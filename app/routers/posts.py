from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, aliased

from .. import auth, exceptions, models, schemas
from ..rate_limit import limiter
from ..database import get_db

router = APIRouter(
    prefix="/posts",
    tags=["posts"],
)

db_dependency = Annotated[Session, Depends(get_db)]
POST_MAX_LENGTH = 280


def _build_posts_with_counts_query(db: Session, current_user: models.User):
    avatar_media = aliased(models.Media)
    top_comment_user = aliased(models.User)
    top_comment_avatar_media = aliased(models.Media)

    likes_subq = (
        db.query(models.Like.post_id, func.count(models.Like.user_id).label("likes_count"))
        .group_by(models.Like.post_id)
        .subquery()
    )

    retweets_subq = (
        db.query(
            models.Retweet.post_id,
            func.count(models.Retweet.user_id).label("retweets_count"),
        )
        .group_by(models.Retweet.post_id)
        .subquery()
    )

    liked_by_me_subq = (
        db.query(models.Like.post_id.label("post_id"))
        .filter(models.Like.user_id == current_user.id)
        .subquery()
    )

    retweeted_by_me_subq = (
        db.query(models.Retweet.post_id.label("post_id"))
        .filter(models.Retweet.user_id == current_user.id)
        .subquery()
    )

    bookmarked_by_me_subq = (
        db.query(models.Bookmark.post_id.label("post_id"))
        .filter(models.Bookmark.user_id == current_user.id)
        .subquery()
    )

    ranked_top_comments_subq = (
        db.query(
            models.Comment.id.label("comment_id"),
            models.Comment.post_id.label("post_id"),
            models.Comment.user_id.label("comment_user_id"),
            models.Comment.content.label("comment_content"),
            models.Comment.like_count.label("comment_like_count"),
            models.Comment.created_at.label("comment_created_at"),
            func.row_number()
            .over(
                partition_by=models.Comment.post_id,
                order_by=(
                    models.Comment.like_count.desc(),
                    models.Comment.created_at.asc(),
                    models.Comment.id.asc(),
                ),
            )
            .label("comment_rank"),
        )
        .filter(models.Comment.parent_id.is_(None))
        .subquery()
    )

    return (
        db.query(
            models.Post,
            models.User.username.label("owner_username"),
            avatar_media.public_url.label("owner_avatar_url"),
            func.coalesce(likes_subq.c.likes_count, 0).label("likes_count"),
            func.coalesce(retweets_subq.c.retweets_count, 0).label("retweets_count"),
            liked_by_me_subq.c.post_id.isnot(None).label("is_liked"),
            retweeted_by_me_subq.c.post_id.isnot(None).label("is_retweeted"),
            bookmarked_by_me_subq.c.post_id.isnot(None).label("is_bookmarked"),
            models.Media.public_url.label("media_url"),
            ranked_top_comments_subq.c.comment_id.label("top_comment_id"),
            ranked_top_comments_subq.c.comment_content.label("top_comment_content"),
            ranked_top_comments_subq.c.comment_like_count.label(
                "top_comment_like_count"
            ),
            ranked_top_comments_subq.c.comment_created_at.label(
                "top_comment_created_at"
            ),
            top_comment_user.id.label("top_comment_user_id"),
            top_comment_user.username.label("top_comment_username"),
            top_comment_avatar_media.public_url.label("top_comment_user_avatar_url"),
            top_comment_user.bio.label("top_comment_user_bio"),
        )
        .join(models.User, models.Post.owner_id == models.User.id)
        .outerjoin(models.Media, models.Post.media_id == models.Media.id)
        .outerjoin(avatar_media, models.User.avatar_media_id == avatar_media.id)
        .outerjoin(likes_subq, models.Post.id == likes_subq.c.post_id)
        .outerjoin(retweets_subq, models.Post.id == retweets_subq.c.post_id)
        .outerjoin(liked_by_me_subq, models.Post.id == liked_by_me_subq.c.post_id)
        .outerjoin(
            retweeted_by_me_subq, models.Post.id == retweeted_by_me_subq.c.post_id
        )
        .outerjoin(
            bookmarked_by_me_subq,
            models.Post.id == bookmarked_by_me_subq.c.post_id,
        )
        .outerjoin(
            ranked_top_comments_subq,
            and_(
                ranked_top_comments_subq.c.post_id == models.Post.id,
                ranked_top_comments_subq.c.comment_rank == 1,
            ),
        )
        .outerjoin(
            top_comment_user,
            ranked_top_comments_subq.c.comment_user_id == top_comment_user.id,
        )
        .outerjoin(
            top_comment_avatar_media,
            top_comment_user.avatar_media_id == top_comment_avatar_media.id,
        )
    )


def _to_post_with_counts(row) -> schemas.PostWithCounts:
    (
        post,
        owner_username,
        owner_avatar_url,
        likes_count,
        retweets_count,
        is_liked,
        is_retweeted,
        is_bookmarked,
        media_url,
        top_comment_id,
        top_comment_content,
        top_comment_like_count,
        top_comment_created_at,
        top_comment_user_id,
        top_comment_username,
        top_comment_user_avatar_url,
        top_comment_user_bio,
    ) = row

    top_comment_preview = None
    if top_comment_id is not None and top_comment_user_id is not None:
        top_comment_preview = schemas.PostTopCommentPreview(
            id=top_comment_id,
            content=top_comment_content,
            like_count=top_comment_like_count,
            created_at=top_comment_created_at,
            user=schemas.UserPreview(
                id=top_comment_user_id,
                username=top_comment_username,
                avatar_url=top_comment_user_avatar_url,
                bio=top_comment_user_bio,
            ),
        )

    return schemas.PostWithCounts(
        id=post.id,
        content=post.content,
        timestamp=post.timestamp,
        owner_id=post.owner_id,
        owner_username=owner_username,
        owner_avatar_url=owner_avatar_url,
        likes_count=likes_count,
        retweets_count=retweets_count,
        is_liked=is_liked,
        is_retweeted=is_retweeted,
        is_bookmarked=is_bookmarked,
        media_url=media_url,
        top_comment_preview=top_comment_preview,
    )


@router.get("/", response_model=List[schemas.Post])
def read_posts(db: db_dependency, skip: int = 0, limit: int = 10):
    posts = (
        db.query(models.Post)
        .order_by(models.Post.timestamp.desc(), models.Post.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return posts


@router.post("/", response_model=schemas.Post)
@limiter.limit("15/minute")
def create_new_post(
    request: Request,
    post: schemas.PostCreate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    content = post.content.strip()
    if len(content) > POST_MAX_LENGTH:
        exceptions.raise_bad_request_exception(
            f"Post is too long (max {POST_MAX_LENGTH} characters)"
        )

    media_id = getattr(post, "media_id", None)
    if media_id is not None:
        media = db.query(models.Media).filter(models.Media.id == media_id).first()
        if not media:
            exceptions.raise_not_found_exception("Media not found")
        if media.owner_id != current_user.id:
            exceptions.raise_forbidden_exception("Not allowed to attach this media")
        if media.status != "ready":
            exceptions.raise_conflict_exception("Media is not ready")
        if media.kind != "post_image":
            exceptions.raise_bad_request_exception("Invalid media kind")

    db_post = models.Post(
        content=content,
        owner_id=current_user.id,
        media_id=media_id,
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@router.delete("/{post_id}", status_code=204)
@limiter.limit("10/minute")
def delete_existing_post(
    request: Request,
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        exceptions.raise_not_found_exception("Post not found")
    if post.owner_id != current_user.id:
        exceptions.raise_forbidden_exception("Not authorized to delete this post")

    db.delete(post)
    db.commit()
    return


@router.put("/{post_id}", response_model=schemas.Post)
@limiter.limit("10/minute")
def update_post(
    request: Request,
    post_id: int,
    post_update: schemas.PostUpdate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    content = post_update.content.strip()
    if len(content) > POST_MAX_LENGTH:
        exceptions.raise_bad_request_exception(
            f"Post is too long (max {POST_MAX_LENGTH} characters)"
        )

    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        exceptions.raise_not_found_exception("Post not found")
    if post.owner_id != current_user.id:
        exceptions.raise_forbidden_exception("Not authorized to edit this post")

    post_timestamp_aware = post.timestamp.replace(tzinfo=timezone.utc)
    time_since_creation = datetime.now(timezone.utc) - post_timestamp_aware
    if time_since_creation > timedelta(minutes=10):
        exceptions.raise_bad_request_exception(
            "You can only edit a post within 10 minutes of its creation"
        )

    post.content = content
    db.add(post)
    db.commit()
    return post


@router.post("/{post_id}/like", status_code=204)
@limiter.limit("60/minute")
def like_post(
    request: Request,
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        exceptions.raise_not_found_exception("Post not found")

    like = (
        db.query(models.Like)
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
    )
    if like:
        exceptions.raise_conflict_exception("Already liked")

    new_like = models.Like(user_id=current_user.id, post_id=post_id)
    db.add(new_like)
    db.commit()
    return


@router.post("/{post_id}/unlike", status_code=204)
@limiter.limit("60/minute")
def unlike_post(
    request: Request,
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    like = (
        db.query(models.Like)
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
    )
    if not like:
        exceptions.raise_conflict_exception("Not liked yet")

    db.delete(like)
    db.commit()
    return


@router.post("/{post_id}/retweet", status_code=204)
@limiter.limit("30/minute")
def retweet_post(
    request: Request,
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        exceptions.raise_not_found_exception("Post not found")

    retweet = (
        db.query(models.Retweet)
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
    )
    if retweet:
        exceptions.raise_conflict_exception("Already retweeted")

    new_retweet = models.Retweet(user_id=current_user.id, post_id=post_id)
    db.add(new_retweet)
    db.commit()
    return


@router.post("/{post_id}/unretweet", status_code=204)
@limiter.limit("30/minute")
def unretweet_post(
    request: Request,
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    retweet = (
        db.query(models.Retweet)
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
    )
    if not retweet:
        exceptions.raise_conflict_exception("Not retweeted yet")

    db.delete(retweet)
    db.commit()
    return


@router.get(
    "/{post_id}/with_counts",
    response_model=schemas.PostWithCounts,
    summary="Post detail with reaction counts",
)
def read_post_with_counts(
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    row = (
        _build_posts_with_counts_query(db, current_user)
        .filter(models.Post.id == post_id)
        .first()
    )
    if row is None:
        exceptions.raise_not_found_exception("Post not found")
    return _to_post_with_counts(row)


@router.get(
    "/with_counts/",
    response_model=List[schemas.PostWithCounts],
    summary="Feed with reaction counts",
    description="Returns posts ordered by newest first, including owner username and like/retweet counts.",
    responses={200: {"description": "List of posts with counts"}},
)
def read_posts_with_counts(
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    view: Literal["public", "subscriptions"] = Query("public"),
):
    followee_ids_subq = (
        db.query(models.Follow.c.followee_id)
        .filter(models.Follow.c.follower_id == current_user.id)
        .subquery()
    )

    query = _build_posts_with_counts_query(db, current_user)

    if view == "subscriptions":
        query = query.filter(
            or_(
                models.Post.owner_id == current_user.id,
                models.Post.owner_id.in_(select(followee_ids_subq.c.followee_id)),
            )
        )

    posts = (
        query.order_by(models.Post.timestamp.desc(), models.Post.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_to_post_with_counts(row) for row in posts]

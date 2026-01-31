from typing import Annotated, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal
from sqlalchemy.orm import Session, aliased

from .. import auth, exceptions, models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/bookmarks",
    tags=["bookmarks"],
)

db_dependency = Annotated[Session, Depends(get_db)]


@router.post("/{post_id}", status_code=204)
def add_bookmark(
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        exceptions.raise_not_found_exception("Post not found")

    existing = (
        db.query(models.Bookmark)
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
    )
    if not existing:
        db.add(models.Bookmark(user_id=current_user.id, post_id=post_id))
        db.commit()
    return


@router.delete("/{post_id}", status_code=204)
def remove_bookmark(
    post_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    existing = (
        db.query(models.Bookmark)
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return


@router.get("/", response_model=List[schemas.PostWithCounts])
def list_bookmarks(
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    avatar_media = aliased(models.Media)

    likes_subq = (
        db.query(
            models.Like.post_id, func.count(models.Like.user_id).label("likes_count")
        )
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

    rows = (
        db.query(
            models.Post,
            models.User.username.label("owner_username"),
            avatar_media.public_url.label("owner_avatar_url"),
            func.coalesce(likes_subq.c.likes_count, 0).label("likes_count"),
            func.coalesce(retweets_subq.c.retweets_count, 0).label("retweets_count"),
            liked_by_me_subq.c.post_id.isnot(None).label("is_liked"),
            retweeted_by_me_subq.c.post_id.isnot(None).label("is_retweeted"),
            literal(True).label("is_bookmarked"),
            models.Media.public_url.label("media_url"),
        )
        .join(models.Bookmark, models.Bookmark.post_id == models.Post.id)
        .join(models.User, models.Post.owner_id == models.User.id)
        .outerjoin(models.Media, models.Post.media_id == models.Media.id)
        .outerjoin(avatar_media, models.User.avatar_media_id == avatar_media.id)
        .outerjoin(likes_subq, models.Post.id == likes_subq.c.post_id)
        .outerjoin(retweets_subq, models.Post.id == retweets_subq.c.post_id)
        .outerjoin(liked_by_me_subq, models.Post.id == liked_by_me_subq.c.post_id)
        .outerjoin(
            retweeted_by_me_subq, models.Post.id == retweeted_by_me_subq.c.post_id
        )
        .filter(models.Bookmark.user_id == current_user.id)
        .order_by(models.Bookmark.created_at.desc(), models.Post.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        schemas.PostWithCounts(
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
        )
        for (
            post,
            owner_username,
            owner_avatar_url,
            likes_count,
            retweets_count,
            is_liked,
            is_retweeted,
            is_bookmarked,
            media_url,
        ) in rows
    ]

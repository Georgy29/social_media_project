from typing import Annotated, List, Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import auth, exceptions, models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..services.feed_query import build_posts_with_counts_query
from ..services.post_mapper import to_post_with_counts
from ..services.post_write_service import (
    normalize_post_content,
    validate_post_edit_window,
    validate_post_media_for_create,
)

router = APIRouter(
    prefix="/posts",
    tags=["posts"],
)

db_dependency = Annotated[Session, Depends(get_db)]


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
    content = normalize_post_content(post.content)

    media_id = getattr(post, "media_id", None)
    validate_post_media_for_create(db, current_user, media_id)

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
    content = normalize_post_content(post_update.content)

    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        exceptions.raise_not_found_exception("Post not found")
    if post.owner_id != current_user.id:
        exceptions.raise_forbidden_exception("Not authorized to edit this post")

    validate_post_edit_window(post)

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
        build_posts_with_counts_query(db, current_user)
        .filter(models.Post.id == post_id)
        .first()
    )
    if row is None:
        exceptions.raise_not_found_exception("Post not found")
    return to_post_with_counts(row)


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

    query = build_posts_with_counts_query(db, current_user)

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

    return [to_post_with_counts(row) for row in posts]

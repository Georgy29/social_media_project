from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from typing import Annotated, List

from .. import models, schemas, auth
from ..database import get_db
from ..exceptions import (
    raise_not_found_exception,
    raise_bad_request_exception,
    raise_conflict_exception,
    raise_forbidden_exception,
)
from ..queries.timeline import fetch_user_timeline

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

db_dependency = Annotated[Session, Depends(get_db)]


@router.get("/me", response_model=schemas.User)
def read_me(current_user: models.User = Depends(auth.get_current_user)):
    avatar_url = (
        current_user.avatar_media.public_url if current_user.avatar_media else None
    )
    return schemas.User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        created_at=current_user.created_at,
        avatar_url=avatar_url,
    )


@router.get("/{username}", response_model=schemas.UserProfile)
def get_user_profile(username: str, db: db_dependency):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise_not_found_exception("User not found")

    followers_count = (
        db.query(func.count())
        .select_from(models.Follow)
        .filter(models.Follow.c.followee_id == user.id)
        .scalar()
    )

    following_count = (
        db.query(func.count())
        .select_from(models.Follow)
        .filter(models.Follow.c.follower_id == user.id)
        .scalar()
    )

    posts_count = (
        db.query(func.count(models.Post.id))
        .filter(models.Post.owner_id == user.id)
        .scalar()
    )

    return schemas.UserProfile(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        followers_count=followers_count or 0,
        following_count=following_count or 0,
        posts_count=posts_count or 0,
        avatar_url=user.avatar_media.public_url if user.avatar_media else None,
    )


@router.get("/{username}/timeline", response_model=List[schemas.TimelineItem])
def get_user_timeline(
    username: str,
    db: db_dependency,
    skip: int = 0,
    limit: int = 10,
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise_not_found_exception("User not found")

    return fetch_user_timeline(db, user.id, skip, limit)


# User Registration Endpoint
@router.post("/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: db_dependency):
    db_user = (
        db.query(models.User).filter(models.User.username == user.username).first()
    )
    if db_user:
        raise_conflict_exception("Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, email=user.email, hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return schemas.User(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        created_at=new_user.created_at,
        avatar_url=None,
    )


# Follow User Endpoint
@router.post("/{user_id}/follow", status_code=204)
def follow_user(
    user_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    user_to_follow = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_follow:
        raise_not_found_exception("User not found")
    if user_to_follow == current_user:
        raise_bad_request_exception("Cannot follow yourself")
    if user_to_follow in current_user.following:
        raise_bad_request_exception("Already following this user")
    current_user.following.append(user_to_follow)
    db.commit()
    return


# Unfollow User Endpoint
@router.post("/{user_id}/unfollow", status_code=204)
def unfollow_user(
    user_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    user_to_unfollow = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_unfollow:
        raise_not_found_exception("User not found")
    if user_to_unfollow == current_user:
        raise_bad_request_exception("Cannot unfollow yourself")
    if user_to_unfollow not in current_user.following:
        raise_bad_request_exception("Not following this user")
    current_user.following.remove(user_to_unfollow)
    db.commit()
    return


@router.put("/me/avatar", response_model=schemas.User)
def update_avatar(
    payload: schemas.AvatarUpdate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.media_id is None:
        current_user.avatar_media_id = None
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return schemas.User(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            created_at=current_user.created_at,
            avatar_url=None,
        )

    media = db.query(models.Media).filter(models.Media.id == payload.media_id).first()
    if not media:
        raise_not_found_exception("Media not found")
    if media.owner_id != current_user.id:
        raise_forbidden_exception("Not allowed to use this media")
    if media.status != "ready":
        raise_conflict_exception("Media is not ready")
    if media.kind != "avatar":
        raise_bad_request_exception("Invalid media kind")

    current_user.avatar_media_id = media.id
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return schemas.User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        created_at=current_user.created_at,
        avatar_url=media.public_url,
    )

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from typing import Annotated, List

from .. import models, schemas, auth
from ..rate_limit import limiter
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
    cover_url = (
        current_user.profile_cover_media.public_url
        if current_user.profile_cover_media
        else None
    )
    return schemas.User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        created_at=current_user.created_at,
        avatar_url=avatar_url,
        cover_url=cover_url,
        bio=current_user.bio,
    )


@router.get("/{username}", response_model=schemas.UserProfile)
def get_user_profile(
    username: str,
    db: db_dependency,
    current_user: models.User | None = Depends(auth.get_current_user_optional),
):
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

    is_followed_by_viewer = False
    if current_user and current_user.id != user.id:
        is_followed_by_viewer = (
            db.query(models.Follow)
            .filter(
                models.Follow.c.follower_id == current_user.id,
                models.Follow.c.followee_id == user.id,
            )
            .first()
            is not None
        )

    return schemas.UserProfile(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        followers_count=followers_count or 0,
        following_count=following_count or 0,
        posts_count=posts_count or 0,
        is_followed_by_viewer=is_followed_by_viewer,
        avatar_url=user.avatar_media.public_url if user.avatar_media else None,
        cover_url=user.profile_cover_media.public_url
        if user.profile_cover_media
        else None,
        bio=user.bio,
    )


@router.get("/{username}/timeline", response_model=List[schemas.TimelineItem])
def get_user_timeline(
    username: str,
    db: db_dependency,
    current_user: models.User | None = Depends(auth.get_current_user_optional),
    skip: int = 0,
    limit: int = 10,
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise_not_found_exception("User not found")

    viewer_id = current_user.id if current_user else 0
    return fetch_user_timeline(db, user.id, viewer_id, skip, limit)


@router.get(
    "/{username}/mutuals/preview",
    response_model=schemas.MutualsPreview,
)
def get_mutuals_preview(
    username: str,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
    limit: int = Query(5, ge=1, le=5),
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise_not_found_exception("User not found")

    f1 = models.Follow.alias("f1")  # viewer -> mutual
    f2 = models.Follow.alias("f2")  # mutual -> profile user

    mutuals_base = (
        db.query(models.User)
        .join(f1, f1.c.followee_id == models.User.id)
        .join(f2, f2.c.follower_id == models.User.id)
        .filter(
            f1.c.follower_id == current_user.id,
            f2.c.followee_id == user.id,
        )
    )

    mutual_count = (
        mutuals_base.with_entities(func.count(func.distinct(models.User.id))).scalar()
        or 0
    )

    mutuals = mutuals_base.order_by(models.User.id.asc()).limit(limit).all()

    preview = [
        schemas.UserPreview(
            id=mutual.id,
            username=mutual.username,
            avatar_url=mutual.avatar_media.public_url if mutual.avatar_media else None,
            bio=mutual.bio,
        )
        for mutual in mutuals
    ]

    return schemas.MutualsPreview(mutual_count=mutual_count, mutual_preview=preview)


@router.get("/discover/suggestions", response_model=schemas.SuggestionsResponse)
def get_suggestions(
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
    limit: int = Query(5, ge=1, le=5),
):
    followed_subq = (
        db.query(models.Follow.c.followee_id)
        .filter(models.Follow.c.follower_id == current_user.id)
        .subquery()
    )

    recent_authors_subq = (
        db.query(
            models.Post.owner_id.label("user_id"),
            func.max(models.Post.timestamp).label("last_post_at"),
        )
        .group_by(models.Post.owner_id)
        .subquery()
    )

    base_q = (
        db.query(models.User)
        .outerjoin(recent_authors_subq, recent_authors_subq.c.user_id == models.User.id)
        .filter(models.User.id != current_user.id)
        .filter(~models.User.id.in_(followed_subq))
    )

    recent = (
        base_q.order_by(
            func.coalesce(
                recent_authors_subq.c.last_post_at, models.User.created_at
            ).desc(),
            models.User.id.desc(),
        )
        .limit(limit)
        .all()
    )

    picked_ids = {u.id for u in recent}
    if len(recent) < limit:
        fallback_q = base_q.order_by(models.User.created_at.desc())
        if picked_ids:
            fallback_q = fallback_q.filter(~models.User.id.in_(picked_ids))
        recent += fallback_q.limit(limit - len(recent)).all()

    suggestions = [
        schemas.UserPreview(
            id=user.id,
            username=user.username,
            avatar_url=user.avatar_media.public_url if user.avatar_media else None,
            bio=user.bio,
        )
        for user in recent
    ]
    return schemas.SuggestionsResponse(suggestions=suggestions)


# User Registration Endpoint
@router.post("/", response_model=schemas.User)
@limiter.limit("3/minute")
def create_user(
    request: Request,
    user: schemas.UserCreate,
    db: db_dependency,
):
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
        cover_url=None,
        bio=None,
    )


# Follow User Endpoint
@router.post("/{user_id}/follow", status_code=204)
@limiter.limit("30/minute")
def follow_user(
    request: Request,
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
@limiter.limit("30/minute")
def unfollow_user(
    request: Request,
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
@limiter.limit("5/minute")
def update_avatar(
    request: Request,
    payload: schemas.AvatarUpdate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.media_id is None:
        current_user.avatar_media_id = None
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        cover_url = (
            current_user.profile_cover_media.public_url
            if current_user.profile_cover_media
            else None
        )
        return schemas.User(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            created_at=current_user.created_at,
            avatar_url=None,
            cover_url=cover_url,
            bio=current_user.bio,
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
        cover_url=current_user.profile_cover_media.public_url
        if current_user.profile_cover_media
        else None,
        bio=current_user.bio,
    )


@router.put("/me/cover", response_model=schemas.User)
@limiter.limit("5/minute")
def update_cover(
    request: Request,
    payload: schemas.CoverUpdate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.media_id is None:
        current_user.profile_cover_media_id = None
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        avatar_url = (
            current_user.avatar_media.public_url if current_user.avatar_media else None
        )
        return schemas.User(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            created_at=current_user.created_at,
            avatar_url=avatar_url,
            cover_url=None,
            bio=current_user.bio,
        )

    media = db.query(models.Media).filter(models.Media.id == payload.media_id).first()
    if not media:
        raise_not_found_exception("Media not found")
    if media.owner_id != current_user.id:
        raise_forbidden_exception("Not allowed to use this media")
    if media.status != "ready":
        raise_conflict_exception("Media is not ready")
    if media.kind != "profile_cover":
        raise_bad_request_exception("Invalid media kind")

    current_user.profile_cover_media_id = media.id
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return schemas.User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        created_at=current_user.created_at,
        avatar_url=current_user.avatar_media.public_url
        if current_user.avatar_media
        else None,
        cover_url=media.public_url,
        bio=current_user.bio,
    )


@router.put("/me/profile", response_model=schemas.User)
def update_profile(
    payload: schemas.UserProfileUpdate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.bio is None:
        current_user.bio = None
    else:
        trimmed = payload.bio.strip()
        if len(trimmed) > 100:
            raise_bad_request_exception("Bio must be 100 characters or less")
        current_user.bio = trimmed if trimmed else None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return schemas.User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        created_at=current_user.created_at,
        avatar_url=current_user.avatar_media.public_url
        if current_user.avatar_media
        else None,
        cover_url=current_user.profile_cover_media.public_url
        if current_user.profile_cover_media
        else None,
        bio=current_user.bio,
    )

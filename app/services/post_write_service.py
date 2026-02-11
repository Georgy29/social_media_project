from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy.orm import Session

from .. import exceptions, models

POST_MAX_LENGTH = 280


def normalize_post_content(content: str, max_length: int = POST_MAX_LENGTH) -> str:
    trimmed = content.strip()
    if len(trimmed) > max_length:
        exceptions.raise_bad_request_exception(
            f"Post is too long (max {max_length} characters)"
        )
    return trimmed


def validate_post_media_for_create(
    db: Session, current_user: models.User, media_id: int | None
) -> None:
    if media_id is None:
        return

    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if not media:
        exceptions.raise_not_found_exception("Media not found")
    if media.owner_id != current_user.id:
        exceptions.raise_forbidden_exception("Not allowed to attach this media")
    if media.status != "ready":
        exceptions.raise_conflict_exception("Media is not ready")
    if media.kind != "post_image":
        exceptions.raise_bad_request_exception("Invalid media kind")


def validate_post_edit_window(post: models.Post, max_minutes: int = 10) -> None:
    post_timestamp_aware = post.timestamp.replace(tzinfo=timezone.utc)
    time_since_creation = datetime.now(timezone.utc) - post_timestamp_aware
    if time_since_creation > timedelta(minutes=max_minutes):
        exceptions.raise_bad_request_exception(
            f"You can only edit a post within {max_minutes} minutes of its creation"
        )


def get_post_or_404(db: Session, post_id: int) -> models.Post:
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        exceptions.raise_not_found_exception("Post not found")
    return post


def get_owned_post_or_404(
    db: Session,
    post_id: int,
    current_user: models.User,
    action: Literal["edit", "delete"] = "edit",
) -> models.Post:
    post = get_post_or_404(db, post_id)
    if post.owner_id != current_user.id:
        exceptions.raise_forbidden_exception(f"Not authorized to {action} this post")
    return post

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import and_, literal, or_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, aliased

from .. import auth, exceptions, models, schemas
from ..comment_cursor import decode_comment_cursor, encode_comment_cursor
from ..database import get_db
from ..rate_limit import limiter

router = APIRouter(tags=["comments"])

db_dependency = Annotated[Session, Depends(get_db)]

COMMENT_MAX_LENGTH = 400


def _trimmed_or_error(content: str) -> str:
    trimmed = content.strip()
    if not trimmed:
        exceptions.raise_bad_request_exception("Comment cannot be empty")
    if len(trimmed) > COMMENT_MAX_LENGTH:
        exceptions.raise_bad_request_exception(
            f"Comment is too long (max {COMMENT_MAX_LENGTH} characters)"
        )
    return trimmed


def _ensure_top_level_comment(
    db: Session, post_id: int, comment_id: int
) -> models.Comment:
    parent = (
        db.query(models.Comment)
        .filter(models.Comment.id == comment_id, models.Comment.post_id == post_id)
        .first()
    )
    if not parent:
        exceptions.raise_not_found_exception("Parent comment not found")
    if parent.parent_id is not None:
        exceptions.raise_bad_request_exception(
            "parent_id must reference a top-level comment"
        )
    return parent


def _ensure_reply_target(
    db: Session,
    post_id: int,
    parent_id: int,
    reply_to_comment_id: int,
    reply_to_user_id: int | None,
) -> tuple[int, int | None]:
    target = (
        db.query(models.Comment)
        .filter(
            models.Comment.id == reply_to_comment_id,
            models.Comment.post_id == post_id,
            models.Comment.parent_id == parent_id,
        )
        .first()
    )
    if not target:
        exceptions.raise_bad_request_exception(
            "reply_to_comment_id must be within the same thread"
        )
    # If client didn't pass reply_to_user_id, derive it.
    target_user_id = target.user_id
    if reply_to_user_id is not None and reply_to_user_id != target_user_id:
        exceptions.raise_bad_request_exception(
            "reply_to_user_id does not match reply_to_comment_id"
        )
    return target_user_id, target.id


def _get_comment_or_404(db: Session, comment_id: int) -> models.Comment:
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        exceptions.raise_not_found_exception("Comment not found")
    return comment


@router.post("/posts/{post_id}/comments", response_model=schemas.CommentResponse)
@limiter.limit("30/minute")
def create_comment(
    request: Request,
    post_id: int,
    payload: schemas.CommentCreate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        exceptions.raise_not_found_exception("Post not found")

    content = _trimmed_or_error(payload.content)

    parent_id = payload.parent_id
    reply_to_comment_id = payload.reply_to_comment_id
    reply_to_user_id = payload.reply_to_user_id

    if parent_id is None:
        # top-level comment
        if reply_to_comment_id or reply_to_user_id:
            exceptions.raise_bad_request_exception(
                "reply_to_* must be null for top-level comments"
            )
    else:
        parent = _ensure_top_level_comment(db, post_id, parent_id)
        if reply_to_comment_id:
            reply_to_user_id, reply_to_comment_id = _ensure_reply_target(
                db, post_id, parent.id, reply_to_comment_id, reply_to_user_id
            )
        else:
            reply_to_comment_id = None
            # Replying to a top-level comment: target the parent user (VK-style "Name,")
            reply_to_user_id = parent.user_id

    comment = models.Comment(
        post_id=post_id,
        user_id=current_user.id,
        parent_id=parent_id,
        reply_to_comment_id=reply_to_comment_id,
        reply_to_user_id=reply_to_user_id,
        content=content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    reply_to_user = (
        db.query(models.User).filter(models.User.id == comment.reply_to_user_id).first()
        if comment.reply_to_user_id
        else None
    )

    return schemas.CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user=schemas.UserPreview(
            id=current_user.id,
            username=current_user.username,
            avatar_url=current_user.avatar_media.public_url
            if current_user.avatar_media
            else None,
            bio=current_user.bio,
        ),
        parent_id=comment.parent_id,
        reply_to_comment_id=comment.reply_to_comment_id,
        reply_to_user=(
            schemas.UserPreview(
                id=reply_to_user.id,
                username=reply_to_user.username,
                avatar_url=reply_to_user.avatar_media.public_url
                if reply_to_user.avatar_media
                else None,
                bio=reply_to_user.bio,
            )
            if reply_to_user
            else None
        ),
        content=comment.content,
        like_count=comment.like_count,
        is_liked=False,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.patch("/comments/{comment_id}", response_model=schemas.CommentResponse)
@limiter.limit("30/minute")
def update_comment(
    request: Request,
    comment_id: int,
    payload: schemas.CommentUpdate,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    comment = _get_comment_or_404(db, comment_id)

    if comment.user_id != current_user.id:
        exceptions.raise_forbidden_exception("Not authorized to edit this comment")

    comment.content = _trimmed_or_error(payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)

    reply_to_user = (
        db.query(models.User).filter(models.User.id == comment.reply_to_user_id).first()
        if comment.reply_to_user_id
        else None
    )
    is_liked = (
        db.query(models.CommentLike)
        .filter_by(user_id=current_user.id, comment_id=comment.id)
        .first()
        is not None
    )

    return schemas.CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user=schemas.UserPreview(
            id=current_user.id,
            username=current_user.username,
            avatar_url=current_user.avatar_media.public_url
            if current_user.avatar_media
            else None,
            bio=current_user.bio,
        ),
        parent_id=comment.parent_id,
        reply_to_comment_id=comment.reply_to_comment_id,
        reply_to_user=(
            schemas.UserPreview(
                id=reply_to_user.id,
                username=reply_to_user.username,
                avatar_url=reply_to_user.avatar_media.public_url
                if reply_to_user.avatar_media
                else None,
                bio=reply_to_user.bio,
            )
            if reply_to_user
            else None
        ),
        content=comment.content,
        like_count=comment.like_count,
        is_liked=is_liked,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.get(
    "/posts/{post_id}/comments",
    response_model=schemas.CommentListResponse,
)
def list_top_level_comments(
    post_id: int,
    db: db_dependency,
    current_user: models.User | None = Depends(auth.get_current_user_optional),
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        exceptions.raise_not_found_exception("Post not found")

    if current_user is not None:
        base_q = (
            db.query(
                models.Comment,
                models.User,
                models.CommentLike.user_id.label("liked_user_id"),
            )
            .join(models.User, models.Comment.user_id == models.User.id)
            .outerjoin(
                models.CommentLike,
                and_(
                    models.CommentLike.comment_id == models.Comment.id,
                    models.CommentLike.user_id == current_user.id,
                ),
            )
            .filter(
                models.Comment.post_id == post_id,
                models.Comment.parent_id.is_(None),
            )
        )
    else:
        base_q = (
            db.query(models.Comment, models.User, literal(None).label("liked_user_id"))
            .join(models.User, models.Comment.user_id == models.User.id)
            .filter(
                models.Comment.post_id == post_id,
                models.Comment.parent_id.is_(None),
            )
        )

    if cursor:
        c_like, c_created, c_id = decode_comment_cursor(cursor)
        base_q = base_q.filter(
            or_(
                models.Comment.like_count < c_like,
                and_(
                    models.Comment.like_count == c_like,
                    models.Comment.created_at > c_created,
                ),
                and_(
                    models.Comment.like_count == c_like,
                    models.Comment.created_at == c_created,
                    models.Comment.id > c_id,
                ),
            )
        )

    rows = (
        base_q.order_by(
            models.Comment.like_count.desc(),
            models.Comment.created_at.asc(),
            models.Comment.id.asc(),
        )
        .limit(limit + 1)
        .all()
    )

    items: list[schemas.CommentResponse] = []
    for comment, user, liked_user_id in rows[:limit]:
        items.append(
            schemas.CommentResponse(
                id=comment.id,
                post_id=comment.post_id,
                user=schemas.UserPreview(
                    id=user.id,
                    username=user.username,
                    avatar_url=user.avatar_media.public_url
                    if user.avatar_media
                    else None,
                    bio=user.bio,
                ),
                parent_id=comment.parent_id,
                reply_to_comment_id=comment.reply_to_comment_id,
                reply_to_user=None,  # optional: join if you want it here
                content=comment.content,
                like_count=comment.like_count,
                is_liked=liked_user_id is not None,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
            )
        )

    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1][0]
        next_cursor = encode_comment_cursor(last.like_count, last.created_at, last.id)

    return schemas.CommentListResponse(items=items, next_cursor=next_cursor)


@router.get(
    "/comments/{comment_id}/replies", response_model=schemas.CommentListResponse
)
def list_replies(
    comment_id: int,
    db: db_dependency,
    current_user: models.User | None = Depends(auth.get_current_user_optional),
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
):
    parent = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not parent:
        exceptions.raise_not_found_exception("Comment not found")
    if parent.parent_id is not None:
        exceptions.raise_bad_request_exception(
            "Replies can only be listed for top-level comments"
        )

    reply_user = aliased(models.User)
    if current_user is not None:
        base_q = (
            db.query(
                models.Comment,
                models.User,
                reply_user,
                models.CommentLike.user_id.label("liked_user_id"),
            )
            .join(models.User, models.Comment.user_id == models.User.id)
            .outerjoin(reply_user, models.Comment.reply_to_user_id == reply_user.id)
            .outerjoin(
                models.CommentLike,
                and_(
                    models.CommentLike.comment_id == models.Comment.id,
                    models.CommentLike.user_id == current_user.id,
                ),
            )
            .filter(models.Comment.parent_id == comment_id)
        )
    else:
        base_q = (
            db.query(
                models.Comment,
                models.User,
                reply_user,
                literal(None).label("liked_user_id"),
            )
            .join(models.User, models.Comment.user_id == models.User.id)
            .outerjoin(reply_user, models.Comment.reply_to_user_id == reply_user.id)
            .filter(models.Comment.parent_id == comment_id)
        )

    if cursor:
        c_like, c_created, c_id = decode_comment_cursor(cursor)
        base_q = base_q.filter(
            or_(
                models.Comment.like_count < c_like,
                and_(
                    models.Comment.like_count == c_like,
                    models.Comment.created_at > c_created,
                ),
                and_(
                    models.Comment.like_count == c_like,
                    models.Comment.created_at == c_created,
                    models.Comment.id > c_id,
                ),
            )
        )

    rows = (
        base_q.order_by(
            models.Comment.like_count.desc(),
            models.Comment.created_at.asc(),
            models.Comment.id.asc(),
        )
        .limit(limit + 1)
        .all()
    )

    items: list[schemas.CommentResponse] = []
    for comment, user, reply_to_user, liked_user_id in rows[:limit]:
        items.append(
            schemas.CommentResponse(
                id=comment.id,
                post_id=comment.post_id,
                user=schemas.UserPreview(
                    id=user.id,
                    username=user.username,
                    avatar_url=user.avatar_media.public_url
                    if user.avatar_media
                    else None,
                    bio=user.bio,
                ),
                parent_id=comment.parent_id,
                reply_to_comment_id=comment.reply_to_comment_id,
                reply_to_user=(
                    schemas.UserPreview(
                        id=reply_to_user.id,
                        username=reply_to_user.username,
                        avatar_url=reply_to_user.avatar_media.public_url
                        if reply_to_user.avatar_media
                        else None,
                        bio=reply_to_user.bio,
                    )
                    if reply_to_user
                    else None
                ),
                content=comment.content,
                like_count=comment.like_count,
                is_liked=liked_user_id is not None,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
            )
        )

    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1][0]
        next_cursor = encode_comment_cursor(last.like_count, last.created_at, last.id)

    return schemas.CommentListResponse(items=items, next_cursor=next_cursor)


@router.post("/comments/{comment_id}/like", status_code=204)
@limiter.limit("120/minute")
def like_comment(
    request: Request,
    comment_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    _get_comment_or_404(db, comment_id)

    insert_stmt = (
        insert(models.CommentLike)
        .values(user_id=current_user.id, comment_id=comment_id)
        .on_conflict_do_nothing(index_elements=["user_id", "comment_id"])
        .returning(models.CommentLike.user_id)
    )
    inserted_user_id = db.execute(insert_stmt).scalar_one_or_none()

    if inserted_user_id is not None:
        db.query(models.Comment).filter(models.Comment.id == comment_id).update(
            {models.Comment.like_count: models.Comment.like_count + 1},
            synchronize_session=False,
        )

    db.commit()

    return


@router.delete("/comments/{comment_id}/like", status_code=204)
@limiter.limit("120/minute")
def unlike_comment(
    request: Request,
    comment_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    _get_comment_or_404(db, comment_id)

    deleted = (
        db.query(models.CommentLike)
        .filter_by(user_id=current_user.id, comment_id=comment_id)
        .delete(synchronize_session=False)
    )

    if deleted:
        db.query(models.Comment).filter(
            models.Comment.id == comment_id, models.Comment.like_count > 0
        ).update(
            {models.Comment.like_count: models.Comment.like_count - 1},
            synchronize_session=False,
        )

    db.commit()
    return


@router.delete("/comments/{comment_id}", status_code=204)
@limiter.limit("20/minute")
def delete_comment(
    request: Request,
    comment_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    comment = _get_comment_or_404(db, comment_id)

    is_owner = comment.user_id == current_user.id
    is_admin = getattr(current_user, "is_admin", False)
    if not (is_owner or is_admin):
        exceptions.raise_forbidden_exception("Not authorized to delete this comment")

    db.delete(comment)
    db.commit()
    return

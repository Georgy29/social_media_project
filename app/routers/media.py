import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from .. import auth, exceptions, models, schemas, settings
from ..database import get_db
from ..storage import s3

router = APIRouter(prefix="/media", tags=["media"])
db_dependency = Annotated[Session, Depends(get_db)]

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _require_s3_config() -> None:
    if not settings.S3_BUCKET:
        raise HTTPException(status_code=500, detail="S3_BUCKET is not configured")
    if not settings.AWS_REGION:
        raise HTTPException(status_code=500, detail="AWS_REGION is not configured")


def _max_bytes_for_kind(kind: str) -> int:
    if kind == "avatar":
        return settings.MEDIA_MAX_BYTES_AVATAR
    if kind in {"post_image", "profile_cover"}:
        return settings.MEDIA_MAX_BYTES_POST
    exceptions.raise_bad_request_exception("Invalid media kind")


def _key_prefix(kind: str) -> str:
    if kind == "avatar":
        return "avatars"
    if kind == "profile_cover":
        return "covers"
    return "posts"


def _build_key(user_id: int, kind: str, content_type: str) -> str:
    ext = ALLOWED_CONTENT_TYPES.get(content_type)
    if not ext:
        exceptions.raise_bad_request_exception("Unsupported content type")

    prefix = settings.S3_PUBLIC_PREFIX or "public/"
    if not prefix.endswith("/"):
        prefix = f"{prefix}/"

    folder = _key_prefix(kind)
    return f"{prefix}{folder}/{user_id}/{uuid.uuid4().hex}.{ext}"


@router.post("/presign", response_model=schemas.MediaPresignResponse)
def presign_media(
    payload: schemas.MediaPresignRequest,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    _require_s3_config()

    max_bytes = _max_bytes_for_kind(payload.kind)
    if payload.size_bytes <= 0 or payload.size_bytes > max_bytes:
        exceptions.raise_bad_request_exception("File too large")

    key = _build_key(current_user.id, payload.kind, payload.content_type)

    public_url = s3.public_url(settings.S3_BUCKET, key)

    media = models.Media(
        owner_id=current_user.id,
        kind=payload.kind,
        status="pending",
        bucket=settings.S3_BUCKET,
        object_key=key,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        public_url=public_url,
    )

    db.add(media)
    db.commit()
    db.refresh(media)

    upload_url = s3.create_presigned_put_url(
        settings.S3_BUCKET,
        key,
        payload.content_type,
    )

    return schemas.MediaPresignResponse(
        media_id=media.id,
        upload_url=upload_url,
        public_url=public_url,
    )


@router.post("/{media_id}/complete", response_model=schemas.MediaCompleteResponse)
def complete_media(
    media_id: int,
    db: db_dependency,
    current_user: models.User = Depends(auth.get_current_user),
):
    _require_s3_config()

    media = db.query(models.Media).filter(models.Media.id == media_id).first()

    if not media:
        exceptions.raise_not_found_exception("Media not found")
    if media.owner_id != current_user.id:
        exceptions.raise_forbidden_exception("Not allowed to complete this media")

    #
    if media.status == "ready":
        return schemas.MediaCompleteResponse(
            media_id=media.id,
            status=media.status,
            public_url=media.public_url,
        )

    try:
        head = s3.head_object(media.bucket, media.object_key)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code")
        if code in {"404", "NoSuchKey", "403", "AccessDenied"}:
            exceptions.raise_conflict_exception(
                "Upload not found yet. Please upload the file before completing."
            )
        raise

    content_type = head.get("ContentType")
    content_length = head.get("ContentLength")

    if content_type != media.content_type:
        exceptions.raise_bad_request_exception("Content type mismatch")

    max_bytes = _max_bytes_for_kind(media.kind)
    if content_length is None or content_length > max_bytes:
        exceptions.raise_bad_request_exception("Uploaded file too large")

    media.status = "ready"
    db.add(media)
    db.commit()
    db.refresh(media)

    return schemas.MediaCompleteResponse(
        media_id=media.id,
        status=media.status,
        public_url=media.public_url,
    )

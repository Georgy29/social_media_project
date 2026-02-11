import base64
from datetime import datetime

from fastapi import HTTPException, status


def encode_comment_cursor(
    like_count: int, created_at: datetime, comment_id: int
) -> str:
    payload = f"{like_count}|{created_at.isoformat()}|{comment_id}"
    return base64.urlsafe_b64encode(payload.encode("utf-8")).decode("utf-8")


def decode_comment_cursor(cursor: str) -> tuple[int, datetime, int]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        like_s, created_s, id_s = raw.split("|", 2)
        like_count = int(like_s)
        created_at = datetime.fromisoformat(created_s)
        comment_id = int(id_s)
        return like_count, created_at, comment_id
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cursor",
        ) from exc

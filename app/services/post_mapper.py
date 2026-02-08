from dataclasses import dataclass
from datetime import datetime
from typing import Any, Sequence

from .. import models, schemas


@dataclass(frozen=True)
class PostWithCountsRow:
    post: models.Post
    owner_username: str
    owner_avatar_url: str | None
    likes_count: int
    retweets_count: int
    is_liked: bool
    is_retweeted: bool
    is_bookmarked: bool
    media_url: str | None
    top_comment_id: int | None
    top_comment_content: str | None
    top_comment_like_count: int | None
    top_comment_is_liked: bool | None
    top_comment_created_at: datetime | None
    top_comment_user_id: int | None
    top_comment_username: str | None
    top_comment_user_avatar_url: str | None
    top_comment_user_bio: str | None


def _coerce_post_with_counts_row(
    row: Sequence[Any] | PostWithCountsRow,
) -> PostWithCountsRow:
    if isinstance(row, PostWithCountsRow):
        return row
    return PostWithCountsRow(*row)


def to_post_with_counts(row: Sequence[Any] | PostWithCountsRow) -> schemas.PostWithCounts:
    data = _coerce_post_with_counts_row(row)

    top_comment_preview = None
    if data.top_comment_id is not None and data.top_comment_user_id is not None:
        top_comment_preview = schemas.PostTopCommentPreview(
            id=data.top_comment_id,
            content=data.top_comment_content or "",
            like_count=data.top_comment_like_count or 0,
            is_liked=bool(data.top_comment_is_liked),
            created_at=data.top_comment_created_at,
            user=schemas.UserPreview(
                id=data.top_comment_user_id,
                username=data.top_comment_username or "",
                avatar_url=data.top_comment_user_avatar_url,
                bio=data.top_comment_user_bio,
            ),
        )

    return schemas.PostWithCounts(
        id=data.post.id,
        content=data.post.content,
        timestamp=data.post.timestamp,
        owner_id=data.post.owner_id,
        owner_username=data.owner_username,
        owner_avatar_url=data.owner_avatar_url,
        likes_count=data.likes_count,
        retweets_count=data.retweets_count,
        is_liked=data.is_liked,
        is_retweeted=data.is_retweeted,
        is_bookmarked=data.is_bookmarked,
        media_url=data.media_url,
        top_comment_preview=top_comment_preview,
    )

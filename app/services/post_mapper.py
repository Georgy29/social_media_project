from .. import schemas


def to_post_with_counts(row) -> schemas.PostWithCounts:
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
        top_comment_is_liked,
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
            is_liked=bool(top_comment_is_liked),
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

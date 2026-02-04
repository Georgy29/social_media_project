from typing import List


from sqlalchemy import func, literal
from sqlalchemy.orm import Session, aliased

from .. import models, schemas


def fetch_user_timeline(
    db: Session,
    user_id: int,
    viewer_id: int,
    skip: int,
    limit: int,
) -> List[schemas.TimelineItem]:
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

    liked_by_viewer_subq = (
        db.query(models.Like.post_id.label("post_id"))
        .filter(models.Like.user_id == viewer_id)
        .subquery()
    )

    retweeted_by_viewer_subq = (
        db.query(models.Retweet.post_id.label("post_id"))
        .filter(models.Retweet.user_id == viewer_id)
        .subquery()
    )

    bookmarked_by_viewer_subq = (
        db.query(models.Bookmark.post_id.label("post_id"))
        .filter(models.Bookmark.user_id == viewer_id)
        .subquery()
    )

    base_posts_q = (
        db.query(
            models.Post.id.label("post_id"),
            models.Post.content.label("content"),
            models.Post.timestamp.label("post_timestamp"),
            models.Post.owner_id.label("owner_id"),
            models.User.username.label("owner_username"),
            avatar_media.public_url.label("owner_avatar_url"),
            func.coalesce(likes_subq.c.likes_count, 0).label("likes_count"),
            func.coalesce(retweets_subq.c.retweets_count, 0).label("retweets_count"),
            liked_by_viewer_subq.c.post_id.isnot(None).label("is_liked"),
            retweeted_by_viewer_subq.c.post_id.isnot(None).label("is_retweeted"),
            bookmarked_by_viewer_subq.c.post_id.isnot(None).label("is_bookmarked"),
            models.Media.public_url.label("media_url"),
            models.Post.timestamp.label("activity_at"),
            literal("posts").label("item_type"),
            literal(None).label("reposted_at"),
        )
        .join(models.User, models.Post.owner_id == models.User.id)
        .outerjoin(models.Media, models.Post.media_id == models.Media.id)
        .outerjoin(avatar_media, models.User.avatar_media_id == avatar_media.id)
        .outerjoin(likes_subq, models.Post.id == likes_subq.c.post_id)
        .outerjoin(retweets_subq, models.Post.id == retweets_subq.c.post_id)
        .outerjoin(
            liked_by_viewer_subq, models.Post.id == liked_by_viewer_subq.c.post_id
        )
        .outerjoin(
            retweeted_by_viewer_subq,
            models.Post.id == retweeted_by_viewer_subq.c.post_id,
        )
        .outerjoin(
            bookmarked_by_viewer_subq,
            models.Post.id == bookmarked_by_viewer_subq.c.post_id,
        )
        .filter(models.Post.owner_id == user_id)
    )

    reposts_q = (
        db.query(
            models.Post.id.label("post_id"),
            models.Post.content.label("content"),
            models.Post.timestamp.label("post_timestamp"),
            models.Post.owner_id.label("owner_id"),
            models.User.username.label("owner_username"),
            avatar_media.public_url.label("owner_avatar_url"),
            func.coalesce(likes_subq.c.likes_count, 0).label("likes_count"),
            func.coalesce(retweets_subq.c.retweets_count, 0).label("retweets_count"),
            liked_by_viewer_subq.c.post_id.isnot(None).label("is_liked"),
            retweeted_by_viewer_subq.c.post_id.isnot(None).label("is_retweeted"),
            bookmarked_by_viewer_subq.c.post_id.isnot(None).label("is_bookmarked"),
            models.Media.public_url.label("media_url"),
            models.Retweet.timestamp.label("activity_at"),
            literal("retweets").label("item_type"),
            models.Retweet.timestamp.label("reposted_at"),
        )
        .join(models.Post, models.Retweet.post_id == models.Post.id)
        .join(models.User, models.Post.owner_id == models.User.id)
        .outerjoin(models.Media, models.Post.media_id == models.Media.id)
        .outerjoin(avatar_media, models.User.avatar_media_id == avatar_media.id)
        .outerjoin(likes_subq, models.Post.id == likes_subq.c.post_id)
        .outerjoin(retweets_subq, models.Post.id == retweets_subq.c.post_id)
        .outerjoin(
            liked_by_viewer_subq, models.Post.id == liked_by_viewer_subq.c.post_id
        )
        .outerjoin(
            retweeted_by_viewer_subq,
            models.Post.id == retweeted_by_viewer_subq.c.post_id,
        )
        .outerjoin(
            bookmarked_by_viewer_subq,
            models.Post.id == bookmarked_by_viewer_subq.c.post_id,
        )
        .filter(models.Retweet.user_id == user_id)
    )

    union_q = base_posts_q.union_all(reposts_q).subquery()

    rows = (
        db.query(union_q)
        .order_by(union_q.c.activity_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    response_items: List[schemas.TimelineItem] = []
    for row in rows:
        post = schemas.PostWithCounts(
            id=row.post_id,
            content=row.content,
            timestamp=row.post_timestamp,
            owner_id=row.owner_id,
            owner_username=row.owner_username,
            owner_avatar_url=row.owner_avatar_url,
            likes_count=row.likes_count,
            retweets_count=row.retweets_count,
            is_liked=row.is_liked,
            is_retweeted=row.is_retweeted,
            is_bookmarked=row.is_bookmarked,
            media_url=row.media_url,
        )
        response_items.append(
            schemas.TimelineItem(
                type=row.item_type,
                activity_at=row.activity_at,
                post=post,
                reposted_at=row.reposted_at,
            )
        )

    return response_items

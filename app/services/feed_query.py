from sqlalchemy import and_, func
from sqlalchemy.orm import Session, aliased

from .. import models


def build_posts_with_counts_query(db: Session, current_user: models.User):
    avatar_media = aliased(models.Media)
    top_comment_user = aliased(models.User)
    top_comment_avatar_media = aliased(models.Media)
    top_comment_liked_by_me = aliased(models.CommentLike)

    likes_subq = (
        db.query(models.Like.post_id, func.count(models.Like.user_id).label("likes_count"))
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

    liked_by_me_subq = (
        db.query(models.Like.post_id.label("post_id"))
        .filter(models.Like.user_id == current_user.id)
        .subquery()
    )

    retweeted_by_me_subq = (
        db.query(models.Retweet.post_id.label("post_id"))
        .filter(models.Retweet.user_id == current_user.id)
        .subquery()
    )

    bookmarked_by_me_subq = (
        db.query(models.Bookmark.post_id.label("post_id"))
        .filter(models.Bookmark.user_id == current_user.id)
        .subquery()
    )

    ranked_top_comments_subq = (
        db.query(
            models.Comment.id.label("comment_id"),
            models.Comment.post_id.label("post_id"),
            models.Comment.user_id.label("comment_user_id"),
            models.Comment.content.label("comment_content"),
            models.Comment.like_count.label("comment_like_count"),
            models.Comment.created_at.label("comment_created_at"),
            func.row_number()
            .over(
                partition_by=models.Comment.post_id,
                order_by=(
                    models.Comment.like_count.desc(),
                    models.Comment.created_at.asc(),
                    models.Comment.id.asc(),
                ),
            )
            .label("comment_rank"),
        )
        .filter(models.Comment.parent_id.is_(None))
        .subquery()
    )

    return (
        db.query(
            models.Post,
            models.User.username.label("owner_username"),
            avatar_media.public_url.label("owner_avatar_url"),
            func.coalesce(likes_subq.c.likes_count, 0).label("likes_count"),
            func.coalesce(retweets_subq.c.retweets_count, 0).label("retweets_count"),
            liked_by_me_subq.c.post_id.isnot(None).label("is_liked"),
            retweeted_by_me_subq.c.post_id.isnot(None).label("is_retweeted"),
            bookmarked_by_me_subq.c.post_id.isnot(None).label("is_bookmarked"),
            models.Media.public_url.label("media_url"),
            ranked_top_comments_subq.c.comment_id.label("top_comment_id"),
            ranked_top_comments_subq.c.comment_content.label("top_comment_content"),
            ranked_top_comments_subq.c.comment_like_count.label(
                "top_comment_like_count"
            ),
            top_comment_liked_by_me.user_id.isnot(None).label("top_comment_is_liked"),
            ranked_top_comments_subq.c.comment_created_at.label(
                "top_comment_created_at"
            ),
            top_comment_user.id.label("top_comment_user_id"),
            top_comment_user.username.label("top_comment_username"),
            top_comment_avatar_media.public_url.label("top_comment_user_avatar_url"),
            top_comment_user.bio.label("top_comment_user_bio"),
        )
        .join(models.User, models.Post.owner_id == models.User.id)
        .outerjoin(models.Media, models.Post.media_id == models.Media.id)
        .outerjoin(avatar_media, models.User.avatar_media_id == avatar_media.id)
        .outerjoin(likes_subq, models.Post.id == likes_subq.c.post_id)
        .outerjoin(retweets_subq, models.Post.id == retweets_subq.c.post_id)
        .outerjoin(liked_by_me_subq, models.Post.id == liked_by_me_subq.c.post_id)
        .outerjoin(
            retweeted_by_me_subq, models.Post.id == retweeted_by_me_subq.c.post_id
        )
        .outerjoin(
            bookmarked_by_me_subq,
            models.Post.id == bookmarked_by_me_subq.c.post_id,
        )
        .outerjoin(
            ranked_top_comments_subq,
            and_(
                ranked_top_comments_subq.c.post_id == models.Post.id,
                ranked_top_comments_subq.c.comment_rank == 1,
            ),
        )
        .outerjoin(
            top_comment_user,
            ranked_top_comments_subq.c.comment_user_id == top_comment_user.id,
        )
        .outerjoin(
            top_comment_avatar_media,
            top_comment_user.avatar_media_id == top_comment_avatar_media.id,
        )
        .outerjoin(
            top_comment_liked_by_me,
            and_(
                top_comment_liked_by_me.comment_id
                == ranked_top_comments_subq.c.comment_id,
                top_comment_liked_by_me.user_id == current_user.id,
            ),
        )
    )

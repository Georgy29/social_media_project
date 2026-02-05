from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Index,
)
from sqlalchemy.orm import relationship

from .database import Base

# Define the Follow association table before the User class
Follow = Table(
    "follows",
    Base.metadata,
    Column("follower_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("followee_id", Integer, ForeignKey("users.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    avatar_media_id = Column(Integer, ForeignKey("media.id", ondelete="SET NULL"))
    profile_cover_media_id = Column(
        Integer, ForeignKey("media.id", ondelete="SET NULL")
    )
    bio = Column(String(100), nullable=True)

    media_items = relationship(
        "Media",
        back_populates="owner",
        primaryjoin=lambda: User.id == Media.owner_id,
        foreign_keys=lambda: [Media.owner_id],
    )
    posts = relationship("Post", back_populates="owner")
    avatar_media = relationship("Media", foreign_keys=[avatar_media_id])
    profile_cover_media = relationship("Media", foreign_keys=[profile_cover_media_id])
    bookmarks = relationship(
        "Bookmark", back_populates="user", cascade="all, delete-orphan"
    )

    followers = relationship(
        "User",
        secondary=Follow,
        primaryjoin=id == Follow.c.followee_id,
        secondaryjoin=id == Follow.c.follower_id,
        backref="following",
    )

    comments = relationship(
        "Comment",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Comment.user_id",
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String(280), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    owner_id = Column(Integer, ForeignKey("users.id"))
    media_id = Column(Integer, ForeignKey("media.id", ondelete="SET NULL"))

    media = relationship("Media")
    owner = relationship("User", back_populates="posts")
    likes = relationship(
        "Like",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    retweets = relationship(
        "Retweet",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    bookmarks = relationship(
        "Bookmark",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    comments = relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan",
    )


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind = Column(String(20), nullable=False)  # "post_image", "avatar", "profile_cover"
    status = Column(String(20), nullable=False, default="pending")
    bucket = Column(String(255), nullable=False)
    object_key = Column(String(512), nullable=False, unique=True, index=True)
    content_type = Column(String(128), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    public_url = Column(String(1024), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship(
        "User",
        back_populates="media_items",
        primaryjoin=lambda: Media.owner_id == User.id,
        foreign_keys=lambda: [Media.owner_id],
    )


class Like(Base):
    __tablename__ = "likes"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    post_id = Column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )

    user = relationship("User")
    post = relationship("Post", back_populates="likes")


class Retweet(Base):
    __tablename__ = "retweets"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    post_id = Column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    post = relationship("Post", back_populates="retweets")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    post_id = Column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="bookmarks")
    post = relationship("Post", back_populates="bookmarks")


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        Index(
            "ix_comments_post_parent_sort",
            "post_id",
            "parent_id",
            "like_count",
            "created_at",
            "id",
        ),
        Index(
            "ix_comments_parent_sort",
            "parent_id",
            "like_count",
            "created_at",
            "id",
        ),
        Index("ix_comments_reply_to_comment", "reply_to_comment_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    parent_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    reply_to_comment_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reply_to_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    content = Column(String(400), nullable=False)
    like_count = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="comments", foreign_keys=[user_id])
    post = relationship("Post", back_populates="comments")
    parent = relationship(
        "Comment", remote_side=[id], foreign_keys=[parent_id], backref="replies"
    )
    reply_to_comment = relationship(
        "Comment", remote_side=[id], foreign_keys=[reply_to_comment_id]
    )
    reply_to_user = relationship("User", foreign_keys=[reply_to_user_id])

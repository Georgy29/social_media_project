from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table
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

    media_items = relationship(
        "Media",
        back_populates="owner",
        primaryjoin=lambda: User.id == Media.owner_id,
        foreign_keys=lambda: [Media.owner_id],
    )
    posts = relationship("Post", back_populates="owner")
    avatar_media = relationship("Media", foreign_keys=[avatar_media_id])
    profile_cover_media = relationship("Media", foreign_keys=[profile_cover_media_id])

    followers = relationship(
        "User",
        secondary=Follow,
        primaryjoin=id == Follow.c.followee_id,
        secondaryjoin=id == Follow.c.follower_id,
        backref="following",
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String(280), nullable=False)
    timestamp = Column(DateTime, default=datetime.now(timezone.utc))
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
    timestamp = Column(DateTime, default=datetime.now(timezone.utc))

    user = relationship("User")
    post = relationship("Post", back_populates="retweets")

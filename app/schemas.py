from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Literal


class UserBase(BaseModel):
    username: str
    email: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    id: int
    username: str
    created_at: datetime
    followers_count: int
    following_count: int
    posts_count: int
    is_followed_by_viewer: bool = False
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None


class AvatarUpdate(BaseModel):
    media_id: Optional[int] = None


class CoverUpdate(BaseModel):
    media_id: Optional[int] = None


# Token schemas


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Post schemas
class PostBase(BaseModel):
    content: str


class PostCreate(PostBase):
    media_id: Optional[int] = None


class Post(PostBase):
    id: int
    timestamp: datetime
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


class PostWithCounts(Post):
    likes_count: int
    retweets_count: int
    owner_username: str
    owner_avatar_url: Optional[str] = None
    is_liked: bool
    is_retweeted: bool
    media_url: Optional[str] = None


class TimelineItem(BaseModel):
    type: Literal["posts", "retweets"]
    activity_at: datetime
    post: PostWithCounts
    reposted_at: Optional[datetime] = None


class PostUpdate(BaseModel):
    content: str

    model_config = ConfigDict(from_attributes=True)


# Like schema


class Like(BaseModel):
    user_id: str
    post_id: str

    model_config = ConfigDict(from_attributes=True)


# Retweet schema
class Retweet(BaseModel):
    user_id: str
    post_id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class MediaPresignRequest(BaseModel):
    filename: Optional[str] = None
    content_type: str
    size_bytes: int
    kind: Literal["post_image", "avatar", "profile_cover"]


class MediaPresignResponse(BaseModel):
    media_id: int
    upload_url: str
    public_url: str


class MediaCompleteResponse(BaseModel):
    media_id: int
    status: str
    public_url: str

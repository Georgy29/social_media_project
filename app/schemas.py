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

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    id: int
    username: str
    created_at: datetime
    followers_count: int
    following_count: int
    posts_count: int

    model_config = ConfigDict(from_attributes=True)


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
    pass


class Post(PostBase):
    id: int
    timestamp: datetime
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


class PostWithCounts(Post):
    likes_count: int
    retweets_count: int
    owner_username: str
    is_liked: bool
    is_retweeted: bool


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

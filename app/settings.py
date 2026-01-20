import os
from pathlib import Path

from dotenv import load_dotenv

# Load repo-root .env (sibling of the app/ directory).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./microblog.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
CORS_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")

S3_BUCKET = os.getenv("S3_BUCKET")
S3_PUBLIC_PREFIX = os.getenv("S3_PUBLIC_PREFIX", "public/")
S3_PUBLIC_BASE_URL = os.getenv("S3_PUBLIC_BASE_URL")

MEDIA_MAX_BYTES_POST = int(os.getenv("MEDIA_MAX_BYTES_POST", "5242880"))
MEDIA_MAX_BYTES_AVATAR = int(os.getenv("MEDIA_MAX_BYTES_AVATAR", "2097152"))

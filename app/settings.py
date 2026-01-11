# app/settings.py
import os
from dotenv import load_dotenv

load_dotenv()  # loads .env from current working dir by default

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./microblog.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
CORS_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

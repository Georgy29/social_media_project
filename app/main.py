from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import settings

from .routers import users, posts, auth


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(posts.router)

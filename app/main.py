from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import settings

from .database import engine
from .models import Base
from .routers import users, posts, auth



Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    alllow_headers=["*"],   
)

# Include routers
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(posts.router)

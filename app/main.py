from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from . import settings

from .routers import users, posts, auth, admin, media, bookmarks, comments

from .rate_limit import limiter, rate_limit_exceeded_handler


app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Optional-auth endpoints should allow both authenticated and anonymous access.
    for path in ("/users/{username}", "/users/{username}/timeline"):
        operation = schema.get("paths", {}).get(path, {}).get("get")
        if operation is None:
            continue
        if "security" in operation:
            operation["security"] = [{"OAuth2PasswordBearer": []}, {}]

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi

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
app.include_router(admin.router)
app.include_router(media.router)
app.include_router(bookmarks.router)
app.include_router(comments.router)

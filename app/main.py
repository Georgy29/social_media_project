from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from . import settings

from .routers import users, posts, auth, admin, media


app = FastAPI()


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

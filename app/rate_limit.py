from __future__ import annotations

from typing import Any, Callable, TypeVar

from fastapi import Request
from fastapi.responses import JSONResponse

from . import settings

T = TypeVar("T", bound=Callable[..., Any])


class _NoopLimiter:
    def limit(self, *_args: Any, **_kwargs: Any) -> Callable[[T], T]:
        def decorator(func: T) -> T:
            return func

        return decorator

def _rate_limit_key(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"

    from slowapi.util import get_remote_address

    return f"ip:{get_remote_address(request)}"


if settings.RATE_LIMIT_ENABLED:
    from slowapi import Limiter

    limiter = Limiter(
        key_func=_rate_limit_key,
        default_limits=["120/minute"],
        storage_uri=settings.RATE_LIMIT_STORAGE_URI,
        strategy="moving-window",
    )
else:
    limiter = _NoopLimiter()


def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    headers = getattr(exc, "headers", None) or {}
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please retry later."},
        headers=headers,
    )

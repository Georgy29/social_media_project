from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import auth, exceptions, models
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

db_dependency = Annotated[Session, Depends(get_db)]


@router.delete("/posts/{post_id}", status_code=204)
def admin_delete_post(
    post_id: int,
    db: db_dependency,
    _: models.User = Depends(auth.require_admin),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        exceptions.raise_not_found_exception("Post not found")
    db.delete(post)
    db.commit()
    return

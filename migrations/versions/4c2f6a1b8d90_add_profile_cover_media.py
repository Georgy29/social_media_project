"""add profile cover media

Revision ID: 4c2f6a1b8d90
Revises: 3f7f8a5cfc0f
Create Date: 2026-01-19 06:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4c2f6a1b8d90"
down_revision: Union[str, None] = "3f7f8a5cfc0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("profile_cover_media_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_users_profile_cover_media_id",
        "users",
        "media",
        ["profile_cover_media_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_users_profile_cover_media_id",
        "users",
        type_="foreignkey",
    )
    op.drop_column("users", "profile_cover_media_id")

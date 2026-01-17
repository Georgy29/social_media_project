"""add users.is_admin

Revision ID: 1b2c3d4e5f6a
Revises: 9c1d8f7b1f2a
Create Date: 2026-01-17
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1b2c3d4e5f6a"
down_revision = "9c1d8f7b1f2a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.alter_column("users", "is_admin", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_admin")


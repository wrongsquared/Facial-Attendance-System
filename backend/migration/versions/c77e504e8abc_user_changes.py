"""User_changes

Revision ID: c77e504e8abc
Revises: 0eac8a1d56c1
Create Date: 2026-01-28 18:10:29.480069

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c77e504e8abc'
down_revision: Union[str, Sequence[str], None] = '0eac8a1d56c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

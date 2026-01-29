"""notif_md

Revision ID: 6f9042da3a9e
Revises: 80913880056e
Create Date: 2026-01-27 16:41:16.747407

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f9042da3a9e'
down_revision: Union[str, Sequence[str], None] = '80913880056e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add a JSONB column called 'meta_data' to store flexible details
    op.add_column('studentnotifications', sa.Column('meta_data', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('studentnotifications', 'meta_data')

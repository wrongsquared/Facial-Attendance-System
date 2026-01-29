"""attdcheck_status

Revision ID: 0eac8a1d56c1
Revises: 6f9042da3a9e
Create Date: 2026-01-27 22:57:07.100469

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0eac8a1d56c1'
down_revision: Union[str, Sequence[str], None] = '6f9042da3a9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add column as nullable first
    op.add_column('attdcheck', sa.Column('status', sa.String(length=20), nullable=True))
    
    # 2. Backfill existing rows (Assume everyone currently in the table is 'Present')
    op.execute("UPDATE attdcheck SET status = 'Present' WHERE status IS NULL")
    
    # 3. Make it non-nullable now that data is fixed
    op.alter_column('attdcheck', 'status', nullable=False)

def downgrade() -> None:
    op.drop_column('attdcheck', 'status')
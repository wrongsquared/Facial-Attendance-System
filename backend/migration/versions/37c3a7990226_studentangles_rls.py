"""studentangles_RLS

Revision ID: 37c3a7990226
Revises: bc6da4a655cc
Create Date: 2026-02-12 03:08:55.590573

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37c3a7990226'
down_revision: Union[str, Sequence[str], None] = 'bc6da4a655cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure RLS is enabled
    op.execute('ALTER TABLE studentangles ENABLE ROW LEVEL SECURITY;')

    # 2. Drop the existing restricted policy
    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles;')

    # 3. Create the robust "FOR ALL" policy
    # USING: Filters what you can see (SELECT/UPDATE/DELETE)
    # WITH CHECK: Filters what you can put in (INSERT/UPDATE)
    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR ALL
        TO authenticated
        USING (auth.uid() = "studentID")
        WITH CHECK (auth.uid() = "studentID");
    """)

def downgrade() -> None:
    # Revert to a basic SELECT-only policy if we roll back
    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles;')
    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = "studentID");
    """)
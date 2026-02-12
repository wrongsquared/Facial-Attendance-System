"""photoangle_pk

Revision ID: 29549c1ba6b9
Revises: 37c3a7990226
Create Date: 2026-02-12 04:04:22.084219

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '29549c1ba6b9'
down_revision: Union[str, Sequence[str], None] = '37c3a7990226'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles;')

    op.execute('ALTER TABLE studentangles DROP CONSTRAINT IF EXISTS pk_studentangles CASCADE;')
    op.execute('ALTER TABLE studentangles DROP CONSTRAINT IF EXISTS studentangles_pkey CASCADE;')

    op.create_primary_key(
        "pk_studentangles", 
        "studentangles", 
        ["studentID", "photoangle"]
    )

    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR ALL TO authenticated
        USING (auth.uid() = "studentID")
        WITH CHECK (auth.uid() = "studentID");
    """)


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles;')
    op.drop_constraint("pk_studentangles", "studentangles", type_="primary")
    
    op.create_primary_key("pk_studentangles", "studentangles", ["studentID"])
    
    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR SELECT TO authenticated
        USING (auth.uid() = "studentID");
    """)
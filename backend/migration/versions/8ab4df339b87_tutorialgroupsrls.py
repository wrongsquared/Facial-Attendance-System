"""tutorialGroupsRLS

Revision ID: 8ab4df339b87
Revises: 445984d0df2d
Create Date: 2026-02-10 12:57:51.550863

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8ab4df339b87'
down_revision: Union[str, Sequence[str], None] = '445984d0df2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add RLS Policies."""
    # 1. Enable RLS
    op.execute('ALTER TABLE tutorialgroups ENABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE studenttutorialgroups ENABLE ROW LEVEL SECURITY;')

    # 2. Create the Policies
    op.execute("""
        CREATE POLICY "Lecturer Group Access" ON tutorialgroups FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM lecmods WHERE "lecModID" = tutorialgroups."lecModID" AND "lecturerID" = auth.uid()));
    """)
    op.execute("""
        CREATE POLICY "Student Group Access" ON tutorialgroups FOR SELECT TO authenticated
        USING (EXISTS (
            SELECT 1 FROM studenttutorialgroups stg 
            JOIN studentmodules sm ON stg."studentModulesID" = sm."studentModulesID" 
            WHERE stg."tutorialGroupID" = tutorialgroups."tutorialGroupsID" AND sm."studentID" = auth.uid()
        ));
    """)
    op.execute("""
        CREATE POLICY "Lecturer Member Access" ON studenttutorialgroups FOR SELECT TO authenticated
        USING (EXISTS (
            SELECT 1 FROM tutorialgroups tg JOIN lecmods lm ON tg."lecModID" = lm."lecModID" 
            WHERE tg."tutorialGroupsID" = studenttutorialgroups."tutorialGroupID" AND lm."lecturerID" = auth.uid()
        ));
    """)
    op.execute("""
        CREATE POLICY "Student Member Access" ON studenttutorialgroups FOR SELECT TO authenticated
        USING (EXISTS (
            SELECT 1 FROM studentmodules sm 
            WHERE sm."studentModulesID" = studenttutorialgroups."studentModulesID" AND sm."studentID" = auth.uid()
        ));
    """)

def downgrade() -> None:
    """Remove RLS Policies only."""
    # DROP only what this file created
    op.execute('DROP POLICY IF EXISTS "Lecturer Group Access" ON tutorialgroups;')
    op.execute('DROP POLICY IF EXISTS "Student Group Access" ON tutorialgroups;')
    op.execute('DROP POLICY IF EXISTS "Lecturer Member Access" ON studenttutorialgroups;')
    op.execute('DROP POLICY IF EXISTS "Student Member Access" ON studenttutorialgroups;')
    
    # Disable RLS (Optional, but good practice)
    op.execute('ALTER TABLE tutorialgroups DISABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE studenttutorialgroups DISABLE ROW LEVEL SECURITY;')
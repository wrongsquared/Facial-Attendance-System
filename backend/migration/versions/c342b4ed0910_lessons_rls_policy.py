"""lessons_rls_policy

Revision ID: c342b4ed0910
Revises: 8ab4df339b87
Create Date: 2026-02-10 16:11:38.686011

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c342b4ed0910'
down_revision: Union[str, Sequence[str], None] = '8ab4df339b87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('DROP POLICY IF EXISTS "Students can view their lessons" ON lessons;')
    op.execute("""
        CREATE POLICY "Students can view their lessons" ON lessons
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM studentmodules sm
                JOIN lecmods lm ON sm."modulesID" = lm."moduleID"
                WHERE lm."lecModID" = lessons."lecModID"
                AND sm."studentID" = auth.uid()
                AND (
                    -- CASE A: It's a Lecture (Everyone in the module sees it)
                    lessons."tutorialGroupID" IS NULL
                    OR
                    -- CASE B: It's a Tutorial (Only members of that group see it)
                    EXISTS (
                        SELECT 1 FROM studenttutorialgroups stg
                        WHERE stg."tutorialGroupID" = lessons."tutorialGroupID"
                        AND stg."studentModulesID" = sm."studentModulesID"
                    )
                )
            )
        );
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DROP POLICY IF EXISTS "Students can view their lessons" ON lessons;')

"""tutorialGroups

Revision ID: 445984d0df2d
Revises: b2af5dbf09aa
Create Date: 2026-02-10 12:41:33.849105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '445984d0df2d'
down_revision: Union[str, Sequence[str], None] = 'b2af5dbf09aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.create_table('tutorialgroups',
        sa.Column('tutorialGroupsID', sa.Integer(), nullable=False),
        sa.Column('lecModID', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['lecModID'], ['lecmods.lecModID'], name=op.f('fk_tutorialgroups_lecModID_lecmods')),
        sa.PrimaryKeyConstraint('tutorialGroupsID', name=op.f('pk_tutorialgroups'))
    )
    op.create_table('studenttutorialgroups',
        sa.Column('sTutorialGroupsID', sa.Integer(), nullable=False),
        sa.Column('studentModulesID', sa.Integer(), nullable=False),
        sa.Column('tutorialGroupID', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['studentModulesID'], ['studentmodules.studentModulesID'], name=op.f('fk_studenttutorialgroups_studentModulesID_studentmodules')),
        sa.ForeignKeyConstraint(['tutorialGroupID'], ['tutorialgroups.tutorialGroupsID'], name=op.f('fk_studenttutorialgroups_tutorialGroupID_tutorialgroups')),
        sa.PrimaryKeyConstraint('sTutorialGroupsID', name=op.f('pk_studenttutorialgroups'))
    )


    op.add_column('lessons', sa.Column('tutorialGroupID', sa.Integer(), nullable=True))
    op.create_foreign_key(op.f('fk_lessons_tutorialGroupID_tutorialgroups'), 'lessons', 'tutorialgroups', ['tutorialGroupID'], ['tutorialGroupsID'])

    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles;')


    op.drop_column('studentangles', 'photoangle')
    op.drop_column('studentangles', 'imagepath')
    op.drop_column('studentangles', 'studentid')
    op.drop_column('studentangles', 'updatedat')


    op.add_column('studentangles', sa.Column('studentID', sa.UUID(), nullable=False))
    op.add_column('studentangles', sa.Column('photoAngle', sa.String(), nullable=False))
    

    op.create_primary_key("pk_studentangles", "studentangles", ["studentID", "photoAngle"])
    op.create_foreign_key(op.f('fk_studentangles_studentID_students'), 'studentangles', 'students', ['studentID'], ['studentID'])


    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR ALL
        TO authenticated
        USING (auth.uid() = "studentID");
    """)


def downgrade() -> None:

    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles;')
    op.drop_constraint("pk_studentangles", "studentangles", type_="primary")
    op.drop_constraint(op.f('fk_studentangles_studentID_students'), 'studentangles', type_='foreignkey')
    op.drop_column('studentangles', 'photoAngle')
    op.drop_column('studentangles', 'studentID')


    op.add_column('studentangles', sa.Column('studentid', sa.UUID(), nullable=False))
    op.add_column('studentangles', sa.Column('photoangle', sa.VARCHAR(), nullable=False))
    op.add_column('studentangles', sa.Column('imagepath', sa.TEXT(), nullable=True))
    op.add_column('studentangles', sa.Column('updatedat', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True))

    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR ALL
        USING (auth.uid() = studentid);
    """)

    op.drop_constraint(op.f('fk_lessons_tutorialGroupID_tutorialgroups'), 'lessons', type_='foreignkey')
    op.drop_column('lessons', 'tutorialGroupID')
    op.drop_table('studenttutorialgroups')
    op.drop_table('tutorialgroups')
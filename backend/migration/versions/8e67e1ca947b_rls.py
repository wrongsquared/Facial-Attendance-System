"""RLS

Revision ID: 8e67e1ca947b
Revises: e1ffdf6c5694
Create Date: 2025-12-07 18:00:40.876989

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e67e1ca947b'
down_revision: Union[str, Sequence[str], None] = 'e1ffdf6c5694'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tables = [
        'userprofiles','users','students','admins','lecturers',
        'entleave', 'attdcheck', 'modules','lessons','lecmods',
        'studentmodules', 'courses', 'alembic_version'
        ]

def upgrade() -> None:
    """Upgrade schema."""
    # enable RLS
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

    # userprofiles Policy
    op.execute("""
                CREATE POLICY "Enable Read for Users"
                ON userprofiles FOR SELECT
                TO authenticated
                USING (true)
            """)
    
    # users Policy
    op.execute("""
        CREATE POLICY "Users can manage their own data"
        ON users FOR ALL
        USING (auth.uid() = "userID"); 
    """)

    # students Policy
    op.execute("""
        CREATE POLICY "Students can access their own data"
        ON students FOR ALL
        USING (auth.uid() = "studentID"); 
    """)
    # lecturers Policy
    op.execute("""
        CREATE POLICY "Lecturers can access their own data"
        ON lecturers FOR ALL
        USING (auth.uid() = "lecturerID"); 
    """)
    # admin Policy
    op.execute("""
        CREATE POLICY "Admins see all"
        ON admins FOR ALL
        USING (auth.uid() = "adminID"); 
    """)

    # Course policy
    op.execute('CREATE POLICY "Authenticated can view courses" ON courses FOR SELECT TO authenticated USING (true)')
    # Module Policy
    op.execute('CREATE POLICY "Authenticated can view modules" ON modules FOR SELECT TO authenticated USING (true)')

    # Student Data
    op.execute('CREATE POLICY "Student sees own modules" ON studentmodules FOR ALL USING (auth.uid() = "studentID")')
    op.execute('CREATE POLICY "Student sees own attendance" ON attdcheck FOR ALL USING (auth.uid() = "studentID")')
    op.execute('CREATE POLICY "Student sees own entry/leave" ON entleave FOR ALL USING (auth.uid() = "studentID")')

    # Lecturer Data
    op.execute('CREATE POLICY "Lecturer manages own modules" ON lecmods FOR ALL USING (auth.uid() = "lecturerID")')

    # Lessons (Complex)
    op.execute('CREATE POLICY "Everyone views lessons" ON lessons FOR SELECT TO authenticated USING (true)')
    op.execute("""
        CREATE POLICY "Lecturers manage their lessons" ON lessons FOR ALL 
        USING (EXISTS (SELECT 1 FROM lecmods WHERE lecmods."lecModID" = lessons."lecModID" AND lecmods."lecturerID" = auth.uid()))
    """)

    pass


def downgrade() -> None:
    """Downgrade schema."""

    # Drop Policy userprofile
    op.execute('DROP POLICY IF EXISTS "Enable Read for Users" ON userprofiles')
    
    # Drop Policy users
    op.execute('DROP POLICY IF EXISTS "Users can manage their own data" ON users')

    #Drop Policy students
    op.execute('DROP POLICY IF EXISTS "Students can access their own data" ON students')
    op.execute('DROP POLICY IF EXISTS "Lecturers can access their own data" ON lecturers')

    #Drop Policy admin
    op.execute('DROP POLICY IF EXISTS "Admins see all" ON admins')
    op.execute('DROP POLICY IF EXISTS "Authenticated can view courses" ON courses')
    op.execute('DROP POLICY IF EXISTS "Authenticated can view modules" ON modules')
    op.execute('DROP POLICY IF EXISTS "Student sees own modules" ON studentmodules')
    op.execute('DROP POLICY IF EXISTS "Student sees own attendance" ON attdcheck')
    op.execute('DROP POLICY IF EXISTS "Student sees own entry/leave" ON entleave')
    op.execute('DROP POLICY IF EXISTS "Lecturer manages own modules" ON lecmods')
    op.execute('DROP POLICY IF EXISTS "Everyone views lessons" ON lessons')
    op.execute('DROP POLICY IF EXISTS "Lecturers manage their lessons" ON lessons')   

    for table in tables:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    pass

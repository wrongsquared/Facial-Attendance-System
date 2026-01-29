"""RLS

Revision ID: 52bc9c16eea1
Revises: ef170c08dab6
Create Date: 2026-01-22 04:50:49.518414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '52bc9c16eea1'
down_revision: Union[str, Sequence[str], None] = 'ef170c08dab6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALL_TABLES = [
    "university", "campus", "userprofiles", 
    "users", "pmanager", "admins", "lecturers", "students",
    "entleave", "attdcheck", "modules", "lessons", 
    "lecmods", "studentmodules", "courses", "studentangles",
    "generated_reports"
]

def upgrade() -> None:
    """Upgrade schema."""
    for table in ALL_TABLES:
        # We use a safe PL/PGSQL block to enable RLS without crashing if it's already on
        op.execute(f"""
            DO $$ 
            BEGIN 
                EXECUTE 'ALTER TABLE "' || '{table}' || '" ENABLE ROW LEVEL SECURITY'; 
            END $$;
        """)

    # =================================================================
    # 2. CATALOG TABLES (University, Campus, Courses, Modules, Profiles)
    # =================================================================
    # Strategy: "Open for Business". Anyone logged in needs to see these 
    # to navigate the app, but they cannot edit them (unless they are specific admins).
    
    public_read_tables = ["university", "campus", "courses", "modules", "userprofiles"]
    
    for table in public_read_tables:
        # Drop old policies to ensure a clean slate
        op.execute(f'DROP POLICY IF EXISTS "Authenticated Read" ON "{table}"')
        op.execute(f"""
            CREATE POLICY "Authenticated Read" ON "{table}"
            FOR SELECT TO authenticated USING (true);
        """)

    # =================================================================
    # 3. THE BASE USER TABLE (users)
    # =================================================================
    # Strategy: "I can see myself".
    # Note: We keep this strict. Admins look up 'students' table, not 'users' table mostly.
    
    op.execute('DROP POLICY IF EXISTS "Users own data" ON users')
    op.execute("""
        CREATE POLICY "Users own data" ON users
        FOR ALL USING (auth.uid() = "userID");
    """)

    # =================================================================
    # 4. HIERARCHY TABLES (Admins, Lecturers, Students, PManager)
    # =================================================================
    
    # --- Platform Managers ---
    # Can see themselves. 
    op.execute('DROP POLICY IF EXISTS "PM Self Access" ON pmanager')
    op.execute("""
        CREATE POLICY "PM Self Access" ON pmanager
        FOR ALL USING (auth.uid() = "pmanagerID");
    """)

    # --- Admins ---
    # Can see themselves. 
    # (Future: PManagers can see Admins of their Uni - requires complex join, skipping for now)
    op.execute('DROP POLICY IF EXISTS "Admin Self Access" ON admins')
    op.execute("""
        CREATE POLICY "Admin Self Access" ON admins
        FOR ALL USING (auth.uid() = "adminID");
    """)

    # --- Lecturers ---
    # 1. Lecturer can see self.
    # 2. Campus Admin can see Lecturer (Matching CampusID).
    op.execute('DROP POLICY IF EXISTS "Lecturer Hierarchy Access" ON lecturers')
    op.execute("""
        CREATE POLICY "Lecturer Hierarchy Access" ON lecturers
        FOR ALL USING (
            -- I am the lecturer
            auth.uid() = "lecturerID"
            OR
            -- I am an Admin of the same campus
            EXISTS (
                SELECT 1 FROM admins 
                WHERE admins."adminID" = auth.uid() 
                AND admins."campusID" = lecturers."campusID"
            )
        );
    """)

    # --- Students ---
    # 1. Student can see self.
    # 2. Campus Admin can see Student.
    op.execute('DROP POLICY IF EXISTS "Student Hierarchy Access" ON students')
    op.execute("""
        CREATE POLICY "Student Hierarchy Access" ON students
        FOR ALL USING (
            auth.uid() = "studentID"
            OR
            EXISTS (
                SELECT 1 FROM admins 
                WHERE admins."adminID" = auth.uid() 
                AND admins."campusID" = students."campusID"
            )
        );
    """)

    # =================================================================
    # 5. OPERATIONAL DATA (Lessons, Attendance, Reports)
    # =================================================================

    # --- Student Angles (Sensitive AI Data) ---
    # Strict: Only the Student and the Admin (for debugging)
    op.execute('DROP POLICY IF EXISTS "Angle Access" ON studentangles')
    op.execute("""
        CREATE POLICY "Angle Access" ON studentangles
        FOR ALL USING (
            auth.uid() = "studentID"
            OR
            EXISTS (
                SELECT 1 FROM admins 
                JOIN students s ON s."campusID" = admins."campusID"
                WHERE admins."adminID" = auth.uid() 
                AND s."studentID" = studentangles."studentID"
            )
        );
    """)

    # --- Generated Reports ---
    # Only the Lecturer who created it can see it
    op.execute('DROP POLICY IF EXISTS "Report Owner" ON generated_reports')
    op.execute("""
        CREATE POLICY "Report Owner" ON generated_reports
        FOR ALL USING (auth.uid() = "lecturerID");
    """)

    # --- Attendance Check (AttdCheck) ---
    # 1. Student sees their own.
    # 2. Lecturer sees records for Lessons they own.
    op.execute('DROP POLICY IF EXISTS "Attendance Visibility" ON attdcheck')
    op.execute("""
        CREATE POLICY "Attendance Visibility" ON attdcheck
        FOR ALL USING (
            -- I am the student
            auth.uid() = "studentID"
            OR
            -- I am the Lecturer teaching this lesson
            EXISTS (
                SELECT 1 FROM lessons l
                JOIN lecmods lm ON l."lecModID" = lm."lecModID"
                WHERE l."lessonID" = attdcheck."lessonID"
                AND lm."lecturerID" = auth.uid()
            )
        );
    """)

    # --- Student Modules (Enrollment) ---
    # Student sees own, Lecturer sees their class list
    op.execute('DROP POLICY IF EXISTS "Enrollment Visibility" ON studentmodules')
    op.execute("""
        CREATE POLICY "Enrollment Visibility" ON studentmodules
        FOR SELECT USING (
            -- I am the student
            auth.uid() = "studentID"
            OR
            -- I am a lecturer teaching this module
            EXISTS (
                SELECT 1 FROM lecmods 
                WHERE lecmods."moduleID" = studentmodules."modulesID"
                AND lecmods."lecturerID" = auth.uid()
            )
        );
    """)
    pass
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    for table in ALL_TABLES:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###

"""RLS_for_avatars

Revision ID: ed2562d99b28
Revises: 52bc9c16eea1
Create Date: 2026-01-22 04:57:59.415950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed2562d99b28'
down_revision: Union[str, Sequence[str], None] = '52bc9c16eea1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # Authenticated users can upload, BUT only if:
    # 1. It is the 'avatars' bucket.
    # 2. The folder name matches their User ID.
    #    (Assumes file path: "avatars/{uuid}/filename.jpg")
    op.execute("""
        CREATE POLICY "Users can upload their own avatar"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'avatars' AND 
            (storage.foldername(name))[1] = auth.uid()::text
        );
    """)


    # Users can delete/replace files in their own folder.
    op.execute("""
        CREATE POLICY "Users can update/delete their own avatar"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'avatars' AND 
            (storage.foldername(name))[1] = auth.uid()::text
        );
    """)
    
    op.execute("""
        CREATE POLICY "Users can delete their own avatar"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'avatars' AND 
            (storage.foldername(name))[1] = auth.uid()::text
        );
    """)


    # Any authenticated user (Student/Lecturer) can view 
    # ANY image in the avatars bucket. 
    op.execute("""
        CREATE POLICY "Authenticated users can view avatars"
        ON storage.objects FOR SELECT
        TO authenticated
        USING ( bucket_id = 'avatars' );
    """)


def downgrade() -> None:
    # Drop policies in reverse order
    op.execute('DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects')
    op.execute('DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects')
    op.execute('DROP POLICY IF EXISTS "Users can update/delete their own avatar" ON storage.objects')
    op.execute('DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects')

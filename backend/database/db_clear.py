import os
from sqlalchemy import text
from sqlalchemy.orm import Session
from supabase import Client
from db_config import SessionLocal
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def clear_db(db: Session, spbse: Client):
    print("Clearing the database....\n")
    db.execute(text("SET session_replication_role = 'replica';"))  # Disable foreign key constraints

    table_names = db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public';")).scalars().all()
    for table in table_names:  # Truncate all tables
        if table not in ["alembic_version"]:
            db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
    # this code clears the Supabase auth tables, y to clear auth.user
    yn_storage = input(f"\nClear all files in Supabase 'avatar' bucket? (Y/y to confirm): ")
    if yn_storage.lower() == "y":
        try:
            # List all files in the bucket
            files = spbse.storage.from_("avatars").list()
            
            if files:
                # Extract file names (excluding the .emptyFolderPlaceholder if it exists)
                file_names = [f['name'] for f in files if f['name'] != '.emptyFolderPlaceholder']
                
                if file_names:
                    spbse.storage.from_("avatar").remove(file_names)
                    print(f"  - Deleted {len(file_names)} files from 'avatars' bucket.")
                else:
                    print("  - Bucket was already empty.")
            else:
                print("  - No files found in bucket.")
        except Exception as e:
            print(f"  - Warning: Could not clear storage: {e}")

    yn = input(f"Clear Supabase Auth.user Tables? Input (Y or y) to confirm \n")
    if yn.lower() == "y":
        try:
            db.execute(text("TRUNCATE TABLE auth.users CASCADE;"))
        except Exception as e:
            print(f"  - Warning: Could not clear auth.users: {e}")

    db.execute(text("SET session_replication_role = 'origin';"))  # Re-enable foreign key constraints
    db.commit()

if __name__ == "__main__":
    db_session: Session = SessionLocal()

    try:
        spbse: Client = create_client(os.getenv("SPBASE_URL"), os.getenv("SPBASE_SKEY"))
        clear_db(db_session, spbse)
    except:
         print("Clearing of Database Failed")
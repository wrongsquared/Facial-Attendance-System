import os
from sqlalchemy import text
from sqlalchemy.orm import Session
from supabase import Client
from db_config import SessionLocal
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def clear_db(db: Session, spbse: Client):
    
    try:
        db.execute(text("SET session_replication_role = 'replica';"))

        table_names = db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public';")).scalars().all()
        for table in table_names:
            if table not in ["alembic_version"]:
                db.execute(text(f"TRUNCATE TABLE \"{table}\" RESTART IDENTITY CASCADE;"))
                print(f"Cleared table: {table}")

        bucket_name = "avatars"
        yn_storage = input(f"\nClear all files in Supabase '{bucket_name}' bucket? (Y/y to confirm): ")
        if yn_storage.lower() == "y":
            try:
                files = spbse.storage.from_(bucket_name).list()
                if files:
                    file_names = [f['name'] for f in files if f['name'] != '.emptyFolderPlaceholder']
                    if file_names:
                        spbse.storage.from_(bucket_name).remove(file_names)
                        print(f"Deleted {len(file_names)} top-level items from '{bucket_name}'.")
                else:
                    print(f"  [-] Bucket '{bucket_name}' is already empty.")
            except Exception as e:
                print(f"Storage error (Check bucket name): {e}")

        # Clear Supabase Auth Tables
        yn_auth = input(f"\nClear ALL Supabase Users (Auth.user)? (Y/y to confirm): ")
        if yn_auth.lower() == "y":
            try:
                db.execute(text("TRUNCATE TABLE auth.users CASCADE;"))
                print("Auth.users table cleared.")
            except Exception as e:
                print(f"Could not truncate auth.users (Permission issue): {e}")

        db.commit()

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        db.rollback()
    finally:
        db.execute(text("SET session_replication_role = 'origin';"))
        print("\n--- Database Reset Complete ---")

if __name__ == "__main__":
    db_session: Session = SessionLocal()

    try:
        spbse: Client = create_client(os.getenv("SPBASE_URL"), os.getenv("SPBASE_SKEY"))
        clear_db(db_session, spbse)
    except:
         print("Clearing of Database Failed")
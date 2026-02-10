import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

load_dotenv()


DATABASE_URL = os.getenv("SPDB_URL")
engine = create_engine(DATABASE_URL, poolclass=NullPool)
connection = engine.connect()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

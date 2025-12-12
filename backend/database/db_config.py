import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

load_dotenv()

# db_user = os.getenv("PGDB_USER")
# db_pass = os.getenv("PGDB_PASSWORD")
# db_host = os.getenv("PGDB_HOST")
# db_port = os.getenv("PGDB_PORT", "5432") # Use 5432 as a default port if not set
# db_name = os.getenv("PGDB_NAME")

# DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
#Cloud Platform
DATABASE_URL = os.getenv("SPDB_URL")
engine = create_engine(DATABASE_URL, echo = True, pool_size = 3, max_overflow = 10, pool_timeout = 30, pool_pre_ping = True, pool_recycle = 600)
connection = engine.connect()

#Locally
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from typing import Union
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

#Install all required libraries from the requirements.txt file
#pip install -r /path/to/requirements.txt
#create a .venv, start a .venv using

# .\.venv\Scripts\Activate.ps1
#docker compose up --build
# fastapi dev main.py

#To update the schema use alembic
#alembic revision --autogenerate -m "save name"
#alembic upgrade head

#To deactivate the virtual environment, just use
#deactivate

#docker compose down -v (Nukes the entire database!)
# Format: postgresql+psycopg2://user:password@host:port/dbname


DATABASE_URL = "postgresql+psycopg2://user:password@localhost:5433/FYP_PG_Container"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float
    is_offer: Union[bool, None] = None


@app.get("/")
def read_root(db: Session= Depends(get_db)):
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
    return {"Message": "Hello World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_name": item.name, "item_id": item_id}
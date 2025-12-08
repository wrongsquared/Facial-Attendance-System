import os 
from supabase import create_client, Client
from typing import Union
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from database.db_config import get_db

app = FastAPI()
sp_url: str = os.getenv("SPBASE_URL")
sp_key: str = os.getenv("SPBASE_SKEY")

supabase: Client = create_client(sp_url, sp_key)

class Item(BaseModel):
    name: str
    price: float
    is_offer: Union[bool, None] = None


@app.get("/")
def read_root(db: Session= Depends(get_db)):
    response = (supabase.table("users").select("*").execute())
    return {"Message": response}

@app.post("/")
def push_acc(db: Session= Depends(get_db)):
    try:
        response = supabase.auth.sign_up(
            {
                "email": "email@example.com",
                "password": "password",
            }
        )

        supabase.table("users").insert({"id"})
        return {"status": "Success", "id": response.users.id, "email": response.users.email}
    except Exception as e:
        return {"error": str(e)} 

@app.get("/madeacc")
def get_acc(db: Session= Depends(get_db)):
    response = (supabase.table("users").select("email").eq("email@example.com").execute())

    return {"Message": response}

@app.get("/delacc")

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_name": item.name, "item_id": item_id}
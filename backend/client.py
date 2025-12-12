from supabase import create_client, Client
import os 

sp_url: str = os.getenv("SPBASE_URL")
sp_key: str = os.getenv("SPBASE_KEY")
sp_skey: str = os.getenv("SPBASE_SKEY")

supabase: Client = create_client(sp_url, sp_key)
supabase_adm: Client = create_client(sp_url, sp_skey)
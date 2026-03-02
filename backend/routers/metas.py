from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from pydantic import BaseModel
from db.supabase_client import get_supabase_client
from core.deps import get_current_user_token

router = APIRouter()

class MetaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    valor_objetivo: float
    valor_atual: float = 0
    data_inicio: str
    data_fim: str
    cliente_id: Optional[str] = None

@router.get("/")
async def list_metas(
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    result = supabase.table("metas").select("*")\
        .eq("empresa_id", x_empresa_id)\
        .order("data_fim").execute()
    return result.data

@router.post("/")
async def create_meta(
    meta: MetaBase,
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    data = meta.model_dump()
    data["empresa_id"] = x_empresa_id
    
    result = supabase.table("metas").insert(data).execute()
    return result.data[0]

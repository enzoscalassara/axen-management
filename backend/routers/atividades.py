from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from pydantic import BaseModel
from db.supabase_client import get_supabase_client
from core.deps import get_current_user_token

router = APIRouter()

class AtividadeUpdate(BaseModel):
    coluna_id: str
    ordem: Optional[int] = None

@router.get("/colunas")
async def list_colunas(
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    result = supabase.table("colunas_kanban").select("*")\
        .eq("empresa_id", x_empresa_id)\
        .order("ordem").execute()
    return result.data

@router.get("/")
async def list_atividades(
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    result = supabase.table("atividades").select("*")\
        .eq("empresa_id", x_empresa_id)\
        .order("ordem").execute()
    return result.data

@router.patch("/{atividade_id}")
async def update_atividade(
    atividade_id: str,
    update: AtividadeUpdate,
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    result = supabase.table("atividades").update(update.model_dump(exclude_unset=True))\
        .eq("id", atividade_id)\
        .eq("empresa_id", x_empresa_id)\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    
    return result.data[0]

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from pydantic import BaseModel
from db.supabase_client import get_supabase_client
from core.deps import get_current_user_token

router = APIRouter()

class ClienteBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    status: str = "lead"  # lead, ativo, inativo
    origem: Optional[str] = None
    setor: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

@router.get("/")
async def list_clientes(
    status: Optional[str] = None,
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    query = supabase.table("clientes").select("*").eq("empresa_id", x_empresa_id)
    
    if status and status != "todos":
        query = query.eq("status", status)
    
    result = query.order("nome").execute()
    return result.data

@router.get("/{cliente_id}")
async def get_cliente(
    cliente_id: str,
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    result = supabase.table("clientes").select("*")\
        .eq("id", cliente_id)\
        .eq("empresa_id", x_empresa_id)\
        .single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    return result.data

@router.post("/")
async def create_cliente(
    cliente: ClienteCreate,
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    data = cliente.model_dump()
    data["empresa_id"] = x_empresa_id
    
    result = supabase.table("clientes").insert(data).execute()
    return result.data[0]

@router.get("/{cliente_id}/historico")
async def get_cliente_historico(
    cliente_id: str,
    x_empresa_id: str = Header(...),
    token: str = Depends(get_current_user_token)
):
    supabase = get_supabase_client(token)
    # Buscar movimentações financeiras ligadas ao cliente
    result = supabase.table("movimentacoes").select("*")\
        .eq("cliente_id", cliente_id)\
        .eq("empresa_id", x_empresa_id)\
        .order("data", desc=True).execute()
    
    return result.data

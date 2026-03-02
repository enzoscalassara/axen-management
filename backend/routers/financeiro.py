"""
Router Financeiro.
CRUD de movimentações e reembolsos com integração Supabase.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from core.deps import get_empresa_id, get_current_user_token
from db.supabase_client import get_supabase_client
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Schemas Pydantic
class MovimentacaoBase(BaseModel):
    tipo: str
    valor: float
    data: str
    categoria: str
    status: str
    descricao: Optional[str] = None
    cliente_id: Optional[str] = None

class ReembolsoBase(BaseModel):
    valor: float
    responsavel: str
    status: str
    descricao: Optional[str] = None

@router.get("/movimentacoes")
async def listar_movimentacoes(
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token),
    tipo: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
):
    """Lista movimentações filtradas por empresa e filtros opcionais."""
    supabase = get_supabase_client(token)
    query = supabase.table("movimentacoes").select("*").eq("empresa_id", empresa_id)
    
    if tipo:
        query = query.eq("tipo", tipo)
    if status:
        query = query.eq("status", status)
    if categoria:
        query = query.eq("categoria", categoria)
        
    res = query.order("data", desc=True).execute()
    return res.data


@router.post("/movimentacoes")
async def criar_movimentacao(
    mov: MovimentacaoBase,
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token)
):
    """Cria uma nova movimentação financeira."""
    supabase = get_supabase_client(token)
    data = mov.model_dump()
    data["empresa_id"] = empresa_id
    
    res = supabase.table("movimentacoes").insert(data).execute()
    return res.data[0] if res.data else {"message": "Criado"}


@router.get("/reembolsos")
async def listar_reembolsos(
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token)
):
    """Lista reembolsos da empresa."""
    supabase = get_supabase_client(token)
    res = supabase.table("reembolsos").select("*").eq("empresa_id", empresa_id).order("created_at", desc=True).execute()
    return res.data


@router.post("/reembolsos")
async def criar_reembolso(
    reem: ReembolsoBase,
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token)
):
    """Registra um novo reembolso."""
    supabase = get_supabase_client(token)
    data = reem.model_dump()
    data["empresa_id"] = empresa_id
    
    res = supabase.table("reembolsos").insert(data).execute()
    return res.data[0] if res.data else {"message": "Registrado"}


@router.post("/movimentacoes/{mov_id}/confirmar")
async def confirmar_movimentacao(
    mov_id: str, 
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token)
):
    """
    Confirma uma movimentação prevista.
    """
    supabase = get_supabase_client(token)
    res = supabase.table("movimentacoes") \
        .update({"status": "confirmado"}) \
        .eq("id", mov_id) \
        .eq("empresa_id", empresa_id) \
        .execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada ou sem permissão")
        
    return res.data[0]


@router.get("/vencidas")
async def verificar_vencidas(
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token)
):
    """
    Retorna movimentações previstas com data vencida.
    """
    supabase = get_supabase_client(token)
    now = datetime.now().isoformat()
    
    res = supabase.table("movimentacoes") \
        .select("*") \
        .eq("empresa_id", empresa_id) \
        .eq("status", "previsto") \
        .lte("data", now) \
        .execute()
        
    return res.data

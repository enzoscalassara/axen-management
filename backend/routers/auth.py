"""
Router de autenticação.
Gerencia login, logout e verificação de sessão via Supabase Auth.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


from fastapi import APIRouter, HTTPException, Depends
from core.deps import get_current_user

router = APIRouter()


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Retorna dados do usuário autenticado real vindo do Supabase."""
    return current_user


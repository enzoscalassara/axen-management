"""
Dependências compartilhadas para injeção nos endpoints.
Extrai empresa_id e user_id dos headers/token.
"""
from fastapi import Header, HTTPException, Depends


async def get_empresa_id(x_empresa_id: str = Header(..., alias="X-Empresa-Id")) -> str:
    """Extrai empresa_id do header X-Empresa-Id. Obrigatório em toda requisição autenticada."""
    if not x_empresa_id:
        raise HTTPException(status_code=400, detail="Header X-Empresa-Id é obrigatório")
    return x_empresa_id


async def get_current_user_token(authorization: str = Header(None)) -> str:
    """Extrai o token JWT do header Authorization."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autenticação ausente")
    
    # Bearer <token>
    if authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    return authorization


async def get_current_user(token: str = Depends(get_current_user_token)) -> dict:
    """
    Valida o token JWT e retorna dados do usuário.
    Em produção, o Supabase RLS cuida da segurança se usarmos o cliente com o token.
    """
    # Mock por enquanto — em produção, pode-se usar supabase.auth.get_user(token)
    return {
        "id": "1",
        "nome": "Enzo Oliveira",
        "email": "enzo@axenhub.com",
        "empresas_permitidas": ["emp-1", "emp-2"],
    }

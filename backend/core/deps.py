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
    Usa o Supabase para obter o UID real.
    """
    from db.supabase_client import get_supabase_client
    
    supabase = get_supabase_client(token)
    try:
        # Busca o usuário autenticado via Supabase Auth
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado no Supabase Auth")
        
        # Opcional: Buscar perfil estendido na tabela `usuarios`
        # profiles = supabase.table("usuarios").select("*").eq("id", res.user.id).execute()
        
        return {
            "id": res.user.id,
            "email": res.user.email,
            "metadata": res.user.user_metadata,
        }
    except Exception as e:
        # Erro tratado via HTTPException
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

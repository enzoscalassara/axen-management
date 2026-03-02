"""
Router de autenticação.
Gerencia login, logout e verificação de sessão via Supabase Auth.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    """Schema de login."""
    email: str
    senha: str


class LoginResponse(BaseModel):
    """Resposta de login bem-sucedido."""
    token: str
    user: dict


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """
    Autentica o usuário via Supabase Auth.
    Em produção, usa supabase-py para chamar signInWithPassword.
    """
    # TODO: Integrar com Supabase Auth
    # Mock — aceita qualquer credencial para dev
    return LoginResponse(
        token=f"mock-jwt-{payload.email}",
        user={
            "id": "1",
            "nome": "Enzo Oliveira",
            "email": payload.email,
            "empresas_permitidas": ["emp-1", "emp-2"],
        },
    )


@router.get("/me")
async def me():
    """Retorna dados do usuário autenticado."""
    # TODO: Decodificar JWT e buscar perfil no Supabase
    return {
        "id": "1",
        "nome": "Enzo Oliveira",
        "email": "enzo@axenhub.com",
        "empresas_permitidas": ["emp-1", "emp-2"],
    }

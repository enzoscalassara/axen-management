"""
Axen Hub — Backend FastAPI
Ponto de entrada da aplicação.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, dashboard, financeiro, metas, atividades, clientes

app = FastAPI(
    title="Axen Hub API",
    description="API do sistema de gestão empresarial Axen Hub",
    version="1.0.0",
)

# CORS — Permite o frontend Vite em dev (qualquer porta localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(financeiro.router, prefix="/api/financeiro", tags=["Financeiro"])
app.include_router(clientes.router, prefix="/api/clientes", tags=["CRM"])
app.include_router(metas.router, prefix="/api/metas", tags=["Metas"])
app.include_router(atividades.router, prefix="/api/atividades", tags=["Atividades"])


@app.get("/api/health")
async def health():
    """Endpoint de health check."""
    return {"status": "ok", "app": "axen-hub"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

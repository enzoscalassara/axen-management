"""
Router do Dashboard.
Retorna indicadores agregados filtrados por empresa.
"""
from fastapi import APIRouter, Depends
from core.deps import get_empresa_id, get_current_user_token
from db.supabase_client import get_supabase_client
from datetime import datetime

router = APIRouter()


@router.get("/resumo")
async def get_resumo(
    empresa_id: str = Depends(get_empresa_id),
    token: str = Depends(get_current_user_token)
):
    """
    Retorna resumo do dashboard para a empresa selecionada.
    Calcula KPIs reais baseados nas tabelas do Supabase.
    """
    supabase = get_supabase_client(token)
    
    # 1. Saldo Atual (Receitas Confirmadas - Despesas Confirmadas)
    mov_res = supabase.table("movimentacoes") \
        .select("valor, tipo") \
        .eq("empresa_id", empresa_id) \
        .eq("status", "confirmado") \
        .execute()
    
    saldo = 0
    now = datetime.now()
    
    for mov in mov_res.data:
        valor = float(mov["valor"])
        if mov["tipo"] == "entrada":
            saldo += valor
        else:
            saldo -= valor

    # 2. Receita do Mês Atual (Entradas Confirmadas no mês)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime('%Y-%m-%d')
    rec_res = supabase.table("movimentacoes") \
        .select("valor") \
        .eq("empresa_id", empresa_id) \
        .eq("status", "confirmado") \
        .eq("tipo", "entrada") \
        .gte("data", start_of_month) \
        .execute()
    
    receita_mes = sum(float(m["valor"]) for m in rec_res.data)

    # 3. Meta do Mês (Soma das metas em andamento)
    metas_res = supabase.table("metas") \
        .select("valor_alvo") \
        .eq("empresa_id", empresa_id) \
        .eq("status", "em_andamento") \
        .execute()
    
    meta_mes = sum(float(m["valor_alvo"]) for m in metas_res.data)

    # 4. Clientes Ativos
    clientes_res = supabase.table("clientes") \
        .select("id", count="exact") \
        .eq("empresa_id", empresa_id) \
        .eq("status", "ativo") \
        .execute()
    
    clientes_ativos = clientes_res.count or 0

    # 5. Atividades Atrasadas
    atividades_res = supabase.table("atividades") \
        .select("id", count="exact") \
        .eq("empresa_id", empresa_id) \
        .neq("status", "concluida") \
        .lt("prazo", now.isoformat()) \
        .execute()
    
    atividades_atrasadas = atividades_res.count or 0

    return {
        "saldo_atual": saldo,
        "receita_mes": receita_mes,
        "meta_mes": meta_mes,
        "clientes_ativos": clientes_ativos,
        "atividades_atrasadas": atividades_atrasadas,
        "atividades_proximas": 0,
    }

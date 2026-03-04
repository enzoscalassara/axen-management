/**
 * Calcula o progresso de uma meta com base em dados reais (movimentações / clientes).
 *
 * Regra: se a meta tem um tipo/subtipo elegível, o cálculo é SEMPRE feito em tempo real,
 * independentemente do flag `calculo_automatico`. O flag controla apenas se o campo
 * de progresso é editável no formulário.
 *
 * Fórmulas:
 *   - receita_mensal  → (Entradas confirmadas do mês atual) / valor_alvo * 100
 *   - receita_anual   → (Entradas confirmadas do ano atual) / valor_alvo * 100
 *   - total_clientes  → (Clientes ativos) / valor_alvo * 100
 *   - cliente_especifico + financeira → mesma fórmula filtrada por cliente
 *
 * Sem cap de 100% — progresso pode ultrapassar a meta.
 */
export function calcularProgressoAuto(meta: any, clientes: any[], movimentacoes: any[]): number {
    const alvo = Number(meta.valor_alvo || 0);
    if (alvo <= 0) return Math.max(0, meta.progresso || 0);

    const now = new Date();

    /* ── Total de Clientes ── */
    if (meta.tipo_meta === 'clientes' && meta.subtipo === 'total_clientes') {
        const ativos = clientes.filter((c: any) => c.status === 'ativo').length;
        return parseFloat(((ativos / alvo) * 100).toFixed(1));
    }

    /* ── Determinar tipo de cálculo financeiro ── */
    const tipoCalc = meta.tipo_meta === 'clientes' && meta.subtipo === 'cliente_especifico'
        ? meta.acompanhamento_subtipo || meta.acompanhamento_tipo
        : meta.subtipo;

    const clienteFilter = meta.tipo_meta === 'clientes' && meta.subtipo === 'cliente_especifico'
        ? meta.cliente_vinculado_id : null;

    /* Só calcula automaticamente para tipos financeiros reconhecidos */
    if (tipoCalc !== 'receita_mensal' && tipoCalc !== 'receita_anual') {
        return Math.max(0, meta.progresso || 0);
    }

    const movsEntrada = movimentacoes.filter((m: any) =>
        m.tipo === 'entrada' && m.status === 'confirmado'
        && (!clienteFilter || m.origem_cliente_id === clienteFilter)
    );

    if (tipoCalc === 'receita_mensal') {
        const receitaMes = movsEntrada
            .filter((m: any) => {
                if (!m.data) return false;
                const d = new Date(m.data);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((s: number, m: any) => s + Number(m.valor), 0);
        return parseFloat(((receitaMes / alvo) * 100).toFixed(1));
    }

    if (tipoCalc === 'receita_anual') {
        const receitaAno = movsEntrada
            .filter((m: any) => m.data && new Date(m.data).getFullYear() === now.getFullYear())
            .reduce((s: number, m: any) => s + Number(m.valor), 0);
        return parseFloat(((receitaAno / alvo) * 100).toFixed(1));
    }

    return Math.max(0, meta.progresso || 0);
}

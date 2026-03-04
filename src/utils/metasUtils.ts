export function calcularProgressoAuto(meta: any, clientes: any[], movimentacoes: any[]): number {
    if (!meta.calculo_automatico) return Math.min(100, Math.max(0, meta.progresso || 0));

    const alvo = Number(meta.valor_alvo || 0);
    if (alvo <= 0) return 0;

    const now = new Date();

    if (meta.tipo_meta === 'clientes' && meta.subtipo === 'total_clientes') {
        const ativos = clientes.filter((c: any) => c.status === 'ativo').length;
        return Math.min(100, parseFloat(((ativos / alvo) * 100).toFixed(1)));
    }

    const tipoCalc = meta.tipo_meta === 'clientes' && meta.subtipo === 'cliente_especifico'
        ? meta.acompanhamento_subtipo || meta.acompanhamento_tipo
        : meta.subtipo;
    const clienteFilter = meta.tipo_meta === 'clientes' && meta.subtipo === 'cliente_especifico'
        ? meta.cliente_vinculado_id : null;

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
        return Math.min(100, parseFloat(((receitaMes / alvo) * 100).toFixed(1)));
    }
    if (tipoCalc === 'receita_anual') {
        const receitaAno = movsEntrada
            .filter((m: any) => m.data && new Date(m.data).getFullYear() === now.getFullYear())
            .reduce((s: number, m: any) => s + Number(m.valor), 0);
        return Math.min(100, parseFloat(((receitaAno / alvo) * 100).toFixed(1)));
    }
    return Math.min(100, Math.max(0, meta.progresso || 0));
}

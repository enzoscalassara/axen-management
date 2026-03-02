import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    DollarSign,
    TrendingUp,
    Users,
    AlertTriangle,
    Target,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Building,
}
    from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { formatCurrency } from '../utils/formatters';

const COLORS = ['#0066ff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
    }),
};

/** Tooltip customizado para os gráficos */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card px-3 py-2 text-xs">
            <p className="text-dark-200 mb-1">{label}</p>
            <p className="text-white font-semibold">{formatCurrency(payload[0].value)}</p>
        </div>
    );
}

import { supabase } from '../services/supabaseClient';

export default function Dashboard() {
    const { empresa } = useEmpresa();

    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-resumo', empresa?.id],
        queryFn: async () => {
            const empresaId = empresa!.id;

            const [movsRes, clientesRes, metasRes, atvsRes] = await Promise.all([
                supabase.from('movimentacoes').select('*').eq('empresa_id', empresaId),
                supabase.from('clientes').select('id, status').eq('empresa_id', empresaId),
                supabase.from('metas').select('*').eq('empresa_id', empresaId),
                supabase.from('atividades').select('*').eq('empresa_id', empresaId),
            ]);

            const movs = movsRes.data ?? [];
            const clientes = clientesRes.data ?? [];
            const metas = metasRes.data ?? [];
            const atvs = atvsRes.data ?? [];

            const entradas = movs.filter(m => m.tipo === 'entrada' && m.status === 'confirmado')
                .reduce((s, m) => s + Number(m.valor), 0);
            const saidas = movs.filter(m => m.tipo === 'saida' && m.status === 'confirmado')
                .reduce((s, m) => s + Number(m.valor), 0);
            const metaAlvo = metas.reduce((s, m) => s + Number(m.valor_alvo || 0), 0);

            const now = new Date();
            const fluxoMensal = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                const mes = d.toLocaleString('pt-BR', { month: 'short' });
                const movsDoMes = movs.filter(m => {
                    const md = new Date(m.data);
                    return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear() && m.status === 'confirmado';
                });
                const valor = movsDoMes.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.valor), 0);
                return { mes, valor };
            });

            // Despesas agrupadas por categoria
            const despesasPorCat: Record<string, number> = {};
            movs.filter(m => m.tipo === 'saida' && m.status === 'confirmado').forEach(m => {
                const cat = m.categoria || 'Outros';
                despesasPorCat[cat] = (despesasPorCat[cat] || 0) + Number(m.valor);
            });
            const despesas_por_categoria = Object.entries(despesasPorCat).map(([categoria, valor]) => ({ categoria, valor }));
            const receitas_por_categoria = despesas_por_categoria; // Usa mesmos dados para iterar Cell do Pie

            // Atividades atrasadas (prazo < hoje e não concluída)
            const atividades_atrasadas = atvs.filter(a => {
                if (a.status === 'concluida') return false;
                if (!a.prazo) return false;
                return new Date(a.prazo) < now;
            }).length;

            // Metas recentes (em andamento, últimas 5)
            const metas_recentes = metas
                .filter(m => m.status === 'em_andamento')
                .slice(0, 5)
                .map(m => ({ id: m.id, titulo: m.titulo || 'Meta', progresso: m.progresso || 0, responsavel: m.responsavel || '-', prazo: m.prazo || now.toISOString() }));

            // Movimentações pendentes (status = previsto)
            const movsPendentes = movs.filter(m => m.status === 'previsto');

            return {
                saldo_atual: entradas - saidas,
                receita_mes: entradas,
                meta_mes: metaAlvo,
                clientes_ativos: clientes.filter(c => c.status === 'ativo').length,
                atividades_pendentes: atvs.filter(a => a.status !== 'concluida').length,
                atividades_atrasadas,
                metas_progresso: Math.round(metas.reduce((s, m) => s + (m.progresso || 0), 0) / (metas.length || 1)),
                metas_count: metas.length,
                receita_por_mes: fluxoMensal,
                despesas_por_categoria,
                receitas_por_categoria,
                metas_recentes,
                movimentacoes_pendentes: movsPendentes,
                movimentacoes_recentes: movsPendentes.slice(0, 5),
                clientes_por_segmento: [],
            };

        },
        enabled: !!empresa?.id,
        retry: 2,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!empresa) {
        return (
            <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-800 mb-4">
                    <Building className="w-8 h-8 text-dark-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhuma empresa selecionada</h3>
                <p className="text-dark-300 max-w-sm mx-auto">
                    Não conseguimos identificar sua empresa principal. Verifique se você possui permissões de acesso ou selecione uma empresa no menu lateral.
                </p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex flex-col items-center gap-4">
                <AlertTriangle className="w-8 h-8" />
                <div className="text-center">
                    <p className="font-bold">Erro ao carregar dados do dashboard</p>
                    <p className="text-sm opacity-80">Verifique se existe o seu perfil de usuário na tabela 'usuarios' do Supabase.</p>
                </div>
            </div>
        );
    }

    const percentMeta = (data.meta_mes || 0) > 0 ? Math.round(((data.receita_mes || 0) / data.meta_mes) * 100) : 0;

    const kpis = [
        {
            label: 'Saldo do Caixa',
            value: formatCurrency(data.saldo_atual),
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            trend: '+12%',
            trendUp: true,
        },
        {
            label: 'Receita do Mês',
            value: formatCurrency(data.receita_mes),
            icon: TrendingUp,
            color: 'text-axen-400',
            bg: 'bg-axen-500/10',
            sub: `${percentMeta}% da meta`,
            trend: '+8%',
            trendUp: true,
        },
        {
            label: 'Clientes Ativos',
            value: data.clientes_ativos.toString(),
            icon: Users,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
        },
        {
            label: 'Atividades Atrasadas',
            value: data.atividades_atrasadas.toString(),
            icon: AlertTriangle,
            color: data.atividades_atrasadas > 0 ? 'text-red-400' : 'text-emerald-400',
            bg: data.atividades_atrasadas > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Título */}
            <div>
                <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                <p className="text-dark-200 text-sm mt-1">
                    Visão geral · {empresa!.nome}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                        className="glass-card p-5 group cursor-default"
                    >
                        <div className="flex items-start justify-between">
                            <div className={`p - 2.5 rounded - lg ${kpi.bg} `}>
                                <kpi.icon className={`w - 5 h - 5 ${kpi.color} `} />
                            </div>
                            {kpi.trend && (
                                <span
                                    className={`flex items - center gap - 0.5 text - xs font - medium ${kpi.trendUp ? 'text-emerald-400' : 'text-red-400'
                                        } `}
                                >
                                    {kpi.trendUp ? (
                                        <ArrowUpRight className="w-3 h-3" />
                                    ) : (
                                        <ArrowDownRight className="w-3 h-3" />
                                    )}
                                    {kpi.trend}
                                </span>
                            )}
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-white">{kpi.value}</p>
                            <p className="text-xs text-dark-200 mt-1">{kpi.label}</p>
                            {kpi.sub && (
                                <p className="text-xs text-axen-400 mt-0.5">{kpi.sub}</p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Receita Mensal — Area Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-5 lg:col-span-2"
                >
                    <h3 className="text-sm font-semibold text-white mb-4">Receita Mensal</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={data.receita_por_mes}>
                            <defs>
                                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0066ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0066ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="mes" tick={{ fill: '#6a6a8a', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6a6a8a', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000} k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="valor" stroke="#0066ff" strokeWidth={2} fill="url(#colorReceita)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Despesas por Categoria — Pie/Donut */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card p-5"
                >
                    <h3 className="text-sm font-semibold text-white mb-4">Despesas por Categoria</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={data.despesas_por_categoria}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                dataKey="valor"
                                nameKey="categoria"
                                strokeWidth={0}
                            >
                                {data.receitas_por_categoria.map((_: any, idx: number) => (
                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => formatCurrency(Number(value))}
                                contentStyle={{
                                    background: 'rgba(18,18,28,0.9)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {data.receitas_por_categoria.map((cat: any, idx: number) => (
                            <div key={cat.categoria} className="flex items-center gap-2 text-xs">
                                <div
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                                <span className="text-dark-200 truncate">{cat.categoria}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Metas + Movimentações Pendentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Metas em andamento */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card p-5"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4 text-axen-400" />
                        <h3 className="text-sm font-semibold text-white">Metas em Andamento</h3>
                    </div>
                    <div className="space-y-3">
                        {data.metas_recentes.map((meta: any) => (
                            <div key={meta.id} className="bg-dark-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-white truncate pr-4">{meta.titulo}</p>
                                    <span className="text-xs text-axen-400 font-semibold whitespace-nowrap">
                                        {meta.progresso}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-dark-600 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${meta.progresso}% ` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-gradient-to-r from-axen-500 to-axen-400"
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[11px] text-dark-300">{meta.responsavel}</span>
                                    <span className="text-[11px] text-dark-300">
                                        Prazo: {new Date(meta.prazo).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Movimentações Pendentes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-card p-5"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-warning" />
                        <h3 className="text-sm font-semibold text-white">Movimentações Pendentes</h3>
                    </div>
                    {data.movimentacoes_pendentes.length === 0 ? (
                        <p className="text-sm text-dark-300 text-center py-8">Nenhuma pendência</p>
                    ) : (
                        <div className="space-y-2">
                            {data.movimentacoes_recentes.map((mov: any) => (
                                <div
                                    key={mov.id}
                                    className="flex items-center justify-between bg-dark-800/50 rounded-lg p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w - 8 h - 8 rounded - lg flex items - center justify - center ${mov.tipo === 'entrada' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                                } `}
                                        >
                                            {mov.tipo === 'entrada' ? (
                                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <ArrowDownRight className="w-4 h-4 text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-white">{mov.descricao}</p>
                                            <p className="text-[11px] text-dark-300">
                                                {new Date(mov.data).toLocaleDateString('pt-BR')} · {mov.categoria}
                                            </p>
                                        </div>
                                    </div>
                                    <p
                                        className={`text - sm font - semibold ${mov.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                                            } `}
                                    >
                                        {mov.tipo === 'entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

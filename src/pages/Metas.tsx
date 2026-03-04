import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Plus, Filter, X, Calendar, User, TrendingUp, Pencil, Trash2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useMembrosDaEmpresa } from '../hooks/useMembrosDaEmpresa';
import { formatCurrencyInput, parseCurrencyToNumber, formatCurrency } from '../utils/formatters';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    em_andamento: { label: 'Em Andamento', color: 'text-axen-400', bg: 'bg-axen-500/10' },
    concluida: { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10' },
};

/** Sub-opções condicionais por tipo de meta */
const SUBTIPO_OPTIONS: Record<string, { label: string; value: string }[]> = {
    financeira: [
        { label: 'Receita Mensal', value: 'receita_mensal' },
        { label: 'Receita Anual', value: 'receita_anual' },
    ],
    clientes: [
        { label: 'Total de Clientes', value: 'total_clientes' },
        { label: 'Cliente Específico', value: 'cliente_especifico' },
    ],
    geral: [],
};

const defaultForm = {
    titulo: '', descricao: '', valor_alvo: 0, data_inicio: '', data_fim: '',
    responsavel: '', status: 'em_andamento', progresso: 0,
    tipo_meta: '' as string, subtipo: '' as string, concluida: false,
    cliente_vinculado_id: '' as string, acompanhamento_tipo: '' as string,
    calculo_automatico: false, acompanhamento_subtipo: '' as string,
};

export default function Metas() {
    const { empresa } = useEmpresa();
    const queryClient = useQueryClient();
    const [filtroStatus, setFiltroStatus] = useState<string>('todos');
    const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [formMeta, setFormMeta] = useState(defaultForm);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
    const { data: membros = [] } = useMembrosDaEmpresa(empresa?.id);

    const { data: metas = [], isLoading } = useQuery({
        queryKey: ['metas', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('metas')
                .select('*')
                .eq('empresa_id', empresa!.id)
                .order('data_fim');
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    /** Clientes da empresa para dropdown de meta tipo cliente_especifico */
    const { data: clientes = [] } = useQuery({
        queryKey: ['clientes-metas', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nome, status')
                .eq('empresa_id', empresa!.id)
                .order('nome');
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    /** Movimentações para cálculos automáticos */
    const { data: movimentacoes = [] } = useQuery({
        queryKey: ['movimentacoes-metas', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('movimentacoes')
                .select('tipo, status, valor, data, origem_cliente_id')
                .eq('empresa_id', empresa!.id);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    const responsaveis = useMemo(
        () => [...new Set(metas.map((m: any) => m.responsavel || 'Não Informado'))],
        [metas]
    );

    const metasFiltradas = useMemo(() => {
        let filtered = metas;
        if (filtroStatus !== 'todos') filtered = filtered.filter((m: any) => m.status === filtroStatus);
        if (filtroResponsavel !== 'todos') filtered = filtered.filter((m: any) => m.responsavel === filtroResponsavel);
        return filtered;
    }, [metas, filtroStatus, filtroResponsavel]);

    const stats = useMemo(() => ({
        total: metas.length,
        andamento: metas.filter((m: any) => m.status === 'em_andamento').length,
        concluidas: metas.filter((m: any) => m.status === 'concluida').length,
        progressoMedio: Math.round(metas.reduce((s: number, m: any) => s + (m.progresso || 0), 0) / (metas.length || 1)),
    }), [metas]);

    const openNew = () => {
        setEditing(null);
        setFormMeta(defaultForm);
        setSelectedResponsaveis([]);
        setShowModal(true);
    };

    const openEdit = useCallback((meta: any) => {
        setEditing(meta);
        setFormMeta({
            titulo: meta.titulo || '',
            descricao: meta.descricao || '',
            valor_alvo: Number(meta.valor_alvo) || 0,
            data_inicio: meta.data_inicio || '',
            data_fim: meta.data_fim || '',
            responsavel: meta.responsavel || '',
            status: meta.status || 'em_andamento',
            progresso: meta.progresso || 0,
            tipo_meta: meta.tipo_meta || '',
            subtipo: meta.subtipo || '',
            concluida: meta.concluida || false,
            cliente_vinculado_id: meta.cliente_vinculado_id || '',
            acompanhamento_tipo: meta.acompanhamento_tipo || '',
            calculo_automatico: meta.calculo_automatico || false,
            acompanhamento_subtipo: meta.acompanhamento_subtipo || '',
        });
        const names = (meta.responsavel || '').split(', ').map((s: string) => s.trim()).filter(Boolean);
        setSelectedResponsaveis(membros.filter(m => names.includes(m.displayName)).map(m => m.id));
        setShowModal(true);
    }, [membros]);

    const toggleResponsavel = (userId: string) => {
        setSelectedResponsaveis(prev => {
            const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
            const names = next.map(id => membros.find(m => m.id === id)?.displayName).filter(Boolean).join(', ');
            setFormMeta(f => ({ ...f, responsavel: names }));
            return next;
        });
    };

    /** Verifica se o tipo/subtipo é elegível para cálculo automático */
    const isAutoCalcEligible = (tipoMeta: string, subtipo: string, acompTipo?: string, acompSub?: string) => {
        if (tipoMeta === 'financeira' && (subtipo === 'receita_mensal' || subtipo === 'receita_anual')) return true;
        if (tipoMeta === 'clientes' && subtipo === 'total_clientes') return true;
        if (tipoMeta === 'clientes' && subtipo === 'cliente_especifico' && acompTipo === 'financeira'
            && (acompSub === 'receita_mensal' || acompSub === 'receita_anual')) return true;
        return false;
    };

    /** Calcula progresso automático para uma meta */
    const calcularProgressoAuto = useCallback((meta: any): number => {
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
                .filter((m: any) => { const d = new Date(m.data); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
                .reduce((s: number, m: any) => s + Number(m.valor), 0);
            return Math.min(100, parseFloat(((receitaMes / alvo) * 100).toFixed(1)));
        }
        if (tipoCalc === 'receita_anual') {
            const receitaAno = movsEntrada
                .filter((m: any) => new Date(m.data).getFullYear() === now.getFullYear())
                .reduce((s: number, m: any) => s + Number(m.valor), 0);
            return Math.min(100, parseFloat(((receitaAno / alvo) * 100).toFixed(1)));
        }
        return meta.progresso || 0;
    }, [clientes, movimentacoes]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formMeta.titulo || !empresa) return;
        const payload: any = {
            titulo: formMeta.titulo,
            descricao: formMeta.descricao,
            valor_alvo: formMeta.valor_alvo,
            data_inicio: formMeta.data_inicio || null,
            data_fim: formMeta.data_fim || null,
            responsavel: formMeta.responsavel,
            status: formMeta.status,
            progresso: formMeta.progresso || 0,
            tipo_meta: formMeta.tipo_meta || null,
            subtipo: formMeta.subtipo || null,
            concluida: formMeta.concluida,
            cliente_vinculado_id: formMeta.cliente_vinculado_id || null,
            acompanhamento_tipo: formMeta.acompanhamento_tipo || null,
            calculo_automatico: formMeta.calculo_automatico,
        };
        try {
            if (editing) {
                const { error } = await supabase.from('metas').update(payload).eq('id', editing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('metas').insert([{ ...payload, empresa_id: empresa.id }]);
                if (error) throw error;
            }
            setShowModal(false);
            setEditing(null);
            setFormMeta(defaultForm);
            queryClient.invalidateQueries({ queryKey: ['metas'] });
        } catch (err) {
            alert('Falha ao salvar meta.');
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        const { error } = await supabase.from('metas').delete().eq('id', showDeleteConfirm);
        if (error) { alert('Falha ao excluir.'); }
        setShowDeleteConfirm(null);
        setShowModal(false);
        setEditing(null);
        queryClient.invalidateQueries({ queryKey: ['metas'] });
    };

    if (isLoading) {
        return <div className="py-24 flex justify-center"><div className="w-10 h-10 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Metas</h2>
                    <p className="text-dark-200 text-sm mt-1">Objetivos e resultados · {empresa!.nome}</p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white text-sm font-medium transition-all shadow-lg shadow-axen-500/20">
                    <Plus className="w-4 h-4" /> Nova Meta
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Metas', value: stats.total, icon: Target, color: 'text-axen-400', bg: 'bg-axen-500/10' },
                    { label: 'Em Andamento', value: stats.andamento, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Concluídas', value: stats.concluidas, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Progresso Médio', value: `${stats.progressoMedio}%`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                ].map((card, i) => (
                    <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
                            <span className="text-xs text-dark-200">{card.label}</span>
                        </div>
                        <p className="text-xl font-bold text-white">{card.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <Filter className="w-4 h-4 text-dark-300" />
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todos os status</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                </select>
                <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todos os responsáveis</option>
                    {responsaveis.map((r: any) => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {metasFiltradas.map((meta: any, i: number) => {
                    const statusStyle = STATUS_LABELS[meta.status] || STATUS_LABELS.em_andamento;
                    const isOverdue = meta.data_fim && new Date(meta.data_fim) < new Date() && meta.status === 'em_andamento';
                    const progressoDisplay = meta.calculo_automatico ? calcularProgressoAuto(meta) : (meta.progresso || 0);

                    /* Info para total_clientes */
                    const isTotalClientes = meta.tipo_meta === 'clientes' && meta.subtipo === 'total_clientes';
                    const clientesAtivos = isTotalClientes ? clientes.filter((c: any) => c.status === 'ativo').length : 0;

                    return (
                        <motion.div key={meta.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className={`glass-card p-5 group ${isOverdue ? 'border-red-500/20' : ''}`}>
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-base font-semibold text-white leading-snug pr-2">{meta.titulo}</h3>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                                        {statusStyle.label}
                                    </span>
                                    <button onClick={() => openEdit(meta)} className="p-1 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-axen-400 opacity-0 group-hover:opacity-100 transition-all" title="Editar">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-dark-200 mb-4 line-clamp-2">{meta.descricao}</p>

                            {meta.tipo_meta && (
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 bg-dark-700 text-dark-200 rounded font-medium uppercase tracking-wider">
                                        {meta.tipo_meta}{meta.subtipo ? ` · ${meta.subtipo}` : ''}
                                    </span>
                                    {isTotalClientes && meta.valor_alvo > 0 ? (
                                        <span className="text-xs text-axen-400 font-semibold">{clientesAtivos} / {Math.round(meta.valor_alvo)} clientes ativos</span>
                                    ) : meta.valor_alvo > 0 && (
                                        <span className="text-xs text-axen-400 font-semibold">{formatCurrency(meta.valor_alvo)}</span>
                                    )}
                                </div>
                            )}

                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-dark-300">Progresso{meta.calculo_automatico ? ' (auto)' : ''}</span>
                                    <span className="text-xs text-axen-400 font-semibold">{progressoDisplay}%</span>
                                </div>
                                <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressoDisplay}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${progressoDisplay >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : progressoDisplay >= 40 ? 'bg-gradient-to-r from-axen-500 to-axen-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-dark-300 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1"><User className="w-3 h-3" />{meta.responsavel || 'S/ Responsável'}</div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span className={isOverdue ? 'text-red-400' : ''}>
                                        {meta.data_fim ? new Date(meta.data_fim).toLocaleDateString('pt-BR') : 'Sem prazo'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal Criar/Editar Meta */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditing(null); }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-lg glow-blue max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-white">{editing ? 'Editar Meta' : 'Nova Meta'}</h3>
                                <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Título da Meta</label>
                                    <input type="text" required placeholder="Ex: Atingir 100k faturamento" value={formMeta.titulo} onChange={(e) => setFormMeta({ ...formMeta, titulo: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Descrição</label>
                                    <textarea placeholder="Detalhes da meta..." value={formMeta.descricao} onChange={(e) => setFormMeta({ ...formMeta, descricao: e.target.value })} className="w-full text-sm h-20" />
                                </div>

                                {/* Tipo de Meta */}
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Tipo de Meta</label>
                                    <select value={formMeta.tipo_meta} onChange={(e) => setFormMeta({ ...formMeta, tipo_meta: e.target.value, subtipo: '' })} className="w-full text-sm">
                                        <option value="">Selecione</option>
                                        <option value="financeira">Financeira</option>
                                        <option value="clientes">Clientes</option>
                                        <option value="geral">Geral</option>
                                    </select>
                                </div>

                                {/* Sub-opções condicionais */}
                                {formMeta.tipo_meta && SUBTIPO_OPTIONS[formMeta.tipo_meta]?.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Subtipo</label>
                                        <select value={formMeta.subtipo} onChange={(e) => setFormMeta({ ...formMeta, subtipo: e.target.value, cliente_vinculado_id: '', acompanhamento_tipo: '', acompanhamento_subtipo: '' })} className="w-full text-sm">
                                            <option value="">Selecione</option>
                                            {SUBTIPO_OPTIONS[formMeta.tipo_meta].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Cliente Específico — dropdown de cliente */}
                                {formMeta.tipo_meta === 'clientes' && formMeta.subtipo === 'cliente_especifico' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Cliente Vinculado</label>
                                            <select value={formMeta.cliente_vinculado_id} onChange={(e) => setFormMeta({ ...formMeta, cliente_vinculado_id: e.target.value })} className="w-full text-sm">
                                                <option value="">Selecione um cliente</option>
                                                {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Tipo de Acompanhamento</label>
                                            <div className="flex gap-4">
                                                {(['geral', 'financeira'] as const).map(tipo => (
                                                    <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" name="acompanhamento" value={tipo}
                                                            checked={formMeta.acompanhamento_tipo === tipo}
                                                            onChange={() => setFormMeta({ ...formMeta, acompanhamento_tipo: tipo, acompanhamento_subtipo: '' })}
                                                            className="w-3.5 h-3.5 text-axen-500 focus:ring-axen-500/20" />
                                                        <span className="text-sm text-dark-200 capitalize">{tipo === 'geral' ? 'Geral' : 'Financeira'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        {formMeta.acompanhamento_tipo === 'financeira' && (
                                            <div>
                                                <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Período</label>
                                                <select value={formMeta.acompanhamento_subtipo} onChange={(e) => setFormMeta({ ...formMeta, acompanhamento_subtipo: e.target.value })} className="w-full text-sm">
                                                    <option value="">Selecione</option>
                                                    <option value="receita_mensal">Receita Mensal</option>
                                                    <option value="receita_anual">Receita Anual</option>
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Valor Alvo — ocultado para tipo Geral e para cliente_especifico com acomp. geral */}
                                {formMeta.tipo_meta !== 'geral' && !(formMeta.tipo_meta === 'clientes' && formMeta.subtipo === 'cliente_especifico' && formMeta.acompanhamento_tipo === 'geral') && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">
                                                {formMeta.tipo_meta === 'clientes' && formMeta.subtipo === 'total_clientes'
                                                    ? 'Meta de clientes ativos'
                                                    : 'Valor Alvo (R$)'}
                                            </label>
                                            {formMeta.tipo_meta === 'clientes' && formMeta.subtipo === 'total_clientes' ? (
                                                <input type="number" min="0" placeholder="0"
                                                    value={formMeta.valor_alvo || ''}
                                                    onChange={(e) => setFormMeta({ ...formMeta, valor_alvo: Number(e.target.value) })}
                                                    className="w-full text-sm" />
                                            ) : (
                                                <input type="text" placeholder="0,00"
                                                    value={formatCurrencyInput(formMeta.valor_alvo || 0)}
                                                    onChange={(e) => setFormMeta({ ...formMeta, valor_alvo: parseCurrencyToNumber(e.target.value) })}
                                                    className="w-full text-sm" />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Progresso (%)</label>
                                            <input type="number" min="0" max="100" value={formMeta.progresso}
                                                onChange={(e) => setFormMeta({ ...formMeta, progresso: Number(e.target.value) })}
                                                className="w-full text-sm" readOnly={formMeta.calculo_automatico} />
                                        </div>
                                    </div>
                                )}

                                {/* Checkbox cálculo automático */}
                                {isAutoCalcEligible(formMeta.tipo_meta, formMeta.subtipo, formMeta.acompanhamento_tipo, formMeta.acompanhamento_subtipo) && (
                                    <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formMeta.calculo_automatico}
                                                onChange={(e) => setFormMeta({ ...formMeta, calculo_automatico: e.target.checked })}
                                                className="w-4 h-4 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                            <span className="text-sm text-white">Calcular progresso automaticamente</span>
                                        </label>
                                    </div>
                                )}

                                {/* Meta atingida — visível apenas para tipo Geral */}
                                {formMeta.tipo_meta === 'geral' && (
                                    <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formMeta.concluida}
                                                onChange={(e) => setFormMeta({ ...formMeta, concluida: e.target.checked, progresso: e.target.checked ? 100 : 0, status: e.target.checked ? 'concluida' : 'em_andamento' })}
                                                className="w-4 h-4 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                            <span className="text-sm text-white">Meta atingida?</span>
                                        </label>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Data de Início</label>
                                        <input type="date" value={formMeta.data_inicio} onChange={(e) => setFormMeta({ ...formMeta, data_inicio: e.target.value })} className="w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Data de Fim</label>
                                        <input type="date" value={formMeta.data_fim} onChange={(e) => setFormMeta({ ...formMeta, data_fim: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Responsáveis</label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {selectedResponsaveis.map(uid => {
                                            const m = membros.find(m => m.id === uid);
                                            return m ? (
                                                <span key={uid} className="inline-flex items-center gap-1 px-2 py-1 bg-axen-500/15 text-axen-400 text-xs rounded-full">
                                                    {m.displayName}
                                                    <button type="button" onClick={() => toggleResponsavel(uid)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto border border-dark-700 rounded-lg">
                                        {membros.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-dark-800/50 cursor-pointer text-sm text-dark-200 hover:text-white transition-colors">
                                                <input type="checkbox" checked={selectedResponsaveis.includes(m.id)} onChange={() => toggleResponsavel(m.id)}
                                                    className="w-3.5 h-3.5 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                                {m.displayName}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {editing && (
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Status</label>
                                        <select value={formMeta.status} onChange={(e) => setFormMeta({ ...formMeta, status: e.target.value })} className="w-full text-sm">
                                            <option value="em_andamento">Em Andamento</option>
                                            <option value="concluida">Concluída</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    {editing && (
                                        <button type="button" onClick={() => setShowDeleteConfirm(editing.id)}
                                            className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-1.5">
                                            <Trash2 className="w-4 h-4" /> Excluir
                                        </button>
                                    )}
                                    <button type="submit" className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white font-medium text-sm transition-all shadow-lg shadow-axen-500/20">
                                        {editing ? 'Salvar Alterações' : 'Criar Meta'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Confirmação de Exclusão */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(null)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-dark-900 border border-dark-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                                <h4 className="text-base font-semibold text-white">Excluir meta?</h4>
                            </div>
                            <p className="text-sm text-dark-200 mb-5">A meta será permanentemente removida. Essa ação não pode ser desfeita.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 rounded-lg bg-dark-800 text-sm text-dark-200 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500/20 text-sm text-red-400 hover:bg-red-500/30 font-medium transition-colors">Excluir</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

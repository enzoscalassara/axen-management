import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Plus, Filter, X, Calendar, User, TrendingUp, Pencil, Trash2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { formatCurrencyInput, parseCurrencyToNumber, formatCurrency } from '../utils/formatters';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    em_andamento: { label: 'Em Andamento', color: 'text-axen-400', bg: 'bg-axen-500/10' },
    concluida: { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10' },
};

/** Sub-opções condicionais por tipo de meta */
const SUBTIPO_OPTIONS: Record<string, string[]> = {
    financeira: ['Receita Mensal', 'Receita Anual'],
    clientes: ['Cliente Específico', 'Total de Clientes'],
    geral: [],
};

const defaultForm = {
    titulo: '', descricao: '', valor_alvo: 0, data_inicio: '', data_fim: '',
    responsavel: '', status: 'em_andamento', progresso: 0,
    tipo_meta: '' as string, subtipo: '' as string, concluida: false,
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
        });
        setShowModal(true);
    }, []);

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
            console.error('Erro ao salvar meta:', err);
            alert('Falha ao salvar meta.');
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        const { error } = await supabase.from('metas').delete().eq('id', showDeleteConfirm);
        if (error) { console.error('Erro ao excluir meta:', error); alert('Falha ao excluir.'); }
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
                                    {meta.valor_alvo > 0 && (
                                        <span className="text-xs text-axen-400 font-semibold">{formatCurrency(meta.valor_alvo)}</span>
                                    )}
                                </div>
                            )}

                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-dark-300">Progresso</span>
                                    <span className="text-xs text-axen-400 font-semibold">{meta.progresso || 0}%</span>
                                </div>
                                <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${meta.progresso || 0}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${meta.progresso >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : meta.progresso >= 40 ? 'bg-gradient-to-r from-axen-500 to-axen-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`} />
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
                                        <select value={formMeta.subtipo} onChange={(e) => setFormMeta({ ...formMeta, subtipo: e.target.value })} className="w-full text-sm">
                                            <option value="">Selecione</option>
                                            {SUBTIPO_OPTIONS[formMeta.tipo_meta].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Valor Alvo — ocultado para tipo Geral */}
                                {formMeta.tipo_meta !== 'geral' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Valor Alvo (R$)</label>
                                            <input type="text" placeholder="0,00"
                                                value={formatCurrencyInput(formMeta.valor_alvo || 0)}
                                                onChange={(e) => setFormMeta({ ...formMeta, valor_alvo: parseCurrencyToNumber(e.target.value) })}
                                                className="w-full text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Progresso (%)</label>
                                            <input type="number" min="0" max="100" value={formMeta.progresso}
                                                onChange={(e) => setFormMeta({ ...formMeta, progresso: Number(e.target.value) })}
                                                className="w-full text-sm" />
                                        </div>
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
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Responsável</label>
                                    <input type="text" placeholder="Nome do responsável" value={formMeta.responsavel} onChange={(e) => setFormMeta({ ...formMeta, responsavel: e.target.value })} className="w-full text-sm" />
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

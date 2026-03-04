import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DragDropContext, Droppable, Draggable, type DropResult,
} from '@hello-pangea/dnd';
import {
    Plus, Filter, X, Calendar, User, Flag, List, LayoutGrid, AlertTriangle, Pencil, Trash2, Info,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useMembrosDaEmpresa } from '../hooks/useMembrosDaEmpresa';

const PRIORIDADE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
    baixa: { label: 'Baixa', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    media: { label: 'Média', color: 'text-axen-400', bg: 'bg-axen-500/10' },
    alta: { label: 'Alta', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    urgente: { label: 'Urgente', color: 'text-red-400', bg: 'bg-red-500/10' },
};

type View = 'kanban' | 'tabela';

const defaultForm = {
    titulo: '', descricao: '', responsavel: '', prazo: '', prioridade: 'media', coluna_id: '', pessoal: false,
};

export default function Atividades() {
    const { empresa } = useEmpresa();
    const queryClient = useQueryClient();
    const [view, setView] = useState<View>('kanban');
    const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
    const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [formAtv, setFormAtv] = useState(defaultForm);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const { data: colunas = [], isLoading: isLoadingCol } = useQuery({
        queryKey: ['kanban-colunas', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('colunas_kanban')
                .select('*')
                .eq('empresa_id', empresa!.id)
                .order('ordem');
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    const { data: atividades = [], isLoading: isLoadingAtv } = useQuery({
        queryKey: ['atividades', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('atividades')
                .select('*')
                .eq('empresa_id', empresa!.id)
                .order('prazo');
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    /** Membros da empresa para multi-select de responsáveis */
    const { data: membros = [] } = useMembrosDaEmpresa(empresa?.id);

    const atividadesFiltradas = useMemo(() => {
        let filtered = atividades;
        if (filtroResponsavel !== 'todos') filtered = filtered.filter((a: any) => a.responsavel?.includes(filtroResponsavel));
        if (filtroPrioridade !== 'todos') filtered = filtered.filter((a: any) => a.prioridade === filtroPrioridade);
        return filtered;
    }, [atividades, filtroResponsavel, filtroPrioridade]);

    const responsaveis = useMemo(() => {
        const set = new Set<string>();
        atividades.forEach((a: any) => {
            (a.responsavel || '').split(', ').forEach((r: string) => { if (r.trim()) set.add(r.trim()); });
        });
        return [...set];
    }, [atividades]);

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        const { draggableId, destination, source } = result;
        const newColunaId = destination.droppableId;
        const oldColunaId = source.droppableId;
        if (newColunaId === oldColunaId) return;

        /* Optimistic update — atualiza estado local imediatamente */
        queryClient.setQueryData(['atividades', empresa?.id], (old: any[] | undefined) =>
            (old ?? []).map((a: any) => a.id === draggableId ? { ...a, coluna_id: newColunaId } : a)
        );

        const { error } = await supabase.from('atividades').update({ coluna_id: newColunaId }).eq('id', draggableId);

        if (error) {
            /* Reverte em caso de falha */
            queryClient.setQueryData(['atividades', empresa?.id], (old: any[] | undefined) =>
                (old ?? []).map((a: any) => a.id === draggableId ? { ...a, coluna_id: oldColunaId } : a)
            );
            alert('Erro ao mover atividade. Tente novamente.');
        }
    };

    const isOverdue = (prazo: string) => prazo && new Date(prazo) < new Date();

    const [tooltipPessoal, setTooltipPessoal] = useState(false);

    const openNew = () => {
        setEditing(null);
        setFormAtv({ ...defaultForm, coluna_id: colunas[0]?.id || '' });
        setSelectedUsers([]);
        setShowModal(true);
    };

    const openEdit = useCallback((atv: any) => {
        setEditing(atv);
        setFormAtv({
            titulo: atv.titulo || '',
            descricao: atv.descricao || '',
            responsavel: atv.responsavel || '',
            prazo: atv.prazo || '',
            prioridade: atv.prioridade || 'media',
            coluna_id: atv.coluna_id || '',
            pessoal: atv.pessoal || false,
        });
        const names = (atv.responsavel || '').split(', ').map((s: string) => s.trim()).filter(Boolean);
        const matchedIds = membros.filter(m => names.includes(m.displayName)).map(m => m.id);
        setSelectedUsers(matchedIds);
        setShowModal(true);
    }, [membros]);

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => {
            const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
            const names = next.map(id => membros.find(m => m.id === id)?.displayName).filter(Boolean).join(', ');
            setFormAtv(f => ({ ...f, responsavel: names }));
            return next;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formAtv.titulo || !empresa || colunas.length === 0) return;

        /* Obter uid do usuário autenticado para atividades pessoais */
        const { data: { user } } = await supabase.auth.getUser();

        const payload: any = {
            titulo: formAtv.titulo,
            descricao: formAtv.descricao,
            responsavel: formAtv.responsavel,
            prazo: formAtv.prazo || null,
            prioridade: formAtv.prioridade,
            coluna_id: formAtv.coluna_id || colunas[0].id,
            pessoal: formAtv.pessoal,
            criador_id: formAtv.pessoal ? user?.id ?? null : null,
        };
        try {
            if (editing) {
                const { error } = await supabase.from('atividades').update(payload).eq('id', editing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('atividades').insert([{ ...payload, empresa_id: empresa.id }]);
                if (error) throw error;
            }
            setShowModal(false);
            setEditing(null);
            setFormAtv(defaultForm);
            setSelectedUsers([]);
            queryClient.invalidateQueries({ queryKey: ['atividades'] });
        } catch (err) {
            alert('Falha ao salvar atividade.');
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        const { error } = await supabase.from('atividades').delete().eq('id', showDeleteConfirm);
        if (error) { alert('Falha ao excluir.'); }
        setShowDeleteConfirm(null);
        setShowModal(false);
        setEditing(null);
        queryClient.invalidateQueries({ queryKey: ['atividades'] });
    };

    if (isLoadingCol || isLoadingAtv) {
        return <div className="py-24 flex justify-center"><div className="w-10 h-10 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Atividades</h2>
                    <p className="text-dark-200 text-sm mt-1">Tarefas e prazos · {empresa!.nome}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-dark-800/50 rounded-lg p-1">
                        <button onClick={() => setView('kanban')} className={`p-2 rounded-md transition-all ${view === 'kanban' ? 'bg-axen-500/15 text-axen-400' : 'text-dark-300 hover:text-white'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setView('tabela')} className={`p-2 rounded-md transition-all ${view === 'tabela' ? 'bg-axen-500/15 text-axen-400' : 'text-dark-300 hover:text-white'}`}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={openNew}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white text-sm font-medium transition-all shadow-lg shadow-axen-500/20">
                        <Plus className="w-4 h-4" /> Nova Atividade
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <Filter className="w-4 h-4 text-dark-300" />
                <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todos os responsáveis</option>
                    {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todas prioridades</option>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                </select>
            </div>

            {view === 'kanban' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {colunas.map((coluna: any) => {
                            const colAtividades = atividadesFiltradas.filter((a: any) => a.coluna_id === coluna.id);
                            return (
                                <div key={coluna.id} className="shrink-0 w-72">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-white">{coluna.nome}</h3>
                                            <span className="text-xs text-dark-300 bg-dark-700 px-2 py-0.5 rounded-full">{colAtividades.length}</span>
                                        </div>
                                    </div>
                                    <Droppable droppableId={coluna.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`min-h-[200px] rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-axen-500/5 border border-axen-500/20' : 'bg-dark-800/30 border border-transparent'}`}
                                            >
                                                {colAtividades.map((atv: any, idx: number) => {
                                                    const prio = PRIORIDADE_COLORS[atv.prioridade] || PRIORIDADE_COLORS.media;
                                                    const overdue = isOverdue(atv.prazo);
                                                    return (
                                                        <Draggable key={atv.id} draggableId={atv.id} index={idx}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`glass-card p-3 mb-2 group cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-xl shadow-axen-500/10 rotate-2' : ''}`}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${prio.bg} ${prio.color}`}>
                                                                                <Flag className="w-2.5 h-2.5" />{prio.label}
                                                                            </span>
                                                                            {overdue && (
                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> Atrasada
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <button onClick={(e) => { e.stopPropagation(); openEdit(atv); }}
                                                                            className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-axen-400 opacity-0 group-hover:opacity-100 transition-all" title="Editar">
                                                                            <Pencil className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-sm font-medium text-white mb-1 leading-snug">{atv.titulo}</p>
                                                                    <div className="flex items-center justify-between text-[11px] text-dark-300">
                                                                        <div className="flex items-center gap-1">
                                                                            <User className="w-3 h-3" />
                                                                            {atv.responsavel ? atv.responsavel.split(',')[0].trim() : 'S/ Resp'}
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar className="w-3 h-3" />
                                                                            <span className={overdue ? 'text-red-400' : ''}>
                                                                                {atv.prazo ? new Date(atv.prazo).toLocaleDateString('pt-BR') : 'Sem prazo'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-3 px-4 text-xs font-medium text-dark-200 uppercase tracking-wider">Título</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-dark-200 uppercase tracking-wider">Responsável</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-dark-200 uppercase tracking-wider">Prioridade</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-dark-200 uppercase tracking-wider">Prazo</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-dark-200 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {atividadesFiltradas.map((atv: any) => {
                                const prio = PRIORIDADE_COLORS[atv.prioridade] || PRIORIDADE_COLORS.media;
                                return (
                                    <tr key={atv.id} className="border-b border-white/3 hover:bg-dark-700/30 transition-colors group">
                                        <td className="py-3 px-4 text-sm text-white">{atv.titulo}</td>
                                        <td className="py-3 px-4 text-sm text-dark-100">{atv.responsavel || 'S/ Resp'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${prio.bg} ${prio.color}`}>{prio.label}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-dark-200">{atv.prazo ? new Date(atv.prazo).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => openEdit(atv)} className="p-1.5 rounded-lg hover:bg-axen-500/10 text-dark-400 hover:text-axen-400 opacity-0 group-hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* Modal Criar/Editar */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditing(null); }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-md glow-blue max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-white">{editing ? 'Editar Atividade' : 'Nova Atividade'}</h3>
                                <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Título da Atividade</label>
                                    <input type="text" required placeholder="Ex: Reunião de Alinhamento" value={formAtv.titulo} onChange={(e) => setFormAtv({ ...formAtv, titulo: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Descrição</label>
                                    <textarea placeholder="Detalhes da atividade..." value={formAtv.descricao} onChange={(e) => setFormAtv({ ...formAtv, descricao: e.target.value })} className="w-full text-sm h-20" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Prioridade</label>
                                        <select value={formAtv.prioridade} onChange={(e) => setFormAtv({ ...formAtv, prioridade: e.target.value })} className="w-full text-sm">
                                            <option value="baixa">Baixa</option>
                                            <option value="media">Média</option>
                                            <option value="alta">Alta</option>
                                            <option value="urgente">Urgente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Prazo</label>
                                        <input type="date" value={formAtv.prazo} onChange={(e) => setFormAtv({ ...formAtv, prazo: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>
                                {/* Status dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Status (Coluna)</label>
                                    <select value={formAtv.coluna_id} onChange={(e) => setFormAtv({ ...formAtv, coluna_id: e.target.value })} className="w-full text-sm">
                                        {colunas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                {/* Multi-select de responsáveis */}
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Responsáveis</label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {selectedUsers.map(uid => {
                                            const m = membros.find(m => m.id === uid);
                                            return m ? (
                                                <span key={uid} className="inline-flex items-center gap-1 px-2 py-1 bg-axen-500/15 text-axen-400 text-xs rounded-full">
                                                    {m.displayName}
                                                    <button type="button" onClick={() => toggleUser(uid)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto border border-dark-700 rounded-lg">
                                        {membros.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-dark-800/50 cursor-pointer text-sm text-dark-200 hover:text-white transition-colors">
                                                <input type="checkbox" checked={selectedUsers.includes(m.id)} onChange={() => toggleUser(m.id)}
                                                    className="w-3.5 h-3.5 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                                {m.displayName}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {/* Atividade pessoal */}
                                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formAtv.pessoal}
                                            onChange={(e) => setFormAtv({ ...formAtv, pessoal: e.target.checked })}
                                            className="w-4 h-4 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                        <span className="text-sm text-white">Atividade pessoal</span>
                                    </label>
                                    <div className="relative">
                                        <button type="button"
                                            onMouseEnter={() => setTooltipPessoal(true)}
                                            onMouseLeave={() => setTooltipPessoal(false)}
                                            className="text-dark-400 hover:text-axen-400 transition-colors">
                                            <Info className="w-4 h-4" />
                                        </button>
                                        {tooltipPessoal && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-dark-700 border border-dark-600 rounded-lg text-xs text-dark-200 shadow-xl z-20">
                                                Ao marcar como atividade pessoal, esta atividade ficará visível apenas para você. Você pode desmarcar esta opção a qualquer momento para torná-la visível para todos os membros da empresa.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    {editing && (
                                        <button type="button" onClick={() => setShowDeleteConfirm(editing.id)}
                                            className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-1.5">
                                            <Trash2 className="w-4 h-4" /> Excluir
                                        </button>
                                    )}
                                    <button type="submit" className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white font-medium text-sm transition-all shadow-lg shadow-axen-500/20">
                                        {editing ? 'Salvar Alterações' : 'Criar Atividade'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Exclusão */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(null)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-dark-900 border border-dark-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                                <h4 className="text-base font-semibold text-white">Excluir atividade?</h4>
                            </div>
                            <p className="text-sm text-dark-200 mb-5">A atividade será permanentemente removida.</p>
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

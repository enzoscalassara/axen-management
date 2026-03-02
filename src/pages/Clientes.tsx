import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Filter, X, Search, Mail, Building, FileText, DollarSign,
    Target, KanbanSquare, Clock, ChevronLeft, Upload, UserCircle, AlertCircle, Pencil, Trash2, AlertTriangle, Phone,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/formatters';
import api from '../services/api';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    lead: { label: 'Lead', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ativo: { label: 'Cliente', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    inativo: { label: 'Inativo', color: 'text-dark-300', bg: 'bg-dark-600/50' },
};

type ActiveTab = 'dados' | 'documentos' | 'financeiro' | 'atividades' | 'metas' | 'historico';

const defaultForm = {
    nome: '', cnpj_cpf: '', contato: '', segmento: '', status: 'lead',
    email: '', telefone: '', focal_point_nome: '', responsaveis: [] as string[],
};

export default function Clientes() {
    const { empresa } = useEmpresa();
    const queryClient = useQueryClient();
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroSegmento, setFiltroSegmento] = useState('todos');
    const [busca, setBusca] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('dados');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [formCliente, setFormCliente] = useState(defaultForm);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);

    const { data: clientes = [], isLoading } = useQuery({
        queryKey: ['clientes', empresa?.id, filtroStatus],
        queryFn: async () => {
            let query = supabase
                .from('clientes')
                .select('*')
                .eq('empresa_id', empresa!.id)
                .order('nome');
            if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus);
            const { data, error } = await query;
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    const { data: clienteMovs = [], isLoading: isLoadingHist } = useQuery({
        queryKey: ['cliente-historico', selectedCliente?.id],
        queryFn: async () => {
            const res = await api.get(`/clientes/${selectedCliente?.id}/historico`);
            return res.data;
        },
        enabled: !!selectedCliente?.id && activeTab === 'financeiro',
    });

    /** Usuarios da empresa para multi-select de responsáveis */
    const { data: usuarios = [] } = useQuery({
        queryKey: ['usuarios-empresa', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('usuarios')
                .select('id, nome')
                .contains('empresas_permitidas', [empresa!.id]);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    const segmentos = useMemo(
        () => [...new Set(clientes.map((c: any) => c.segmento || 'Não Informado'))],
        [clientes]
    );

    const clientesFiltrados = useMemo(() => {
        let filtered = clientes;
        if (filtroSegmento !== 'todos') filtered = filtered.filter((c: any) => c.segmento === filtroSegmento);
        if (busca) filtered = filtered.filter((c: any) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            (c.cnpj_cpf && c.cnpj_cpf.includes(busca))
        );
        return filtered;
    }, [clientes, filtroSegmento, busca]);

    const tabs: { key: ActiveTab; label: string; icon: typeof FileText }[] = [
        { key: 'dados', label: 'Dados', icon: UserCircle },
        { key: 'documentos', label: 'Documentos', icon: FileText },
        { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
        { key: 'atividades', label: 'Atividades', icon: KanbanSquare },
        { key: 'metas', label: 'Metas', icon: Target },
        { key: 'historico', label: 'Histórico', icon: Clock },
    ];

    const openNew = () => {
        setEditing(null);
        setFormCliente(defaultForm);
        setSelectedResponsaveis([]);
        setShowModal(true);
    };

    const openEdit = useCallback((c: any) => {
        setEditing(c);
        setFormCliente({
            nome: c.nome || '',
            cnpj_cpf: c.cnpj_cpf || '',
            contato: c.contato || '',
            segmento: c.segmento || '',
            status: c.status || 'lead',
            email: c.email || '',
            telefone: c.telefone || '',
            focal_point_nome: c.focal_point_nome || '',
            responsaveis: c.responsaveis || [],
        });
        setSelectedResponsaveis(c.responsaveis || []);
        setShowModal(true);
    }, []);

    const toggleResponsavel = (uid: string) => {
        setSelectedResponsaveis(prev => {
            const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
            setFormCliente(f => ({ ...f, responsaveis: next }));
            return next;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formCliente.nome || !empresa) return;
        const payload: any = {
            nome: formCliente.nome,
            cnpj_cpf: formCliente.cnpj_cpf,
            contato: formCliente.contato,
            segmento: formCliente.segmento,
            status: formCliente.status,
            email: formCliente.email || null,
            telefone: formCliente.telefone || null,
            focal_point_nome: formCliente.focal_point_nome || null,
            responsaveis: formCliente.responsaveis,
        };
        try {
            if (editing) {
                const { error } = await supabase.from('clientes').update(payload).eq('id', editing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('clientes').insert([{ ...payload, empresa_id: empresa.id }]);
                if (error) throw error;
            }
            setShowModal(false);
            setEditing(null);
            setFormCliente(defaultForm);
            setSelectedResponsaveis([]);
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        } catch (err) {
            console.error('Erro ao salvar cliente:', err);
            alert('Falha ao salvar cliente.');
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        const { error } = await supabase.from('clientes').delete().eq('id', showDeleteConfirm);
        if (error) { console.error('Erro ao excluir:', error); alert('Falha ao excluir.'); }
        setShowDeleteConfirm(null);
        setShowModal(false);
        setEditing(null);
        setSelectedCliente(null);
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
    };

    if (!empresa) return null;

    // View de Perfil do Cliente
    if (selectedCliente) {
        const statusStyle = STATUS_LABELS[selectedCliente.status] || STATUS_LABELS.lead;
        return (
            <div className="space-y-6 max-w-5xl">
                <button onClick={() => setSelectedCliente(null)} className="flex items-center gap-1 text-sm text-dark-200 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Voltar para listagem
                </button>

                <div className="glass-card p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-axen-500 to-axen-700 flex items-center justify-center text-xl font-bold text-white">
                                {selectedCliente.nome.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedCliente.nome}</h2>
                                <p className="text-sm text-dark-200">{selectedCliente.cnpj_cpf || 'S/ CNPJ'} · {selectedCliente.segmento || 'Segmento não info'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                                {statusStyle.label}
                            </span>
                            <button onClick={() => openEdit(selectedCliente)} className="p-2 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-axen-400 transition-colors" title="Editar">
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-dark-800/50 rounded-lg p-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-axen-500/15 text-axen-400' : 'text-dark-200 hover:text-white'}`}>
                            <tab.icon className="w-4 h-4" />{tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-5">
                        {activeTab === 'dados' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div><label className="text-xs text-dark-300 uppercase tracking-wider">Nome / Razão Social</label><p className="text-white mt-1">{selectedCliente.nome}</p></div>
                                    <div><label className="text-xs text-dark-300 uppercase tracking-wider">CNPJ/CPF</label><p className="text-white mt-1">{selectedCliente.cnpj_cpf || '-'}</p></div>
                                    <div><label className="text-xs text-dark-300 uppercase tracking-wider">Focal Point</label><p className="text-white mt-1">{selectedCliente.focal_point_nome || '-'}</p></div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="text-xs text-dark-300 uppercase tracking-wider">E-mail</label><p className="text-white mt-1 flex items-center gap-2"><Mail className="w-4 h-4 text-dark-300" />{selectedCliente.email || selectedCliente.contato || 'Não informado'}</p></div>
                                    <div><label className="text-xs text-dark-300 uppercase tracking-wider">Telefone</label><p className="text-white mt-1 flex items-center gap-2"><Phone className="w-4 h-4 text-dark-300" />{selectedCliente.telefone || 'Não informado'}</p></div>
                                    <div><label className="text-xs text-dark-300 uppercase tracking-wider">Segmento</label><p className="text-white mt-1 flex items-center gap-2"><Building className="w-4 h-4 text-dark-300" />{selectedCliente.segmento || 'Não informado'}</p></div>
                                    {selectedCliente.responsaveis?.length > 0 && (
                                        <div>
                                            <label className="text-xs text-dark-300 uppercase tracking-wider">Responsáveis</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {selectedCliente.responsaveis.map((uid: string) => {
                                                    const u = usuarios.find((u: any) => u.id === uid);
                                                    return <span key={uid} className="px-2 py-1 bg-axen-500/10 text-axen-400 text-xs rounded-full">{u?.nome || uid}</span>;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'documentos' && (
                            <div className="text-center py-12">
                                <Upload className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                                <p className="text-dark-200 mb-2">Nenhum documento cadastrado</p>
                                <button className="text-sm text-axen-400 hover:text-axen-300 transition-colors">+ Fazer upload</button>
                            </div>
                        )}

                        {activeTab === 'financeiro' && (
                            isLoadingHist ? (
                                <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>
                            ) : clienteMovs.length === 0 ? (
                                <p className="text-center text-dark-300 py-12">Nenhuma movimentação vinculada</p>
                            ) : (
                                <div className="space-y-2">
                                    {clienteMovs.map((m: any) => (
                                        <div key={m.id} className="flex items-center justify-between bg-dark-800/50 rounded-lg p-3">
                                            <div>
                                                <p className="text-sm text-white">{m.descricao}</p>
                                                <p className="text-xs text-dark-300">{new Date(m.data).toLocaleDateString('pt-BR')} · {m.categoria}</p>
                                            </div>
                                            <p className={`text-sm font-semibold ${m.tipo === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {m.tipo === 'receita' ? '+' : '-'} {formatCurrency(m.valor)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {activeTab === 'atividades' && <p className="text-center text-dark-300 py-12">Módulo em implantação</p>}
                        {activeTab === 'metas' && <p className="text-center text-dark-300 py-12">Módulo em implantação</p>}
                        {activeTab === 'historico' && (
                            <div className="text-center py-12">
                                <Clock className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                                <p className="text-dark-200">Nenhum registro no histórico</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Clientes</h2>
                    <p className="text-dark-200 text-sm mt-1">CRM · {empresa!.nome}</p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white text-sm font-medium transition-all shadow-lg shadow-axen-500/20">
                    <Plus className="w-4 h-4" /> Novo Cliente
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total', value: clientes.length, color: 'text-axen-400', bg: 'bg-axen-500/10' },
                    { label: 'Clientes', value: clientes.filter((c: any) => c.status === 'ativo').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Leads', value: clientes.filter((c: any) => c.status === 'lead').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${s.bg}`}><Users className={`w-4 h-4 ${s.color}`} /></div>
                        <div><p className="text-lg font-bold text-white">{s.value}</p><p className="text-xs text-dark-200">{s.label}</p></div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-300" />
                    <input type="text" placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 text-sm" />
                </div>
                <Filter className="w-4 h-4 text-dark-300" />
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todos os status</option>
                    <option value="ativo">Cliente</option>
                    <option value="lead">Lead</option>
                    <option value="inativo">Inativo</option>
                </select>
                <select value={filtroSegmento} onChange={(e) => setFiltroSegmento(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todos segmentos</option>
                    {segmentos.map((s: any) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {isLoading ? (
                <div className="py-24 flex justify-center"><div className="w-10 h-10 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {clientesFiltrados.map((cliente: any, i: number) => {
                        const statusStyle = STATUS_LABELS[cliente.status] || STATUS_LABELS.lead;
                        return (
                            <motion.div key={cliente.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="glass-card p-4 hover:border-axen-500/20 transition-all group">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-axen-500/20 to-axen-700/20 flex items-center justify-center text-axen-400 font-bold text-sm group-hover:from-axen-500/30 group-hover:to-axen-700/30 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedCliente(cliente); setActiveTab('dados'); }}>
                                        {cliente.nome.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-white truncate cursor-pointer hover:text-axen-400 transition-colors"
                                                onClick={() => { setSelectedCliente(cliente); setActiveTab('dados'); }}>
                                                {cliente.nome}
                                            </p>
                                            <span className={`shrink-0 ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                                                {statusStyle.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-dark-300 mt-0.5">{cliente.cnpj_cpf || 'S/ CPF-CNPJ'}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="flex items-center gap-1 text-xs text-dark-200"><Building className="w-3 h-3" />{cliente.segmento || 'Não informado'}</span>
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(cliente); }}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-axen-500/10 text-axen-400 text-xs font-medium hover:bg-axen-500/20 transition-colors opacity-0 group-hover:opacity-100">
                                                <Pencil className="w-3 h-3" /> Editar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
            {clientesFiltrados.length === 0 && !isLoading && (
                <div className="py-24 text-center">
                    <AlertCircle className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white">Nenhum cliente encontrado</h3>
                </div>
            )}

            {/* Modal Criar/Editar */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditing(null); }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-lg glow-blue max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-white">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                                <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Nome / Razão Social</label>
                                    <input type="text" required placeholder="Nome do cliente..." value={formCliente.nome} onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">CNPJ/CPF</label>
                                        <input type="text" placeholder="00.000.000/0001-00" value={formCliente.cnpj_cpf} onChange={(e) => setFormCliente({ ...formCliente, cnpj_cpf: e.target.value })} className="w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Segmento</label>
                                        <input type="text" placeholder="Ex: Energia" value={formCliente.segmento} onChange={(e) => setFormCliente({ ...formCliente, segmento: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">E-mail</label>
                                        <input type="email" placeholder="contato@empresa.com" value={formCliente.email} onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })} className="w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Telefone</label>
                                        <input type="tel" placeholder="(11) 99999-0000" value={formCliente.telefone} onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Nome do Focal Point</label>
                                    <input type="text" placeholder="Pessoa de contato principal" value={formCliente.focal_point_nome} onChange={(e) => setFormCliente({ ...formCliente, focal_point_nome: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Categoria</label>
                                    <select value={formCliente.status} onChange={(e) => setFormCliente({ ...formCliente, status: e.target.value })} className="w-full text-sm">
                                        <option value="lead">Lead</option>
                                        <option value="ativo">Cliente</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                                {/* Multi-select responsáveis */}
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Responsáveis</label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {selectedResponsaveis.map(uid => {
                                            const u = usuarios.find((u: any) => u.id === uid);
                                            return u ? (
                                                <span key={uid} className="inline-flex items-center gap-1 px-2 py-1 bg-axen-500/15 text-axen-400 text-xs rounded-full">
                                                    {u.nome}
                                                    <button type="button" onClick={() => toggleResponsavel(uid)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto border border-dark-700 rounded-lg">
                                        {usuarios.map((u: any) => (
                                            <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-dark-800/50 cursor-pointer text-sm text-dark-200 hover:text-white transition-colors">
                                                <input type="checkbox" checked={selectedResponsaveis.includes(u.id)} onChange={() => toggleResponsavel(u.id)}
                                                    className="w-3.5 h-3.5 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                                {u.nome}
                                            </label>
                                        ))}
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
                                        {editing ? 'Salvar Alterações' : 'Finalizar Cadastro'}
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
                                <h4 className="text-base font-semibold text-white">Excluir cliente?</h4>
                            </div>
                            <p className="text-sm text-dark-200 mb-5">O cliente será permanentemente removido. Essa ação não pode ser desfeita.</p>
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

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Filter, X, Search, Mail, Phone, Building, AlertCircle,
    Pencil, Trash2, AlertTriangle,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    ativo: { label: 'Ativo', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    inativo: { label: 'Inativo', color: 'text-dark-300', bg: 'bg-dark-600/50' },
};

const defaultForm = {
    nome: '', cnpj_cpf: '', email: '', telefone: '', contato_nome: '',
    segmento: '', status: 'ativo', observacoes: '',
};

export default function Fornecedores() {
    const { empresa } = useEmpresa();
    const queryClient = useQueryClient();
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [busca, setBusca] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const { data: fornecedores = [], isLoading } = useQuery({
        queryKey: ['fornecedores', empresa?.id, filtroStatus],
        queryFn: async () => {
            let query = supabase
                .from('fornecedores')
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

    const fornecedoresFiltrados = useMemo(() => {
        if (!busca) return fornecedores;
        return fornecedores.filter((f: any) =>
            f.nome.toLowerCase().includes(busca.toLowerCase()) ||
            (f.cnpj_cpf && f.cnpj_cpf.includes(busca))
        );
    }, [fornecedores, busca]);

    const openNew = () => {
        setEditing(null);
        setForm(defaultForm);
        setShowModal(true);
    };

    const openEdit = useCallback((f: any) => {
        setEditing(f);
        setForm({
            nome: f.nome || '',
            cnpj_cpf: f.cnpj_cpf || '',
            email: f.email || '',
            telefone: f.telefone || '',
            contato_nome: f.contato_nome || '',
            segmento: f.segmento || '',
            status: f.status || 'ativo',
            observacoes: f.observacoes || '',
        });
        setShowModal(true);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nome || !empresa) return;
        const payload: any = {
            nome: form.nome,
            cnpj_cpf: form.cnpj_cpf || null,
            email: form.email || null,
            telefone: form.telefone || null,
            contato_nome: form.contato_nome || null,
            segmento: form.segmento || null,
            status: form.status,
            observacoes: form.observacoes || null,
        };
        try {
            if (editing) {
                const { error } = await supabase.from('fornecedores').update(payload).eq('id', editing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('fornecedores').insert([{ ...payload, empresa_id: empresa.id }]);
                if (error) throw error;
            }
            setShowModal(false);
            setEditing(null);
            setForm(defaultForm);
            queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
        } catch {
            alert('Falha ao salvar fornecedor.');
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        const { error } = await supabase.from('fornecedores').delete().eq('id', showDeleteConfirm);
        if (error) { alert('Falha ao excluir.'); }
        setShowDeleteConfirm(null);
        setShowModal(false);
        setEditing(null);
        queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    };

    if (!empresa) return null;

    if (isLoading) {
        return <div className="py-24 flex justify-center"><div className="w-10 h-10 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Fornecedores</h2>
                    <p className="text-dark-200 text-sm mt-1">Gestão de fornecedores · {empresa.nome}</p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white text-sm font-medium transition-all shadow-lg shadow-axen-500/20">
                    <Plus className="w-4 h-4" /> Novo Fornecedor
                </button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                    <Search className="w-4 h-4 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)}
                        className="bg-dark-900 border border-dark-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-axen-500/50 w-48" />
                </div>
                <Filter className="w-4 h-4 text-dark-300" />
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="text-sm bg-dark-700 border-dark-500 rounded-lg px-3 py-1.5">
                    <option value="todos">Todos</option>
                    <option value="ativo">Ativos</option>
                    <option value="inativo">Inativos</option>
                </select>
            </div>

            {/* Lista */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {fornecedoresFiltrados.map((f: any, i: number) => {
                    const statusStyle = STATUS_LABELS[f.status] || STATUS_LABELS.ativo;
                    return (
                        <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="glass-card p-4 hover:border-axen-500/20 transition-all group">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-axen-500/20 to-axen-700/20 flex items-center justify-center text-axen-400 font-bold text-sm">
                                    {f.nome.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-white truncate">{f.nome}</p>
                                        <span className={`shrink-0 ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                                            {statusStyle.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-dark-300 mt-0.5">{f.cnpj_cpf || 'S/ CPF-CNPJ'}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-dark-200">
                                        {f.segmento && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{f.segmento}</span>}
                                        {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        {f.telefone && <span className="flex items-center gap-1 text-xs text-dark-200"><Phone className="w-3 h-3" />{f.telefone}</span>}
                                        <button onClick={(e) => { e.stopPropagation(); openEdit(f); }}
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
            {fornecedoresFiltrados.length === 0 && !isLoading && (
                <div className="py-24 text-center">
                    <AlertCircle className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white">Nenhum fornecedor encontrado</h3>
                    <p className="text-dark-400 text-sm mt-1">Ajuste os filtros ou cadastre um novo.</p>
                </div>
            )}

            {/* Modal Criar/Editar */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditing(null); }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-lg glow-blue max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-white">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                                <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Nome / Razão Social</label>
                                    <input type="text" required placeholder="Nome do fornecedor..." value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">CNPJ/CPF</label>
                                        <input type="text" placeholder="00.000.000/0001-00" value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} className="w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Segmento</label>
                                        <input type="text" placeholder="Ex: Tecnologia" value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">E-mail</label>
                                        <input type="email" placeholder="contato@fornecedor.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Telefone</label>
                                        <input type="tel" placeholder="(11) 99999-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Nome do Contato</label>
                                    <input type="text" placeholder="Pessoa de contato" value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Status</label>
                                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full text-sm">
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Observações</label>
                                    <textarea placeholder="Notas sobre o fornecedor..." value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full text-sm h-20" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    {editing && (
                                        <button type="button" onClick={() => setShowDeleteConfirm(editing.id)}
                                            className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-1.5">
                                            <Trash2 className="w-4 h-4" /> Excluir
                                        </button>
                                    )}
                                    <button type="submit" className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white font-medium text-sm transition-all shadow-lg shadow-axen-500/20">
                                        {editing ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
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
                                <h4 className="text-base font-semibold text-white">Excluir fornecedor?</h4>
                            </div>
                            <p className="text-sm text-dark-200 mb-5">O fornecedor será permanentemente removido. Essa ação não pode ser desfeita.</p>
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

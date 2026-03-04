import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    X,
    Tag,
    Clock,
    CheckCircle2,
    AlertCircle,
    Pencil,
    Trash2,
    Check,
    AlertTriangle,
    FilterX,
    Repeat,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { formatCurrency, parseCurrencyToNumber, formatCurrencyInput } from '../utils/formatters';
import { formatDateBR } from '../utils/dateUtils';
import type { Movimentacao, Reembolso } from '../types';
import { supabase } from '../services/supabaseClient';
import { useMembrosDaEmpresa } from '../hooks/useMembrosDaEmpresa';

type Tab = 'movimentacoes' | 'reembolsos';

export default function Financeiro() {
    const { empresa } = useEmpresa();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('movimentacoes');
    const [filtroTipo, setFiltroTipo] = useState<string>('todos');
    const [filtroStatus, setFiltroStatus] = useState<string>('todos');
    const [filtroCategoria] = useState<string>('todos');
    const [showModal, setShowModal] = useState(false);
    const [showReembolsoModal, setShowReembolsoModal] = useState(false);
    const [editingMov, setEditingMov] = useState<Movimentacao | null>(null);
    const [editingReemb, setEditingReemb] = useState<Reembolso | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'mov' | 'reemb'; id: string } | null>(null);

    const defaultFormMov = {
        tipo: 'entrada' as 'entrada' | 'saida', valor: 0, data: new Date().toISOString().split('T')[0],
        data_prevista: '', data_realizada: '',
        categoria: '', status: 'confirmado' as 'confirmado' | 'previsto', descricao: '',
        origem_cliente_id: '' as string, destino_usuario_id: '' as string, destino_fornecedor_id: '' as string, destino_tipo: 'terceiros',
    };

    /** Filtros avançados — ano atual pré-selecionado */
    const anoAtual = String(new Date().getFullYear());
    const [filtroDataPrevMes, setFiltroDataPrevMes] = useState('');
    const [filtroDataPrevAno, setFiltroDataPrevAno] = useState(anoAtual);
    const [filtroDataRealMes, setFiltroDataRealMes] = useState('');
    const [filtroDataRealAno, setFiltroDataRealAno] = useState(anoAtual);
    const [filtroClienteFornecedor, setFiltroClienteFornecedor] = useState<string>('');
    const [filtroClienteFornecedorTexto, setFiltroClienteFornecedorTexto] = useState('');
    const [showCfSuggestions, setShowCfSuggestions] = useState(false);
    const cfInputRef = useRef<HTMLInputElement>(null);
    const [showCatSuggestions, setShowCatSuggestions] = useState(false);
    const catInputRef = useRef<HTMLInputElement>(null);

    /** Recorrência */
    const [isRecorrente, setIsRecorrente] = useState(false);
    const [recorrenciaInicio, setRecorrenciaInicio] = useState('');
    const [recorrenciaFim, setRecorrenciaFim] = useState('');

    const [formMov, setFormMov] = useState(defaultFormMov);

    const defaultFormReemb = { valor: 0, responsavel: '', status: 'pendente' as 'pendente' | 'pago', descricao: '' };
    const [formReemb, setFormReemb] = useState(defaultFormReemb);

    // Queries
    const { data: movimentacoes = [], isLoading: isLoadingMov } = useQuery({
        queryKey: ['movimentacoes', empresa?.id, filtroTipo, filtroStatus],
        queryFn: async () => {
            let query = supabase
                .from('movimentacoes')
                .select('*')
                .eq('empresa_id', empresa!.id)
                .order('data', { ascending: false });
            if (filtroTipo !== 'todos') query = query.eq('tipo', filtroTipo);
            if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus);
            const { data, error } = await query;
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
        refetchInterval: 10000,
        retry: 2,
    });

    const { data: reembolsos = [], isLoading: isLoadingReem } = useQuery({
        queryKey: ['reembolsos', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reembolsos')
                .select('*')
                .eq('empresa_id', empresa!.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
        refetchInterval: 10000,
        retry: 2,
    });

    /** Clientes da empresa para dropdown de Origem */
    const { data: clientes = [] } = useQuery({
        queryKey: ['clientes-dropdown', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nome')
                .eq('empresa_id', empresa!.id)
                .order('nome');
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    /** Membros da empresa para dropdowns de destino e responsável */
    const { data: membros = [] } = useMembrosDaEmpresa(empresa?.id);
    const [selectedReembResponsaveis, setSelectedReembResponsaveis] = useState<string[]>([]);

    /** Fornecedores da empresa para dropdown de Destino */
    const { data: fornecedores = [] } = useQuery({
        queryKey: ['fornecedores-dropdown', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fornecedores')
                .select('id, nome')
                .eq('empresa_id', empresa!.id)
                .eq('status', 'ativo')
                .order('nome');
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    /** Categorias existentes (distinct) para autocomplete */
    const categoriasExistentes = useMemo(() => {
        const cats = movimentacoes.map((m: any) => m.categoria).filter(Boolean);
        return [...new Set(cats)].sort();
    }, [movimentacoes]);

    /** Helper para resolver nome de cliente/fornecedor */
    const resolverNomeDestino = useCallback((mov: any) => {
        if (mov.origem_cliente_id) {
            const c = clientes.find((c: any) => c.id === mov.origem_cliente_id);
            return c ? c.nome : null;
        }
        if (mov.destino_fornecedor_id) {
            const f = fornecedores.find((f: any) => f.id === mov.destino_fornecedor_id);
            return f ? f.nome : null;
        }
        if (mov.destino_usuario_id) {
            const m = membros.find(m => m.id === mov.destino_usuario_id);
            return m ? m.displayName : null;
        }
        if (mov.destino_tipo === 'terceiros') return 'Terceiros';
        return null;
    }, [clientes, fornecedores, membros]);

    const movsFiltradas = useMemo(() => {
        let filtered = movimentacoes;
        if (filtroCategoria !== 'todos') filtered = filtered.filter((m: any) => m.categoria === filtroCategoria);
        /* Filtro Data Prevista: por ano sozinho ou ano+mês */
        if (filtroDataPrevAno) {
            const prefix = filtroDataPrevMes ? `${filtroDataPrevAno}-${filtroDataPrevMes}` : filtroDataPrevAno;
            filtered = filtered.filter((m: any) => m.data_prevista && m.data_prevista.startsWith(prefix));
        }
        /* Filtro Data Realizada: mesma lógica */
        if (filtroDataRealAno) {
            const prefix = filtroDataRealMes ? `${filtroDataRealAno}-${filtroDataRealMes}` : filtroDataRealAno;
            filtered = filtered.filter((m: any) => m.data_realizada && m.data_realizada.startsWith(prefix));
        }
        if (filtroClienteFornecedor) {
            filtered = filtered.filter((m: any) =>
                m.origem_cliente_id === filtroClienteFornecedor ||
                m.destino_fornecedor_id === filtroClienteFornecedor ||
                m.destino_usuario_id === filtroClienteFornecedor
            );
        }
        return filtered;
    }, [movimentacoes, filtroCategoria, filtroDataPrevMes, filtroDataPrevAno, filtroDataRealMes, filtroDataRealAno, filtroClienteFornecedor]);

    /** Lista combinada de clientes + fornecedores para autocomplete */
    const clientesFornecedoresList = useMemo(() => {
        const items: { id: string; nome: string; tipo: 'Cliente' | 'Fornecedor' }[] = [];
        clientes.forEach((c: any) => items.push({ id: c.id, nome: c.nome, tipo: 'Cliente' }));
        fornecedores.forEach((f: any) => items.push({ id: f.id, nome: f.nome, tipo: 'Fornecedor' }));
        return items;
    }, [clientes, fornecedores]);

    const hasAdvancedFilters = filtroDataPrevMes || filtroDataPrevAno !== anoAtual || filtroDataRealMes || filtroDataRealAno !== anoAtual || filtroClienteFornecedor;
    const clearAdvancedFilters = () => {
        setFiltroDataPrevMes(''); setFiltroDataPrevAno(anoAtual);
        setFiltroDataRealMes(''); setFiltroDataRealAno(anoAtual);
        setFiltroClienteFornecedor(''); setFiltroClienteFornecedorTexto('');
    };

    const stats = useMemo(() => {
        const entradas = movimentacoes.filter((m: any) => m.tipo === 'entrada' && m.status === 'confirmado')
            .reduce((acc: number, cur: any) => acc + Number(cur.valor), 0);
        const saidas = movimentacoes.filter((m: any) => m.tipo === 'saida' && m.status === 'confirmado')
            .reduce((acc: number, cur: any) => acc + Number(cur.valor), 0);
        const previsto = movimentacoes.filter((m: any) => m.status === 'previsto')
            .reduce((acc: number, cur: any) => acc + (cur.tipo === 'entrada' ? Number(cur.valor) : -Number(cur.valor)), 0);
        /** Reembolsos pendentes contam como saída projetada */
        const reembPendente = reembolsos
            .filter((r: any) => r.status === 'pendente')
            .reduce((acc: number, cur: any) => acc + Number(cur.valor), 0);
        return { saldo: entradas - saidas, entradas, saidas, previsto: previsto - reembPendente };
    }, [movimentacoes, reembolsos]);

    // ---- Handlers ----

    const openEditMov = useCallback((mov: Movimentacao) => {
        setEditingMov(mov);
        setFormMov({
            tipo: mov.tipo,
            valor: Number(mov.valor),
            data: mov.data,
            data_prevista: mov.data_prevista || '',
            data_realizada: mov.data_realizada || '',
            categoria: mov.categoria,
            status: mov.status,
            descricao: mov.descricao || '',
            origem_cliente_id: mov.origem_cliente_id || '',
            destino_usuario_id: mov.destino_usuario_id || '',
            destino_fornecedor_id: mov.destino_fornecedor_id || '',
            destino_tipo: mov.destino_tipo || 'terceiros',
        });
        setShowModal(true);
    }, []);

    const openEditReemb = useCallback((r: Reembolso) => {
        setEditingReemb(r);
        setFormReemb({
            valor: Number(r.valor),
            responsavel: r.responsavel,
            status: r.status,
            descricao: r.descricao || '',
        });
        const names = (r.responsavel || '').split(', ').map((s: string) => s.trim()).filter(Boolean);
        setSelectedReembResponsaveis(membros.filter(m => names.includes(m.displayName)).map(m => m.id));
        setShowReembolsoModal(true);
    }, [membros]);

    const toggleReembResponsavel = (userId: string) => {
        setSelectedReembResponsaveis(prev => {
            const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
            const names = next.map(id => membros.find(m => m.id === id)?.displayName).filter(Boolean).join(', ');
            setFormReemb(f => ({ ...f, responsavel: names }));
            return next;
        });
    };

    const handleSaveMov = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empresa || !formMov.valor) return;

        const basePayload: any = {
            tipo: formMov.tipo,
            valor: formMov.valor,
            data: formMov.data,
            data_prevista: formMov.data_prevista || null,
            data_realizada: formMov.data_realizada || null,
            categoria: formMov.categoria,
            status: formMov.status,
            descricao: formMov.descricao,
            origem_cliente_id: formMov.tipo === 'entrada' && formMov.origem_cliente_id ? formMov.origem_cliente_id : null,
            destino_usuario_id: formMov.tipo === 'saida' && formMov.destino_tipo === 'usuario' && formMov.destino_usuario_id ? formMov.destino_usuario_id : null,
            destino_fornecedor_id: formMov.tipo === 'saida' && formMov.destino_tipo === 'fornecedor' && formMov.destino_fornecedor_id ? formMov.destino_fornecedor_id : null,
            destino_tipo: formMov.tipo === 'saida' ? formMov.destino_tipo : null,
        };

        try {
            if (editingMov) {
                const { error } = await supabase.from('movimentacoes').update(basePayload).eq('id', editingMov.id);
                if (error) throw error;
            } else if (isRecorrente && recorrenciaInicio && recorrenciaFim) {
                /** Batch insert de transações recorrentes */
                const grupoId = crypto.randomUUID();
                const [anoI, mesI] = recorrenciaInicio.split('-').map(Number);
                const [anoF, mesF] = recorrenciaFim.split('-').map(Number);
                const totalMeses = (anoF - anoI) * 12 + (mesF - mesI) + 1;
                if (totalMeses < 1 || totalMeses > 60) { alert('Intervalo inválido (máx 60 meses).'); return; }

                const diaBase = formMov.data_prevista
                    ? parseInt(formMov.data_prevista.split('-')[2] || '1', 10)
                    : parseInt(formMov.data.split('-')[2] || '1', 10);

                const records = Array.from({ length: totalMeses }, (_, i) => {
                    const dt = new Date(anoI, mesI - 1 + i, 1);
                    const ultimoDia = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
                    const dia = Math.min(diaBase, ultimoDia);
                    const dataPrev = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    return {
                        ...basePayload,
                        empresa_id: empresa.id,
                        data: dataPrev,
                        data_prevista: dataPrev,
                        data_realizada: null,
                        status: 'previsto' as const,
                        recorrente: true,
                        recorrencia_grupo_id: grupoId,
                    };
                });

                const { error } = await supabase.from('movimentacoes').insert(records);
                if (error) throw error;
                alert(`${records.length} movimentações recorrentes criadas com sucesso`);
            } else {
                const { error } = await supabase.from('movimentacoes').insert([{ ...basePayload, empresa_id: empresa.id }]);
                if (error) throw error;
            }
            setShowModal(false);
            setEditingMov(null);
            setFormMov(defaultFormMov);
            setIsRecorrente(false);
            setRecorrenciaInicio('');
            setRecorrenciaFim('');
            await queryClient.invalidateQueries();
        } catch (err) {
            alert('Falha ao salvar movimentação.');
        }
    };

    const handleSaveReemb = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empresa || !formReemb.valor) return;

        try {
            if (editingReemb) {
                const { error } = await supabase.from('reembolsos').update(formReemb).eq('id', editingReemb.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('reembolsos').insert([{ ...formReemb, empresa_id: empresa.id }]);
                if (error) throw error;
            }
            setShowReembolsoModal(false);
            setEditingReemb(null);
            setFormReemb(defaultFormReemb);
            queryClient.invalidateQueries({ queryKey: ['reembolsos'] });
        } catch (err) {
            // Erro tratado na UI
            alert('Falha ao salvar reembolso.');
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        const table = showDeleteConfirm.type === 'mov' ? 'movimentacoes' : 'reembolsos';
        const { error } = await supabase.from(table).delete().eq('id', showDeleteConfirm.id);
        if (error) { alert('Falha ao excluir.'); }
        setShowDeleteConfirm(null);
        setShowModal(false);
        setShowReembolsoModal(false);
        setEditingMov(null);
        setEditingReemb(null);
        await queryClient.invalidateQueries();
    };

    const handleApprove = async (type: 'mov' | 'reemb', id: string) => {
        if (!window.confirm('Confirmar aprovação desta movimentação?')) return;
        const table = type === 'mov' ? 'movimentacoes' : 'reembolsos';
        const newStatus = type === 'mov' ? 'confirmado' : 'pago';
        const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id);
        if (error) return;
        await queryClient.invalidateQueries();
    };

    if (!empresa) return null;

    const isMovModalOpen = showModal;
    const isReembModalOpen = showReembolsoModal;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Financeiro</h2>
                    <p className="text-dark-200 text-sm mt-1">Gestão de caixa e reembolsos · {empresa!.nome}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingReemb(null); setFormReemb(defaultFormReemb); setShowReembolsoModal(true); }} className="btn-secondary py-2 px-4 h-auto text-sm">
                        Solicitar Reembolso
                    </button>
                    <button onClick={() => { setEditingMov(null); setFormMov(defaultFormMov); setShowModal(true); }} className="btn-primary py-2 px-4 h-auto text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nova Movimentação
                    </button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-5 border-l-4 border-l-emerald-500">
                    <p className="text-dark-300 text-xs font-medium uppercase tracking-wider">Saldo em Caixa</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.saldo)}</h3>
                        <div className="p-2 bg-emerald-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
                    </div>
                </div>
                <div className="card p-5 border-l-4 border-l-axen-500">
                    <p className="text-dark-300 text-xs font-medium uppercase tracking-wider">Entradas (Confirmadas)</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.entradas)}</h3>
                        <div className="p-2 bg-axen-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-axen-400" /></div>
                    </div>
                </div>
                <div className="card p-5 border-l-4 border-l-red-500">
                    <p className="text-dark-300 text-xs font-medium uppercase tracking-wider">Saídas (Confirmadas)</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.saidas)}</h3>
                        <div className="p-2 bg-red-500/10 rounded-lg"><TrendingDown className="w-5 h-5 text-red-400" /></div>
                    </div>
                </div>
                <div className="card p-5 border-l-4 border-l-amber-500">
                    <p className="text-dark-300 text-xs font-medium uppercase tracking-wider">Fluxo Previsto</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.previsto)}</h3>
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Clock className="w-5 h-5 text-amber-400" /></div>
                    </div>
                </div>
            </div>

            {/* Tabs e Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800 pb-px">
                <div className="flex gap-8">
                    {(['movimentacoes', 'reembolsos'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-axen-400' : 'text-dark-400 hover:text-dark-200'}`}>
                            {tab === 'movimentacoes' ? 'Movimentações' : 'Reembolsos'}
                            {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-axen-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 pb-4 md:pb-0">
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="bg-dark-900 border border-dark-800 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-axen-500/50">
                        <option value="todos">Todos Tipos</option>
                        <option value="entrada">Entradas</option>
                        <option value="saida">Saídas</option>
                    </select>
                    <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="bg-dark-900 border border-dark-800 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-axen-500/50">
                        <option value="todos">Status</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="previsto">Previsto</option>
                    </select>
                    {activeTab === 'movimentacoes' && (
                        <>
                            {/* Data Prevista */}
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-dark-400 uppercase tracking-wider mr-0.5">Prev.</span>
                                <select value={filtroDataPrevMes} onChange={(e) => setFiltroDataPrevMes(e.target.value)}
                                    className="bg-dark-900 border border-dark-800 rounded-lg px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-axen-500/50">
                                    <option value="">Mês</option>
                                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => (
                                        <option key={m} value={m}>{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i]}</option>
                                    ))}
                                </select>
                                <select value={filtroDataPrevAno} onChange={(e) => setFiltroDataPrevAno(e.target.value)}
                                    className="bg-dark-900 border border-dark-800 rounded-lg px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-axen-500/50">
                                    {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            {/* Data Realizada */}
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-dark-400 uppercase tracking-wider mr-0.5">Real.</span>
                                <select value={filtroDataRealMes} onChange={(e) => setFiltroDataRealMes(e.target.value)}
                                    className="bg-dark-900 border border-dark-800 rounded-lg px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-axen-500/50">
                                    <option value="">Mês</option>
                                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => (
                                        <option key={m} value={m}>{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i]}</option>
                                    ))}
                                </select>
                                <select value={filtroDataRealAno} onChange={(e) => setFiltroDataRealAno(e.target.value)}
                                    className="bg-dark-900 border border-dark-800 rounded-lg px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-axen-500/50">
                                    {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            {/* Cliente/Fornecedor autocomplete */}
                            <div className="relative">
                                <input type="text" ref={cfInputRef}
                                    value={filtroClienteFornecedorTexto}
                                    onChange={(e) => { setFiltroClienteFornecedorTexto(e.target.value); setShowCfSuggestions(true); if (!e.target.value) setFiltroClienteFornecedor(''); }}
                                    onFocus={() => setShowCfSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowCfSuggestions(false), 200)}
                                    placeholder="Cliente / Forn."
                                    className="bg-dark-900 border border-dark-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-axen-500/50 w-36 pr-6" />
                                {filtroClienteFornecedor && (
                                    <button type="button" onClick={() => { setFiltroClienteFornecedor(''); setFiltroClienteFornecedorTexto(''); }}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"><X className="w-3 h-3" /></button>
                                )}
                                {showCfSuggestions && filtroClienteFornecedorTexto && !filtroClienteFornecedor && (
                                    <div className="absolute z-10 top-full left-0 mt-1 w-56 bg-dark-800 border border-dark-700 rounded-lg max-h-40 overflow-y-auto shadow-xl">
                                        {clientesFornecedoresList
                                            .filter(cf => cf.nome.toLowerCase().startsWith(filtroClienteFornecedorTexto.toLowerCase()))
                                            .map(cf => (
                                                <button key={cf.id} type="button" className="w-full text-left px-3 py-2 text-sm text-dark-200 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-2"
                                                    onMouseDown={() => { setFiltroClienteFornecedor(cf.id); setFiltroClienteFornecedorTexto(cf.nome); setShowCfSuggestions(false); }}>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cf.tipo === 'Cliente' ? 'bg-axen-500/20 text-axen-400' : 'bg-amber-500/20 text-amber-400'}`}>{cf.tipo === 'Cliente' ? 'C' : 'F'}</span>
                                                    {cf.nome}
                                                </button>
                                            ))}
                                        {clientesFornecedoresList.filter(cf => cf.nome.toLowerCase().startsWith(filtroClienteFornecedorTexto.toLowerCase())).length === 0 && (
                                            <p className="px-3 py-2 text-xs text-dark-400">Nenhum resultado</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            {hasAdvancedFilters && (
                                <button onClick={clearAdvancedFilters} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors">
                                    <FilterX className="w-3.5 h-3.5" /> Limpar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Listagem Movimentações */}
            {activeTab === 'movimentacoes' ? (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoadingMov ? (
                            <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-dark-900/50 border-b border-dark-800">
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider">Data Prev.</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider">Data Real.</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider">Cliente / Fornecedor</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider">Categoria</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider">Valor</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-800">
                                    {movsFiltradas.map((mov: any) => (
                                        <tr key={mov.id} className="hover:bg-dark-800/30 transition-colors group">
                                            <td className="px-5 py-3 whitespace-nowrap text-sm text-dark-200">
                                                {formatDateBR(mov.data_prevista)}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-sm text-dark-200">
                                                {formatDateBR(mov.data_realizada)}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-white">
                                                {resolverNomeDestino(mov) || <span className="text-dark-400">—</span>}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className="px-2 py-1 bg-dark-800 text-dark-200 rounded text-xs">{mov.categoria}</span>
                                            </td>
                                            <td className={`px-5 py-3 whitespace-nowrap text-sm font-bold ${mov.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {mov.tipo === 'entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 text-xs font-medium ${mov.status === 'confirmado' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {mov.status === 'confirmado' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                                    {mov.status === 'confirmado' ? 'Confirmado' : 'Previsto'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {mov.status === 'previsto' && (
                                                        <button onClick={() => handleApprove('mov', mov.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-dark-400 hover:text-emerald-400 transition-colors" title="Aprovar">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEditMov(mov)} className="p-1.5 rounded-lg hover:bg-axen-500/10 text-dark-400 hover:text-axen-400 transition-colors" title="Editar">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {movsFiltradas.length === 0 && !isLoadingMov && (
                            <div className="p-12 text-center">
                                <AlertCircle className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white">Nenhuma movimentação encontrada</h3>
                                <p className="text-dark-400 text-sm mt-1">Ajuste os filtros ou adicione um novo lançamento.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingReem ? (
                        <div className="col-span-full py-12 flex justify-center"><div className="w-8 h-8 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>
                    ) : (
                        reembolsos.map((r: any) => (
                            <div key={r.id} className="card p-5 hover:border-dark-700 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-dark-800 rounded-lg"><Tag className="w-4 h-4 text-dark-300" /></div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.status}</span>
                                    </div>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">{formatCurrency(r.valor)}</h4>
                                <p className="text-dark-300 text-sm mb-4">{r.descricao || 'Sem descrição'}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-dark-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-axen-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">{r.responsavel?.[0] || '?'}</div>
                                        <span className="text-xs text-dark-200">{r.responsavel}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {r.status === 'pendente' && (
                                            <button onClick={() => handleApprove('reemb', r.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-dark-400 hover:text-emerald-400 transition-colors" title="Aprovar"><Check className="w-4 h-4" /></button>
                                        )}
                                        <button onClick={() => openEditReemb(r)} className="p-1.5 rounded-lg hover:bg-axen-500/10 text-dark-400 hover:text-axen-400 transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Movimentação (Criar/Editar) */}
            <AnimatePresence>
                {isMovModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => { setShowModal(false); setEditingMov(null); }}
                            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">{editingMov ? 'Editar Movimentação' : 'Nova Movimentação'}</h3>
                                <button onClick={() => { setShowModal(false); setEditingMov(null); }} className="text-dark-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleSaveMov} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Tipo</label>
                                        <select value={formMov.tipo} onChange={(e) => setFormMov({ ...formMov, tipo: e.target.value as any })} className="w-full text-sm">
                                            <option value="entrada">Entrada</option>
                                            <option value="saida">Saída</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Valor (R$)</label>
                                        <input type="text" required
                                            value={formatCurrencyInput(formMov.valor || 0)}
                                            onChange={(e) => setFormMov({ ...formMov, valor: parseCurrencyToNumber(e.target.value) })}
                                            className="w-full text-sm" placeholder="0,00" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-dark-300 uppercase">Descrição</label>
                                    <input type="text" required value={formMov.descricao}
                                        onChange={(e) => setFormMov({ ...formMov, descricao: e.target.value })}
                                        className="w-full text-sm" placeholder="Ex: Pagamento Consultoria" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Data Prevista</label>
                                        <input type="date" value={formMov.data_prevista}
                                            onChange={(e) => setFormMov({ ...formMov, data_prevista: e.target.value, data: e.target.value || formMov.data })}
                                            className="w-full text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Data Realizada</label>
                                        <input type="date" value={formMov.data_realizada}
                                            onChange={(e) => setFormMov({ ...formMov, data_realizada: e.target.value, data: e.target.value || formMov.data })}
                                            className="w-full text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Categoria</label>
                                        <input type="text" ref={catInputRef} value={formMov.categoria}
                                            onChange={(e) => { setFormMov({ ...formMov, categoria: e.target.value }); setShowCatSuggestions(true); }}
                                            onFocus={() => setShowCatSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowCatSuggestions(false), 200)}
                                            className="w-full text-sm" placeholder="Digite a categoria..." />
                                        {showCatSuggestions && formMov.categoria && (
                                            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-700 rounded-lg max-h-32 overflow-y-auto shadow-xl">
                                                {categoriasExistentes.filter(c => c.toLowerCase().includes(formMov.categoria.toLowerCase())).map(c => (
                                                    <button key={c} type="button" className="w-full text-left px-3 py-2 text-sm text-dark-200 hover:text-white hover:bg-dark-700 transition-colors"
                                                        onMouseDown={() => { setFormMov(f => ({ ...f, categoria: c })); setShowCatSuggestions(false); }}>
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Status</label>
                                        <select value={formMov.status} onChange={(e) => setFormMov({ ...formMov, status: e.target.value as any })} className="w-full text-sm">
                                            <option value="confirmado">Confirmado</option>
                                            <option value="previsto">Previsto</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Origem — visível somente quando tipo='entrada' */}
                                {formMov.tipo === 'entrada' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Cliente de Origem</label>
                                        <select value={formMov.origem_cliente_id} onChange={(e) => setFormMov({ ...formMov, origem_cliente_id: e.target.value })} className="w-full text-sm">
                                            <option value="">Nenhum</option>
                                            {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Destino — visível somente quando tipo='saida' */}
                                {formMov.tipo === 'saida' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-dark-300 uppercase">Destino</label>
                                        <select value={formMov.destino_tipo} onChange={(e) => setFormMov({ ...formMov, destino_tipo: e.target.value, destino_usuario_id: '', destino_fornecedor_id: '' })} className="w-full text-sm mb-2">
                                            <option value="terceiros">Terceiros</option>
                                            <option value="usuario">Membro da empresa</option>
                                            <option value="fornecedor">Fornecedor</option>
                                        </select>
                                        {formMov.destino_tipo === 'usuario' && (
                                            <select value={formMov.destino_usuario_id} onChange={(e) => setFormMov({ ...formMov, destino_usuario_id: e.target.value })} className="w-full text-sm">
                                                <option value="">Selecione o membro</option>
                                                {membros.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                                            </select>
                                        )}
                                        {formMov.destino_tipo === 'fornecedor' && (
                                            <select value={formMov.destino_fornecedor_id} onChange={(e) => setFormMov({ ...formMov, destino_fornecedor_id: e.target.value })} className="w-full text-sm">
                                                <option value="">Selecione o fornecedor</option>
                                                {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* Recorrência — visível somente em criação */}
                                {!editingMov && (
                                    <div className="space-y-3 border-t border-dark-800 pt-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={isRecorrente} onChange={(e) => setIsRecorrente(e.target.checked)}
                                                className="w-4 h-4 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                            <Repeat className="w-4 h-4 text-dark-300" />
                                            <span className="text-sm text-dark-200">Movimentação Recorrente</span>
                                        </label>
                                        {isRecorrente && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-dark-300 uppercase">Início da Recorrência</label>
                                                    <input type="month" required value={recorrenciaInicio}
                                                        onChange={(e) => setRecorrenciaInicio(e.target.value)}
                                                        className="w-full text-sm" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-dark-300 uppercase">Fim da Recorrência</label>
                                                    <input type="month" required value={recorrenciaFim}
                                                        onChange={(e) => setRecorrenciaFim(e.target.value)}
                                                        className="w-full text-sm" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-4">
                                    {editingMov && (
                                        <button type="button" onClick={() => setShowDeleteConfirm({ type: 'mov', id: editingMov.id })}
                                            className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-1.5">
                                            <Trash2 className="w-4 h-4" /> Excluir
                                        </button>
                                    )}
                                    <button type="submit" className="flex-1 btn-primary py-2.5">
                                        {editingMov ? 'Salvar Alterações' : 'Salvar Lançamento'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Reembolso (Criar/Editar) */}
            <AnimatePresence>
                {isReembModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => { setShowReembolsoModal(false); setEditingReemb(null); }}
                            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">{editingReemb ? 'Editar Reembolso' : 'Solicitar Reembolso'}</h3>
                                <button onClick={() => { setShowReembolsoModal(false); setEditingReemb(null); }} className="text-dark-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSaveReemb} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-dark-300 uppercase">Valor (R$)</label>
                                    <input type="text" required
                                        value={formatCurrencyInput(formReemb.valor || 0)}
                                        onChange={(e) => setFormReemb({ ...formReemb, valor: parseCurrencyToNumber(e.target.value) })}
                                        className="w-full text-sm" placeholder="0,00" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-dark-300 uppercase">Responsáveis</label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {selectedReembResponsaveis.map(uid => {
                                            const m = membros.find(m => m.id === uid);
                                            return m ? (
                                                <span key={uid} className="inline-flex items-center gap-1 px-2 py-1 bg-axen-500/15 text-axen-400 text-xs rounded-full">
                                                    {m.displayName}
                                                    <button type="button" onClick={() => toggleReembResponsavel(uid)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto border border-dark-700 rounded-lg">
                                        {membros.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-dark-800/50 cursor-pointer text-sm text-dark-200 hover:text-white transition-colors">
                                                <input type="checkbox" checked={selectedReembResponsaveis.includes(m.id)} onChange={() => toggleReembResponsavel(m.id)}
                                                    className="w-3.5 h-3.5 rounded border-dark-500 text-axen-500 focus:ring-axen-500/20" />
                                                {m.displayName}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-dark-300 uppercase">Descrição/Motivo</label>
                                    <textarea rows={3} required value={formReemb.descricao}
                                        onChange={(e) => setFormReemb({ ...formReemb, descricao: e.target.value })}
                                        className="w-full text-sm h-24" placeholder="Ex: Viagem para Petrolina - Combustível" />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    {editingReemb && (
                                        <button type="button" onClick={() => setShowDeleteConfirm({ type: 'reemb', id: editingReemb.id })}
                                            className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-1.5">
                                            <Trash2 className="w-4 h-4" /> Excluir
                                        </button>
                                    )}
                                    <button type="submit" className="flex-1 btn-primary py-2.5">{editingReemb ? 'Salvar Alterações' : 'Enviar Solicitação'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
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
                                <h4 className="text-base font-semibold text-white">Confirmar exclusão?</h4>
                            </div>
                            <p className="text-sm text-dark-200 mb-5">Esse registro será permanentemente removido. Essa ação não pode ser desfeita.</p>
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

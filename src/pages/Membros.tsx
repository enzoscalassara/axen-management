import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Building2, X, Save, Edit3,
} from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PerfilMembro } from '../types';

/**
 * Página de Membros — gerencia perfis de usuários e empresa.
 * Auto-cria registros vazios no primeiro load.
 */
export default function Membros() {
    const { empresa } = useEmpresa();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editingPerfil, setEditingPerfil] = useState<PerfilMembro | null>(null);
    const [formPerfil, setFormPerfil] = useState<Partial<PerfilMembro>>({});
    const [saving, setSaving] = useState(false);

    /** Usuarios da empresa */
    const { data: usuarios = [] } = useQuery({
        queryKey: ['usuarios-empresa', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('usuarios')
                .select('id, nome, email')
                .contains('empresas_permitidas', [empresa!.id]);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!empresa?.id,
    });

    /** Perfis existentes */
    const { data: perfis = [], isLoading } = useQuery({
        queryKey: ['perfis-membros', empresa?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('perfis_membros')
                .select('*')
                .eq('empresa_id', empresa!.id);
            if (error) throw error;
            return (data ?? []) as PerfilMembro[];
        },
        enabled: !!empresa?.id,
    });

    /** Auto-cria perfis vazios para a empresa e seus usuarios */
    const ensureProfiles = useCallback(async () => {
        if (!empresa || !usuarios.length) return;
        const existingUserIds = perfis.filter(p => p.tipo === 'usuario').map(p => p.usuario_id);
        const hasCompanyProfile = perfis.some(p => p.tipo === 'empresa');

        const toInsert: any[] = [];
        if (!hasCompanyProfile) {
            toInsert.push({
                empresa_id: empresa.id,
                tipo: 'empresa',
                nome_completo: empresa.nome,
            });
        }
        for (const u of usuarios) {
            if (!existingUserIds.includes(u.id)) {
                toInsert.push({
                    usuario_id: u.id,
                    empresa_id: empresa.id,
                    tipo: 'usuario',
                    nome_completo: u.nome,
                    email: u.email,
                });
            }
        }
        if (toInsert.length > 0) {
            await supabase.from('perfis_membros').insert(toInsert);
            queryClient.invalidateQueries({ queryKey: ['perfis-membros'] });
        }
    }, [empresa, usuarios, perfis, queryClient]);

    useEffect(() => {
        if (perfis.length === 0 && usuarios.length > 0 && empresa) {
            ensureProfiles();
        } else if (perfis.length > 0 && usuarios.length > 0 && empresa) {
            // Verificar se faltam perfis
            const existingUserIds = perfis.filter(p => p.tipo === 'usuario').map(p => p.usuario_id);
            const missing = usuarios.filter((u: any) => !existingUserIds.includes(u.id));
            if (missing.length > 0 || !perfis.some(p => p.tipo === 'empresa')) {
                ensureProfiles();
            }
        }
    }, [perfis, usuarios, empresa, ensureProfiles]);

    const openEdit = (perfil: PerfilMembro) => {
        setEditingPerfil(perfil);
        setFormPerfil({
            nome_completo: perfil.nome_completo || '',
            cpf_cnpj: perfil.cpf_cnpj || '',
            cidade_nascimento: perfil.cidade_nascimento || '',
            data_nascimento: perfil.data_nascimento || '',
            telefone: perfil.telefone || '',
            email: perfil.email || '',
            cargo: perfil.cargo || '',
            bio: perfil.bio || '',
        });
    };

    const handleSave = async () => {
        if (!editingPerfil) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('perfis_membros')
                .update({
                    ...formPerfil,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', editingPerfil.id);
            if (error) throw error;
            setEditingPerfil(null);
            queryClient.invalidateQueries({ queryKey: ['perfis-membros'] });
        } catch (err) {
            console.error('Erro ao salvar perfil:', err);
            alert('Falha ao salvar perfil.');
        } finally {
            setSaving(false);
        }
    };

    const companyProfile = perfis.find(p => p.tipo === 'empresa');
    const memberProfiles = perfis.filter(p => p.tipo === 'usuario');

    if (!empresa) return null;

    if (isLoading) {
        return <div className="py-24 flex justify-center"><div className="w-10 h-10 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold text-white">Membros</h2>
                <p className="text-dark-200 text-sm mt-1">Perfis e equipe · {empresa.nome}</p>
            </div>

            {/* Card da Empresa */}
            {companyProfile && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 border-l-4 border-l-axen-500">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-axen-500 to-axen-700 flex items-center justify-center">
                                <Building2 className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-axen-400 bg-axen-500/10 px-2 py-0.5 rounded">Empresa</span>
                                <h3 className="text-lg font-bold text-white mt-1">{companyProfile.nome_completo || empresa.nome}</h3>
                                {companyProfile.cpf_cnpj && <p className="text-xs text-dark-300">{companyProfile.cpf_cnpj}</p>}
                                {companyProfile.bio && <p className="text-sm text-dark-200 mt-1">{companyProfile.bio}</p>}
                            </div>
                        </div>
                        <button onClick={() => openEdit(companyProfile)} className="p-2 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-axen-400 transition-colors" title="Editar">
                            <Edit3 className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Cards de Membros */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-axen-400" /> Equipe <span className="text-sm text-dark-300 font-normal">({memberProfiles.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memberProfiles.map((perfil, i) => {
                        const isCurrentUser = perfil.usuario_id === user?.id;
                        return (
                            <motion.div key={perfil.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="glass-card p-5 hover:border-axen-500/20 transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-axen-500 to-axen-700 flex items-center justify-center text-sm font-bold text-white">
                                            {(perfil.nome_completo || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-white">{perfil.nome_completo || 'Sem nome'}</p>
                                                {isCurrentUser && <span className="px-1.5 py-0.5 bg-axen-500/10 text-axen-400 text-[9px] font-bold rounded-full uppercase tracking-wider">Você</span>}
                                            </div>
                                            {perfil.cargo && <p className="text-xs text-dark-300">{perfil.cargo}</p>}
                                            {perfil.email && <p className="text-xs text-dark-400 mt-0.5">{perfil.email}</p>}
                                        </div>
                                    </div>
                                    <button onClick={() => openEdit(perfil)} className="p-1.5 rounded-lg hover:bg-dark-600 text-dark-400 hover:text-axen-400 opacity-0 group-hover:opacity-100 transition-all" title="Editar">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                                {perfil.bio && <p className="text-xs text-dark-200 mt-3 line-clamp-2">{perfil.bio}</p>}
                                <div className="flex items-center gap-4 mt-3 text-[11px] text-dark-300">
                                    {perfil.telefone && <span>📱 {perfil.telefone}</span>}
                                    {perfil.cidade_nascimento && <span>📍 {perfil.cidade_nascimento}</span>}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Modal de Edição de Perfil */}
            <AnimatePresence>
                {editingPerfil && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingPerfil(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-card p-6 w-full max-w-lg glow-blue max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-white">
                                    Editar {editingPerfil.tipo === 'empresa' ? 'Perfil da Empresa' : 'Perfil de Membro'}
                                </h3>
                                <button onClick={() => setEditingPerfil(null)} className="p-1 rounded-lg hover:bg-dark-600 text-dark-300 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Nome Completo</label>
                                    <input type="text" value={formPerfil.nome_completo || ''} onChange={(e) => setFormPerfil({ ...formPerfil, nome_completo: e.target.value })} className="w-full text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">{editingPerfil.tipo === 'empresa' ? 'CNPJ' : 'CPF'}</label>
                                        <input type="text" placeholder={editingPerfil.tipo === 'empresa' ? '00.000.000/0001-00' : '000.000.000-00'} value={formPerfil.cpf_cnpj || ''} onChange={(e) => setFormPerfil({ ...formPerfil, cpf_cnpj: e.target.value })} className="w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Telefone</label>
                                        <input type="tel" placeholder="(11) 99999-0000" value={formPerfil.telefone || ''} onChange={(e) => setFormPerfil({ ...formPerfil, telefone: e.target.value })} className="w-full text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">E-mail</label>
                                    <input type="email" value={formPerfil.email || ''} onChange={(e) => setFormPerfil({ ...formPerfil, email: e.target.value })} className="w-full text-sm" />
                                </div>

                                {editingPerfil.tipo === 'usuario' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Cidade de Nascimento</label>
                                                <input type="text" placeholder="São Paulo" value={formPerfil.cidade_nascimento || ''} onChange={(e) => setFormPerfil({ ...formPerfil, cidade_nascimento: e.target.value })} className="w-full text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Data de Nascimento</label>
                                                <input type="date" value={formPerfil.data_nascimento || ''} onChange={(e) => setFormPerfil({ ...formPerfil, data_nascimento: e.target.value })} className="w-full text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Cargo</label>
                                            <input type="text" placeholder="Ex: Sócio-Diretor" value={formPerfil.cargo || ''} onChange={(e) => setFormPerfil({ ...formPerfil, cargo: e.target.value })} className="w-full text-sm" />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-dark-100 mb-1 uppercase tracking-wider">Bio / Descrição</label>
                                    <textarea placeholder="Uma breve descrição..." value={formPerfil.bio || ''} onChange={(e) => setFormPerfil({ ...formPerfil, bio: e.target.value })} className="w-full text-sm h-20" />
                                </div>

                                <button onClick={handleSave} disabled={saving}
                                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-axen-500 to-axen-600 hover:from-axen-400 hover:to-axen-500 text-white font-medium text-sm transition-all shadow-lg shadow-axen-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                    <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Trash2, DollarSign, Target, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Notificacao } from '../types';

/** Ícone e cor por tipo de notificação */
const TIPO_CONFIG: Record<string, { icon: typeof DollarSign; color: string; bg: string }> = {
    movimentacao: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    meta: { icon: Target, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    cliente: { icon: Users, color: 'text-axen-400', bg: 'bg-axen-500/10' },
};

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    unreadCount: number;
    onCountChange: () => void;
}

/** Painel lateral de notificações */
export default function NotificationPanel({ isOpen, onClose, onCountChange }: NotificationPanelProps) {
    const { user } = useAuth();
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [loading, setLoading] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    const fetchNotificacoes = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notificacoes')
                .select('*')
                .eq('usuario_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            setNotificacoes(data ?? []);
        } catch (err) {
            // Falha silenciosa no fetch de notificações
        } finally {
            setLoading(false);
        }
    }, [user]);

    /** Busca inicial e marca como lidas ao abrir */
    useEffect(() => {
        if (isOpen && user) {
            fetchNotificacoes().then(async () => {
                // Marcar visíveis como lidas após 1s
                setTimeout(async () => {
                    await supabase
                        .from('notificacoes')
                        .update({ lida: true })
                        .eq('usuario_id', user.id)
                        .eq('lida', false);
                    onCountChange();
                    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
                }, 1000);
            });
        }
    }, [isOpen, user, fetchNotificacoes, onCountChange]);

    const handleMarkAllRead = async () => {
        if (!user) return;
        await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('usuario_id', user.id);
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
        onCountChange();
    };

    const handleClearAll = async () => {
        if (!user) return;
        await supabase
            .from('notificacoes')
            .delete()
            .eq('usuario_id', user.id);
        setNotificacoes([]);
        setShowConfirmClear(false);
        onCountChange();
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Agora';
        if (mins < 60) return `${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-50"
                    />
                    {/* Painel lateral */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-screen w-full max-w-md bg-dark-900 border-l border-white/5 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-axen-400" />
                                <h3 className="text-lg font-semibold text-white">Notificações</h3>
                                {notificacoes.filter(n => !n.lida).length > 0 && (
                                    <span className="px-2 py-0.5 bg-axen-500/20 text-axen-400 text-xs font-bold rounded-full">
                                        {notificacoes.filter(n => !n.lida).length}
                                    </span>
                                )}
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-300 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-xs text-dark-200 hover:text-white transition-colors"
                            >
                                <Check className="w-3.5 h-3.5" /> Marcar todas como lidas
                            </button>
                            <button
                                onClick={() => setShowConfirmClear(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-red-500/10 text-xs text-dark-200 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Limpar notificações
                            </button>
                        </div>

                        {/* Lista */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-axen-500/30 border-t-axen-500 rounded-full animate-spin" />
                                </div>
                            ) : notificacoes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-dark-300">
                                    <Bell className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm">Nenhuma notificação</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {notificacoes.map((notif) => {
                                        const config = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.movimentacao;
                                        const Icon = config.icon;
                                        return (
                                            <div
                                                key={notif.id}
                                                className={`px-5 py-3.5 transition-colors hover:bg-dark-800/50 ${!notif.lida ? 'bg-axen-500/[0.03] border-l-2 border-l-axen-500' : 'border-l-2 border-l-transparent'}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`shrink-0 p-2 rounded-lg ${config.bg}`}>
                                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className={`text-sm font-medium leading-snug ${!notif.lida ? 'text-white' : 'text-dark-200'}`}>
                                                                {notif.titulo}
                                                            </p>
                                                            <span className="shrink-0 text-[10px] text-dark-400">
                                                                {formatTimeAgo(notif.created_at)}
                                                            </span>
                                                        </div>
                                                        {notif.descricao && (
                                                            <p className="text-xs text-dark-300 mt-0.5 line-clamp-2">{notif.descricao}</p>
                                                        )}
                                                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color}`}>
                                                            {notif.tipo === 'movimentacao' ? 'Financeiro' : notif.tipo === 'meta' ? 'Meta' : 'Cliente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Modal de confirmação para limpar */}
                    <AnimatePresence>
                        {showConfirmClear && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[60] flex items-center justify-center"
                            >
                                <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmClear(false)} />
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="relative bg-dark-900 border border-dark-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-red-500/10 rounded-lg">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>
                                        <h4 className="text-base font-semibold text-white">Limpar notificações?</h4>
                                    </div>
                                    <p className="text-sm text-dark-200 mb-5">Todas as notificações serão permanentemente removidas. Essa ação não pode ser desfeita.</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowConfirmClear(false)}
                                            className="flex-1 py-2 rounded-lg bg-dark-800 text-sm text-dark-200 hover:text-white transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleClearAll}
                                            className="flex-1 py-2 rounded-lg bg-red-500/20 text-sm text-red-400 hover:bg-red-500/30 font-medium transition-colors"
                                        >
                                            Limpar tudo
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}

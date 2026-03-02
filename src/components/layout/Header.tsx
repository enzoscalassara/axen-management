import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { LogOut, ChevronDown, Building2, Bell } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import NotificationPanel from '../NotificationPanel';

/** Header com seletor de empresa, notificações e informações do usuário */
export default function Header() {
    const { user, logout } = useAuth();
    const { empresa, empresas, setEmpresaById, loading: loadingEmpresas } = useEmpresa();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /** Busca contagem de não-lidas */
    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        const { count, error } = await supabase
            .from('notificacoes')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', user.id)
            .eq('lida', false);
        if (!error && count !== null) setUnreadCount(count);
    }, [user]);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    /** Supabase Realtime: escuta novas notificações para atualizar badge ao vivo */
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('notificacoes-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificacoes',
                    filter: `usuario_id=eq.${user.id}`,
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchUnreadCount]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!empresa || loadingEmpresas) {
        return (
            <header className="h-16 glass border-b border-white/5 flex items-center px-6 sticky top-0 z-30">
                <div className="w-32 h-8 bg-white/5 rounded-lg animate-pulse" />
            </header>
        );
    }

    return (
        <>
            <header className="h-16 glass border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
                {/* Seletor de Empresa */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-600/50 border border-white/5 hover:border-axen-500/20 transition-all duration-200 text-sm"
                    >
                        <Building2 className="w-4 h-4 text-axen-400" />
                        <span className="font-medium text-white">{empresa.nome}</span>
                        <ChevronDown
                            className={`w-4 h-4 text-dark-200 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 glass-card py-1 shadow-xl shadow-black/30 z-50">
                            {empresas.map((emp) => (
                                <button
                                    key={emp.id}
                                    onClick={() => {
                                        setEmpresaById(emp.id);
                                        setDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${emp.id === empresa.id
                                        ? 'text-axen-400 bg-axen-500/10'
                                        : 'text-dark-100 hover:text-white hover:bg-dark-600/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-2 h-2 rounded-full ${emp.id === empresa.id ? 'bg-axen-400' : 'bg-dark-400'
                                                }`}
                                        />
                                        {emp.nome}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lado direito — notificações + usuário */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setNotifOpen(true)}
                        className="relative p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                    >
                        <Bell className="w-5 h-5 text-dark-200 hover:text-white transition-colors" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-axen-500 rounded-full animate-pulse" />
                        )}
                    </button>

                    <div className="h-6 w-px bg-dark-500" />

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-axen-500 to-axen-700 flex items-center justify-center text-xs font-bold text-white">
                            {user?.nome.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium text-white leading-tight">{user?.nome}</p>
                            <p className="text-[11px] text-dark-200">{user?.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-dark-300 hover:text-red-400 transition-colors"
                            title="Sair"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Painel de Notificações */}
            <NotificationPanel
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                unreadCount={unreadCount}
                onCountChange={fetchUnreadCount}
            />
        </>
    );
}

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Usuario } from '../types';

interface AuthContextType {
    user: Usuario | null;
    loading: boolean;
    login: (email: string, senha: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);

    /** Busca perfil do usuário na tabela `usuarios`. */
    const fetchUserProfile = useCallback(async (id: string, email: string): Promise<Usuario | null> => {
        const startTime = Date.now();
        console.log(`[Auth] Início fetchUserProfile para ${id}`);

        try {
            // Timeout de 7 segundos para a query do banco
            const fetchPromise = supabase
                .from('usuarios')
                .select('*')
                .eq('id', id)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout na consulta ao banco')), 7000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            console.log(`[Auth] Banco respondeu em ${Date.now() - startTime}ms. Erro:`, error);

            if (error) {
                console.error('[Auth] Erro no perfil:', error);
                return null;
            }

            return {
                id: data.id,
                nome: data.nome,
                email: email,
                role: data.role,
                empresas_permitidas: data.empresas_permitidas || [],
            };
        } catch (err) {
            console.error('[Auth] Exceção no fetchUserProfile:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        console.log('[Auth] Configurando listeners de autenticação...');

        // Fail-safe: Forçar o fim do loading após 10 segundos
        const failSafeTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Fail-safe disparado! Forçando fim do loading.');
                setLoading(false);
            }
        }, 10000);

        const handleSession = async (session: any) => {
            if (!mounted) return;

            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id, session.user.email!);
                if (mounted) {
                    setUser(profile);
                    if (session.access_token) {
                        localStorage.setItem('axen_token', session.access_token);
                    }
                }
            } else {
                if (mounted) {
                    setUser(null);
                    localStorage.removeItem('axen_token');
                    localStorage.removeItem('axen_empresa_id');
                }
            }

            if (mounted) {
                console.log('[Auth] Estado resolvido, encerrando loading');
                setLoading(false);
            }
        };

        // Obter a sessão inicial (v2 getSession) - tentativa única
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[Auth] getSession inicial concluído:', !!session);
            handleSession(session);
        }).catch(err => {
            console.error('[Auth] Erro no getSession inicial:', err);
            if (mounted) setLoading(false);
        });

        // Listener para mudanças
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth] Evento recebido:', event, !!session);
            handleSession(session);
        });

        return () => {
            mounted = false;
            clearTimeout(failSafeTimer);
            subscription.unsubscribe();
        };
    }, []); // Estável

    const login = useCallback(async (email: string, senha: string) => {
        console.log('[Auth] Tentando login...');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) {
            console.error('[Auth] Erro no signIn:', error.message);
            throw error;
        }
        console.log('[Auth] signIn concluído com sucesso');
        if (data.session) {
            localStorage.setItem('axen_token', data.session.access_token);
        }
    }, []);

    const logout = useCallback(async () => {
        console.log('[Auth] Logging out...');
        await supabase.auth.signOut();
        localStorage.removeItem('axen_token');
        localStorage.removeItem('axen_empresa_id');
        setUser(null);
    }, []);

    /** useMemo estabiliza o value do provider, evitando re-renders desnecessários. */
    const value = useMemo(() => ({
        user, loading, login, logout
    }), [user, loading, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
    return context;
}

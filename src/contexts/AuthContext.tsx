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
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Erro ao buscar perfil:', error);
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
            console.error('Exceção ao buscar perfil:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user && mounted) {
                    const profile = await fetchUserProfile(session.user.id, session.user.email!);
                    if (mounted) {
                        setUser(profile);
                        if (session.access_token) {
                            localStorage.setItem('axen_token', session.access_token);
                        }
                    }
                }
            } catch (err) {
                console.error('Erro na inicialização do Auth:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        /**
         * Listener para mudanças de auth (login, logout, token refresh).
         * NÃO chama setLoading(true) para evitar flash de loading em token refresh.
         */
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id, session.user.email!);
                if (mounted) {
                    setUser(profile);
                    localStorage.setItem('axen_token', session.access_token);
                }
            } else {
                if (mounted) {
                    setUser(null);
                    localStorage.removeItem('axen_token');
                    localStorage.removeItem('axen_empresa_id');
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchUserProfile]);

    const login = useCallback(async (email: string, senha: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        if (data.session) {
            localStorage.setItem('axen_token', data.session.access_token);
        }
    }, []);

    const logout = useCallback(async () => {
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

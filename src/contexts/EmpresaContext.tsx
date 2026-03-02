import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabaseClient';
import type { Empresa } from '../types';

interface EmpresaContextType {
    empresa: Empresa | null;
    empresas: Empresa[];
    setEmpresaById: (id: string) => void;
    loading: boolean;
}

const EmpresaContext = createContext<EmpresaContextType | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [todasEmpresas, setTodasEmpresas] = useState<Empresa[]>([]);
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [loading, setLoading] = useState(true);

    // Usar user?.id (primitivo) como dep — evita re-execução quando o objeto user é recriado
    const userId = user?.id;
    const userRole = user?.role;
    const empresasPermitidas = user?.empresas_permitidas;

    // Filtrar apenas as empresas permitidas para o usuário
    const empresasFiltradas = useMemo(() => {
        if (!userId || userRole === 'admin') return todasEmpresas;
        return todasEmpresas.filter(e => empresasPermitidas?.includes(e.id));
    }, [todasEmpresas, userId, userRole, empresasPermitidas]);

    useEffect(() => {
        console.log('[Empresa] Verificando empresas para user:', userId, 'authLoading:', authLoading);
        // Se auth ainda está carregando, aguarda
        if (authLoading) return;

        // Sem user = sem fetch
        if (!userId) {
            console.log('[Empresa] Sem usuário logado, encerrando loading');
            setLoading(false);
            return;
        }

        let mounted = true;

        const fetchEmpresas = async () => {
            console.log('[Empresa] Iniciando fetch de empresas...');
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('empresas')
                    .select('*')
                    .order('nome');

                if (!mounted) return;

                if (!error && data) {
                    console.log('[Empresa] Empresas carregadas:', data.length);
                    setTodasEmpresas(data);

                    // Definir empresa inicial (prioriza filtradas)
                    const filtered = userId && userRole !== 'admin'
                        ? data.filter(e => empresasPermitidas?.includes(e.id))
                        : data;

                    console.log('[Empresa] Empresas permitidas:', filtered.length);
                    const savedId = localStorage.getItem('axen_empresa_id');
                    const initial = filtered.find(e => e.id === savedId) || filtered[0];
                    if (initial) {
                        console.log('[Empresa] Empresa selecionada:', initial.nome);
                        setEmpresa(initial);
                    }
                } else if (error) {
                    console.error('[Empresa] Erro no Supabase:', error);
                }
            } catch (err) {
                console.error('[Empresa] Exceção:', err);
            } finally {
                if (mounted) {
                    console.log('[Empresa] Finalizando loading');
                    setLoading(false);
                }
            }
        };

        fetchEmpresas();

        return () => { mounted = false; };
    }, [userId, authLoading, userRole, empresasPermitidas]); // Deps primitivas — sem loop

    useEffect(() => {
        if (empresa) {
            localStorage.setItem('axen_empresa_id', empresa.id);
        }
    }, [empresa]);

    const setEmpresaById = useCallback((id: string) => {
        const found = todasEmpresas.find((e) => e.id === id);
        if (found) setEmpresa(found);
    }, [todasEmpresas]);

    /** useMemo estabiliza o value do provider, evitando re-renders desnecessários. */
    const value = useMemo(() => ({
        empresa,
        empresas: empresasFiltradas,
        setEmpresaById,
        loading,
    }), [empresa, empresasFiltradas, setEmpresaById, loading]);

    return (
        <EmpresaContext.Provider value={value}>
            {children}
        </EmpresaContext.Provider>
    );
}

export function useEmpresa() {
    const context = useContext(EmpresaContext);
    if (!context) throw new Error('useEmpresa deve ser usado dentro de EmpresaProvider');
    return context;
}

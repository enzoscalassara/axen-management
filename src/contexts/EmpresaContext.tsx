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

    const userId = user?.id;
    const userRole = user?.role;
    const empresasPermitidas = user?.empresas_permitidas;

    const empresasFiltradas = useMemo(() => {
        if (!userId || userRole === 'admin') return todasEmpresas;
        return todasEmpresas.filter(e => empresasPermitidas?.includes(e.id));
    }, [todasEmpresas, userId, userRole, empresasPermitidas]);

    useEffect(() => {
        if (authLoading) return;

        if (!userId) {
            setLoading(false);
            return;
        }

        let mounted = true;

        const fetchEmpresas = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('empresas')
                    .select('*')
                    .order('nome');

                if (!mounted) return;

                if (!error && data) {
                    setTodasEmpresas(data);

                    const filtered = userId && userRole !== 'admin'
                        ? data.filter(e => empresasPermitidas?.includes(e.id))
                        : data;

                    const savedId = localStorage.getItem('axen_empresa_id');
                    const initial = filtered.find(e => e.id === savedId) || filtered[0];
                    if (initial) setEmpresa(initial);
                }
            } catch {
                // Falha silenciosa — não expor dados internos
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchEmpresas();

        return () => { mounted = false; };
    }, [userId, authLoading, userRole, empresasPermitidas]);

    useEffect(() => {
        if (empresa) {
            localStorage.setItem('axen_empresa_id', empresa.id);
        }
    }, [empresa]);

    const setEmpresaById = useCallback((id: string) => {
        const found = todasEmpresas.find((e) => e.id === id);
        if (found) setEmpresa(found);
    }, [todasEmpresas]);

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

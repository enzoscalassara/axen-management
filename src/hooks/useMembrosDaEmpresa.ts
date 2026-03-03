import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

interface MembroOption {
    /** UUID do usuário (perfis_membros.usuario_id) */
    id: string;
    /** Nome formatado: primeiro + último nome */
    displayName: string;
}

/**
 * Formata nome completo para "Primeiro Último".
 * Ex: "Carlos Eduardo Mendes Silva" → "Carlos Silva"
 */
function formatDisplayName(nomeCompleto: string | null | undefined, fallbackNome?: string): string {
    const raw = nomeCompleto?.trim() || fallbackNome?.trim() || '';
    if (!raw) return 'Sem nome';
    const parts = raw.split(/\s+/);
    if (parts.length <= 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

/**
 * Hook que retorna a lista de membros da empresa atual,
 * com nomes formatados (primeiro + último) para uso em multi-selects.
 *
 * Fonte: perfis_membros (tipo='usuario') + fallback para usuarios.nome.
 */
export function useMembrosDaEmpresa(empresaId: string | undefined) {
    return useQuery<MembroOption[]>({
        queryKey: ['membros-empresa', empresaId],
        enabled: !!empresaId,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            if (!empresaId) return [];

            const { data, error } = await supabase
                .from('perfis_membros')
                .select('usuario_id, nome_completo, usuarios!perfis_membros_usuario_id_fkey(nome)')
                .eq('empresa_id', empresaId)
                .eq('tipo', 'usuario')
                .not('usuario_id', 'is', null);

            if (error || !data) return [];

            return data
                .filter((p: any) => p.usuario_id)
                .map((p: any) => ({
                    id: p.usuario_id as string,
                    displayName: formatDisplayName(p.nome_completo, p.usuarios?.nome),
                }));
        },
    });
}

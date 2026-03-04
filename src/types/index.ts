/** Tipos base do Axen Hub */

export interface Empresa {
    id: string;
    nome: string;
    slug: string;
}

export interface Usuario {
    id: string;
    nome: string;
    email: string;
    role: string;
    empresas_permitidas: string[];
}

export interface Cliente {
    id: string;
    empresa_id: string;
    nome: string;
    cnpj_cpf: string;
    contato: string;
    segmento: string;
    status: 'lead' | 'ativo' | 'inativo';
    email?: string;
    telefone?: string;
    focal_point_nome?: string;
    responsaveis?: string[];
    created_at?: string;
}

export interface Movimentacao {
    id: string;
    empresa_id: string;
    cliente_id: string | null;
    tipo: 'entrada' | 'saida';
    valor: number;
    data: string;
    data_prevista?: string;
    data_realizada?: string;
    origem_cliente_id?: string | null;
    destino_usuario_id?: string | null;
    destino_fornecedor_id?: string | null;
    destino_tipo?: string;
    categoria: string;
    status: 'confirmado' | 'previsto';
    descricao: string;
    cliente_nome?: string;
}

export interface Fornecedor {
    id: string;
    empresa_id: string;
    nome: string;
    cnpj_cpf?: string;
    email?: string;
    telefone?: string;
    contato_nome?: string;
    segmento?: string;
    status: 'ativo' | 'inativo';
    observacoes?: string;
    created_at?: string;
}

export interface Reembolso {
    id: string;
    empresa_id: string;
    valor: number;
    responsavel: string;
    status: 'pendente' | 'pago';
    descricao: string;
    created_at?: string;
}

export interface Meta {
    id: string;
    empresa_id: string;
    cliente_id: string | null;
    titulo: string;
    descricao: string;
    valor_alvo: number;
    data_fim: string;
    data_inicio?: string;
    data_criacao?: string;
    tipo_meta?: 'financeira' | 'clientes' | 'geral';
    subtipo?: string;
    concluida?: boolean;
    responsavel: string;
    status: 'em_andamento' | 'concluida' | 'cancelada';
    progresso: number;
    cliente_nome?: string;
    cliente_vinculado_id?: string;
    acompanhamento_tipo?: 'geral' | 'financeira';
    calculo_automatico?: boolean;
}

export interface Atividade {
    id: string;
    empresa_id: string;
    cliente_id: string | null;
    titulo: string;
    descricao: string;
    responsavel: string;
    prazo: string;
    prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
    coluna_id: string;
    status: string;
    cliente_nome?: string;
    pessoal?: boolean;
    criador_id?: string;
}

export interface ColunaKanban {
    id: string;
    empresa_id: string;
    nome: string;
    ordem: number;
}

export interface Documento {
    id: string;
    cliente_id: string;
    nome: string;
    url_storage: string;
    tipo: string;
    data_upload: string;
}

export interface HistoricoCliente {
    id: string;
    cliente_id: string;
    descricao: string;
    data: string;
    tipo: string;
}

export interface Notificacao {
    id: string;
    usuario_id: string;
    empresa_id: string;
    tipo: 'movimentacao' | 'meta' | 'cliente';
    titulo: string;
    descricao?: string;
    referencia_id?: string;
    lida: boolean;
    created_at: string;
}

export interface PerfilMembro {
    id: string;
    usuario_id: string | null;
    empresa_id: string;
    tipo: 'usuario' | 'empresa';
    nome_completo?: string;
    cpf_cnpj?: string;
    cidade_nascimento?: string;
    data_nascimento?: string;
    telefone?: string;
    email?: string;
    cargo?: string;
    bio?: string;
    updated_at?: string;
}

/** Resumo do Dashboard */
export interface DashboardResumo {
    saldo_atual: number;
    receita_mes: number;
    meta_mes: number;
    clientes_ativos: number;
    atividades_atrasadas: number;
    atividades_proximas: number;
    metas_andamento: Meta[];
    movimentacoes_pendentes: Movimentacao[];
    receita_por_mes: { mes: string; valor: number }[];
    despesas_por_categoria: { categoria: string; valor: number }[];
}

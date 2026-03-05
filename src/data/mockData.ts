/**
 * Dados mock para demonstração do Axen Hub.
 * Em produção, esses dados virão dos endpoints FastAPI.
 */
import type {
    Movimentacao,
    Meta,
    Atividade,
    ColunaKanban,
    Cliente,
    Reembolso,
    DashboardResumo,
} from '../types';

const EMP1 = 'emp-1'; // Axen Energia
const EMP2 = 'emp-2'; // Axen Data

export const mockClientes: Cliente[] = [
    { id: 'cli-1', empresa_id: EMP1, nome: 'Solar Vale Energia', cnpj_cpf: '12.345.678/0001-90', contato: 'contato@solarvale.com', segmento: 'Geração Solar', status: 'ativo' },
    { id: 'cli-2', empresa_id: EMP1, nome: 'EcoPower Brasil', cnpj_cpf: '23.456.789/0001-01', contato: 'comercial@ecopower.com', segmento: 'Distribuição', status: 'ativo' },
    { id: 'cli-3', empresa_id: EMP1, nome: 'GreenWind Ltda', cnpj_cpf: '34.567.890/0001-12', contato: 'operacoes@greenwind.com', segmento: 'Eólica', status: 'lead' },
    { id: 'cli-4', empresa_id: EMP2, nome: 'TechAnalytics Corp', cnpj_cpf: '45.678.901/0001-23', contato: 'cto@techanalytics.com', segmento: 'Tecnologia', status: 'ativo' },
    { id: 'cli-5', empresa_id: EMP2, nome: 'DataDriven Solutions', cnpj_cpf: '56.789.012/0001-34', contato: 'projetos@datadriven.com', segmento: 'Consultoria', status: 'ativo' },
    { id: 'cli-6', empresa_id: EMP2, nome: 'SmartBI Ltda', cnpj_cpf: '67.890.123/0001-45', contato: 'diretoria@smartbi.com', segmento: 'Business Intelligence', status: 'inativo' },
];

export const mockMovimentacoes: Movimentacao[] = [
    { id: 'mov-1', empresa_id: EMP1, cliente_id: 'cli-1', tipo: 'entrada', valor: 45000, data: '2026-02-15', categoria: 'Serviços', status: 'confirmado', descricao: 'Consultoria energética - Solar Vale', cliente_nome: 'Solar Vale Energia' },
    { id: 'mov-2', empresa_id: EMP1, cliente_id: null, tipo: 'saida', valor: 12000, data: '2026-02-10', categoria: 'Salários', status: 'confirmado', descricao: 'Folha de pagamento fevereiro' },
    { id: 'mov-3', empresa_id: EMP1, cliente_id: 'cli-2', tipo: 'entrada', valor: 28000, data: '2026-02-20', categoria: 'Serviços', status: 'confirmado', descricao: 'Projeto de eficiência - EcoPower', cliente_nome: 'EcoPower Brasil' },
    { id: 'mov-4', empresa_id: EMP1, cliente_id: null, tipo: 'saida', valor: 3500, data: '2026-02-28', categoria: 'Impostos', status: 'previsto', descricao: 'ISS sobre serviços fev/2026' },
    { id: 'mov-5', empresa_id: EMP1, cliente_id: 'cli-3', tipo: 'entrada', valor: 65000, data: '2026-03-15', categoria: 'Projetos', status: 'previsto', descricao: 'Proposta consultoria eólica – GreenWind', cliente_nome: 'GreenWind Ltda' },
    { id: 'mov-6', empresa_id: EMP2, cliente_id: 'cli-4', tipo: 'entrada', valor: 32000, data: '2026-02-12', categoria: 'Consultoria', status: 'confirmado', descricao: 'Sprint de BI - TechAnalytics', cliente_nome: 'TechAnalytics Corp' },
    { id: 'mov-7', empresa_id: EMP2, cliente_id: 'cli-5', tipo: 'entrada', valor: 18000, data: '2026-02-18', categoria: 'Consultoria', status: 'confirmado', descricao: 'Dashboards Power BI - DataDriven', cliente_nome: 'DataDriven Solutions' },
    { id: 'mov-8', empresa_id: EMP2, cliente_id: null, tipo: 'saida', valor: 8500, data: '2026-02-10', categoria: 'Salários', status: 'confirmado', descricao: 'Folha de pagamento fevereiro' },
    { id: 'mov-9', empresa_id: EMP2, cliente_id: null, tipo: 'saida', valor: 2200, data: '2026-03-05', categoria: 'Software', status: 'previsto', descricao: 'Licenças Power BI Pro' },
];

export const mockReembolsos: Reembolso[] = [
    { id: 'ree-1', empresa_id: EMP1, valor: 850, responsavel: 'Enzo Oliveira', status: 'pendente', descricao: 'Viagem para reunião em SP' },
    { id: 'ree-2', empresa_id: EMP1, valor: 320, responsavel: 'Rafael Costa', status: 'pago', descricao: 'Material de escritório' },
    { id: 'ree-3', empresa_id: EMP2, valor: 1200, responsavel: 'Enzo Oliveira', status: 'pendente', descricao: 'Licenças de software emergenciais' },
];

export const mockMetas: Meta[] = [
    { id: 'met-1', empresa_id: EMP1, cliente_id: null, titulo: 'Receita Q1 2026', descricao: 'Atingir R$ 200k de receita no primeiro trimestre', valor_alvo: 200000, data_fim: '2026-03-31', responsavel: 'Enzo Oliveira', status: 'em_andamento', progresso: 62 },
    { id: 'met-2', empresa_id: EMP1, cliente_id: 'cli-3', titulo: 'Fechar contrato GreenWind', descricao: 'Assinar contrato de consultoria eólica', valor_alvo: 65000, data_fim: '2026-03-15', responsavel: 'Rafael Costa', status: 'em_andamento', progresso: 40, cliente_nome: 'GreenWind Ltda' },
    { id: 'met-3', empresa_id: EMP1, cliente_id: null, titulo: 'Captar 5 novos clientes', descricao: 'Expandir carteira de clientes de energia', valor_alvo: 5, data_fim: '2026-06-30', responsavel: 'Enzo Oliveira', status: 'em_andamento', progresso: 20 },
    { id: 'met-4', empresa_id: EMP2, cliente_id: null, titulo: 'Receita BI Q1', descricao: 'Atingir R$ 80k de receita em consultoria de dados', valor_alvo: 80000, data_fim: '2026-03-31', responsavel: 'Enzo Oliveira', status: 'em_andamento', progresso: 75 },
    { id: 'met-5', empresa_id: EMP2, cliente_id: 'cli-5', titulo: 'Projeto DataDriven fase 2', descricao: 'Entregar segunda fase de dashboards', valor_alvo: 45000, data_fim: '2026-04-15', responsavel: 'Lucas Martins', status: 'em_andamento', progresso: 30, cliente_nome: 'DataDriven Solutions' },
];

export const mockColunasKanban: ColunaKanban[] = [
    { id: 'col-1', empresa_id: EMP1, nome: 'A Fazer', ordem: 0 },
    { id: 'col-2', empresa_id: EMP1, nome: 'Em Progresso', ordem: 1 },
    { id: 'col-3', empresa_id: EMP1, nome: 'Revisão', ordem: 2 },
    { id: 'col-4', empresa_id: EMP1, nome: 'Concluído', ordem: 3 },
    { id: 'col-5', empresa_id: EMP2, nome: 'Backlog', ordem: 0 },
    { id: 'col-6', empresa_id: EMP2, nome: 'Em Andamento', ordem: 1 },
    { id: 'col-7', empresa_id: EMP2, nome: 'Entrega', ordem: 2 },
    { id: 'col-8', empresa_id: EMP2, nome: 'Finalizado', ordem: 3 },
];

export const mockAtividades: Atividade[] = [
    { id: 'atv-1', empresa_id: EMP1, cliente_id: 'cli-1', titulo: 'Preparar relatório de auditoria', descricao: 'Relatório mensal para Solar Vale', responsavel: 'Enzo Oliveira', prazo: '2026-02-22', prioridade: 'alta', coluna_id: 'col-2', status: 'em_progresso', cliente_nome: 'Solar Vale Energia' },
    { id: 'atv-2', empresa_id: EMP1, cliente_id: 'cli-3', titulo: 'Elaborar proposta GreenWind', descricao: 'Proposta técnica e comercial eólica', responsavel: 'Rafael Costa', prazo: '2026-02-25', prioridade: 'urgente', coluna_id: 'col-1', status: 'a_fazer', cliente_nome: 'GreenWind Ltda' },
    { id: 'atv-3', empresa_id: EMP1, cliente_id: null, titulo: 'Atualizar site institucional', descricao: 'Revisar textos e cases', responsavel: 'Lucas Martins', prazo: '2026-03-01', prioridade: 'media', coluna_id: 'col-1', status: 'a_fazer' },
    { id: 'atv-4', empresa_id: EMP1, cliente_id: 'cli-2', titulo: 'Apresentação de resultados EcoPower', descricao: 'Deck com análise de economia', responsavel: 'Enzo Oliveira', prazo: '2026-02-18', prioridade: 'alta', coluna_id: 'col-3', status: 'revisao', cliente_nome: 'EcoPower Brasil' },
    { id: 'atv-5', empresa_id: EMP2, cliente_id: 'cli-4', titulo: 'Sprint de modelagem de dados', descricao: 'Modelo dimensional para TechAnalytics', responsavel: 'Lucas Martins', prazo: '2026-02-24', prioridade: 'alta', coluna_id: 'col-6', status: 'em_andamento', cliente_nome: 'TechAnalytics Corp' },
    { id: 'atv-6', empresa_id: EMP2, cliente_id: 'cli-5', titulo: 'Deploy dashboards DataDriven', descricao: 'Publicar Power BI premium', responsavel: 'Enzo Oliveira', prazo: '2026-02-28', prioridade: 'media', coluna_id: 'col-5', status: 'backlog', cliente_nome: 'DataDriven Solutions' },
    { id: 'atv-7', empresa_id: EMP2, cliente_id: null, titulo: 'Criar template de propostas', descricao: 'Padronizar propostas comerciais', responsavel: 'Rafael Costa', prazo: '2026-03-05', prioridade: 'baixa', coluna_id: 'col-5', status: 'backlog' },
];

/** Helper para gerar dashboard por empresa */
export function getMockDashboard(empresaId: string): DashboardResumo {
    const movs = mockMovimentacoes.filter((m) => m.empresa_id === empresaId);
    const metas = mockMetas.filter((m) => m.empresa_id === empresaId);
    const clientes = mockClientes.filter((c) => c.empresa_id === empresaId && c.status === 'ativo');
    const atividades = mockAtividades.filter((a) => a.empresa_id === empresaId);

    const entradas = movs.filter((m) => m.tipo === 'entrada' && m.status === 'confirmado').reduce((s, m) => s + m.valor, 0);
    const saidas = movs.filter((m) => m.tipo === 'saida' && m.status === 'confirmado').reduce((s, m) => s + m.valor, 0);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const atrasadas = atividades.filter((a) => new Date(a.prazo + 'T00:00:00') < hoje && a.coluna_id !== 'col-4' && a.coluna_id !== 'col-8');
    const proximas = atividades.filter((a) => {
        const diff = (new Date(a.prazo + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 3;
    });

    const pendentes = movs.filter((m) => m.status === 'previsto');

    return {
        saldo_atual: entradas - saidas,
        receita_mes: entradas,
        meta_mes: empresaId === EMP1 ? 200000 : 80000,
        clientes_ativos: clientes.length,
        atividades_atrasadas: atrasadas.length,
        atividades_proximas: proximas.length,
        metas_andamento: metas.filter((m) => m.status === 'em_andamento'),
        movimentacoes_pendentes: pendentes,
        receita_por_mes: [
            { mes: 'Set', valor: empresaId === EMP1 ? 38000 : 22000 },
            { mes: 'Out', valor: empresaId === EMP1 ? 52000 : 28000 },
            { mes: 'Nov', valor: empresaId === EMP1 ? 61000 : 35000 },
            { mes: 'Dez', valor: empresaId === EMP1 ? 48000 : 41000 },
            { mes: 'Jan', valor: empresaId === EMP1 ? 55000 : 38000 },
            { mes: 'Fev', valor: entradas },
        ],
        despesas_por_categoria: empresaId === EMP1
            ? [
                { categoria: 'Salários', valor: 12000 },
                { categoria: 'Impostos', valor: 3500 },
                { categoria: 'Operacional', valor: 2800 },
                { categoria: 'Marketing', valor: 1500 },
            ]
            : [
                { categoria: 'Salários', valor: 8500 },
                { categoria: 'Software', valor: 2200 },
                { categoria: 'Infraestrutura', valor: 1800 },
                { categoria: 'Marketing', valor: 900 },
            ],
    };
}

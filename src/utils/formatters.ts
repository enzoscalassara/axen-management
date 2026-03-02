/**
 * Axen Hub — Utilitários de Formatação
 */

/**
 * Converte uma string de input de moeda para um número decimal.
 * Segue o padrão bancário: "123" -> 1.23
 */
export const parseCurrencyToNumber = (value: string): number => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits, 10) / 100;
};

/**
 * Formata um número para display no input enquanto o usuário digita.
 * Ex: 1.23 -> "1,23"
 */
export const formatCurrencyInput = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

/**
 * Formata um número para a moeda brasileira (BRL) com símbolo.
 */
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA).
 */
export const formatDate = (date: string | Date): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
};

/**
 * Formata um percentual.
 */
export const formatPercent = (value: number): string => {
    return `${Math.round(value)}%`;
};

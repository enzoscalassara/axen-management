/**
 * Utilitários de data para evitar problemas de timezone.
 * Ao criar um Date a partir de "YYYY-MM-DD", o construtor padrão
 * trata como UTC meia-noite — que pode recuar um dia no fuso local.
 */

/** Parseia "YYYY-MM-DD" como data local (meia-noite no fuso do usuário). */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d);
}

/** Formata Date para "dd/mm/yyyy" sem risco de offset. */
export function toLocalDateString(date: Date | null | undefined): string {
    if (!date || isNaN(date.getTime())) return '—';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
}

/** Formata "YYYY-MM-DD" diretamente para "dd/mm/yyyy". */
export function formatDateBR(dateStr: string | null | undefined): string {
    return toLocalDateString(parseLocalDate(dateStr));
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'ERRO CRÍTICO: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas. ' +
        'Certifique-se de que o arquivo .env existe na raiz do projeto Vite e que o servidor foi reiniciado.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

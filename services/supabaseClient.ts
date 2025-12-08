import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO SUPABASE (ADAPTADA PARA NEXT.JS)
// No Next.js usamos process.env e o prefixo NEXT_PUBLIC_ para variáveis visíveis no front
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('⚠️ ATENÇÃO: Variáveis de ambiente do Supabase não encontradas.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para verificar conexão
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexão com Supabase estabelecida (Next.js).');
        return true;
    } catch (e) {
        console.error('❌ Erro ao conectar com Supabase:', e);
        return false;
    }
};
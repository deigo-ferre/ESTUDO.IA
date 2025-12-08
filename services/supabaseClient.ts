import { createClient } from '@supabase/supabase-js';

// --- CORREÇÃO IMPORTANTE ---
// Estamos usando Vite, então usamos import.meta.env e prefixo VITE_
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação no Console para te ajudar a debugar
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('⚠️ CRÍTICO: Variáveis de ambiente VITE_ não encontradas. Verifique o painel da Vercel.');
}

// Cria o cliente forçando o tipo string para evitar erro de TypeScript
export const supabase = createClient(
    SUPABASE_URL as string, 
    SUPABASE_ANON_KEY as string
);

// Helper para verificar conexão
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexão com Supabase estabelecida (Vite).');
        return true;
    } catch (e) {
        console.error('❌ Erro ao conectar com Supabase:', e);
        return false;
    }
};
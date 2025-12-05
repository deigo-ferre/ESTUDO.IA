import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO DE SUPABASE (VITE)
// Use import.meta.env em vez de process.env no frontend
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://cgnhsnvmmrwtburialpx.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbmhzbnZtbXJ3dGJ1cmlhbHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODIzMzAsImV4cCI6MjA4MDM1ODMzMH0.1vr_LOxGyqoRpUVMoE40DLZnusqp9byav9sIRAiJcvQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para verificar conexão
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexão com Supabase estabelecida.');
        return true;
    } catch (e) {
        console.error('❌ Erro ao conectar com Supabase:', e);
        return false;
    }
};
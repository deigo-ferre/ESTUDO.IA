import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // Tenta pegar a Service Role Key (Poder total) ou a Anon Key (Poder limitado)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "ERRO CRÍTICO: Chaves do Supabase não configuradas na Vercel." });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId } = req.body; // O Frontend manda isso aqui

    if (!userId) {
      return res.status(400).json({ error: "Faltou enviar o ID do usuário." });
    }

    console.log(`🔍 Tentando cancelar para: ${userId}`);

    // TENTATIVA 1: Assume que 'userId' é um UUID (ID do usuário)
    let { data, error } = await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', userId)
      .select();

    // Se deu erro de UUID inválido, é porque o 'userId' na verdade é um Email!
    if (error && error.code === '22P02') {
       console.log("⚠️ Não é um ID válido, tentando cancelar pelo Email...");
       const resultEmail = await supabase
         .from('profiles')
         .update({ is_premium: false })
         .eq('email', userId) // Tenta buscar pela coluna email
         .select();
         
       data = resultEmail.data;
       error = resultEmail.error;
    }

    // Se ainda tiver erro, agora mostramos ele COMPLETO
    if (error) {
      console.error("❌ ERRO SUPABASE:", error);
      // Aqui devolvemos o erro técnico para você ler na tela
      return res.status(500).json({ 
        error: "Erro no Banco de Dados", 
        details: error.message, 
        hint: error.hint || "Verifique se a Service Role Key está na Vercel" 
      });
    }

    // Se não deu erro, mas não atualizou nada (Data vazio), o usuário não existe na tabela
    if (!data || data.length === 0) {
        console.error("❌ Usuário não encontrado na tabela 'profiles'");
        return res.status(404).json({ error: "Usuário não encontrado na tabela profiles. Verifique se o login criou o perfil." });
    }

    console.log("✅ Sucesso!");
    return res.status(200).json({ message: "Assinatura cancelada", user: userId });

  } catch (err) {
    console.error("Erro Fatal no Código:", err);
    return res.status(500).json({ error: err.message });
  }
}
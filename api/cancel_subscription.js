import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Configuração de CORS (Permite o site falar com o backend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 3. Conecta no Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Erro de configuração do banco de dados" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Recebe o ID do usuário que quer cancelar
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "ID do usuário obrigatório" });
    }

    console.log(`🚫 Cancelando assinatura do usuário: ${userId}`);

    // 5. Atualiza o banco de dados (Remove o Premium)
    const { error } = await supabase
      .from('profiles')
      .update({ 
          is_premium: false,
          status: 'canceled' // Opcional: marca como cancelado se tiver esse campo
      })
      .eq('id', userId);

    if (error) {
      console.error("Erro ao atualizar Supabase:", error);
      return res.status(500).json({ error: "Erro ao cancelar no banco de dados" });
    }

    // Sucesso!
    console.log("✅ Assinatura cancelada com sucesso.");
    return res.status(200).json({ message: "Assinatura cancelada" });

  } catch (error) {
    console.error("Erro fatal:", error);
    return res.status(500).json({ error: error.message });
  }
}
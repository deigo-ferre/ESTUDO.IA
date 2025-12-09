const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Exportação no padrão antigo (Node.js clássico)
module.exports = async (req, res) => {
  // 1. Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Validação do Método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 3. Verifica Variáveis
    const supabaseUrl = process.env.SUPABASE_URL;
    // Tenta pegar a Service Role, se não tiver, tenta a Anon (mas Service Role é melhor para escrita)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseKey || !mpAccessToken) {
      console.error("❌ ERRO: Variáveis de ambiente faltando no servidor.");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 4. Inicializa Clientes
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });

    // 5. Lê os dados (funciona tanto para query quanto body)
    const { query, body } = req;
    const topic = query.topic || (body && body.type);
    const id = query.id || (body && body.data && body.data.id);

    console.log(`🔔 Webhook acionado. Topic: ${topic}, ID: ${id}`);

    if (topic === 'payment' && id) {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: id });

      if (paymentData.status === 'approved') {
        const emailPagador = paymentData.payer.email;
        console.log(`✅ Pagamento Aprovado! Email: ${emailPagador}`);

        // Atualiza Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('email', emailPagador);

        if (error) {
            console.error('Erro Supabase:', error);
        } else {
            console.log('🏆 Cliente virou Premium!');
        }
      }
    }

    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Erro fatal:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
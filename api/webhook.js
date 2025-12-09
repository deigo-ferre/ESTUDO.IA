import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// No formato moderno (Module), usamos export default function
export default async function handler(req, res) {
  // 1. Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Validação do Método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 3. Verifica Variáveis (Compatível com Vercel)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseKey || !mpAccessToken) {
      console.error("❌ ERRO: Variáveis de ambiente faltando.");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 4. Inicializa Clientes
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });

    // 5. Lógica de Pagamento
    const { query, body } = req;
    const topic = query.topic || body?.type;
    const id = query.id || body?.data?.id;

    console.log(`🔔 Webhook ESM acionado. ID: ${id}`);

    if (topic === 'payment' && id) {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: id });

      if (paymentData.status === 'approved') {
        const emailPagador = paymentData.payer.email;
        console.log(`✅ Aprovado: ${emailPagador}`);

        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('email', emailPagador);

        if (error) console.error('Erro Supabase:', error);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Erro fatal:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
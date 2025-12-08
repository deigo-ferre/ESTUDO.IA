import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de CORS (Permite que o Mercado Pago chame a rota)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Inicializa Variáveis (Se falhar, avisa no log)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseKey || !mpAccessToken) {
      console.error("❌ Faltam variáveis de ambiente no servidor Vercel.");
      return res.status(500).json({ error: 'Configuração de servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });

    // 3. Processa a notificação
    const { query, body } = req;
    const topic = query.topic || (body as any)?.type;
    const id = query.id || (body as any)?.data?.id;

    if (topic === 'payment' && id) {
      console.log(`🔔 Webhook acionado. ID do Pagamento: ${id}`);

      const payment = new Payment(client);
      const paymentData = await payment.get({ id: id as string });

      if (paymentData.status === 'approved') {
        const emailPagador = paymentData.payer?.email;
        console.log(`✅ Pagamento Aprovado! Email: ${emailPagador}`);

        if (emailPagador) {
            const { error } = await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('email', emailPagador);

            if (error) console.error('Erro no Supabase:', error);
            else console.log('🏆 Cliente atualizado para Premium!');
        }
      }
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Erro fatal no webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
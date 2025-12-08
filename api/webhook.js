import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // 1. Configuração de CORS e Método (Para evitar erros de permissão)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Só aceita POST (que é o que o Mercado Pago manda)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Inicializa Supabase e Mercado Pago aqui dentro (usando process.env)
    // Nota: Vamos configurar essas variáveis no painel da Vercel depois
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY // Use a Service Role para ter permissão de escrita segura
    );

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

    // 3. Pega os dados da notificação
    const { query, body } = req;
    const topic = query.topic || body?.type;
    const id = query.id || body?.data?.id;

    if (topic === 'payment' && id) {
      console.log(`🔔 Notificação recebida. ID: ${id}`);

      // 4. Pergunta ao Mercado Pago o status real
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: id });

      if (paymentData.status === 'approved') {
        const emailPagador = paymentData.payer.email;
        console.log(`✅ Pagamento aprovado para: ${emailPagador}`);

        // 5. Atualiza o usuário no Supabase
        // IMPORTANTE: Confirme se a tabela é 'profiles' e a coluna 'is_premium'
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('email', emailPagador);

        if (error) {
          console.error('Erro ao atualizar Supabase:', error);
          // Não retornamos erro 500 para o MP não ficar tentando de novo se for erro nosso de banco
        } else {
          console.log('🏆 Usuário atualizado com sucesso!');
        }
      }
    }

    // 6. Responde Sucesso para o Mercado Pago
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
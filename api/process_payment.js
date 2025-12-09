import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // 1. Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    if (!mpAccessToken) {
      return res.status(500).json({ error: "Token MP não configurado" });
    }

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });

    // 2. Recebe os dados do Frontend (o que apareceu no seu console)
    const { transaction_amount, token, description, payment_method_id, issuer_id, payer } = req.body;

    // 3. Cria o pagamento REAL
    const payment = new Payment(client);
    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        token: token,
        description: description || 'Assinatura Estude.IA',
        payment_method_id: payment_method_id,
        issuer_id: issuer_id,
        payer: {
          email: payer.email,
          identification: {
            type: payer.identification.type,
            number: payer.identification.number
          }
        },
        installments: 1,
        // O Webhook vai avisar quando isso for aprovado
        notification_url: `https://${req.headers.host}/api/webhook` 
      }
    });

    // 4. Devolve o status real (approved, rejected, etc)
    return res.status(200).json({
      status: result.status,
      id: result.id,
      detail: result.status_detail
    });

  } catch (error) {
    console.error("Erro ao processar pagamento:", error);
    return res.status(500).json({ error: error.message });
  }
}
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  // 1. Configuração de CORS (Essencial para o site falar com o backend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde rápido se for apenas uma verificação do navegador
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Autenticação com Mercado Pago
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    if (!mpAccessToken) {
      console.error("Erro: MP_ACCESS_TOKEN não configurado na Vercel");
      return res.status(500).json({ error: "Erro interno de configuração de chaves" });
    }

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });

    // 3. Recebe os dados do Frontend
    const { title, quantity, unit_price } = req.body;

    // 4. Cria a preferência de pagamento
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            title: title || 'Produto Estude.IA',
            quantity: Number(quantity) || 1,
            unit_price: Number(unit_price) || 1.00,
            currency_id: 'BRL',
          },
        ],
        // Configura para onde o usuário volta depois de pagar
        back_urls: {
          success: "https://estudo-ia.vercel.app/", // URL do seu site
          failure: "https://estudo-ia.vercel.app/",
          pending: "https://estudo-ia.vercel.app/",
        },
        auto_return: "approved",
        // Aponta para o nosso Webhook que já está funcionando
        notification_url: `https://${req.headers.host}/api/webhook`, 
      },
    });

    // 5. Retorna o ID para o checkout abrir
    return res.status(200).json({
      id: result.id,
      init_point: result.init_point, 
    });

  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    return res.status(500).json({ error: error.message });
  }
}
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';

// 1. Carrega as variáveis de ambiente
dotenv.config();

// 2. Debug rápido para garantir que a senha foi lida
console.log("--- DEBUG INICIAL ---");
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.log("✅ Token MP: Carregado com sucesso.");
} else {
    console.error("❌ Token MP: NÃO ENCONTRADO. Verifique o arquivo .env");
}
console.log("---------------------");

const app = express();
const port = process.env.PORT || 8000;

// 3. Configura o Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. Rota que cria o pagamento
app.post('/create_preference', async (req, res) => {
    try {
        // Verifica se a chave existe
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            return res.status(500).json({ error: "Token não configurado no servidor." });
        }

        const { title, quantity, unit_price, plan_type } = req.body;

        // Monta os dados da venda
        const preferenceData = {
            items: [
                {
                    id: plan_type || 'plano-generico',
                    title: title || 'Produto Estude.IA',
                    quantity: Number(quantity) || 1,
                    unit_price: Number(unit_price),
                    currency_id: 'BRL',
                },
            ],
            // ⚠️ A CORREÇÃO ESTÁ AQUI:
            // Usamos 'backUrls' (CamelCase) em vez de 'back_urls'
            backUrls: {
                success: "http://localhost:5173/?status=success",
                failure: "http://localhost:5173/?status=failure",
                pending: "http://localhost:5173/?status=pending",
            },
            // Usamos 'autoReturn' em vez de 'auto_return'
            autoReturn: "approved",
        };

        const preference = new Preference(client);
        // Cria a preferência
        const result = await preference.create({ body: preferenceData });

        console.log(`✅ Pagamento criado! ID: ${result.id}`);
        
        // Devolve o ID para o site abrir o checkout
        res.json({
            id: result.id,
            init_point: result.init_point
        });

    } catch (error) {
        console.error("❌ Erro ao criar preferência:", error);
        res.status(500).json({ 
            error: "Erro ao comunicar com Mercado Pago",
            details: error.message 
        });
    }
});

// 6. Rota de teste
app.get('/', (req, res) => {
    res.send('Servidor Estude.IA rodando! 🚀');
});

// 7. Inicia o servidor
app.listen(port, () => {
    console.log(`🚀 Servidor ouvindo na porta ${port}`);
});
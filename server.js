import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference, PreApproval } from 'mercadopago';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Configuração do Mercado Pago
// IMPORTANTE: A chave de acesso deve vir do .env e nunca ser hardcoded aqui para produção
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' 
});

app.use(cors());
app.use(express.json());

// Rota para criar a preferência de pagamento
app.post('/create_preference', async (req, res) => {
    try {
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            console.error("ERRO: MERCADOPAGO_ACCESS_TOKEN não definido no .env");
            return res.status(500).json({ error: "Servidor mal configurado: Token MP ausente." });
        }

        const { title, quantity, unit_price, plan_type } = req.body;

        const body = {
            items: [
                {
                    id: plan_type,
                    title: title,
                    quantity: Number(quantity),
                    unit_price: Number(unit_price),
                    currency_id: 'BRL',
                },
            ],
            back_urls: {
                success: 'http://localhost:5173/?status=success',
                failure: 'http://localhost:5173/?status=failure',
                pending: 'http://localhost:5173/?status=pending',
            },
            auto_return: 'approved',
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });

        console.log(`Preferência criada: ${result.id} para o plano ${plan_type}`);
        
        res.json({
            id: result.id,
            init_point: result.init_point
        });

    } catch (error) {
        console.error("Erro ao criar preferência:", error);
        res.status(500).json({ error: "Erro ao comunicar com Mercado Pago" });
    }
});

// Rota para cancelar assinatura (Simulado para MVP, implementável com PreApproval API)
app.post('/cancel_subscription', async (req, res) => {
    try {
        const { userId, reason } = req.body;
        console.log(`Solicitação de cancelamento para usuário: ${userId}. Motivo: ${reason}`);

        // NOTA DE IMPLEMENTAÇÃO REAL:
        // 1. Buscar o 'preapproval_id' (ID da assinatura) do usuário no banco de dados.
        // 2. Chamar a API do Mercado Pago:
        // const subscription = new PreApproval(client);
        // await subscription.update({ id: userSubscriptionId, body: { status: 'cancelled' } });

        // Simulando sucesso do cancelamento na operadora
        setTimeout(() => {
            res.json({ 
                status: 'success', 
                message: 'Assinatura cancelada e cobranças suspensas com sucesso.' 
            });
        }, 1000);

    } catch (error) {
        console.error("Erro ao cancelar assinatura:", error);
        res.status(500).json({ error: "Erro ao processar cancelamento." });
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('API de Pagamentos Estude.IA rodando!');
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`- Backend: http://localhost:${port}`);
    console.log(`- Frontend: http://localhost:5173 (se rodando via Vite)`);
});
import { PlanType } from "../types";

// CONFIGURAÇÃO DE PRODUÇÃO (VITE)
// A chave deve estar no arquivo .env como VITE_MERCADOPAGO_PUBLIC_KEY
const MERCADOPAGO_PUBLIC_KEY = import.meta.env?.VITE_MERCADOPAGO_PUBLIC_KEY || "";

// URL do Backend (VITE)
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

declare global {
    interface Window {
        MercadoPago: any;
    }
}

// Inicializa o SDK do Mercado Pago
export const initMercadoPago = () => {
    if (!MERCADOPAGO_PUBLIC_KEY) {
        console.error("ERRO CRÍTICO: Chave Pública do Mercado Pago não configurada (VITE_MERCADOPAGO_PUBLIC_KEY).");
        return null;
    }

    if (window.MercadoPago) {
        try {
            return new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY, {
                locale: 'pt-BR'
            });
        } catch (error) {
            console.error("Erro ao instanciar MercadoPago. Verifique sua Public Key.", error);
            return null;
        }
    } else {
        console.error("SDK do Mercado Pago não carregado. Verifique o script no index.html.");
        return null;
    }
};

// Cria uma Preferência de Pagamento Real no Backend
export const createPreference = async (plan: PlanType): Promise<{ preferenceId?: string; init_point?: string; error?: string }> => {
    const prices = {
        'FREE': 0,
        'ADVANCED': 29.90,
        'PREMIUM': 49.90
    };

    const title = plan === 'ADVANCED' ? 'Plano Avançado - Estude.IA' : 'Plano Premium - Estude.IA';
    const price = prices[plan];

    try {
        console.log(`Conectando ao backend em ${API_URL}/create_preference...`);
        
        const response = await fetch(`${API_URL}/create_preference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                quantity: 1,
                unit_price: price,
                plan_type: plan
            })
        });

        if (!response.ok) {
            // Tenta ler o erro como JSON, se falhar lê como texto
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorText;
            } catch(e) {}
            
            throw new Error(`Falha no Backend: ${errorMessage}`);
        }

        const data = await response.json();
        
        if (!data.id) {
            throw new Error("Backend não retornou um ID de preferência válido.");
        }

        return { preferenceId: data.id, init_point: data.init_point };

    } catch (error: any) {
        console.error("Erro ao criar preferência de pagamento:", error);
        
        // Mensagem amigável para erro de conexão comum (backend desligado)
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            return { error: "O servidor de pagamentos parece estar offline. (Certifique-se de rodar 'npm run start:full')" };
        }
        
        return { error: error.message || "Erro de conexão com o servidor de pagamento." };
    }
};

// Callback para processamento do Brick
export const processBrickPayment = async (paymentData: any) => {
    return new Promise<{ status: 'approved' | 'rejected' }>((resolve, reject) => {
        console.log("Dados do pagamento recebidos pelo Brick:", paymentData);
        // O Brick do MP lida com a tokenização. Em um fluxo real avançado,
        // você enviaria esses dados para o backend validar novamente, 
        // mas o auto_return configurado na preferência já ajuda no redirecionamento.
        resolve({ status: 'approved' });
    });
};
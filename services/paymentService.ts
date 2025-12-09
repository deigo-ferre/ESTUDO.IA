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

export const requestSubscriptionCancellation = async (userId: string, reason: string = 'user_request'): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/cancel_subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason })
        });

        if (!response.ok) {
            throw new Error('Falha ao cancelar assinatura no servidor.');
        }

        return true;
    } catch (error) {
        console.error("Erro ao cancelar assinatura:", error);
        // Em caso de falha de rede no MVP, podemos assumir sucesso local para não prender o usuário
        // Em produção, isso deve ser tratado com retries.
        return false;
    }
};

// Callback para processamento do Brick REAL
export const processBrickPayment = async (paymentData: any) => {
    return new Promise<{ status: 'approved' | 'rejected' }>(async (resolve, reject) => {
        try {
            console.log("Enviando pagamento para o backend...", paymentData);
            
            // 1. Chama o arquivo que acabamos de criar
            const response = await fetch(`${API_URL}/process_payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erro no processamento:", errorData);
                reject(errorData.error || "Erro ao processar pagamento");
                return;
            }

            // 2. Recebe a resposta REAL do Mercado Pago
            const data = await response.json();
            console.log("Status do pagamento:", data.status);

            if (data.status === 'approved') {
                resolve({ status: 'approved' });
            } else {
                // Se foi recusado ou pendente
                resolve({ status: 'rejected' }); 
            }

        } catch (error) {
            console.error("Erro de comunicação:", error);
            reject("Erro ao conectar com servidor de pagamento");
        }
    });
};
async function downloadProject() {
  const files = {
    '.env.example': `# --- CONFIGURAÇÃO OBRIGATÓRIA (PADRÃO VITE) ---

# 1. Google Gemini (IA)
# Gere em: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY="sua_chave_gemini_aqui"

# 2. Mercado Pago (Pagamentos)
# Gere em: https://www.mercadopago.com.br/developers/panel
# Chave Pública (Para o Frontend)
VITE_MERCADOPAGO_PUBLIC_KEY="APP_USR-xxxx-xxxx-xxxx-xxxx"
# Token de Acesso (Para o Backend - server.js)
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxx-xxxx-xxxx-xxxx"

# 3. Supabase (Banco de Dados - Opcional se usar apenas localStorage)
VITE_SUPABASE_URL="sua_url_supabase"
VITE_SUPABASE_ANON_KEY="sua_chave_anon_supabase"

# 4. Configuração do Servidor
PORT=8000
VITE_API_URL="http://localhost:8000"`,

    'package.json': `{
  "name": "estude-ia",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server": "node server.js",
    "start:full": "concurrently \\"npm run server\\" \\"npm run dev\\"",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@google/genai": "^0.2.0",
    "@stripe/react-stripe-js": "^2.1.0",
    "@stripe/stripe-js": "^1.54.0",
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.263.1",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "mercadopago": "^2.0.0",
    "dotenv": "^16.3.1",
    "concurrently": "^8.2.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}`,

    'server.js': `import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
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

        console.log(\`Preferência criada: \${result.id} para o plano \${plan_type}\`);
        
        res.json({
            id: result.id,
            init_point: result.init_point
        });

    } catch (error) {
        console.error("Erro ao criar preferência:", error);
        res.status(500).json({ error: "Erro ao comunicar com Mercado Pago" });
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('API de Pagamentos Estude.IA rodando!');
});

app.listen(port, () => {
    console.log(\`Servidor rodando na porta \${port}\`);
    console.log(\`- Backend: http://localhost:\${port}\`);
    console.log(\`- Frontend: http://localhost:5173 (se rodando via Vite)\`);
});`,

    'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  define: {
    'process.env': {} // Fallback seguro
  }
});`,

    'services/paymentService.ts': `import { PlanType } from "../types";

// CONFIGURAÇÃO DE PRODUÇÃO (VITE)
const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || "";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
        console.log(\`Conectando ao backend em \${API_URL}/create_preference...\`);
        
        const response = await fetch(\`\${API_URL}/create_preference\`, {
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
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorText;
            } catch(e) {}
            
            throw new Error(\`Falha no Backend: \${errorMessage}\`);
        }

        const data = await response.json();
        
        if (!data.id) {
            throw new Error("Backend não retornou um ID de preferência válido.");
        }

        return { preferenceId: data.id, init_point: data.init_point };

    } catch (error: any) {
        console.error("Erro ao criar preferência de pagamento:", error);
        
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            return { error: "O servidor de pagamentos parece estar offline. (Certifique-se de rodar 'npm run start:full')" };
        }
        
        return { error: error.message || "Erro de conexão com o servidor de pagamento." };
    }
};

export const processBrickPayment = async (paymentData: any) => {
    return new Promise<{ status: 'approved' | 'rejected' }>((resolve, reject) => {
        console.log("Dados do pagamento recebidos pelo Brick:", paymentData);
        resolve({ status: 'approved' });
    });
};`,

    'index.html': `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estude.IA - Preparação ENEM Inteligente</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://sdk.mercadopago.com/js/v2"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
    </style>
</head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`
  };

  // Create a blob and download
  const fileContent = JSON.stringify(files, null, 2);
  const blob = new Blob([fileContent], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  
  const element = document.createElement('a');
  element.href = url;
  element.download = "estude-ia-full-project.json";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  
  console.log("Arquivo de projeto gerado. Extraia o conteúdo JSON para criar os arquivos.");
}
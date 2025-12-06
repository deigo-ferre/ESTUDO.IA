import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
    QuestionResult, 
    EssayTheme, 
    CorrectionResult, 
    StudyProfile, 
    StudyScheduleResult, 
    SisuEstimation, 
    ImageData 
} from '../types';

// Inicializa a API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Função auxiliar para limpar o JSON que o Gemini retorna (remove ```json e ```)
const cleanJSON = (text: string) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Função genérica para chamadas seguras
const callGemini = async (prompt: string, temp = 0.7) => {
    if (!API_KEY) throw new Error("Chave de API do Gemini não configurada.");
    try {
        // Usa o modelo Flash que é mais rápido para apps
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: temp }
        });
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erro na API Gemini:", error);
        throw new Error("Falha ao conectar com a Inteligência Artificial. Tente novamente.");
    }
};

// --- 1. GERAR QUESTÕES ---
export const generateQuestionsBatch = async (
    area: string, 
    count: number, 
    language?: string, 
    isForeign: boolean = false, 
    topics?: string[]
): Promise<QuestionResult[]> => {
    let topicInstruction = topics && topics.length > 0 
        ? `Foque EXCLUSIVAMENTE nos seguintes tópicos: ${topics.join(', ')}.` 
        : "Distribua os tópicos conforme a matriz de referência do ENEM.";

    let langInstruction = isForeign && language 
        ? `As questões devem ser de Língua Estrangeira (${language}). O texto base deve ser em ${language} e o enunciado/alternativas em Português, padrão ENEM.` 
        : "";

    const prompt = `
        Crie ${count} questões inéditas estilo ENEM da área de ${area}.
        ${topicInstruction}
        ${langInstruction}
        
        RETORNE APENAS UM ARRAY JSON VÁLIDO. Sem texto antes ou depois.
        Formato de cada objeto no array:
        {
            "id": "gerado_agora",
            "origem": "Simulado IA",
            "enunciado": "Texto da questão...",
            "alternativas": ["A", "B", "C", "D", "E"],
            "correta_index": 0 (0 para A, 1 para B...),
            "explicacao": "Por que a alternativa correta é a certa...",
            "materia": "Matéria específica (ex: Geografia)",
            "area": "${area}",
            "difficulty": "medium",
            "topic": "Tópico principal da questão"
        }
    `;

    const text = await callGemini(prompt, 0.8);
    try {
        return JSON.parse(cleanJSON(text));
    } catch (e) {
        console.error("Erro ao fazer parse das questões", text);
        return []; // Retorna vazio em vez de quebrar
    }
};

// --- 2. GERAR TEMA DE REDAÇÃO ---
export const generateEssayTheme = async (): Promise<EssayTheme> => {
    const prompt = `
        Gere um tema de redação estilo ENEM inédito e atual.
        RETORNE APENAS JSON:
        {
            "titulo": "Título do Tema",
            "textos_motivadores": ["Texto 1 curto...", "Texto 2 curto...", "Texto 3 curto..."],
            "origem": "Inédito IA"
        }
    `;
    const text = await callGemini(prompt, 0.9);
    return JSON.parse(cleanJSON(text));
};

// --- 3. CORRIGIR REDAÇÃO ---
export const gradeEssay = async (essayText: string, image?: ImageData, theme?: EssayTheme | null): Promise<CorrectionResult> => {
    let imagePart = null;
    // Se tiver imagem (foto da redação), prepara para enviar
    if (image) {
        // Nota: O SDK processa imagens, mas aqui vamos focar no texto transcrito se disponível
        // Se quiser enviar imagem real, precisa usar model.generateContent([prompt, imagePart])
    }

    const themeTitle = theme ? theme.titulo : "Tema Livre";
    
    const prompt = `
        Aja como um corretor oficial do ENEM muito rigoroso.
        Tema: ${themeTitle}
        Redação do aluno:
        "${essayText}"

        Avalie com base nas 5 competências (0 a 200 pontos cada).
        RETORNE APENAS JSON:
        {
            "nota_total": 0,
            "competencias": [
                { "nome": "Competência 1", "nota": 0, "feedback": "..." },
                { "nome": "Competência 2", "nota": 0, "feedback": "..." },
                { "nome": "Competência 3", "nota": 0, "feedback": "..." },
                { "nome": "Competência 4", "nota": 0, "feedback": "..." },
                { "nome": "Competência 5", "nota": 0, "feedback": "..." }
            ],
            "comentario_geral": "Visão geral...",
            "melhorias": ["Dica prática 1", "Dica prática 2", "Dica prática 3"]
        }
    `;

    const text = await callGemini(prompt, 0.4); // Temperatura baixa para ser mais preciso
    return JSON.parse(cleanJSON(text));
};

// --- 4. ESTIMAR NOTA SISU ---
export const estimateSisuCutoff = async (courses: string[]): Promise<SisuEstimation[]> => {
    const prompt = `
        Para cada um destes cursos/faculdades: ${courses.join(', ')}.
        Estime a nota de corte do SISU (Ampla Concorrência) com base nos dados históricos mais recentes (2023/2024).
        RETORNE APENAS ARRAY JSON:
        [
            {
                "curso": "Nome do Curso - Universidade",
                "nota_corte_media": 000.0,
                "nota_corte_min": 000.0,
                "nota_corte_max": 000.0,
                "ano_referencia": "2023",
                "mensagem": "Comentário sobre a dificuldade (Fácil/Médio/Difícil)",
                "fontes": ["Fonte aproximada"]
            }
        ]
    `;
    const text = await callGemini(prompt, 0.5);
    return JSON.parse(cleanJSON(text));
};

// --- 5. GERAR CRONOGRAMA ---
export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
    const prompt = `
        Crie um cronograma de estudos semanal para um aluno com o seguinte perfil:
        - Foco: ${profile.targetCourse || profile.course}
        - Tempo: ${profile.availableTime} minutos/dia
        - Dificuldades: ${typeof profile.difficulties === 'string' ? profile.difficulties : profile.difficulties.join(', ')}
        
        RETORNE APENAS JSON no formato:
        {
            "schedule": {
                "weeks": [
                    {
                        "days": [
                            { 
                                "dia": "Segunda", 
                                "foco": "Foco do dia", 
                                "materias": ["Matéria 1 - Tópico", "Matéria 2 - Tópico"],
                                "tasks": [ { "id": "1", "text": "Estudar X", "completed": false } ]
                            },
                            ... (até Domingo)
                        ]
                    }
                ]
            },
            "tips": ["Dica 1", "Dica 2"]
        }
    `;
    const text = await callGemini(prompt, 0.7);
    return JSON.parse(cleanJSON(text));
};

// --- 6. TRANSCREVER IMAGEM (OCR) ---
export const transcribeImage = async (image: ImageData): Promise<string> => {
    if (!API_KEY) throw new Error("API Key ausente");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            "Transcreva APENAS o texto manuscrito desta imagem. Corrija erros óbvios de ortografia, mas mantenha a estrutura. Não adicione comentários.",
            {
                inlineData: {
                    data: image.base64,
                    mimeType: image.mimeType
                }
            }
        ]);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Erro OCR:", error);
        throw new Error("Não foi possível ler a imagem.");
    }
};
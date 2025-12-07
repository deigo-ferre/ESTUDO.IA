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

// O segredo é NÃO inicializar o 'genAI' aqui fora.
// Apenas lemos a chave.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL_NAME = "gemini-1.5-flash"; 

const cleanJSON = (text: string) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Função auxiliar para pegar a instância da IA apenas quando necessário
const getGenAI = () => {
    if (!API_KEY) {
        throw new Error("Chave de API do Gemini não configurada (VITE_GEMINI_API_KEY).");
    }
    return new GoogleGenerativeAI(API_KEY);
};

const callGemini = async (prompt: string, temp = 0.7) => {
    try {
        // Inicializa AQUI DENTRO. Se falhar, só falha a requisição, não o site todo.
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: temp }
        });
        
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erro na API Gemini:", error);
        throw new Error("Falha ao conectar com a IA. Verifique a chave API ou a internet.");
    }
};

// --- 1. GERAR QUESTÕES ---
export const generateQuestionsBatch = async (area: string, count: number, language?: string, isForeign: boolean = false, topics?: string[]): Promise<QuestionResult[]> => {
    let topicInstruction = topics && topics.length > 0 ? `Foque EXCLUSIVAMENTE nos seguintes tópicos: ${topics.join(', ')}.` : "Distribua os tópicos conforme a matriz de referência do ENEM.";
    let langInstruction = isForeign && language ? `As questões devem ser de Língua Estrangeira (${language}). O texto base deve ser em ${language} e o enunciado/alternativas em Português, padrão ENEM.` : "";

    const prompt = `Crie ${count} questões inéditas estilo ENEM da área de ${area}. ${topicInstruction} ${langInstruction} RETORNE APENAS UM ARRAY JSON VÁLIDO. Sem texto antes ou depois. Formato de cada objeto no array: { "id": "gerado_agora", "origem": "Simulado IA", "enunciado": "Texto da questão...", "alternativas": ["A", "B", "C", "D", "E"], "correta_index": 0, "explicacao": "...", "materia": "...", "area": "${area}", "difficulty": "medium", "topic": "..." }`;

    const text = await callGemini(prompt, 0.8);
    try {
        return JSON.parse(cleanJSON(text));
    } catch (e) {
        return [];
    }
};

// --- 2. GERAR TEMA ---
export const generateEssayTheme = async (): Promise<EssayTheme> => {
    const prompt = `Gere um tema de redação estilo ENEM inédito. RETORNE APENAS JSON: { "titulo": "...", "textos_motivadores": ["..."], "origem": "Inédito IA" }`;
    const text = await callGemini(prompt, 0.9);
    return JSON.parse(cleanJSON(text));
};

// --- 3. CORRIGIR REDAÇÃO ---
export const gradeEssay = async (essayText: string, image?: ImageData, theme?: EssayTheme | null): Promise<CorrectionResult> => {
    const themeTitle = theme ? theme.titulo : "Tema Livre";
    const prompt = `Aja como corretor do ENEM. Tema: ${themeTitle}. Redação: "${essayText}". Avalie as 5 competências. RETORNE APENAS JSON: { "nota_total": 0, "competencias": [{ "nome": "...", "nota": 0, "feedback": "..." }], "comentario_geral": "...", "melhorias": ["..."] }`;
    const text = await callGemini(prompt, 0.4); 
    return JSON.parse(cleanJSON(text));
};

// --- 4. SISU ---
export const estimateSisuCutoff = async (courses: string[]): Promise<SisuEstimation[]> => {
    const prompt = `Para: ${courses.join(', ')}. Estime nota de corte SISU (Ampla). RETORNE ARRAY JSON: [{ "curso": "...", "nota_corte_media": 0.0, "nota_corte_min": 0.0, "nota_corte_max": 0.0, "ano_referencia": "2023", "mensagem": "...", "fontes": ["..."] }]`;
    const text = await callGemini(prompt, 0.5);
    return JSON.parse(cleanJSON(text));
};

// --- 5. CRONOGRAMA ---
export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
    const targetCourse = profile.targetCourse || profile.course || "Geral";
    const time = profile.availableTime || 120;
    
    let difficultiesStr = "";
    if (Array.isArray(profile.difficulties)) {
        difficultiesStr = profile.difficulties.join(', ');
    } else {
        difficultiesStr = String(profile.difficulties);
    }

    const prompt = `
        Crie um cronograma semanal. Foco: ${targetCourse}. Tempo: ${time} min/dia. Dificuldades: ${difficultiesStr}.
        RETORNE APENAS JSON: { "schedule": { "weeks": [{ "days": [{ "dia": "Segunda", "foco": "...", "materias": ["..."], "tasks": [{ "id": "1", "text": "...", "completed": false }] }] }] }, "tips": ["..."] }
    `;
    const text = await callGemini(prompt, 0.7);
    return JSON.parse(cleanJSON(text));
};

// --- 6. OCR ---
export const transcribeImage = async (image: ImageData): Promise<string> => {
    try {
        const genAI = getGenAI(); // Inicializa aqui também
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent([
            "Transcreva APENAS o texto manuscrito.",
            { inlineData: { data: image.base64, mimeType: image.mimeType } }
        ]);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Erro OCR:", error);
        throw new Error("Não foi possível ler a imagem.");
    }
};
```

### O que fazer agora:

1.  **Salve** o arquivo `geminiService.ts`.
2.  **Envie** para o GitHub:
    ```bash
    git add .
    git commit -m "Correção crítica: Inicialização lazy do Gemini"
    git push
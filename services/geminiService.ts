import { GoogleGenAI, Type } from "@google/genai";
import { CorrectionResult, ImageData, StudyProfile, StudyScheduleResult, QuestionResult, EssayTheme, SisuEstimation } from "../types";
import { logTokens } from "./storageService";

// Helper to initialize AI client with the latest API key
const getAiClient = () => {
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing. Ensure VITE_GEMINI_API_KEY is set.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

// --- FUNÇÃO DE LIMPEZA AVANÇADA PARA JSON ---
const cleanAndParseJSON = (text: string) => {
  let cleanText = text;
  
  // 1. Remove blocos de código Markdown (```json ... ```)
  cleanText = cleanText.replace(/```json\n?|```/g, '').trim();
  
  // 2. Tenta encontrar o JSON válido dentro do texto (caso a IA fale antes ou depois)
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("JSON sujo detectado, tentando sanitizar...", error);
    
    // 3. Tentativa desesperada de corrigir aspas internas não escapadas
    // Isso é arriscado, mas salva muitos casos onde a IA põe "aspas" dentro de "aspas"
    try {
        // Esta regex tenta escapar aspas que não estão nas bordas de chaves ou dois pontos
        // Nota: É uma heurística, não perfeita.
        const fixedText = cleanText.replace(/(?<!^|{|}|\[|\]|,|:)\s*"(?!,|}|]|:)/g, '\\"');
        return JSON.parse(fixedText);
    } catch (finalError) {
        console.error("Falha fatal ao ler JSON da IA. Texto recebido:", text);
        throw finalError;
    }
  }
};

const SISU_CACHE_KEY = 'enem_ai_sisu_cache_v1';
const STATIC_SISU_DB: Record<string, SisuEstimation> = {
    'medicina usp': { curso: 'Medicina (USP - Pinheiros)', nota_corte_media: 834.56, nota_corte_min: 815, nota_corte_max: 850, ano_referencia: 'SISU 2023/24', mensagem: 'Dado oficial USP.', fontes: ['[https://www.fuvest.br](https://www.fuvest.br)'] },
    // Adicione mais se necessário
};

const normalizeKey = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const getCachedSisu = (key: string): SisuEstimation | null => {
    if (STATIC_SISU_DB[key]) return STATIC_SISU_DB[key];
    try {
        const cacheRaw = localStorage.getItem(SISU_CACHE_KEY);
        if (cacheRaw) {
            const cache = JSON.parse(cacheRaw);
            if (cache[key]) return cache[key];
        }
    } catch (e) { console.warn("Cache error", e); }
    return null;
};

const saveToSisuCache = (key: string, data: SisuEstimation) => {
    try {
        const cacheRaw = localStorage.getItem(SISU_CACHE_KEY);
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
        cache[key] = data;
        localStorage.setItem(SISU_CACHE_KEY, JSON.stringify(cache));
    } catch (e) { console.warn("Cache save error", e); }
};

// SCHEMAS PARA O GOOGLE GEN AI
const correctionSchema = {
  type: Type.OBJECT,
  properties: {
    nota_total: { type: Type.NUMBER },
    competencias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          nota: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ["nome", "nota", "feedback"]
      }
    },
    comentario_geral: { type: Type.STRING },
    melhorias: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["nota_total", "competencias", "comentario_geral", "melhorias"]
};

const scheduleSchema = {
  type: Type.OBJECT,
  properties: {
    diagnostico: { type: Type.STRING },
    semana: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dia: { type: Type.STRING },
          materias: { 
              type: Type.ARRAY, 
              items: { 
                  type: Type.OBJECT,
                  properties: {
                      name: { type: Type.STRING },
                      snippet: { type: Type.STRING }
                  },
                  required: ["name", "snippet"]
              } 
          },
          foco: { type: Type.STRING }
        },
        required: ["dia", "materias", "foco"]
      }
    },
    dicas_personalizadas: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["semana", "dicas_personalizadas"]
};

const questionBatchSchema = {
  type: Type.OBJECT,
  properties: {
    questoes: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                origem: { type: Type.STRING },
                enunciado: { type: Type.STRING },
                alternativas: { type: Type.ARRAY, items: { type: Type.STRING } },
                correta_index: { type: Type.NUMBER },
                explicacao: { type: Type.STRING },
                materia: { type: Type.STRING },
                topic: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
            },
            required: ["origem", "enunciado", "alternativas", "correta_index", "explicacao", "materia", "difficulty"]
        }
    }
  },
  required: ["questoes"]
};

const essayThemeSchema = {
  type: Type.OBJECT,
  properties: {
    titulo: { type: Type.STRING },
    textos_motivadores: { type: Type.ARRAY, items: { type: Type.STRING } },
    origem: { type: Type.STRING }
  },
  required: ["titulo", "textos_motivadores", "origem"]
};

// --- FUNÇÕES EXPORTADAS ---

export const transcribeImage = async (image: ImageData): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash-exp"; // Modelo experimental costuma ser melhor para visão
  const promptText = `Transcreva este texto. Apenas o texto, sem comentários.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          { text: promptText }
        ]
      },
      config: { temperature: 0.0, maxOutputTokens: 2000 } 
    });
    
    const output = response.text || "";
    logTokens(estimateTokens(promptText) + estimateTokens(output));
    return output;
  } catch (error) {
    console.error("Transcription error", error);
    throw new Error("Erro na transcrição de imagem.");
  }
};

export const gradeEssay = async (text: string, image?: ImageData | null, theme?: EssayTheme | null): Promise<CorrectionResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash"; // Flash é rápido e bom para tarefas estruturadas
  
  // Prompt super rigoroso com a formatação
  let promptText = `TASK: Corrigir redação ENEM.
INPUT: Texto do aluno abaixo.
OUTPUT: JSON estrito.
IMPORTANTE: Não use Markdown. Não coloque aspas dentro de strings sem escapar (use \\").
FORMATO ESPERADO:
{
  "nota_total": 0-1000,
  "competencias": [{"nome": "C1", "nota": 0, "feedback": "texto"}],
  "comentario_geral": "texto",
  "melhorias": ["texto"]
}
`;
  
  if (theme) promptText += `TEMA: "${theme.titulo}" (Avalie fuga ao tema).\n`;

  const contents: any[] = [];
  if (image) {
    promptText += `Ref visual anexa. Texto transcrito: "${text}"`;
    contents.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  } else {
    promptText += `TEXTO ALUNO: "${text}"`;
  }
  contents.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json", // Força o modo JSON do modelo
        responseSchema: correctionSchema,
        temperature: 0.2,
        maxOutputTokens: 2000
      }
    });

    const output = response.text || "{}";
    logTokens(estimateTokens(promptText) + estimateTokens(output));

    return cleanAndParseJSON(output) as CorrectionResult;

  } catch (error) {
    console.error("Essay grading error:", error);
    // FALLBACK DE SEGURANÇA: Retorna um objeto de erro formatado em vez de quebrar a aplicação
    return {
        nota_total: 0,
        competencias: [
            { nome: "Erro no Processamento", nota: 0, feedback: "A IA não conseguiu gerar um formato válido. Tente novamente." },
            { nome: "Competência 2", nota: 0, feedback: "-" },
            { nome: "Competência 3", nota: 0, feedback: "-" },
            { nome: "Competência 4", nota: 0, feedback: "-" },
            { nome: "Competência 5", nota: 0, feedback: "-" }
        ],
        comentario_geral: "Ocorreu um erro técnico na leitura da resposta da IA. Por favor, tente reenviar o texto.",
        melhorias: ["Verifique se o texto não contém caracteres estranhos"]
    };
  }
};

export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";
  const promptText = `Gere cronograma ENEM JSON. Curso: ${profile.course}. Tempo: ${profile.hoursPerDay}. Dificuldades: ${profile.difficulties}.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: scheduleSchema,
        temperature: 0.3,
        maxOutputTokens: 3000
      }
    });
    
    const output = response.text!;
    logTokens(estimateTokens(promptText) + estimateTokens(output));
    return cleanAndParseJSON(output) as StudyScheduleResult;
  } catch (error) {
    console.error("Schedule generation error", error);
    throw new Error("Erro ao gerar cronograma.");
  }
};

export const generateQuestionsBatch = async (area: string, count: number, foreignLanguage?: string, isForeignBatch: boolean = false, turboTopics?: string[]): Promise<QuestionResult[]> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";
  let promptContext = `AREA: ${area}.`;
  
  if (turboTopics && turboTopics.length > 0) promptContext = `TOPICS: ${turboTopics.join(', ')}.`;
  else if (isForeignBatch && foreignLanguage) promptContext = `LANG: ${foreignLanguage}.`;

  const promptText = `TASK: Generate ${count} ENEM questions in JSON. ${promptContext} RULES: Strict JSON. Short texts.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: questionBatchSchema,
        temperature: 0.3,
        maxOutputTokens: 800 * count
      }
    });

    const output = response.text!;
    logTokens(estimateTokens(promptText) + estimateTokens(output));

    const parsed = cleanAndParseJSON(output);
    return parsed.questoes.map((q: any) => ({
        ...q,
        area: area,
        materia: q.materia || (isForeignBatch ? foreignLanguage : area),
        topic: q.topic || 'Geral'
    }));

  } catch (error) {
    console.error("Questions batch error:", error);
    return [];
  }
};

export const estimateSisuCutoff = async (courses: string[]): Promise<SisuEstimation[]> => {
    const results: SisuEstimation[] = [];
    const missingCourses: string[] = [];

    for (const course of courses) {
        const normalized = normalizeKey(course);
        const cached = getCachedSisu(normalized);
        if (cached) results.push({ ...cached, curso: course });
        else missingCourses.push(course);
    }

    if (missingCourses.length === 0) return results;

    const ai = getAiClient();
    const modelId = "gemini-2.0-flash";
    const prompt = `Find SISU cutoff scores for: ${missingCourses.join(', ')}. Output JSON array.`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { text: prompt },
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1,
                maxOutputTokens: 1000
            }
        });
        
        const outputText = response.text || "[]";
        logTokens(estimateTokens(prompt) + estimateTokens(outputText));

        // Tenta extrair JSON da resposta de busca (que pode vir misturada com texto)
        let jsonString = outputText;
        const jsonMatch = outputText.match(/```json\s*(\[[\s\S]*?\])\s*```/) || outputText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) jsonString = jsonMatch[1] || jsonMatch[0];
        
        const parsed = cleanAndParseJSON(jsonString);
        
        // Se parsed não for array, força erro para ir pro catch
        if (!Array.isArray(parsed)) throw new Error("Formato inválido");

        const newResults = parsed.map((item: any) => {
            const resultObj: SisuEstimation = {
                curso: item.curso_encontrado || item.curso_pesquisado || "Curso Desconhecido",
                nota_corte_media: Number(item.nota_corte_media) || 700,
                nota_corte_min: Number(item.nota_corte_min) || 680,
                nota_corte_max: Number(item.nota_corte_max) || 720,
                ano_referencia: item.ano_referencia || "Estimativa",
                mensagem: item.mensagem || "Dados aproximados.",
                fontes: []
            };
            if (item.curso_pesquisado) saveToSisuCache(normalizeKey(item.curso_pesquisado), resultObj);
            return resultObj;
        });
        return [...results, ...newResults];

    } catch (e) {
        console.error("Sisu search error:", e);
        const fallbacks = missingCourses.map(c => ({
            curso: c,
            nota_corte_media: 700, 
            nota_corte_min: 600,
            nota_corte_max: 800,
            ano_referencia: "Estimativa",
            mensagem: "Não foi possível verificar no momento."
        }));
        return [...results, ...fallbacks];
    }
}

export const generateEssayTheme = async (): Promise<EssayTheme> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";
  const promptText = `Gere tema redação ENEM atual. JSON: {titulo, textos_motivadores, origem}.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: essayThemeSchema,
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    });
    return cleanAndParseJSON(response.text!) as EssayTheme;
  } catch (error) {
    console.error("Theme error", error);
    throw new Error("Erro ao gerar tema.");
  }
};
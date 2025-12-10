import { GoogleGenAI, Type } from "@google/genai";
import { CorrectionResult, ImageData, StudyProfile, StudyScheduleResult, QuestionResult, EssayTheme, SisuEstimation } from "../types";
import { logTokens } from "./storageService";

// Helper to initialize AI client with the latest API key
const getAiClient = () => {
  // Tenta obter a chave do process.env (Ambiente Cloud/System) ou import.meta.env (Ambiente Local Vite)
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("API Key is missing. Ensure process.env.API_KEY or VITE_GEMINI_API_KEY is set.");
  }

  return new GoogleGenAI({ apiKey: apiKey || '' });
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

// --- FUNÇÃO AUXILIAR PARA LIMPAR JSON DA IA ---
const cleanAndParseJSON = (text: string) => {
  try {
    // 1. Tenta parsear direto caso venha limpo
    return JSON.parse(text);
  } catch (firstError) {
    // 2. Se falhar, tenta limpar blocos de código Markdown (```json ... ```)
    try {
      let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // 3. Tenta encontrar onde começa '{' e termina '}' para ignorar textos extras
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }
      
      return JSON.parse(cleanText);
    } catch (finalError) {
      console.error("Falha fatal ao ler JSON da IA. Texto recebido:", text);
      throw finalError; // Lança erro para cair no catch da função principal
    }
  }
};

const SISU_CACHE_KEY = 'enem_ai_sisu_cache_v1';

const STATIC_SISU_DB: Record<string, SisuEstimation> = {
    'medicina usp': { curso: 'Medicina (USP - Pinheiros)', nota_corte_media: 834.56, nota_corte_min: 815, nota_corte_max: 850, ano_referencia: 'SISU 2023/24', mensagem: 'Dado oficial USP (Ampla Concorrência).', fontes: ['https://www.fuvest.br'] },
    'medicina unifesp': { curso: 'Medicina (UNIFESP)', nota_corte_media: 798.20, nota_corte_min: 795, nota_corte_max: 805, ano_referencia: 'SISU 2023', mensagem: 'Dado oficial UNIFESP.', fontes: ['https://www.unifesp.br'] },
    'direito usp': { curso: 'Direito (USP)', nota_corte_media: 765.40, nota_corte_min: 750, nota_corte_max: 780, ano_referencia: 'SISU 2023', mensagem: 'Dado oficial SanFran.', fontes: ['https://www.fuvest.br'] },
};

const normalizeKey = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const getCachedSisu = (key: string): SisuEstimation | null => {
    if (STATIC_SISU_DB[key]) return STATIC_SISU_DB[key];
    const staticKey = Object.keys(STATIC_SISU_DB).find(k => key.includes(k) || k.includes(key));
    if (staticKey) return STATIC_SISU_DB[staticKey];
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
                      snippet: { type: Type.STRING, description: "Resumo curto de 1 linha." }
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

export const transcribeImage = async (image: ImageData): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  // Prompt otimizado para OCR direto
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
      config: { 
          temperature: 0.0, // Deterministico para OCR
          maxOutputTokens: 2000 
      } 
    });
    
    const output = response.text || "";
    const inputTokens = estimateTokens(promptText) + 258;
    const outputTokens = estimateTokens(output);
    logTokens(inputTokens + outputTokens);

    return output;
  } catch (error) {
    console.error("Transcription error", error);
    throw new Error("Erro na transcrição de imagem.");
  }
};

// --- FUNÇÃO CORRIGIDA COM TRATAMENTO DE ERRO E LIMPEZA DE JSON ---
export const gradeEssay = async (text: string, image?: ImageData | null, theme?: EssayTheme | null): Promise<CorrectionResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash"; 
  
  // Prompt técnico direto para reduzir latência de processamento
  let promptText = `TASK: Corrigir redação ENEM.
INPUT: Texto abaixo.
OUTPUT: JSON estrito seguindo esquema.
CRITÉRIOS: Rigor oficial INEP (Competências 1-5).
`;
  
  if (theme) {
      promptText += `TEMA: "${theme.titulo}" (Avalie fuga ao tema).\n`;
  }

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
        responseMimeType: "application/json",
        responseSchema: correctionSchema,
        temperature: 0.1, // Baixa temperatura para análise técnica rápida
        maxOutputTokens: 2000 // Limite para evitar alucinações longas
      }
    });

    const output = response.text || "{}";
    const inputTokens = estimateTokens(promptText) + (image ? 258 : 0);
    const outputTokens = estimateTokens(output);
    logTokens(inputTokens + outputTokens);

    // Usa a função de limpeza antes de retornar
    return cleanAndParseJSON(output) as CorrectionResult;

  } catch (error) {
    console.error("Essay grading error", error);
    // Retorna um objeto de erro amigável para não quebrar a tela
    return {
        nota_total: 0,
        competencias: [
            { nome: "Erro no Processamento", nota: 0, feedback: "Houve um erro técnico ao corrigir sua redação." },
            { nome: "Tente Novamente", nota: 0, feedback: "Por favor, envie o texto novamente." },
            { nome: "Competência 3", nota: 0, feedback: "-" },
            { nome: "Competência 4", nota: 0, feedback: "-" },
            { nome: "Competência 5", nota: 0, feedback: "-" }
        ],
        comentario_geral: "Ocorreu um erro de comunicação com a IA ou o texto enviado não pôde ser processado corretamente. Verifique sua conexão e tente novamente.",
        melhorias: ["Tente enviar um texto mais curto", "Verifique a formatação do texto"]
    } as CorrectionResult;
  }
};

export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  
  // Prompt comprimido para geração rápida
  const promptText = `Gere cronograma ENEM JSON. Curso: ${profile.course}. Tempo: ${profile.hoursPerDay}. ${profile.scores ? `Notas: L${profile.scores.linguagens} H${profile.scores.humanas} N${profile.scores.natureza} M${profile.scores.matematica} R${profile.scores.redacao}` : `Dificuldades: ${profile.difficulties}`}.
REGRAS: Snippets curtos (max 10 palavras). Foco em tópicos de alta incidência.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: scheduleSchema,
        temperature: 0.3, // Equilíbrio entre variedade e velocidade
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
  const modelId = "gemini-2.5-flash";
  let promptContext = "";
  
  if (turboTopics && turboTopics.length > 0) {
      promptContext = `TOPICS: ${turboTopics.join(', ')}.`;
  } else if (isForeignBatch && foreignLanguage) {
      promptContext = `LANG: ${foreignLanguage}.`;
  } else {
     promptContext = `AREA: ${area}.`;
  }

  // Prompt otimizado para velocidade: direto e estruturado
  const promptText = `TASK: Generate ${count} ENEM questions in JSON.
CONTEXT: ${promptContext}
RULES:
1. Strict JSON output.
2. Short, concise texts (max 100 words).
3. 5 alternatives, 1 correct.
4. Difficulty: varied.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: questionBatchSchema,
        temperature: 0.3, // Mais determinístico = mais rápido
        maxOutputTokens: 800 * count // Limite dinâmico baseado na contagem
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
    console.error("Erro ao gerar batch de questões:", error);
    return [];
  }
};

export const estimateSisuCutoff = async (courses: string[]): Promise<SisuEstimation[]> => {
    const results: SisuEstimation[] = [];
    const missingCourses: string[] = [];

    for (const course of courses) {
        const normalized = normalizeKey(course);
        const cached = getCachedSisu(normalized);
        if (cached) {
            results.push({ ...cached, curso: course });
        } else {
            missingCourses.push(course);
        }
    }

    if (missingCourses.length === 0) return results;

    const ai = getAiClient();
    const modelId = "gemini-2.5-flash";
    
    // Prompt altamente otimizado para uso de ferramenta
    // Instruções claras para PARAR a busca assim que encontrar o dado
    const prompt = `Find SISU 2023/2024 cutoff scores (Ampla Concorrência) for: ${missingCourses.join(', ')}.
OUTPUT: JSON Array only.
Format: [{ "curso_pesquisado": "...", "curso_encontrado": "...", "nota_corte_media": number, "ano_referencia": "...", "mensagem": "..." }]
RULES: Use Google Search. Extract number. Return JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { text: prompt },
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1, // Mínima criatividade para busca de dados
                maxOutputTokens: 1000
            }
        });
        
        const outputText = response.text || "";
        logTokens(estimateTokens(prompt) + estimateTokens(outputText));

        const sources: string[] = [];
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) sources.push(chunk.web.uri);
            });
        }
        const uniqueSources = [...new Set(sources)];

        let jsonString = outputText;
        const jsonMatch = outputText.match(/```json\s*(\[[\s\S]*?\])\s*```/) || outputText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            jsonString = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonString);
            const newResults = parsed.map((item: any) => {
                const resultObj: SisuEstimation = {
                    curso: item.curso_encontrado || item.curso_pesquisado,
                    nota_corte_media: item.nota_corte_media,
                    nota_corte_min: item.nota_corte_min || item.nota_corte_media - 10,
                    nota_corte_max: item.nota_corte_max || item.nota_corte_media + 10,
                    ano_referencia: item.ano_referencia || "SISU Recente",
                    mensagem: item.mensagem || "Nota estimada via busca.",
                    fontes: uniqueSources
                };
                if (item.curso_pesquisado) saveToSisuCache(normalizeKey(item.curso_pesquisado), resultObj);
                return resultObj;
            });
            return [...results, ...newResults];
        } else {
             // Fallback silencioso se o JSON falhar, mas tenta parsear o texto se for simples
             throw new Error("Formato JSON não encontrado.");
        }
    } catch (e) {
        console.error("Erro no Grounding SISU:", e);
        const fallbacks = missingCourses.map(c => ({
            curso: c,
            nota_corte_media: 700, 
            nota_corte_min: 600,
            nota_corte_max: 800,
            ano_referencia: "Estimativa",
            mensagem: "Dados indisponíveis no momento."
        }));
        return [...results, ...fallbacks];
    }
}

export const generateEssayTheme = async (): Promise<EssayTheme> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  // Prompt curto e direto
  const promptText = `Gere tema redação ENEM atual. JSON: {titulo, textos_motivadores, origem}.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: essayThemeSchema,
        temperature: 0.7, // Um pouco de variedade aqui é bom, mas mantemos o restante rápido
        maxOutputTokens: 1000
      }
    });

    const output = response.text!;
    logTokens(estimateTokens(promptText) + estimateTokens(output));
    
    return cleanAndParseJSON(output) as EssayTheme;
  } catch (error) {
    console.error("Theme generation error", error);
    throw new Error("Erro ao gerar tema.");
  }
};
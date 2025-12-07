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
                      snippet: { type: Type.STRING, description: "Resumo curto de 2 linhas sobre o tópico." }
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
  const promptText = `Transcreva o texto desta imagem exatemente como está. Ignore rasuras. Mantenha pontuação.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          { text: promptText }
        ]
      },
      config: { temperature: 0.1 }
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

export const gradeEssay = async (text: string, image?: ImageData | null, theme?: EssayTheme | null): Promise<CorrectionResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash"; 
  let promptText = `Corrija a redação ENEM baseada nas 5 competências. Rigor oficial.`;
  
  if (theme) {
      promptText += `\n\nATENÇÃO AO TEMA PROPOSTO:\nTítulo: "${theme.titulo}"\nUse este tema para avaliar a Competência 2 (Fuga ao tema) e Competência 3. Se o texto fugir deste tema, penalize severamente.\n`;
  }

  // Explicitly type parts array as any to allow pushing different types of parts
  const contents: any[] = [];

  if (image) {
    promptText += `\nUse o documento/imagem fornecido como referência visual. O texto transcrito é o seguinte: "${text}"`;
    contents.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  } else {
    promptText += `\nTexto do Aluno: "${text}"`;
  }
  contents.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: correctionSchema,
        temperature: 0.2,
      }
    });

    const output = response.text!;
    const inputTokens = estimateTokens(promptText) + (image ? 258 : 0);
    const outputTokens = estimateTokens(output);
    logTokens(inputTokens + outputTokens);

    return JSON.parse(output) as CorrectionResult;
  } catch (error) {
    console.error("Essay grading error", error);
    throw new Error("Erro ao corrigir redação.");
  }
};

export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  let promptText = "";

  if (profile.scores) {
      promptText = `Crie cronograma ENEM para ${profile.course}. Tempo: ${profile.hoursPerDay}. Notas: Ling ${profile.scores.linguagens}, Hum ${profile.scores.humanas}, Nat ${profile.scores.natureza}, Mat ${profile.scores.matematica}, Red ${profile.scores.redacao}. Regra: Tempo inversamente proporcional à nota. Priorize pesos do SISU. IMPORTANTE: Para cada matéria, forneça um 'snippet' (resumo curto explicativo) no JSON.`;
  } else {
      promptText = `Crie cronograma ENEM para ${profile.course}. Tempo: ${profile.hoursPerDay}. Dificuldades: ${profile.difficulties}. IMPORTANTE: Para cada matéria, forneça um 'snippet' (resumo curto explicativo) no JSON.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: scheduleSchema,
        temperature: 0.6,
      }
    });
    
    const output = response.text!;
    logTokens(estimateTokens(promptText) + estimateTokens(output));

    return JSON.parse(output) as StudyScheduleResult;
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
      promptContext = `MODO REVISÃO INTENSIVA (TURBO). Foque exclusivamente nestes tópicos onde o aluno errou anteriormente: ${turboTopics.join(', ')}. Gere questões para sanar essas dúvidas específicas. Nível: Médio/Difícil.`;
  } else if (isForeignBatch && foreignLanguage) {
      promptContext = `IDIOMA: ${foreignLanguage.toUpperCase()}. Enunciado e Texto Base em ${foreignLanguage}. Foco: Interpretação de texto.`;
  } else {
     promptContext = `Área: ${area}. Gere questões variadas e de alta qualidade. Defina "difficulty" (easy/medium/hard).`;
  }

  const promptText = `Gere EXATAMENTE ${count} questões no formato JSON para o ENEM. ${promptContext} Tente usar questões reais ou crie simulados perfeitos.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: questionBatchSchema,
        temperature: 0.5, 
      }
    });

    const output = response.text!;
    logTokens(estimateTokens(promptText) + estimateTokens(output));

    const parsed = JSON.parse(output);
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
    const prompt = `Pesquise no Google as notas de corte OFICIAIS do SISU (Ampla Concorrência) dos últimos anos (2023, 2024) para os seguintes cursos: ${missingCourses.join(', ')}. REGRAS RIGOROSAS: 1. Use APENAS dados reais encontrados na busca. NÃO INVENTE. 2. Se não encontrar o curso específico, procure o mais próximo na mesma universidade ou região. 3. Calcule a média simples entre 2023 e 2024 se disponível. 4. Retorne a resposta ESTRITAMENTE como um array JSON válido. O formato do JSON deve ser: [{ "curso_pesquisado": "...", "curso_encontrado": "...", "nota_corte_media": 750.5, "nota_corte_min": 740, "nota_corte_max": 760, "ano_referencia": "Média SISU 2023/24", "mensagem": "..." }]`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { text: prompt },
            config: {
                tools: [{ googleSearch: {} }],
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
        // Clean up markdown code blocks if present
        const jsonMatch = outputText.match(/```json\s*(\[[\s\S]*?\])\s*```/) || outputText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            jsonString = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonString);
            const newResults = parsed.map((item: any) => {
                const resultObj: SisuEstimation = {
                    curso: item.curso_encontrado || item.curso_pesquisado,
                    nota_corte_media: item.nota_corte_media,
                    nota_corte_min: item.nota_corte_min,
                    nota_corte_max: item.nota_corte_max,
                    ano_referencia: item.ano_referencia,
                    mensagem: item.mensagem,
                    fontes: uniqueSources
                };
                if (item.curso_pesquisado) saveToSisuCache(normalizeKey(item.curso_pesquisado), resultObj);
                return resultObj;
            });
            return [...results, ...newResults];
        } else {
             throw new Error("Formato JSON não encontrado na resposta da busca.");
        }
    } catch (e) {
        console.error("Erro no Grounding SISU:", e);
        // Fallback para evitar travar a UI
        const fallbacks = missingCourses.map(c => ({
            curso: c,
            nota_corte_media: 700, 
            nota_corte_min: 600,
            nota_corte_max: 800,
            ano_referencia: "Estimativa (Sem dados reais)",
            mensagem: "Não foi possível verificar a nota real no momento. Tente novamente mais tarde."
        }));
        return [...results, ...fallbacks];
    }
}

export const generateEssayTheme = async (): Promise<EssayTheme> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  const promptText = `Gere um tema de redação ENEM completo. O tema pode ser uma proposta anterior do ENEM ou um tema ATUAL E EM ALTA NO MOMENTO. Retorne apenas o JSON com título e textos motivadores (curtos).`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: {
        responseMimeType: "application/json",
        responseSchema: essayThemeSchema,
        temperature: 0.8,
      }
    });

    const output = response.text!;
    logTokens(estimateTokens(promptText) + estimateTokens(output));
    
    return JSON.parse(output) as EssayTheme;
  } catch (error) {
    console.error("Theme generation error", error);
    throw new Error("Erro ao gerar tema.");
  }
};
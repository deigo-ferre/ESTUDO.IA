import { GoogleGenAI, Type } from "@google/genai";
import { CorrectionResult, ImageData, StudyProfile, StudyScheduleResult, QuestionResult, EssayTheme, SisuEstimation } from "../types";
import { logTokens } from "./storageService";

// Inicializa o cliente da IA
const getAiClient = () => {
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing. Ensure VITE_GEMINI_API_KEY is set.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

// --- FUNÇÃO DE LIMPEZA E PARSE (Ajustada para não falhar) ---
const cleanAndParseJSON = (text: string) => {
  console.log("🤖 Resposta Bruta da IA (Correção):", text);

  // 1. Remove formatação Markdown
  let cleanText = text.replace(/```json\n?|```/g, '').trim();
  
  // 2. Isola o objeto JSON
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("JSON sujo. Tentando recuperação manual...", error);
    
    // Tenta limpar aspas internas que quebram o JSON
    // Ex: "feedback": "O uso de "aspas" quebra" -> "feedback": "O uso de 'aspas' quebra"
    try {
        const fixedText = cleanText.replace(/(?<=:\s*)"(.*?)"(?=\s*[,}])/g, (match) => {
            // Dentro do valor de uma propriedade, troca aspas duplas por simples
            return match.replace(/(?<!^)"(?!$)/g, "'");
        });
        return JSON.parse(fixedText);
    } catch (e2) {
        // Último recurso: Extração via Regex para garantir que a nota venha
        const notaMatch = cleanText.match(/"nota_total"\s*:\s*(\d+)/);
        if (notaMatch) {
            return {
                nota_total: parseInt(notaMatch[1]),
                competencias: [], // Detalhes perdidos, mas nota salva
                comentario_geral: "Correção realizada, mas houve erro na formatação do detalhamento.",
                melhorias: []
            };
        }
        throw error;
    }
  }
};

const SISU_CACHE_KEY = 'enem_ai_sisu_cache_v1';
const STATIC_SISU_DB: Record<string, SisuEstimation> = {
    'medicina usp': { curso: 'Medicina (USP - Pinheiros)', nota_corte_media: 834.56, nota_corte_min: 815, nota_corte_max: 850, ano_referencia: 'SISU 2023/24', mensagem: 'Dado oficial USP.', fontes: ['https://www.fuvest.br'] },
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

// --- CORREÇÃO DE REDAÇÃO (PADRÃO ENEM) ---
export const gradeEssay = async (text: string, image?: ImageData | null, theme?: EssayTheme | null): Promise<CorrectionResult> => {
  const ai = getAiClient();
  const modelId = "gemini-1.5-flash"; 
  
  const themeText = theme ? `TEMA PROPOSTO: "${theme.titulo}"` : "TEMA: Livre / Não identificado";
  
  // PROMPT ENGENHEIRADO COM REGRAS DO MANUAL DO CORRETOR
  const promptText = `
    ATUE COMO UM CORRETOR OFICIAL DA BANCA DO ENEM (INEP).
    Sua tarefa é corrigir a redação abaixo com rigor técnico absoluto.

    ${themeText}
    
    TEXTO DO ALUNO:
    "${text}"

    REGRAS DE CORREÇÃO (MATRIZ DE REFERÊNCIA DO ENEM):
    Avalie de 0 a 200 pontos cada competência (apenas múltiplos de 40: 0, 40, 80, 120, 160, 200).
    
    1. Competência 1 (Norma Culta): Avalie desvios gramaticais, ortografia, acentuação e fluidez. Seja rigoroso.
    2. Competência 2 (Tema e Estrutura): O texto é dissertativo-argumentativo? Foge ao tema? Usa repertório sociocultural produtivo?
    3. Competência 3 (Argumentação): Defesa de tese, projeto de texto, progressão de ideias.
    4. Competência 4 (Coesão): Uso de conectivos, parágrafos bem estruturados, repetição de palavras.
    5. Competência 5 (Proposta de Intervenção): Tem os 5 elementos (Agente, Ação, Meio/Modo, Efeito, Detalhamento)?

    ⚠️ FORMATO DE SAÍDA OBRIGATÓRIO (JSON PURO): ⚠️
    Não use Markdown. Não coloque texto antes ou depois.
    Dentro dos textos, use ASPAS SIMPLES ('') para citações, nunca aspas duplas.

    {
      "nota_total": (soma das 5 competências),
      "competencias": [
        { "nome": "C1: Norma Culta", "nota": (0-200), "feedback": "Análise técnica..." },
        { "nome": "C2: Tema e Estrutura", "nota": (0-200), "feedback": "Análise técnica..." },
        { "nome": "C3: Argumentação", "nota": (0-200), "feedback": "Análise técnica..." },
        { "nome": "C4: Coesão", "nota": (0-200), "feedback": "Análise técnica..." },
        { "nome": "C5: Proposta de Intervenção", "nota": (0-200), "feedback": "Análise técnica..." }
      ],
      "comentario_geral": "Parecer final da banca sobre a redação.",
      "melhorias": ["Ação prática 1", "Ação prática 2", "Ação prática 3"]
    }
  `;

  const contents: any[] = [];
  if (image) {
    contents.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    contents.push({ text: "Texto transcrito da imagem original: " + text });
  }
  contents.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        temperature: 0.0, // Zero criatividade, 100% consistência técnica
      }
    });

    const output = response.text || "{}";
    logTokens(estimateTokens(promptText) + estimateTokens(output));

    const result = cleanAndParseJSON(output);

    // Validação de Segurança: Se a nota não for número, força erro
    if (typeof result.nota_total !== 'number') {
        throw new Error("Nota total inválida");
    }

    return result as CorrectionResult;

  } catch (error: any) {
    console.error("Erro na Correção:", error);
    // Retorno amigável em vez de crash
    return {
        nota_total: 0,
        competencias: [
            { nome: "Erro Técnico", nota: 0, feedback: "Falha ao processar a resposta da IA." },
            { nome: "-", nota: 0, feedback: "-" },
            { nome: "-", nota: 0, feedback: "-" },
            { nome: "-", nota: 0, feedback: "-" },
            { nome: "-", nota: 0, feedback: "-" }
        ],
        comentario_geral: `Houve um problema técnico. Tente reenviar o texto. Detalhe: ${error.message}`,
        melhorias: []
    };
  }
};

export const transcribeImage = async (image: ImageData): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-1.5-flash"; 
  const promptText = `Transcreva este texto manuscrito com exatidão.`;

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
    return response.text || "";
  } catch (error) {
    console.error("Transcription error", error);
    throw new Error("Erro na transcrição de imagem.");
  }
};

export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
  const ai = getAiClient();
  const modelId = "gemini-1.5-flash";
  const promptText = `Gere cronograma ENEM JSON. Curso: ${profile.course}. Tempo: ${profile.hoursPerDay}. Dificuldades: ${profile.difficulties}. JSON Output.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!) as StudyScheduleResult;
  } catch (error) {
    console.error("Schedule error", error);
    throw error;
  }
};

export const generateQuestionsBatch = async (area: string, count: number, foreignLanguage?: string, isForeignBatch: boolean = false, turboTopics?: string[]): Promise<QuestionResult[]> => {
  const ai = getAiClient();
  const modelId = "gemini-1.5-flash";
  let promptContext = `AREA: ${area}.`;
  if (turboTopics && turboTopics.length > 0) promptContext = `TOPICS: ${turboTopics.join(', ')}.`;
  else if (isForeignBatch && foreignLanguage) promptContext = `LANG: ${foreignLanguage}.`;

  const promptText = `TASK: Generate ${count} ENEM questions in JSON. ${promptContext} RULES: Strict JSON. Short texts. Format: { "questoes": [...] }`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: { responseMimeType: "application/json" }
    });
    const parsed = cleanAndParseJSON(response.text!);
    return parsed.questoes.map((q: any) => ({ ...q, area, materia: q.materia || area }));
  } catch (error) {
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
    const modelId = "gemini-1.5-flash";
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
        let jsonString = outputText;
        const jsonMatch = outputText.match(/```json\s*(\[[\s\S]*?\])\s*```/) || outputText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonString = jsonMatch[1] || jsonMatch[0];
        
        const parsed = cleanAndParseJSON(jsonString);
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
        const fallbacks = missingCourses.map(c => ({
            curso: c,
            nota_corte_media: 700, 
            nota_corte_min: 600,
            nota_corte_max: 800,
            ano_referencia: "Estimativa",
            mensagem: "Indisponível no momento."
        }));
        return [...results, ...fallbacks];
    }
}

export const generateEssayTheme = async (): Promise<EssayTheme> => {
  const ai = getAiClient();
  const modelId = "gemini-1.5-flash";
  const promptText = `Gere 1 tema redação ENEM. JSON: { "titulo": "...", "textos_motivadores": ["..."], "origem": "Inédita" }`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: promptText },
      config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!) as EssayTheme;
  } catch (error) {
    throw new Error("Erro ao gerar tema.");
  }
};
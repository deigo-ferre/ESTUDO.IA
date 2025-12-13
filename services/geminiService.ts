import { GoogleGenAI } from "@google/genai";
import { CorrectionResult, ImageData, StudyProfile, StudyScheduleResult, QuestionResult, EssayTheme, SisuEstimation } from "../types";
import { logTokens } from "./storageService";

const getAiClient = () => {
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) console.warn("API Key missing for geminiService");
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

const estimateTokens = (text: string) => Math.ceil((text || "").length / 4);
const SISU_CACHE_KEY = "enem_ai_sisu_cache_v1";

const cleanAndParseJSON = (text: string) => {
  let s = (text || "").toString();
  s = s.replace(/```json\n?|```/g, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1) s = s.substring(first, last + 1);
  return JSON.parse(s);
};

const normalizeKey = (t: string) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const getCachedSisu = (key: string): SisuEstimation | null => {
  try {
    const raw = localStorage.getItem(SISU_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[key] || null;
  } catch {
    return null;
  }
};

const saveToSisuCache = (key: string, data: SisuEstimation) => {
  try {
    const raw = localStorage.getItem(SISU_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[key] = data;
    localStorage.setItem(SISU_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

export const transcribeImage = async (image: ImageData): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-2.0-flash-exp";
  const prompt = "Transcreva o texto manuscrito. Retorne apenas o texto.";
  const res = await ai.models.generateContent({
    model,
    contents: { parts: [{ inlineData: { mimeType: image.mimeType, data: image.base64 } }, { text: prompt }] },
    config: { temperature: 0.1, maxOutputTokens: 2000 }
  });
  return res.text || "";
};

export const gradeEssay = async (text: string, image?: ImageData | null, theme?: EssayTheme | null): Promise<CorrectionResult> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";
  const themeText = theme ? `Tema: "${theme.titulo}"` : "Tema livre";
  const prompt = `Aja como corretor ENEM. ${themeText}\nTEXTO: ${text}\nRetorne apenas JSON com nota_total, competencias, comentario_geral e melhorias.`;
  try {
    const res = await ai.models.generateContent({ model, contents: { parts: [{ text: prompt }] }, config: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 2000 } });
    const out = res.text || "{}";
    logTokens(estimateTokens(prompt) + estimateTokens(out));
    return cleanAndParseJSON(out) as CorrectionResult;
  } catch (e) {
    console.error("gradeEssay error", e);
    return {
      nota_total: 0,
      competencias: [
        { nome: "Erro", nota: 0, feedback: "Erro técnico" },
        { nome: "Erro", nota: 0, feedback: "Erro técnico" },
        { nome: "Erro", nota: 0, feedback: "Erro técnico" },
        { nome: "Erro", nota: 0, feedback: "Erro técnico" },
        { nome: "Erro", nota: 0, feedback: "Erro técnico" }
      ],
      comentario_geral: "Erro na correção.",
      melhorias: []
    } as CorrectionResult;
  }
};

export const generateStudySchedule = async (profile: StudyProfile): Promise<StudyScheduleResult> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";
  const prompt = `Gere cronograma ENEM JSON. Curso: ${profile.course}. Tempo: ${profile.hoursPerDay}. Dificuldades: ${profile.difficulties || ''}`;
  const res = await ai.models.generateContent({ model, contents: { text: prompt }, config: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 3000 } });
  logTokens(estimateTokens(prompt) + estimateTokens(res.text || ""));
  return cleanAndParseJSON(res.text || "{}") as StudyScheduleResult;
};

export const generateQuestionsBatch = async (area: string, count: number, foreignLanguage?: string, isForeignBatch: boolean = false, turboTopics?: string[]): Promise<QuestionResult[]> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";
  const topicContext = turboTopics && turboTopics.length ? `focadas em: ${turboTopics.join(', ')}` : '';
  const langContext = isForeignBatch && foreignLanguage ? ` (${foreignLanguage})` : '';
  const prompt = `Gere ${count} questões ENEM de ${area}${langContext}. ${topicContext} Retorne JSON com array questoes.`;
  try {
    const res = await ai.models.generateContent({ model, contents: { text: prompt }, config: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 800 * Math.max(1, count) } });
    logTokens(estimateTokens(prompt) + estimateTokens(res.text || ""));
    const parsed = cleanAndParseJSON(res.text || "[]");
    return (parsed.questoes || []).map((q: any) => ({ ...q, area, materia: q.materia || area }));
  } catch (e) {
    console.error("generateQuestionsBatch error", e);
    return [];
  }
};

export const estimateSisuCutoff = async (courses: string[]): Promise<SisuEstimation[]> => {
  const results: SisuEstimation[] = [];
  const missing: string[] = [];
  for (const c of courses) {
    const k = normalizeKey(c);
    const cached = getCachedSisu(k);
    if (cached) results.push({ ...cached, curso: c }); else missing.push(c);
  }
  if (missing.length === 0) return results;
  const ai = getAiClient();
  const model = "gemini-2.5-flash";
  const prompt = `Estime nota de corte SISU para: ${missing.join(', ')}. Retorne JSON array.`;
  try {
    const res = await ai.models.generateContent({ model, contents: { text: prompt }, config: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 1000 } });
    logTokens(estimateTokens(prompt) + estimateTokens(res.text || ""));
    const parsed = cleanAndParseJSON(res.text || "[]");
    const mapped = (parsed || []).map((it: any) => ({ curso: it.curso || it.curso_pesquisado || 'Desconhecido', nota_corte_media: it.nota_corte_media || 700, nota_corte_min: it.nota_corte_min || (it.nota_corte_media || 700) - 10, nota_corte_max: it.nota_corte_max || (it.nota_corte_media || 700) + 10, ano_referencia: it.ano_referencia || 'Estimado', mensagem: it.mensagem || '' }));
    mapped.forEach((m: any) => saveToSisuCache(normalizeKey(m.curso), m));
    return [...results, ...mapped];
  } catch (e) {
    console.error('estimateSisuCutoff error', e);
    const fallback = missing.map(c => ({ curso: c, nota_corte_media: 700, nota_corte_min: 650, nota_corte_max: 750, ano_referencia: 'Estimado', mensagem: 'Estimativa padrão' }));
    return [...results, ...fallback];
  }
};

export const generateEssayTheme = async (): Promise<EssayTheme> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";
  const prompt = 'Gere 1 tema de redação ENEM. Retorne JSON { titulo, textos_motivadores, origem }';
  const res = await ai.models.generateContent({ model, contents: { text: prompt }, config: { responseMimeType: "application/json", temperature: 0.5, maxOutputTokens: 800 } });
  logTokens(estimateTokens(prompt) + estimateTokens(res.text || ""));
  return cleanAndParseJSON(res.text || "{}") as EssayTheme;
};
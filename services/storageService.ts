import { User, UserSettings, CorrectionResult, ExamState, ExamConfig, PlanType } from '../types';

const USER_KEY = 'estude_ia_user';
const SETTINGS_KEY = 'estude_ia_settings';
const USAGE_KEY = 'estude_ia_usage';
const ESSAYS_KEY = 'estude_ia_essays';
const EXAMS_KEY = 'estude_ia_exams';

// --- GERENCIAMENTO DE SESSÃO (LOGIN) ---

export const saveUserSession = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getUserSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null; // <--- SE NÃO TIVER NADA, RETORNA NULL (TELA DE LOGIN)

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Erro ao ler sessão:", error);
    return null;
  }
};

export const clearUserSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
};

// --- CONFIGURAÇÕES E OUTROS ---

export const getSettings = (): UserSettings => {
  if (typeof window === 'undefined') return { theme: 'light', fontSize: 'medium', fontStyle: 'sans' };
  const stored = localStorage.getItem(SETTINGS_KEY);
  return stored ? JSON.parse(stored) : { theme: 'light', fontSize: 'medium', fontStyle: 'sans' };
};

// Se precisar das outras funções (checkUsageLimit, saveExamProgress, etc),
// mantenha as que você já tem abaixo daqui, mas certifique-se que getUserSession
// esteja exatamente como acima.
// ... (mantenha o resto do seu arquivo se tiver lógica de limites/provas)
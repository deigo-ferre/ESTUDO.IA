import { User, UserSettings, SavedReport, SavedExam } from '../types';

// Chaves principais do LocalStorage
const KEYS = {
    SESSION: 'enem_ai_session_v2',
    SETTINGS: 'enem_ai_settings_v2',
    REPORTS: 'enem_ai_reports_v2',
    EXAMS: 'enem_ai_exams_v2',
    TOKENS: 'enem_ai_tokens_consumed'
};

// --- GERENCIAMENTO DE SESSÃO (LOGIN) ---

export const saveUserSession = (user: User) => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
};

export const getUserSession = (): User | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
};

export const clearUserSession = () => {
    localStorage.removeItem(KEYS.SESSION);
    // Não limpamos os outros dados aqui para não perder o histórico de outros usuários
    // A limpeza total só ocorre se o usuário clicar em "Excluir Conta"
};

// Helper: Pega o ID do usuário logado atual
const getCurrentUserId = (): string | null => {
    const user = getUserSession();
    return user ? user.id : null;
};

// --- CONFIGURAÇÕES (Por Usuário) ---

export const getSettings = (): UserSettings => {
    const userId = getCurrentUserId();
    const defaultSettings: UserSettings = { 
        theme: 'system', 
        fontSize: 'base', 
        fontStyle: 'sans',
        sisuGoals: [] 
    };

    if (!userId) return defaultSettings;

    try {
        // Busca o "Bancão" de configurações
        const allSettings = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
        // Retorna só as do usuário atual ou o padrão
        return allSettings[userId] || defaultSettings;
    } catch {
        return defaultSettings;
    }
};

export const saveSettings = (settings: UserSettings) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const allSettings = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    allSettings[userId] = settings; // Salva na gaveta deste usuário
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(allSettings));
};

// --- RELATÓRIOS (Por Usuário) ---

export const saveReport = (report: SavedReport) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Garante que o relatório tenha o ID do dono
    const reportWithOwner = { ...report, userId };

    const reports = getAllReportsRaw();
    reports.unshift(reportWithOwner);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
};

export const getReports = (): SavedReport[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const allReports = getAllReportsRaw();
    // FILTRO MÁGICO: Só retorna o que é deste usuário
    return allReports.filter((r: any) => r.userId === userId);
};

export const deleteReport = (id: string) => {
    const reports = getAllReportsRaw().filter(r => r.id !== id);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
};

// --- SIMULADOS & REDAÇÕES (Por Usuário) ---

export const saveExam = (exam: SavedExam) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const examWithOwner = { ...exam, userId }; // Carimba o dono

    const exams = getAllExamsRaw();
    // Verifica se já existe para atualizar
    const index = exams.findIndex(e => e.id === exam.id);
    
    if (index >= 0) {
        exams[index] = examWithOwner;
    } else {
        exams.unshift(examWithOwner);
    }
    
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
};

export const getExams = (): SavedExam[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const allExams = getAllExamsRaw();
    // FILTRO MÁGICO: Só retorna o que é deste usuário
    return allExams.filter((e: any) => e.userId === userId);
};

export const deleteExam = (id: string) => {
    const exams = getAllExamsRaw().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
};

// --- HELPERS INTERNOS (Lê tudo do disco) ---

const getAllReportsRaw = (): SavedReport[] => {
    try {
        return JSON.parse(localStorage.getItem(KEYS.REPORTS) || '[]');
    } catch { return []; }
};

const getAllExamsRaw = (): SavedExam[] => {
    try {
        return JSON.parse(localStorage.getItem(KEYS.EXAMS) || '[]');
    } catch { return []; }
};

// --- FUNÇÕES DE UTILIDADE ---

export const logTokens = (count: number) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const session = getUserSession();
    if (session) {
        session.tokensConsumed = (session.tokensConsumed || 0) + count;
        saveUserSession(session);
    }
};

export const cancelUserSubscription = (): User | null => {
    const user = getUserSession();
    if (user) {
        user.planType = 'FREE';
        saveUserSession(user);
    }
    return user;
};

// Função legacy mantida para compatibilidade, mas agora usa lógica simples
export const authenticateUser = (email: string) => {
    // No sistema novo com Supabase, essa função é pouco usada, 
    // mas mantemos para não quebrar chamadas antigas.
    return null; 
};
import { User, UserSettings, SavedReport, SavedExam, StudyScheduleResult, CorrectionResult, EssayTheme } from '../types';

const KEYS = {
    SESSION: 'enem_ai_session_v2',
    SETTINGS: 'enem_ai_settings_v2',
    REPORTS: 'enem_ai_reports_v2',
    EXAMS: 'enem_ai_exams_v2',
    SCHEDULES: 'enem_ai_schedules_v2',
    TOKENS: 'enem_ai_tokens_consumed'
};

// --- SESSION ---
export const saveUserSession = (user: User) => localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
export const getUserSession = (): User | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
};
export const clearUserSession = () => localStorage.removeItem(KEYS.SESSION);
const getCurrentUserId = (): string | null => {
    const user = getUserSession();
    return user ? user.id : null;
};

// --- PLANOS ---
export const upgradeUser = (user: User, plan: 'PREMIUM' | 'ADVANCED' | 'FREE') => {
    const updatedUser = { ...user, planType: plan };
    saveUserSession(updatedUser);
    return updatedUser;
};
export const setUserPlan = upgradeUser; // Alias para compatibilidade

export const cancelUserSubscription = (): User | null => {
    const user = getUserSession();
    if (user) {
        const updatedUser = { ...user, planType: 'FREE' };
        saveUserSession(updatedUser as User);
        return updatedUser as User;
    }
    return null;
};

// --- SETTINGS ---
export const getSettings = (): UserSettings => {
    const userId = getCurrentUserId();
    const defaultSettings: UserSettings = { 
        theme: 'system', fontSize: 'base', fontStyle: 'sans', sisuGoals: [], name: '', targetCourse: '' 
    };
    if (!userId) return defaultSettings;
    try {
        const all = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
        return { ...defaultSettings, ...all[userId] };
    } catch { return defaultSettings; }
};
export const saveSettings = (settings: UserSettings) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const all = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    all[userId] = settings;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(all));
};

// --- EXAMS & ESSAYS ---
const getAllExamsRaw = (): SavedExam[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.EXAMS) || '[]'); } catch { return []; }
};

export const saveExam = (exam: SavedExam) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const examWithOwner = { ...exam, userId };
    const exams = getAllExamsRaw();
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) exams[index] = examWithOwner;
    else exams.unshift(examWithOwner);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
};
export const saveExamProgress = saveExam; // Alias

export const getExams = (): SavedExam[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    return getAllExamsRaw().filter((e: any) => e.userId === userId);
};

export const getExamById = (id: string): SavedExam | undefined => getExams().find(e => e.id === id);
export const deleteExam = (id: string) => {
    const exams = getAllExamsRaw().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
};

// CORREÇÃO AQUI: Removemos timeLimit e totalCount que davam erro
export const saveStandaloneEssay = (user: User, correction: CorrectionResult, theme?: EssayTheme) => {
    const essayExam: SavedExam = {
        id: Date.now().toString(),
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed',
        config: {
            mode: 'essay_only',
            areas: ['Redação'],
            totalQuestions: 1,
            isTurbo: false
        },
        state: {
            currentQuestionIndex: 0,
            answers: {},
            userAnswers: {},
            timeRemaining: 0,
            essayTheme: theme || null, // Correção de tipo null
            essayText: ""
        },
        performance: {
            correctCount: 0,
            byArea: {},
            essayResult: correction
        }
    };
    saveExam(essayExam);
};

// --- REPORTS ---
const getAllReportsRaw = (): SavedReport[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.REPORTS) || '[]'); } catch { return []; }
};
export const saveReport = (report: SavedReport) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const reports = getAllReportsRaw();
    reports.unshift({ ...report, userId });
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
};
export const getReports = (): SavedReport[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    return getAllReportsRaw().filter((r: any) => r.userId === userId);
};
export const deleteReport = (id: string) => {
    const reports = getAllReportsRaw().filter(r => r.id !== id);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
};

export const calculateReportStats = (user: User, startDate?: Date, endDate?: Date, customExams?: SavedExam[]) => {
    const userId = user.id;
    const allExams = customExams || getAllExamsRaw().filter((e: any) => e.userId === userId);
    
    const filteredExams = allExams.filter(e => {
        if (!startDate || !endDate) return true;
        const examDate = new Date(e.createdAt);
        return examDate >= startDate && examDate <= endDate;
    });

    const simulados = filteredExams.filter(e => e.config.mode !== 'essay_only');
    const redacoes = filteredExams.filter(e => e.config.mode === 'essay_only');
    const avgSim = simulados.length > 0 ? 700 : 0; 
    const avgEssay = redacoes.length > 0 ? 600 : 0;

    return {
        simCount: simulados.length,
        essaysCount: redacoes.length,
        totalExams: filteredExams.length,
        averageScore: (avgSim + avgEssay) / 2,
        avgSim,
        avgEssay,
        tasksCompleted: 0, 
        tasksProgress: 0
    };
};

// --- SCHEDULES ---
const getAllSchedulesRaw = (): any[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.SCHEDULES) || '[]'); } catch { return []; }
};
export const saveSchedule = (schedule: StudyScheduleResult) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    let all = getAllSchedulesRaw().map((s: any) => s.userId === userId ? { ...s, active: false } : s);
    all.unshift({ ...schedule, id: Date.now().toString(), userId, active: true, createdAt: new Date().toISOString() });
    localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(all));
};
export const getSchedules = (): any[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    return getAllSchedulesRaw().filter((s: any) => s.userId === userId);
};
export const toggleScheduleTask = (scheduleId: string, dayIndex: number, taskIndex: number) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const all = getAllSchedulesRaw();
    const idx = all.findIndex((s: any) => s.id === scheduleId && s.userId === userId);
    if (idx >= 0) {
        if (!all[idx].completedTasks) all[idx].completedTasks = {};
        const k = `${dayIndex}-${taskIndex}`;
        all[idx].completedTasks[k] = !all[idx].completedTasks[k];
        localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(all));
        return all[idx];
    }
    return null;
};

// --- LIMITS & TOKENS ---
export const checkUsageLimit = (user: User, type: 'essay' | 'exam' | 'schedule'): { allowed: boolean; message?: string } => {
    if (user.planType === 'PREMIUM' || user.planType === 'ADVANCED') return { allowed: true };
    const LIMITS = { essay: 1, exam: 1, schedule: 1 };
    const count = user.usage?.[type === 'essay' ? 'essaysCount' : type === 'exam' ? 'examsCount' : 'schedulesCount'] || 0;
    if (count >= LIMITS[type]) return { allowed: false, message: `Limite Free atingido. Upgrade necessário.` };
    return { allowed: true };
};

export const incrementUsage = (user: User, type: 'essay' | 'exam' | 'schedule') => {
    const updated = { ...user };
    if (!updated.usage) updated.usage = { essaysCount: 0, examsCount: 0, schedulesCount: 0, lastEssayDate: null, lastExamDate: null, lastScheduleDate: null };
    const now = new Date().toISOString();
    if (type === 'essay') { updated.usage.essaysCount++; updated.usage.lastEssayDate = now; }
    else if (type === 'exam') { updated.usage.examsCount++; updated.usage.lastExamDate = now; }
    else { updated.usage.schedulesCount++; updated.usage.lastScheduleDate = now; }
    saveUserSession(updated);
    return updated;
};

export const logTokens = (count: number) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const session = getUserSession();
    if (session) {
        session.tokensConsumed = (session.tokensConsumed || 0) + count;
        saveUserSession(session);
    }
};
export const authenticateUser = (email: string) => null;
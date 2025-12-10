import { User, UserSettings, SavedReport, SavedExam, StudyScheduleResult, CorrectionResult, EssayTheme } from '../types';

// Chaves principais do LocalStorage
const KEYS = {
    SESSION: 'enem_ai_session_v2',
    SETTINGS: 'enem_ai_settings_v2',
    REPORTS: 'enem_ai_reports_v2',
    EXAMS: 'enem_ai_exams_v2',
    SCHEDULES: 'enem_ai_schedules_v2',
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
};

// Helper: Pega o ID do usuário logado atual
const getCurrentUserId = (): string | null => {
    const user = getUserSession();
    return user ? user.id : null;
};

// --- UPGRADE, PLANOS & COMPATIBILIDADE ---

export const upgradeUser = (user: User, plan: 'PREMIUM' | 'ADVANCED' | 'FREE') => {
    const updatedUser = { ...user, planType: plan };
    saveUserSession(updatedUser);
    return updatedUser;
};

// Alias para o App.tsx (resolve o erro 'has no exported member setUserPlan')
export const setUserPlan = (user: User, plan: 'PREMIUM' | 'ADVANCED' | 'FREE') => {
    return upgradeUser(user, plan);
};

export const cancelUserSubscription = (): User | null => {
    const user = getUserSession();
    if (user) {
        const updatedUser = { ...user, planType: 'FREE' };
        saveUserSession(updatedUser as User);
        return updatedUser as User;
    }
    return null;
};

// --- CONFIGURAÇÕES (Por Usuário) ---

export const getSettings = (): UserSettings => {
    const userId = getCurrentUserId();
    const defaultSettings: UserSettings = { 
        theme: 'system', 
        fontSize: 'base', 
        fontStyle: 'sans', 
        sisuGoals: [],
        name: '',
        targetCourse: ''
    };

    if (!userId) return defaultSettings;

    try {
        const allSettings = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
        return { ...defaultSettings, ...allSettings[userId] };
    } catch {
        return defaultSettings;
    }
};

export const saveSettings = (settings: UserSettings) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const allSettings = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    allSettings[userId] = settings;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(allSettings));
};

// --- RELATÓRIOS (Por Usuário) ---

export const saveReport = (report: SavedReport) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const reportWithOwner = { ...report, userId };
    const reports = getAllReportsRaw();
    reports.unshift(reportWithOwner);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
};

export const getReports = (): SavedReport[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const allReports = getAllReportsRaw();
    return allReports.filter((r: any) => r.userId === userId);
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

// --- SIMULADOS & REDAÇÕES (Por Usuário) ---

export const saveExam = (exam: SavedExam) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const examWithOwner = { ...exam, userId };
    const exams = getAllExamsRaw();
    
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
        exams[index] = examWithOwner;
    } else {
        exams.unshift(examWithOwner);
    }
    
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
};

// Alias para manter compatibilidade
export const saveExamProgress = saveExam;

// FUNÇÃO RESTAURADA: Salva redação avulsa como se fosse um exame (resolve erro no App.tsx)
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
            timeLimit: 3600,
            isTurbo: false
        },
        state: {
            currentQuestionIndex: 0,
            answers: {},
            userAnswers: {},
            timeRemaining: 0,
            essayTheme: theme,
            essayText: "" // Opcional, se tiver no App.tsx pode passar
        },
        performance: {
            correctCount: 0,
            totalCount: 1,
            byArea: {},
            essayResult: correction
        }
    };
    saveExam(essayExam);
};

export const getExams = (): SavedExam[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const allExams = getAllExamsRaw();
    return allExams.filter((e: any) => e.userId === userId);
};

export const getExamById = (id: string): SavedExam | undefined => {
    const exams = getExams();
    return exams.find(e => e.id === id);
};

export const deleteExam = (id: string) => {
    const exams = getAllExamsRaw().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
};

// --- CRONOGRAMAS (Por Usuário) ---

export const saveSchedule = (schedule: StudyScheduleResult) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const scheduleWithId = { ...schedule, id: Date.now().toString(), userId, active: true, createdAt: new Date().toISOString() };
    
    let allSchedules = getAllSchedulesRaw();
    allSchedules = allSchedules.map((s: any) => 
        s.userId === userId ? { ...s, active: false } : s
    );

    allSchedules.unshift(scheduleWithId);
    localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(allSchedules));
    return scheduleWithId;
};

export const getSchedules = (): any[] => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const all = getAllSchedulesRaw();
    return all.filter((s: any) => s.userId === userId);
};

export const toggleScheduleTask = (scheduleId: string, dayIndex: number, taskIndex: number) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const allSchedules = getAllSchedulesRaw();
    const scheduleIndex = allSchedules.findIndex((s: any) => s.id === scheduleId && s.userId === userId);

    if (scheduleIndex >= 0) {
        const schedule = allSchedules[scheduleIndex];
        if (!schedule.completedTasks) schedule.completedTasks = {};
        
        const taskKey = `${dayIndex}-${taskIndex}`;
        schedule.completedTasks[taskKey] = !schedule.completedTasks[taskKey];
        
        allSchedules[scheduleIndex] = schedule;
        localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(allSchedules));
        return schedule;
    }
    return null;
};

// --- LIMITES DE USO (Por Usuário) ---

export const checkUsageLimit = (user: User, type: 'essay' | 'exam' | 'schedule'): { allowed: boolean; message?: string } => {
    if (user.planType === 'PREMIUM' || user.planType === 'ADVANCED') {
        return { allowed: true };
    }

    const LIMITS = { essay: 1, exam: 1, schedule: 1 };
    const count = user.usage?.[type === 'essay' ? 'essaysCount' : type === 'exam' ? 'examsCount' : 'schedulesCount'] || 0;
    
    if (count >= LIMITS[type]) {
        return { 
            allowed: false, 
            message: `Limite do plano Gratuito atingido (${LIMITS[type]}/${LIMITS[type]}). Faça upgrade para continuar.` 
        };
    }
    return { allowed: true };
};

export const incrementUsage = (user: User, type: 'essay' | 'exam' | 'schedule') => {
    const updatedUser = { ...user };
    if (!updatedUser.usage) updatedUser.usage = { essaysCount: 0, examsCount: 0, schedulesCount: 0, lastEssayDate: null, lastExamDate: null, lastScheduleDate: null };

    const now = new Date().toISOString();

    if (type === 'essay') {
        updatedUser.usage.essaysCount++;
        updatedUser.usage.lastEssayDate = now;
    } else if (type === 'exam') {
        updatedUser.usage.examsCount++;
        updatedUser.usage.lastExamDate = now;
    } else {
        updatedUser.usage.schedulesCount++;
        updatedUser.usage.lastScheduleDate = now;
    }

    saveUserSession(updatedUser);
    return updatedUser;
};

// --- HELPERS INTERNOS ---

const getAllReportsRaw = (): SavedReport[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.REPORTS) || '[]'); } catch { return []; }
};

const getAllExamsRaw = (): SavedExam[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.EXAMS) || '[]'); } catch { return []; }
};

const getAllSchedulesRaw = (): any[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.SCHEDULES) || '[]'); } catch { return []; }
};

// --- UTILS ---

export const logTokens = (count: number) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const session = getUserSession();
    if (session) {
        session.tokensConsumed = (session.tokensConsumed || 0) + count;
        saveUserSession(session);
    }
};

export const authenticateUser = (email: string) => { return null; };
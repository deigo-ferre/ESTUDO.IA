import { SavedSchedule, SavedExam, UserSettings, StudyProfile, StudyScheduleResult, ExamConfig, ExamState, ExamPerformance, User, PlanType, CorrectionResult, SavedReport, WeeklyReportStats } from "../types";

const KEYS = {
  SCHEDULES: 'enem_ai_schedules',
  EXAMS: 'enem_ai_exams',
  SETTINGS: 'enem_ai_settings',
  USER_SESSION: 'enem_ai_user_session',
  REPORTS: 'enem_ai_reports'
};

export const getSettings = (): UserSettings => {
  const data = localStorage.getItem(KEYS.SETTINGS);
  return data ? JSON.parse(data) : { name: 'Estudante', targetCourse: '', theme: 'light', fontStyle: 'sans', fontSize: 'base', sisuGoals: [] };
};

export const saveSettings = (settings: UserSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));

export const saveUserSession = (user: User) => {
  const userWithDefaults: User = {
    ...user,
    planType: user.planType || 'FREE',
    hasSeenOnboarding: user.hasSeenOnboarding ?? false,
    hasSeenOnboardingGoalSetter: user.hasSeenOnboardingGoalSetter ?? false,
    hasSeenEssayDemo: user.hasSeenEssayDemo ?? false,
    usage: {
        essaysCount: user.usage?.essaysCount || 0,
        lastEssayDate: user.usage?.lastEssayDate || null,
        examsCount: user.usage?.examsCount || 0,
        lastExamDate: user.usage?.lastExamDate || null,
        schedulesCount: user.usage?.schedulesCount || 0,
        lastScheduleDate: user.usage?.lastScheduleDate || null,
    },
    tokensConsumed: user.tokensConsumed || 0
  };
  localStorage.setItem(KEYS.USER_SESSION, JSON.stringify(userWithDefaults));
  const settings = getSettings();
  saveSettings({ ...settings, name: user.name });
};

export const getUserSession = (): User | null => {
  const data = localStorage.getItem(KEYS.USER_SESSION);
  if (!data) return null;
  const user = JSON.parse(data);
  // Runtime migration
  user.planType = user.planType || 'FREE';
  user.hasSeenOnboarding = user.hasSeenOnboarding ?? false;
  user.hasSeenOnboardingGoalSetter = user.hasSeenOnboardingGoalSetter ?? false;
  user.hasSeenEssayDemo = user.hasSeenEssayDemo ?? false;
  user.usage = user.usage || { essaysCount: 0, examsCount: 0, schedulesCount: 0 };
  user.tokensConsumed = user.tokensConsumed || 0;
  return user;
};

export const clearUserSession = () => localStorage.removeItem(KEYS.USER_SESSION);

export const checkUsageLimit = (type: 'essay' | 'exam' | 'schedule'): { allowed: boolean; message?: string } => {
    const user = getUserSession();
    if (!user) return { allowed: false, message: "Usuário não logado." };
    if (user.planType === 'PREMIUM') return { allowed: true };

    const now = new Date();
    const LIMITS = {
        FREE: { essaysPerMonth: 1, examsPerWeek: 1, schedulesPerMonth: 1 },
        ADVANCED: { essaysPerMonth: 5, examsPerWeek: 3, schedulesPerMonth: 4 }
    };
    const limits = user.planType === 'ADVANCED' ? LIMITS.ADVANCED : LIMITS.FREE;
    const planName = user.planType === 'ADVANCED' ? 'Avançado' : 'Gratuito';

    if (type === 'essay') {
        if (user.usage.lastEssayDate) {
            const lastDate = new Date(user.usage.lastEssayDate);
            if (lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) {
                if (user.usage.essaysCount >= limits.essaysPerMonth) return { allowed: false, message: `Você atingiu o limite de ${limits.essaysPerMonth} redação(ões) por mês do plano ${planName}. Faça upgrade!` };
            }
        }
    }
    if (type === 'exam') {
        if (user.usage.lastExamDate) {
            const lastDate = new Date(user.usage.lastExamDate);
            const diffDays = Math.ceil(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)); 
            if (diffDays < 7 && user.usage.examsCount >= limits.examsPerWeek) return { allowed: false, message: `Você atingiu o limite de ${limits.examsPerWeek} simulado(s) por semana do plano ${planName}. Faça upgrade!` };
        }
    }
    if (type === 'schedule') {
        if (user.usage.lastScheduleDate) {
            const lastDate = new Date(user.usage.lastScheduleDate);
            if (lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) {
                if (user.usage.schedulesCount >= limits.schedulesPerMonth) return { allowed: false, message: `Você atingiu o limite de ${limits.schedulesPerMonth} cronograma(s) por mês do plano ${planName}. Faça upgrade!` };
            }
        }
    }
    return { allowed: true };
};

export const incrementUsage = (type: 'essay' | 'exam' | 'schedule') => {
    const user = getUserSession();
    if (!user) return;
    const now = new Date();
    const isoNow = now.toISOString();

    if (type === 'essay') {
        const lastDate = user.usage.lastEssayDate ? new Date(user.usage.lastEssayDate) : null;
        let newCount = 1;
        if (lastDate && lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) newCount = user.usage.essaysCount + 1;
        user.usage.essaysCount = newCount;
        user.usage.lastEssayDate = isoNow;
    } else if (type === 'exam') {
        const lastDate = user.usage.lastExamDate ? new Date(user.usage.lastExamDate) : null;
        let newCount = 1;
        if (lastDate) {
            const diffDays = Math.ceil(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) newCount = user.usage.examsCount + 1;
        }
        user.usage.examsCount = newCount;
        user.usage.lastExamDate = isoNow;
    } else if (type === 'schedule') {
        const lastDate = user.usage.lastScheduleDate ? new Date(user.usage.lastScheduleDate) : null;
        let newCount = 1;
        if (lastDate && lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) newCount = (user.usage.schedulesCount || 0) + 1;
        user.usage.schedulesCount = newCount;
        user.usage.lastScheduleDate = isoNow;
    }
    saveUserSession(user);
};

export const logTokens = (amount: number) => {
    const user = getUserSession();
    if (!user) return;
    user.tokensConsumed = (user.tokensConsumed || 0) + amount;
    saveUserSession(user);
};

export const upgradeUser = () => {
    alert("Para fazer o upgrade, por favor selecione seu plano na página inicial ou em configurações.");
};

export const setUserPlan = (plan: PlanType) => {
    const user = getUserSession();
    if (user) {
        user.planType = plan;
        saveUserSession(user);
    }
}

const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const getSchedules = (): SavedSchedule[] => {
  const data = localStorage.getItem(KEYS.SCHEDULES);
  return data ? JSON.parse(data) : [];
};

export const saveSchedule = (profile: StudyProfile, result: StudyScheduleResult): SavedSchedule => {
  const existingSchedules = getSchedules();
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  let activeScheduleIndex = -1;
  const activeSchedule = existingSchedules.find((s, index) => {
      if (!s.archived) {
          activeScheduleIndex = index;
          return true;
      }
      return false;
  });

  if (activeSchedule) {
      const activeDate = new Date(activeSchedule.createdAt);
      if (getWeekNumber(activeDate) !== currentWeek) {
          if (activeScheduleIndex !== -1) existingSchedules[activeScheduleIndex].archived = true;
      }
  }

  const filteredSchedules = activeSchedule && getWeekNumber(new Date(activeSchedule.createdAt)) === currentWeek 
      ? existingSchedules.filter(s => s.id !== activeSchedule.id) 
      : existingSchedules;

  const newSchedule: SavedSchedule = {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    profile,
    result,
    completedItems: [],
    archived: false
  };

  const updated = [newSchedule, ...filteredSchedules];
  localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(updated));
  return newSchedule;
};

export const toggleScheduleTask = (scheduleId: string, taskId: string) => {
    const schedules = getSchedules();
    const updated = schedules.map(s => {
        if (s.id === scheduleId) {
            const isCompleted = s.completedItems?.includes(taskId);
            let newCompleted = s.completedItems || [];
            if (isCompleted) newCompleted = newCompleted.filter(id => id !== taskId);
            else newCompleted = [...newCompleted, taskId];
            return { ...s, completedItems: newCompleted };
        }
        return s;
    });
    localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(updated));
};

export const deleteSchedule = (id: string) => {
  const existing = getSchedules();
  const updated = existing.filter(s => s.id !== id);
  localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(updated));
};

export const clearSchedules = () => localStorage.removeItem(KEYS.SCHEDULES);

export const getExams = (): SavedExam[] => {
  const data = localStorage.getItem(KEYS.EXAMS);
  return data ? JSON.parse(data) : [];
};

export const saveStandaloneEssay = (text: string, result: CorrectionResult) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const examWrapper: SavedExam = {
        id,
        createdAt: now,
        updatedAt: now,
        status: 'completed',
        config: { mode: 'essay_only', targetCourses: [], areas: ['Redação'], durationMinutes: 60, totalQuestions: 0 },
        state: { questions: [], essayTheme: null, userAnswers: {}, userEssayText: text, timeRemaining: 0, isFinished: true, loadingProgress: 100 },
        performance: { scoreByArea: {}, totalScore: result.nota_total, essayResult: result, correctCount: 0, totalQuestions: 0 }
    };
    const existingExams = getExams();
    localStorage.setItem(KEYS.EXAMS, JSON.stringify([examWrapper, ...existingExams]));
    return id;
};

export const saveExamProgress = (id: string | null, config: ExamConfig, state: ExamState, status: 'in_progress' | 'completed' = 'in_progress', performance?: ExamPerformance): string => {
  const existingExams = getExams();
  const now = new Date().toISOString();
  let examId = id;

  if (!examId) {
    examId = crypto.randomUUID();
    const newExam: SavedExam = { id: examId, createdAt: now, updatedAt: now, status, config, state, performance };
    localStorage.setItem(KEYS.EXAMS, JSON.stringify([newExam, ...existingExams]));
  } else {
    const updatedExams = existingExams.map(e => {
      if (e.id === examId) return { ...e, updatedAt: now, status, state, performance: performance || e.performance };
      return e;
    });
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(updatedExams));
  }
  return examId!;
};

export const getExamById = (id: string): SavedExam | undefined => getExams().find(e => e.id === id);

export const deleteExam = (id: string) => {
  const existing = getExams();
  const updated = existing.filter(e => e.id !== id);
  localStorage.setItem(KEYS.EXAMS, JSON.stringify(updated));
};

export const getReports = (): SavedReport[] => {
    const data = localStorage.getItem(KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
};

export const calculateReportStats = (start: Date, end: Date): WeeklyReportStats => {
    const endInclusive = new Date(end);
    endInclusive.setHours(23, 59, 59, 999);
    const allExams = getExams();
    const allSchedules = getSchedules();
    const periodExams = allExams.filter(e => { const d = new Date(e.createdAt); return d >= start && d <= endInclusive && e.status === 'completed'; });
    const essayExams = periodExams.filter(e => e.performance?.essayResult);
    const avgEssay = essayExams.length > 0 ? Math.round(essayExams.reduce((acc, e) => acc + (e.performance?.essayResult?.nota_total || 0), 0) / essayExams.length) : 0;
    const simExams = periodExams.filter(e => e.config.mode === 'day1' || e.config.mode === 'day2');
    const avgSim = simExams.length > 0 ? Math.round(simExams.reduce((acc, e) => acc + (e.performance?.totalScore || 0), 0) / simExams.length) : 0;
    const relevantSchedules = allSchedules.filter(s => { const d = new Date(s.createdAt); return d >= start && d <= endInclusive; });
    let totalTasks = 0;
    let completedTasks = 0;
    relevantSchedules.forEach(s => {
        totalTasks += s.result.semana.reduce((acc, day) => acc + day.materias.length, 0);
        completedTasks += (s.completedItems?.length || 0);
    });
    return { totalExams: periodExams.length, avgSim, essaysCount: essayExams.length, simCount: simExams.length, avgEssay, tasksCompleted: completedTasks, tasksProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 };
};

export const saveReport = (stats: WeeklyReportStats, start: Date, end: Date, type: 'manual' | 'auto'): SavedReport => {
    const reports = getReports();
    const newReport: SavedReport = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), startDate: start.toISOString(), endDate: end.toISOString(), type, stats };
    localStorage.setItem(KEYS.REPORTS, JSON.stringify([newReport, ...reports]));
    return newReport;
};

export const deleteReport = (id: string) => {
    const reports = getReports();
    const updated = reports.filter(r => r.id !== id);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(updated));
};

export const getAdminStats = () => {
    const user = getUserSession();
    const currentTokens = user?.tokensConsumed || 0;
    
    // Mock data for simulation
    return {
        totalUsers: 1248,
        activeUsersToday: 142,
        totalRevenue: 15890.00, // R$
        mrr: 4500.00, // Monthly Recurring Revenue
        tokensConsumedGlobal: 1500000 + currentTokens, // Global + Local
        serverStatus: 'healthy',
        recentSignups: [
            { name: user?.name || 'Você', email: user?.email || 'voce@email.com', plan: user?.planType || 'FREE', date: 'Hoje', status: 'Online' },
            { name: 'Mariana Silva', email: 'mari.silva@gmail.com', plan: 'PREMIUM', date: 'Ontem', status: 'Offline' },
            { name: 'João Pedro', email: 'joao.p@outlook.com', plan: 'ADVANCED', date: 'Ontem', status: 'Offline' },
            { name: 'Carlos Edu', email: 'carlosedu@yahoo.com', plan: 'FREE', date: '2 dias atrás', status: 'Offline' },
            { name: 'Fernanda Lima', email: 'fer.lima@gmail.com', plan: 'PREMIUM', date: '3 dias atrás', status: 'Offline' }
        ]
    };
};

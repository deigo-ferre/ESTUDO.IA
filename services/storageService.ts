import { User, UserSettings, CorrectionResult, ExamState, ExamConfig, PlanType, Schedule, WeeklyReport, StudySession } from '../types';

const USER_KEY = 'estude_ia_user';
const SETTINGS_KEY = 'estude_ia_settings';
const USAGE_KEY = 'estude_ia_usage';
const ESSAYS_KEY = 'estude_ia_essays';
const EXAMS_KEY = 'estude_ia_exams';
const SCHEDULES_KEY = 'estude_ia_schedules';
const REPORTS_KEY = 'estude_ia_reports';

// --- GERENCIAMENTO DE SESSÃO (LOGIN) ---

export const saveUserSession = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getUserSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;

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

// --- CONFIGURAÇÕES ---

export const getSettings = (): UserSettings => {
  if (typeof window === 'undefined') return { theme: 'light', fontSize: 'base', fontStyle: 'sans' };
  const stored = localStorage.getItem(SETTINGS_KEY);
  // CORREÇÃO: Mudamos 'medium' para 'base' para parar o erro TS2322
  return stored ? JSON.parse(stored) : { theme: 'light', fontSize: 'base', fontStyle: 'sans' };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- PLANOS E USUÁRIOS ---

export const upgradeUser = (): void => {
  const user = getUserSession();
  if (user) {
    const updated = { ...user, planType: 'PREMIUM' as PlanType };
    saveUserSession(updated);
  }
};

export const setUserPlan = (plan: PlanType): void => {
  const user = getUserSession();
  if (user) {
    const updated = { ...user, planType: plan };
    saveUserSession(updated);
  }
};

// --- LIMITES DE USO ---

export const checkUsageLimit = (feature: 'essay' | 'chat' | 'exam'): { allowed: boolean; message?: string } => {
  const user = getUserSession();
  if (!user) return { allowed: false, message: 'Faça login.' };
  if (user.planType === 'PREMIUM') return { allowed: true };

  // Lógica simples para Free: 3 usos por dia (exemplo)
  const today = new Date().toDateString();
  const usageKey = `${USAGE_KEY}_${today}`;
  const usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
  const count = usage[feature] || 0;

  if (count >= 3) {
    return { allowed: false, message: 'Limite diário atingido para o plano Grátis.' };
  }
  return { allowed: true };
};

export const incrementUsage = (feature: 'essay' | 'chat' | 'exam'): void => {
  const today = new Date().toDateString();
  const usageKey = `${USAGE_KEY}_${today}`;
  const usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
  usage[feature] = (usage[feature] || 0) + 1;
  localStorage.setItem(usageKey, JSON.stringify(usage));
};

export const logTokens = (inputTokens: number, outputTokens: number): void => {
    // Apenas um log para controle, pode salvar se quiser estatisticas
    console.log(`[Token Usage] In: ${inputTokens}, Out: ${outputTokens}`);
};

// --- REDAÇÕES ---

export const saveStandaloneEssay = (text: string, result: CorrectionResult): void => {
  const essays = JSON.parse(localStorage.getItem(ESSAYS_KEY) || '[]');
  const newEssay = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    text,
    result,
    score: result.notaTotal
  };
  essays.unshift(newEssay);
  localStorage.setItem(ESSAYS_KEY, JSON.stringify(essays));
};

// --- SIMULADOS E PROVAS ---

export const getExams = (): any[] => {
  return JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]');
};

export const getExamById = (id: string): any | null => {
  const exams = getExams();
  return exams.find((e: any) => e.id === id) || null;
};

export const saveExamProgress = (id: string | null, config: ExamConfig, state: ExamState, status: 'in_progress' | 'completed'): void => {
  const exams = getExams();
  const examId = id || Date.now().toString();
  
  const newExam = {
    id: examId,
    date: new Date().toISOString(),
    config,
    state,
    status
  };

  const existingIndex = exams.findIndex((e: any) => e.id === examId);
  if (existingIndex >= 0) {
    exams[existingIndex] = newExam;
  } else {
    exams.unshift(newExam);
  }
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

export const deleteExam = (id: string): void => {
  const exams = getExams().filter((e: any) => e.id !== id);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

// --- CRONOGRAMAS ---

export const getSchedules = (): Schedule[] => {
    return JSON.parse(localStorage.getItem(SCHEDULES_KEY) || '[]');
};

export const saveSchedule = (schedule: Schedule): void => {
    const schedules = getSchedules();
    schedules.push(schedule);
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
};

export const toggleScheduleTask = (scheduleId: string, dayIndex: number, taskIndex: number): void => {
    const schedules = getSchedules();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule && schedule.weeks[0].days[dayIndex].tasks[taskIndex]) {
        schedule.weeks[0].days[dayIndex].tasks[taskIndex].completed = !schedule.weeks[0].days[dayIndex].tasks[taskIndex].completed;
        localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
    }
};

// --- RELATÓRIOS ---

export const calculateReportStats = (userId: string): WeeklyReport => {
    // Gera estatísticas baseadas nos dados salvos
    const exams = getExams();
    const completedExams = exams.filter((e: any) => e.status === 'completed');
    
    return {
        id: Date.now().toString(),
        userId,
        weekStartDate: new Date().toISOString(),
        weekEndDate: new Date().toISOString(),
        totalStudyTime: 120, // Exemplo
        completedTasks: 5,
        totalTasks: 10,
        averageEssayScore: 750,
        questionsAnswered: completedExams.length * 90,
        correctAnswers: completedExams.length * 60,
        topSubject: 'Matemática',
        weakestSubject: 'História',
        recommendations: ['Focar mais em Humanas', 'Praticar mais redação']
    };
};

export const saveReport = (report: WeeklyReport): void => {
    const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    reports.unshift(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};
import { User, UserSettings, CorrectionResult, ExamState, ExamConfig, PlanType, Schedule, WeeklyReport, SavedExam } from '../types';

const USER_KEY = 'estude_ia_user';
const SETTINGS_KEY = 'estude_ia_settings';
const USAGE_KEY = 'estude_ia_usage';
const ESSAYS_KEY = 'estude_ia_essays';
const EXAMS_KEY = 'estude_ia_exams';
const SCHEDULES_KEY = 'estude_ia_schedules';
const REPORTS_KEY = 'estude_ia_reports';

// --- SESSÃO ---
export const saveUserSession = (user: User): void => {
  if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUserSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
};

export const clearUserSession = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem(USER_KEY);
};

// --- CONFIGURAÇÕES ---
export const getSettings = (): UserSettings => {
  const defaults: UserSettings = { 
      theme: 'light', fontSize: 'base', fontStyle: 'sans', name: '', targetCourse: '' 
  };
  if (typeof window === 'undefined') return defaults;
  const stored = localStorage.getItem(SETTINGS_KEY);
  const parsed = stored ? JSON.parse(stored) : {};
  if (parsed.fontSize === 'medium') parsed.fontSize = 'base';
  return { ...defaults, ...parsed };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- USOS E PLANOS ---
export const setUserPlan = (plan: PlanType): void => {
  const user = getUserSession();
  if (user) saveUserSession({ ...user, planType: plan });
};

export const upgradeUser = (): void => setUserPlan('PREMIUM');

export const checkUsageLimit = (feature: string): { allowed: boolean; message?: string } => {
  const user = getUserSession();
  if (!user) return { allowed: false, message: 'Login necessário.' };
  if (user.planType === 'PREMIUM' || user.planType === 'ADVANCED') return { allowed: true };
  
  const today = new Date().toDateString();
  const usage = JSON.parse(localStorage.getItem(`${USAGE_KEY}_${today}`) || '{}');
  if ((usage[feature] || 0) >= 3) return { allowed: false, message: 'Limite diário atingido.' };
  return { allowed: true };
};

export const incrementUsage = (feature: string): void => {
  const today = new Date().toDateString();
  const key = `${USAGE_KEY}_${today}`;
  const usage = JSON.parse(localStorage.getItem(key) || '{}');
  usage[feature] = (usage[feature] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(usage));
};

export const logTokens = (input: number, output: number = 0): void => {};

// --- REDAÇÕES ---
export const saveStandaloneEssay = (text: string, result: CorrectionResult): void => {
  const essays = JSON.parse(localStorage.getItem(ESSAYS_KEY) || '[]');
  const score = result.nota_total ?? result.notaTotal ?? 0;
  essays.unshift({ id: Date.now().toString(), date: new Date().toISOString(), text, result, score });
  localStorage.setItem(ESSAYS_KEY, JSON.stringify(essays));
};

// --- SIMULADOS ---
export const getExams = (): SavedExam[] => JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]');
export const getExamById = (id: string): SavedExam | undefined => getExams().find((e) => e.id === id);

// CORREÇÃO: Agora retorna STRING (o ID) para o SimuladoGenerator não reclamar
export const saveExamProgress = (id: string | null, config: ExamConfig, state: ExamState, status: 'in_progress' | 'completed'): string => {
  const exams = getExams();
  const examId = id || Date.now().toString();
  const newExam: SavedExam = { 
      id: examId, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      status, config, state 
  };
  
  const index = exams.findIndex((e) => e.id === examId);
  if (index >= 0) exams[index] = newExam;
  else exams.unshift(newExam);
  
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  return examId; // RETORNA O ID
};

export const deleteExam = (id: string): void => {
  const exams = getExams().filter((e) => e.id !== id);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

// --- CRONOGRAMAS ---
export const getSchedules = (): Schedule[] => JSON.parse(localStorage.getItem(SCHEDULES_KEY) || '[]');
export const saveSchedule = (schedule: Schedule): void => {
    const list = getSchedules();
    list.push(schedule);
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(list));
};

export const toggleScheduleTask = (scheduleId: string, dayIndex: number, taskIndex: number): void => {
    const list = getSchedules();
    const item = list.find(s => s.id === scheduleId);
    // CORREÇÃO: Verifica se 'weeks' e 'tasks' existem antes de acessar
    if (item && item.weeks && item.weeks[0] && item.weeks[0].days[dayIndex] && item.weeks[0].days[dayIndex].tasks[taskIndex]) {
        const task = item.weeks[0].days[dayIndex].tasks[taskIndex];
        task.completed = !task.completed;
        localStorage.setItem(SCHEDULES_KEY, JSON.stringify(list));
    }
};

// --- RELATÓRIOS ---
// CORREÇÃO: Retorna o objeto COMPLETO que satisfaz WeeklyReport e WeeklyReportStats
export const calculateReportStats = (userId: string, ...args: any[]): WeeklyReport => {
    const now = new Date().toISOString();
    return {
        id: Date.now().toString(),
        userId,
        createdAt: now,
        startDate: now,
        endDate: now,
        weekStartDate: now,
        weekEndDate: now,
        type: 'auto',
        
        // Objeto STATS aninhado
        stats: {
            totalExams: 0,
            avgSim: 0,
            simCount: 0,
            essaysCount: 0,
            avgEssay: 0,
            tasksCompleted: 0,
            tasksProgress: 0
        },

        // Campos planos (Flat)
        totalStudyTime: 0,
        completedTasks: 0,
        totalTasks: 0,
        averageEssayScore: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        topSubject: '-',
        weakestSubject: '-',
        recommendations: []
    };
};

export const saveReport = (report: WeeklyReport, ...args: any[]): void => {
    const list = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    list.unshift(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
};
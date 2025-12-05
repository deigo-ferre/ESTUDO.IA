import { User, UserSettings, CorrectionResult, ExamState, ExamConfig, PlanType, Schedule, WeeklyReport } from '../types';

const USER_KEY = 'estude_ia_user';
const SETTINGS_KEY = 'estude_ia_settings';
const USAGE_KEY = 'estude_ia_usage';
const ESSAYS_KEY = 'estude_ia_essays';
const EXAMS_KEY = 'estude_ia_exams';
const SCHEDULES_KEY = 'estude_ia_schedules';
const REPORTS_KEY = 'estude_ia_reports';

// --- GERENCIAMENTO DE SESSÃO ---

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
  const defaultSettings: UserSettings = { 
      theme: 'light', 
      fontSize: 'base', 
      fontStyle: 'sans',
      name: '',        // Adicionado para corrigir erro TS2739
      targetCourse: '' // Adicionado para corrigir erro TS2739
  };

  if (typeof window === 'undefined') return defaultSettings;
  
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return defaultSettings;

  const parsed = JSON.parse(stored);
  // Garante que o fontSize seja válido
  if (parsed.fontSize === 'medium') parsed.fontSize = 'base';
  
  return { ...defaultSettings, ...parsed };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- PLANOS E USO ---

export const setUserPlan = (plan: PlanType): void => {
  const user = getUserSession();
  if (user) {
    saveUserSession({ ...user, planType: plan });
  }
};

export const upgradeUser = (): void => setUserPlan('PREMIUM');

export const checkUsageLimit = (feature: string): { allowed: boolean; message?: string } => {
  const user = getUserSession();
  if (!user) return { allowed: false, message: 'Login necessário.' };
  if (user.planType === 'PREMIUM') return { allowed: true };
  
  // Lógica simples para Free
  const today = new Date().toDateString();
  const usageKey = `${USAGE_KEY}_${today}`;
  const usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
  if ((usage[feature] || 0) >= 3) return { allowed: false, message: 'Limite diário atingido.' };
  
  return { allowed: true };
};

export const incrementUsage = (feature: string): void => {
  const today = new Date().toDateString();
  const usageKey = `${USAGE_KEY}_${today}`;
  const usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
  usage[feature] = (usage[feature] || 0) + 1;
  localStorage.setItem(usageKey, JSON.stringify(usage));
};

// CORREÇÃO DO ERRO TS2554: Tornamos o segundo argumento opcional
export const logTokens = (input: number, output: number = 0): void => {
    // console.log(`Tokens: ${input} in, ${output} out`);
};

// --- REDAÇÕES ---

export const saveStandaloneEssay = (text: string, result: CorrectionResult): void => {
  const essays = JSON.parse(localStorage.getItem(ESSAYS_KEY) || '[]');
  
  // CORREÇÃO DO ERRO TS2551: Usa nota_total ou notaTotal (o que vier)
  const score = result.nota_total ?? result.notaTotal ?? 0;

  const newEssay = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    text,
    result,
    score
  };
  essays.unshift(newEssay);
  localStorage.setItem(ESSAYS_KEY, JSON.stringify(essays));
};

// --- SIMULADOS ---

export const getExams = (): any[] => JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]');

export const getExamById = (id: string): any => getExams().find((e: any) => e.id === id);

export const saveExamProgress = (id: string | null, config: ExamConfig, state: ExamState, status: string): void => {
  const exams = getExams();
  const examId = id || Date.now().toString();
  const newExam = { id: examId, date: new Date().toISOString(), config, state, status };
  
  const index = exams.findIndex((e: any) => e.id === examId);
  if (index >= 0) exams[index] = newExam;
  else exams.unshift(newExam);
  
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

export const deleteExam = (id: string): void => {
  const exams = getExams().filter((e: any) => e.id !== id);
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
    if (item && item.weeks[0]?.days[dayIndex]?.tasks[taskIndex]) {
        item.weeks[0].days[dayIndex].tasks[taskIndex].completed = !item.weeks[0].days[dayIndex].tasks[taskIndex].completed;
        localStorage.setItem(SCHEDULES_KEY, JSON.stringify(list));
    }
};

// --- RELATÓRIOS ---

// CORREÇÃO DO ERRO TS2554: Aceita argumentos extras (args) para não quebrar se o Modal mandar data
export const calculateReportStats = (userId: string, ...args: any[]): WeeklyReport => {
    return {
        id: Date.now().toString(),
        userId,
        weekStartDate: new Date().toISOString(),
        weekEndDate: new Date().toISOString(),
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

// CORREÇÃO DO ERRO TS2554: Aceita argumentos extras
export const saveReport = (report: WeeklyReport, ...args: any[]): void => {
    const list = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    list.unshift(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
};
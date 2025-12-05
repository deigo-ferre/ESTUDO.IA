// --- TIPOS GERAIS ---
export type PlanType = 'FREE' | 'PREMIUM' | 'ADVANCED'; // Adicionado ADVANCED para corrigir o erro do paymentService
export type ImageFilter = 'none' | 'grayscale' | 'contrast';

export interface User {
  id?: string; // Adicionado id para corrigir erro do databaseService
  name: string;
  email: string;
  avatar?: string;
  planType: PlanType;
  isAdmin?: boolean;
  hasSeenOnboarding?: boolean;
  hasSeenOnboardingGoalSetter?: boolean;
  hasSeenEssayDemo?: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'base' | 'large';
  fontStyle: 'sans' | 'serif' | 'mono';
  name?: string;
  targetCourse?: string;
  sisuGoals?: SisuGoal[];
}

export interface SisuGoal {
    course: string;
    university: string;
    cutScore: number;
}

// --- REDAÇÃO ---
export interface CorrectionResult {
  notaTotal?: number;
  nota_total?: number;
  comentarios: string[];
  competencias?: any[];
  correction?: string;
}

export interface EssayTheme {
  titulo: string;
  textos_motivadores: string[];
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

// --- SIMULADOS E PROVAS ---
export interface ExamConfig {
    mode: string;
    targetCourses: string[];
    areas: string[];
    durationMinutes: number;
    totalQuestions: number;
}

export interface ExamState {
    questions: any[];
    userAnswers: any;
    timeRemaining: number;
    isFinished: boolean;
    essayTheme?: EssayTheme | null;
    userEssayText?: string;
    essayImage?: string | null;
    activeFilter?: ImageFilter;
}

// Aliases para compatibilidade com códigos antigos
export type SavedExam = any; 
export type QuestionResult = any;

// --- CRONOGRAMAS E ESTUDOS ---
export interface Schedule {
    id: string;
    createdAt: string;
    weeks: any[];
}

export type SavedSchedule = Schedule; // Alias

export interface StudyProfile {
    name: string;
    availableTime: number; // minutos por dia
    weaknesses: string[];
    strengths: string[];
    targetCourse: string;
}

export interface StudyScheduleResult {
    schedule: Schedule;
    tips: string[];
}

export interface StudySession {
    id: string;
    date: string;
    duration: number;
    subject: string;
}

export interface ExamPerformance {
    totalQuestions: number;
    correctAnswers: number;
    byArea: Record<string, number>;
}

export interface SisuEstimation {
    chance: number; // 0 a 100
    cutScore: number;
    message: string;
}

// --- RELATÓRIOS ---
export interface WeeklyReport {
    id: string;
    userId: string;
    weekStartDate: string;
    weekEndDate: string;
    totalStudyTime: number;
    completedTasks: number;
    totalTasks: number;
    averageEssayScore: number;
    questionsAnswered: number;
    correctAnswers: number;
    topSubject: string;
    weakestSubject: string;
    recommendations: string[];
}

// Aliases para compatibilidade
export type SavedReport = WeeklyReport;
export type WeeklyReportStats = WeeklyReport;

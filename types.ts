export type PlanType = 'FREE' | 'PREMIUM';
export type ImageFilter = 'none' | 'grayscale' | 'contrast';

export interface User {
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
  // Adicionados para evitar erro TS2739
  name?: string; 
  targetCourse?: string;
  sisuGoals?: SisuGoal[];
}

export interface SisuGoal {
    course: string;
    university: string;
    cutScore: number;
}

export interface CorrectionResult {
  // Ajustado para aceitar os dois formatos e evitar erros
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

// --- NOVOS TIPOS ADICIONADOS PARA CORRIGIR O BUILD ---

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

export interface Schedule {
    id: string;
    createdAt: string;
    weeks: any[];
}

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

export interface StudySession {
    id: string;
    date: string;
    duration: number;
    subject: string;
}

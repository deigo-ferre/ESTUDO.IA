export type PlanType = 'FREE' | 'ADVANCED' | 'PREMIUM';

// --- USUÁRIOS ---
export interface UserUsage {
  essaysCount: number;
  lastEssayDate: string | null;
  examsCount: number;
  lastExamDate: string | null;
  schedulesCount: number;
  lastScheduleDate: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  hasSeenOnboarding?: boolean;
  hasSeenOnboardingGoalSetter?: boolean;
  hasSeenEssayDemo?: boolean;
  planType: PlanType;
  usage?: UserUsage;
  tokensConsumed?: number;
  isAdmin?: boolean;
}

// --- REDAÇÃO ---
export interface Competencia {
  nome: string;
  nota: number;
  feedback: string;
}

export interface CorrectionResult {
  nota_total: number;
  competencias: Competencia[];
  comentario_geral: string;
  melhorias: string[];
  notaTotal?: number; // Compatibilidade
  correction?: string;
  comentarios?: string[];
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface EssayTheme {
  titulo: string;
  textos_motivadores: string[];
  origem?: string;
}

// --- SIMULADOS ---
export type AreaConhecimento = 'Linguagens' | 'Humanas' | 'Natureza' | 'Matemática' | 'Redação';
export type LinguaEstrangeira = 'Inglês' | 'Espanhol';

export interface ExamConfig {
  mode: string;
  targetCourses: string[];
  areas: string[] | AreaConhecimento[];
  foreignLanguage?: string; 
  durationMinutes: number;
  totalQuestions: number;
  turboTopics?: string[]; 
}

export interface QuestionResult {
  id?: string;
  origem: string;
  enunciado: string;
  alternativas: string[];
  correta_index: number;
  explicacao: string;
  materia?: string;
  area?: string;
  difficulty?: string;
  topic?: string;
}

// Adicionado para corrigir erro no SimuladoGenerator
export interface BatchRequest {
    area: string;
    count: number;
    isForeign?: boolean;
    language?: string;
    startIndex: number;
    topics?: string[]; 
}

export interface ExamState {
  questions: (QuestionResult | null)[];
  essayTheme: EssayTheme | null;
  userAnswers: Record<number, number>;
  userEssayText: string;
  timeRemaining: number;
  isFinished: boolean;
  loadingProgress: number;
  batchQueue?: any[];
  essayImage?: string | null;
  activeFilter?: ImageFilter;
  lastEssayImageData?: ImageData | null;
}

export interface ExamPerformance {
  scoreByArea: Record<string, number>;
  totalScore: number;
  essayResult: CorrectionResult | null;
  correctCount: number;
  totalQuestions: number;
  sisuComparisons?: SisuEstimation[];
  wrongTopics?: string[];
  correctAnswers?: number; // Compatibilidade
  byArea?: Record<string, number>; // Compatibilidade
}

export interface SavedExam {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'in_progress' | 'completed';
  config: ExamConfig;
  state: ExamState;
  performance?: ExamPerformance;
}

// --- CRONOGRAMAS ---
export interface TopicDetail {
  name: string;
  snippet: string;
}

export interface DailySchedule {
  dia: string;
  materias: (string | TopicDetail)[];
  foco: string;
}

export interface StudyScheduleResult {
  diagnostico?: string;
  semana: DailySchedule[];
  dicas_personalizadas: string[];
  schedule?: any;
  tips?: string[];
}

export interface StudyProfile {
  course: string;
  hoursPerDay: string | number;
  difficulties: string | string[];
  scores?: any;
  availableTime?: number;
  targetCourse?: string;
  weaknesses?: string[];
  strengths?: string[];
}

export interface SavedSchedule {
  id: string;
  createdAt: string;
  profile: StudyProfile;
  result: StudyScheduleResult;
  completedItems: string[];
  archived: boolean;
  weeks?: any[]; // Compatibilidade
}

// --- RELATÓRIOS E OUTROS ---
export interface SisuEstimation {
  curso?: string;
  nota_corte_media?: number;
  nota_corte_min?: number;
  nota_corte_max?: number;
  ano_referencia?: string;
  mensagem?: string;
  fontes?: string[];
  chance?: number; // Compatibilidade
  cutScore?: number; // Compatibilidade
  message?: string; // Compatibilidade
  course?: string; // Compatibilidade
  source?: string; // Compatibilidade
}

export interface SisuGoal {
  course: string;
  cutoff: number;
  lastUpdated: string;
  source?: string;
  university?: string; // Compatibilidade
  cutScore?: number; // Compatibilidade
}

export interface UserSettings {
  name: string;
  targetCourse: string;
  theme: 'light' | 'dark' | 'system';
  fontStyle: 'sans' | 'serif' | 'mono';
  fontSize: 'small' | 'base' | 'large';
  sisuGoals?: SisuGoal[]; 
}

export type ImageFilter = 'none' | 'grayscale' | 'contrast';

export interface StudySession {
    id: string;
    date: string;
    duration: number;
    subject: string;
}

export interface WeeklyReportStats {
    totalExams: number;
    avgSim: number;
    simCount: number;
    essaysCount: number;
    avgEssay: number;
    tasksCompleted: number;
    tasksProgress: number;
}

export interface WeeklyReport {
    id: string;
    userId: string;
    createdAt: string;
    startDate: string;
    endDate: string;
    type: 'manual' | 'auto';
    stats: WeeklyReportStats; 

    // Campos opcionais para compatibilidade
    weekStartDate?: string;
    weekEndDate?: string;
    totalStudyTime?: number;
    completedTasks?: number;
    totalTasks?: number;
    averageEssayScore?: number;
    questionsAnswered?: number;
    correctAnswers?: number;
    topSubject?: string;
    weakestSubject?: string;
    recommendations?: string[];
}

// Aliases
export type SavedReport = WeeklyReport;
export type Schedule = SavedSchedule;
export type PlanType = 'FREE' | 'ADVANCED' | 'PREMIUM';

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
  usage: UserUsage;
  tokensConsumed: number;
  isAdmin?: boolean;
}

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
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface EnemScores {
  linguagens: number;
  humanas: number;
  natureza: number;
  matematica: number;
  redacao: number;
}

export interface StudyProfile {
  course: string;
  hoursPerDay: string;
  difficulties: string;
  scores?: EnemScores;
}

export interface TopicDetail {
    name: string;
    snippet: string;
}

export type ImageFilter = 'none' | 'grayscale' | 'contrast';

export interface DailySchedule {
  dia: string;
  materias: (string | TopicDetail)[];
  foco: string;
}

export interface StudyScheduleResult {
  diagnostico?: string;
  semana: DailySchedule[];
  dicas_personalizadas: string[];
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
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
}

export interface EssayTheme {
  titulo: string;
  textos_motivadores: string[];
  origem: string;
}

export interface SisuEstimation {
  curso: string;
  nota_corte_media: number;
  nota_corte_min: number;
  nota_corte_max: number;
  ano_referencia: string;
  mensagem: string;
  fontes?: string[];
}

export interface SisuGoal {
    course: string;
    cutoff: number;
    lastUpdated: string;
    source?: string;
}

export type AreaConhecimento = 'Linguagens' | 'Humanas' | 'Natureza' | 'Matemática' | 'Redação';
export type LinguaEstrangeira = 'Inglês' | 'Espanhol';

export interface ExamConfig {
  mode: 'day1' | 'day2' | 'area_training' | 'turbo_review' | 'essay_only'; 
  targetCourses: string[];
  areas: AreaConhecimento[]; 
  foreignLanguage?: LinguaEstrangeira; 
  durationMinutes: number;
  totalQuestions: number;
  turboTopics?: string[]; 
}

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
  batchQueue?: BatchRequest[];
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
}

export interface SavedSchedule {
  id: string;
  createdAt: string;
  profile: StudyProfile;
  result: StudyScheduleResult;
  completedItems: string[];
  archived: boolean;
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

export interface UserSettings {
  name: string;
  targetCourse: string;
  theme: 'light' | 'dark' | 'system';
  fontStyle: 'sans' | 'serif' | 'mono';
  fontSize: 'small' | 'base' | 'large';
  sisuGoals?: SisuGoal[]; 
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

export interface SavedReport {
    id: string;
    userId: string;
    createdAt: string;
    startDate: string;
    endDate: string;
    type: 'manual' | 'auto';
    stats: WeeklyReportStats;
}

export type AppView = 'essay' | 'schedule' | 'simu
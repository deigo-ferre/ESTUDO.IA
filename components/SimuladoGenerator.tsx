import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { generateQuestionsBatch, generateEssayTheme, gradeEssay, estimateSisuCutoff, transcribeImage } from '../services/geminiService';
import { saveExamProgress, getExamById, checkUsageLimit, incrementUsage, getUserSession, upgradeUser, deleteExam, getSettings } from '../services/storageService';
import { QuestionResult, EssayTheme, CorrectionResult, ExamPerformance, ExamConfig, AreaConhecimento, LinguaEstrangeira, SisuEstimation, BatchRequest, SavedExam } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ResultCard from './ResultCard';

type ImageFilter = 'none' | 'grayscale' | 'contrast';

const AREAS_INFO = {
  'Linguagens': { color: 'rose', label: 'Linguagens e Códigos' },
  'Humanas': { color: 'amber', label: 'Ciências Humanas' },
  'Natureza': { color: 'green', label: 'Ciências da Natureza' },
  'Matemática': { color: 'blue', label: 'Matemática' },
  'Redação': { color: 'slate', label: 'Redação' }
};

const INITIAL_BATCH_SIZE = 1; // Start quick with 1 question
const DEFAULT_BATCH_SIZE = 3; // Continue with batches of 3 as requested

// --- EXAM REDUCER ---
interface ExamStateReducer {
    questions: (QuestionResult | null)[];
    essayTheme: EssayTheme | null;
    userAnswers: Record<number, number>;
    userEssayText: string;
    timeRemaining: number;
    isFinished: boolean;
    isLoading: boolean; // Blocking loading (initial)
    isBackgroundLoading: boolean; // Non-blocking loading (subsequent batches)
    loadingProgress: number; 
    batchQueue: BatchRequest[];
    error: string | null;
}

type ExamAction = 
    | { type: 'START_LOADING' }
    | { type: 'STOP_LOADING' }
    | { type: 'START_BACKGROUND_LOADING' }
    | { type: 'STOP_BACKGROUND_LOADING' }
    | { type: 'SET_QUESTIONS'; payload: (QuestionResult | null)[] }
    | { type: 'ADD_QUESTIONS'; payload: { newQuestions: QuestionResult[], startIndex: number } }
    | { type: 'SET_ESSAY_THEME'; payload: EssayTheme | null }
    | { type: 'ANSWER'; payload: { qIndex: number; answer: number } }
    | { type: 'SET_USER_ANSWERS'; payload: Record<number, number> }
    | { type: 'SET_ESSAY'; payload: string }
    | { type: 'SET_TIME'; payload: number }
    | { type: 'SET_BATCH_QUEUE'; payload: BatchRequest[] }
    | { type: 'DEQUEUE_BATCH' }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'FINISH_EXAM'; payload: ExamPerformance | null };

const examReducer = (state: ExamStateReducer, action: ExamAction): ExamStateReducer => {
    switch (action.type) {
        case 'START_LOADING':
            return { ...state, isLoading: true, error: null };
        case 'STOP_LOADING':
            return { ...state, isLoading: false };
        case 'START_BACKGROUND_LOADING':
            return { ...state, isBackgroundLoading: true };
        case 'STOP_BACKGROUND_LOADING':
            return { ...state, isBackgroundLoading: false };
        case 'SET_QUESTIONS':
            return { ...state, questions: action.payload };
        case 'ADD_QUESTIONS': {
            const newQuestions = [...state.questions];
            action.payload.newQuestions.forEach((q, i) => {
                if (action.payload.startIndex + i < newQuestions.length) {
                    newQuestions[action.payload.startIndex + i] = q;
                }
            });
            return { ...state, questions: newQuestions };
        }
        case 'SET_ESSAY_THEME':
            return { ...state, essayTheme: action.payload };
        case 'ANSWER':
            return { ...state, userAnswers: { ...state.userAnswers, [action.payload.qIndex]: action.payload.answer } };
        case 'SET_USER_ANSWERS':
            return { ...state, userAnswers: action.payload };
        case 'SET_ESSAY':
            return { ...state, userEssayText: action.payload };
        case 'SET_TIME':
            return { ...state, timeRemaining: action.payload };
        case 'SET_BATCH_QUEUE':
            return { ...state, batchQueue: action.payload };
        case 'DEQUEUE_BATCH':
            return { ...state, batchQueue: state.batchQueue.slice(1) };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false, isBackgroundLoading: false };
        case 'FINISH_EXAM':
            return { ...state, isFinished: true, isLoading: false, isBackgroundLoading: false };
        default:
            return state;
    }
};


const Dashboard: React.FC<{ onStart: (config: ExamConfig) => void; onBack: () => void }> = ({ onStart, onBack }) => {
    const [targetCourse1, setTargetCourse1] = useState('');
    const [targetCourse2, setTargetCourse2] = useState('');
    const [foreignLanguage, setForeignLanguage] = useState<LinguaEstrangeira | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'full' | 'specific'>('full');
    
    // Theme Logic
    const settings = getSettings();
    const isDark = settings.theme === 'dark';
    const textTitle = isDark ? 'text-white' : 'text-slate-900';
    const textSub = isDark ? 'text-slate-400' : 'text-slate-600';
    const inputClass = 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400';
    const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

    const handleStart = (mode: 'day1' | 'day2' | 'area_training' | 'essay_only', area?: AreaConhecimento) => {
        const limit = checkUsageLimit('exam');
        if (!limit.allowed) {
            setError(limit.message || "Limite atingido.");
            return;
        }

        const isFullExam = mode === 'day1' || mode === 'day2';
        if (isFullExam && !targetCourse1) { setError("Informe pelo menos a 1ª opção de curso para cálculo do SISU."); return; }

        let config: ExamConfig = {
            mode,
            targetCourses: [targetCourse1, targetCourse2].filter(c => c.trim() !== ''),
            areas: [],
            durationMinutes: 0,
            totalQuestions: 0,
            foreignLanguage
        };

        if (mode === 'day1') {
            if (!foreignLanguage) { setError("Selecione o idioma estrangeiro."); return; }
            config.areas = ['Linguagens', 'Humanas', 'Redação'];
            config.durationMinutes = 330;
            config.totalQuestions = 90;
        } else if (mode === 'day2') {
            config.areas = ['Natureza', 'Matemática'];
            config.durationMinutes = 300;
            config.totalQuestions = 90;
        } else if (mode === 'area_training' && area) {
            config.areas = [area];
            if (area === 'Linguagens' && !foreignLanguage) { setError("Selecione o idioma."); return; }
            config.durationMinutes = 150;
            config.totalQuestions = 45;
        } else if (mode === 'essay_only') {
            config.areas = ['Redação'];
            config.durationMinutes = 60;
            config.totalQuestions = 0;
        }

        onStart(config);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
            <div className="mb-4">
                <button onClick={onBack} className={`flex items-center gap-2 font-bold text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Voltar ao Dashboard
                </button>
            </div>

            <div className="text-center mb-10">
                <h1 className={`text-4xl font-extrabold tracking-tight mb-2 ${textTitle}`}>Simulado Oficial ENEM</h1>
                <p className={`${textSub} text-lg`}>Engine de Alta Performance: Questões carregadas em tempo real.</p>
            </div>

            {error && (
                <div className="bg-fuchsia-50 border-l-4 border-fuchsia-500 p-6 rounded-r-xl shadow-md flex flex-col items-center justify-between gap-4 mb-8">
                    <p className="text-fuchsia-800 font-bold">{error}</p>
                    <button onClick={upgradeUser} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold px-6 py-2 rounded-lg shadow whitespace-nowrap">
                        Fazer Upgrade para Premium
                    </button>
                </div>
            )}

            <div className="flex justify-center mb-8">
                <div className={`p-1 rounded-xl flex gap-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <button 
                        onClick={() => { setActiveTab('full'); setError(null); }}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'full' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-indigo-600 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                        Simulado Completo (SISU)
                    </button>
                    <button 
                        onClick={() => { setActiveTab('specific'); setError(null); }}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'specific' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-indigo-600 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                        Treino por Área / Redação
                    </button>
                </div>
            </div>

            {activeTab === 'full' ? (
                <>
                    <div className="max-w-2xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Curso dos Sonhos (1ª Opção)</label>
                            <input type="text" placeholder="Ex: Medicina (USP)" className={`w-full px-4 py-3 rounded-xl border outline-none ${inputClass}`} value={targetCourse1} onChange={(e) => setTargetCourse1(e.target.value)} />
                        </div>
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>2ª Opção (Opcional)</label>
                            <input type="text" placeholder="Ex: Biomedicina" className={`w-full px-4 py-3 rounded-xl border outline-none ${inputClass}`} value={targetCourse2} onChange={(e) => setTargetCourse2(e.target.value)} />
                        </div>
                    </div>

                    <div className={`max-w-xl mx-auto mb-10 p-6 rounded-xl border ${cardClass}`}>
                        <p className={`text-sm font-bold mb-3 uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Língua Estrangeira</p>
                        <div className="flex gap-4">
                            {['Inglês', 'Espanhol'].map(lang => (
                                <label key={lang} className={`flex-1 cursor-pointer border-2 rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${foreignLanguage === lang ? 'border-indigo-600 bg-indigo-500/10 text-indigo-500 font-bold' : `border-slate-200 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white'}`}`}>
                                    <input type="radio" name="lang" className="hidden" onClick={() => setForeignLanguage(lang as any)} />
                                    {lang}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className={`rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden group ${cardClass}`}>
                            <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">DIA 1</div>
                            <h3 className={`text-2xl font-bold mb-2 ${textTitle}`}>Humanas & Linguagens</h3>
                            <p className={`${textSub} text-sm mb-6`}>90 Questões + Redação (5h 30min)</p>
                            <button onClick={() => handleStart('day1')} className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors">Iniciar Dia 1</button>
                        </div>
                        <div className={`rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden group ${cardClass}`}>
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">DIA 2</div>
                            <h3 className={`text-2xl font-bold mb-2 ${textTitle}`}>Natureza & Matemática</h3>
                            <p className={`${textSub} text-sm mb-6`}>90 Questões (5h 00min)</p>
                            <button onClick={() => handleStart('day2')} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Iniciar Dia 2</button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className={`border p-6 rounded-xl mb-8 text-center ${isDark ? 'bg-indigo-900/20 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}>
                        <p className={`${isDark ? 'text-indigo-300' : 'text-indigo-800'} text-sm`}>Nestes modos, <strong>não é necessário definir curso alvo</strong>. O foco é puramente técnico.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className={`p-6 rounded-xl border-2 transition-all flex flex-col justify-between ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <div>
                                <h3 className={`font-bold mb-2 ${textTitle}`}>Apenas Redação</h3>
                                <p className={`text-xs mb-4 ${textSub}`}>Tema inédito ou anterior gerado pela IA. Correção imediata.</p>
                            </div>
                            <button onClick={() => handleStart('essay_only')} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900">Gerar Tema & Escrever</button>
                        </div>

                        {['Matemática', 'Humanas', 'Natureza', 'Linguagens'].map((area) => {
                            const areaThemeColor = AREAS_INFO[area as AreaConhecimento]?.color || 'indigo';
                            return (
                                <div key={area} className={`${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : `bg-white border-slate-200 hover:border-${areaThemeColor}-200`} p-6 rounded-xl border-2 transition-all flex flex-col justify-between`}>
                                    <div>
                                        <h3 className={`font-bold text-${areaThemeColor}-600 mb-2`}>{area}</h3>
                                        <p className={`text-xs mb-4 ${textSub}`}>45 Questões • Padrão ENEM</p>
                                        
                                        {area === 'Linguagens' && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Idioma</p>
                                                <select 
                                                    className={`w-full text-xs p-2 border rounded ${inputClass}`}
                                                    onChange={(e) => setForeignLanguage(e.target.value as LinguaEstrangeira)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    <option value="Inglês">Inglês</option>
                                                    <option value="Espanhol">Espanhol</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => handleStart('area_training', area as AreaConhecimento)} 
                                        className={`w-full py-2 font-bold rounded-lg text-sm ${isDark ? `bg-${areaThemeColor}-900/30 text-${areaThemeColor}-400 hover:bg-${areaThemeColor}-900/50` : `bg-${areaThemeColor}-100 text-${areaThemeColor}-700 hover:bg-${areaThemeColor}-200`}`}
                                    >
                                        Iniciar Treino
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- EXAM RUNNER COMPONENT ---
const ExamRunner: React.FC<{ 
    config: ExamConfig; 
    questions: (QuestionResult | null)[];
    essayTheme: EssayTheme | null;
    userAnswers: Record<number, number>;
    userEssayText: string;
    timeRemaining: number;
    dispatch: (action: ExamAction) => void;
    onFinish: () => void;
    onSaveAndExit: () => void;
    onCancel: () => void;
}> = ({ config, questions, essayTheme, userAnswers, userEssayText, timeRemaining, dispatch, onFinish, onSaveAndExit, onCancel }) => {
    const [currentView, setCurrentView] = useState<'questions' | 'essay'>(config.mode === 'essay_only' ? 'essay' : 'questions');
    const [qIndex, setQIndex] = useState(0);
    const [essayInputMode, setEssayInputMode] = useState<'text' | 'camera' | 'upload' | 'editor'>('text');
    const [essayImage, setEssayImage] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ImageFilter>('none');
    
    const settings = getSettings();
    const isDark = settings.theme === 'dark';

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFilterClass = () => {
        switch(activeFilter) {
          case 'grayscale': return 'grayscale contrast-125';
          case 'contrast': return 'contrast-150 grayscale brightness-90'; 
          default: return '';
        }
      };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    };

    const currentQuestion = questions[qIndex];
    
    // --- Camera/Image Handlers ---
    const startCamera = async () => {
        try {
            setEssayInputMode('camera');
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (e) {
            alert("Erro ao acessar câmera: " + (e as Error).message);
            setEssayInputMode('text');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setEssayImage(imageBase64);
                stopCamera(); // Stop camera after capture
                setEssayInputMode('editor');
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Por favor, envie um arquivo de imagem (JPG, PNG) para a redação.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setEssayImage(reader.result as string);
            setEssayInputMode('editor');
        };
        reader.readAsDataURL(file);
    };

    const applyFilterAndGetImage = async (): Promise<{ base64: string; mimeType: string } | null> => {
        if (!essayImage) return null;
        
        return new Promise((resolve) => {
           const img = new Image();
           img.src = essayImage;
           img.onload = () => {
               const canvas = document.createElement('canvas');
               const ctx = canvas.getContext('2d');
               if (!ctx) { resolve(null); return; }
   
               canvas.width = img.width;
               canvas.height = img.height;
   
               if (activeFilter === 'grayscale') ctx.filter = 'grayscale(100%) contrast(125%)';
               else if (activeFilter === 'contrast') ctx.filter = 'contrast(150%) grayscale(100%) brightness(90%)';
               else ctx.filter = 'none';
   
               ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
               const processedBase64 = canvas.toDataURL('image/jpeg', 0.85);
               resolve({ base64: processedBase64.split(',')[1], mimeType: 'image/jpeg' });
           };
           img.onerror = () => resolve(null);
        });
    };

    const handleExtractText = async () => {
        if (!essayImage) return;
        setIsTranscribing(true);
        try {
            const imageData = await applyFilterAndGetImage();
            if (!imageData) throw new Error("Erro ao processar imagem para transcrição.");
            const transcribedText = await transcribeImage(imageData);
            dispatch({ type: 'SET_ESSAY', payload: transcribedText });
            setEssayInputMode('text');
        } catch(e) {
            alert("Erro ao transcrever imagem: " + (e as Error).message);
        } finally {
            setIsTranscribing(false);
        }
    };

    // --- Delivery & Cancellation Logic ---
    const handleDeliveryCheck = () => {
        // Se for modo apenas redação, confirmação simples
        if (config.mode === 'essay_only') {
            if(window.confirm("Deseja entregar sua redação para correção?")) onFinish();
            return;
        }

        const total = config.totalQuestions;
        const answered = Object.keys(userAnswers).map(Number);
        const missing: number[] = [];
        
        for(let i=0; i<total; i++) {
            if(!answered.includes(i)) missing.push(i+1);
        }

        if (missing.length > 0) {
            const confirmText = `Você ainda não respondeu ${missing.length} questões.\nQuestões faltantes: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}\n\nTem certeza que deseja entregar o simulado incompleto?`;
            if (window.confirm(confirmText)) {
                onFinish();
            } else {
                // Navega para a primeira questão não respondida
                setQIndex(missing[0] - 1);
                setCurrentView('questions');
            }
        } else {
            if(window.confirm("Você tem certeza que deseja finalizar a prova agora?")) onFinish();
        }
    };

    const handleCancelCheck = () => {
        if(window.confirm("Tem certeza que deseja cancelar este simulado? Todo o progresso será perdido e ele NÃO aparecerá no histórico.")) {
            onCancel();
        }
    }

    const hasQuestions = config.totalQuestions > 0;
    const loadedCount = questions.filter(q => q !== null).length;
    const progressPercent = hasQuestions ? Math.round((loadedCount / config.totalQuestions) * 100) : 100;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            <canvas ref={canvasRef} className="hidden" />
            
            {essayInputMode === 'camera' && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-10 flex gap-8 items-center">
                    <button onClick={() => { stopCamera(); setEssayInputMode('text'); }} className="p-4 rounded-full bg-white/20 text-white backdrop-blur-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 shadow-2xl ring-4 ring-white/30"></button>
                    </div>
                </div>
            )}

            {essayInputMode === 'editor' && essayImage && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
                    <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl shadow-xl overflow-hidden max-w-3xl w-full`}>
                        <div className={`p-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} flex justify-between items-center`}>
                            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Editor de Imagem</h3>
                            <button onClick={() => { setEssayInputMode('text'); setEssayImage(null); }} className="text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">Descartar</button>
                        </div>
                        
                        <div className={`p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-100'} flex justify-center overflow-auto max-h-[50vh] relative`}>
                            <img src={essayImage} className={`max-w-full shadow-lg transition-all duration-300 ${getFilterClass()}`} alt="Essay to Transcribe" loading="lazy" />
                            {isTranscribing && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                                    <p className="text-indigo-800 dark:text-indigo-300 font-bold animate-pulse">Lendo manuscrito...</p>
                                </div>
                            )}
                        </div>

                        <div className={`p-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t`}>
                            <div className="flex justify-center gap-2 mb-6">
                                {['none', 'grayscale', 'contrast'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f as ImageFilter)}
                                    disabled={isTranscribing}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeFilter === f ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                >
                                    {f === 'none' ? 'Original' : f === 'grayscale' ? 'P&B' : 'Alto Contraste'}
                                </button>
                                ))}
                            </div>
                            
                            <button onClick={handleExtractText} disabled={isTranscribing} className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 ${isTranscribing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.01] active:scale-[0.99]'}`}>
                                {!isTranscribing ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Extrair Texto da Imagem
                                    </>
                                ) : "Processando..."}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-900'} text-white px-6 py-3 flex items-center justify-between shadow-md flex-shrink-0 z-20`}>
                <div className="flex items-center gap-4">
                    <span className="font-mono text-xl font-bold text-yellow-400 tracking-widest">{formatTime(timeRemaining)}</span>
                    {hasQuestions && (
                        <div className="hidden md:flex flex-col w-32">
                             <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                 <div className="h-full bg-green-500 transition-all" style={{ width: `${(Object.keys(userAnswers).length / config.totalQuestions) * 100}%` }}></div>
                             </div>
                             <span className="text-[10px] text-slate-400 mt-1">{Object.keys(userAnswers).length} / {config.totalQuestions} respondidas</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    {hasQuestions && loadedCount < config.totalQuestions && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded text-xs text-blue-300 border border-blue-900/50">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
                            <span className="hidden sm:inline">Carregando ({progressPercent}%)</span>
                        </div>
                    )}
                    <button onClick={handleCancelCheck} className="bg-red-900/50 border border-red-800 hover:bg-red-800 text-red-200 text-xs font-bold px-4 py-2 rounded transition-colors">Cancelar</button>
                    <button onClick={onSaveAndExit} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded">Salvar e Sair</button>
                    <button onClick={handleDeliveryCheck} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded">Entregar</button>
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden relative">
                {/* Sidebar */}
                {config.mode !== 'essay_only' && (
                    <nav className={`w-16 md:w-64 border-r flex flex-col flex-shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="p-2 overflow-y-auto flex-grow space-y-1">
                            <button onClick={() => setCurrentView('questions')} className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'questions' ? (isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-50 text-indigo-700') : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'hover:bg-slate-50 text-slate-600')}`}>
                                <span className="font-bold text-lg">Q</span> <span className="hidden md:inline text-sm font-medium">Questões</span>
                            </button>
                            {config.areas.includes('Redação') && (
                                <button onClick={() => setCurrentView('essay')} className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'essay' ? (isDark ? 'bg-rose-900/50 text-rose-300' : 'bg-rose-50 text-rose-700') : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'hover:bg-slate-50 text-slate-600')}`}>
                                    <span className="font-bold text-lg">R</span> <span className="hidden md:inline text-sm font-medium">Redação</span>
                                </button>
                            )}
                            <div className={`border-t my-2 pt-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <p className="px-2 text-[10px] font-bold text-slate-500 uppercase mb-2 hidden md:block">Mapa da Prova</p>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5 px-1">
                                    {questions.map((q, i) => (
                                        <button 
                                            key={i} 
                                            disabled={!q}
                                            onClick={() => { setCurrentView('questions'); setQIndex(i); }}
                                            className={`h-8 rounded text-xs font-bold transition-all ${
                                                !q ? 'bg-slate-50 opacity-20' :
                                                userAnswers[i] !== undefined 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : i === qIndex ? 'ring-2 ring-indigo-500 text-slate-500' : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200')
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </nav>
                )}

                <main className={`flex-grow overflow-y-auto p-4 md:p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    {currentView === 'questions' && hasQuestions ? (
                        <div className={`max-w-4xl mx-auto min-h-[500px] rounded-2xl shadow-sm border p-8 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            {currentQuestion ? (
                                <div className="animate-fade-in">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-full uppercase">Questão {qIndex + 1}</span>
                                            {/* Fix: Extract questionAreaColor calculation outside the template literal */}
                                            {(() => {
                                                const questionAreaColor = AREAS_INFO[currentQuestion.area as keyof typeof AREAS_INFO]?.color || 'slate';
                                                return (
                                                    <span className={`px-3 py-1 bg-${questionAreaColor}-100 text-${questionAreaColor}-800 text-xs font-bold rounded-full uppercase`}>
                                                        {currentQuestion.materia}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">{currentQuestion.origem}</span>
                                    </div>
                                    <p className={`text-lg leading-relaxed mb-8 whitespace-pre-line font-serif ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                        {currentQuestion.enunciado}
                                    </p>
                                    <div className="space-y-3">
                                        {currentQuestion.alternativas.map((alt, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => dispatch({ type: 'ANSWER', payload: { qIndex, answer: idx } })}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 ${userAnswers[qIndex] === idx ? 'border-indigo-600 bg-indigo-50/10 text-indigo-600' : (isDark ? 'border-slate-800 hover:border-slate-700 text-slate-300' : 'border-slate-200 hover:border-slate-300 text-slate-700')}`}
                                            >
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${userAnswers[qIndex] === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-400 text-slate-500'}`}>{String.fromCharCode(65+idx)}</span>
                                                <span className="text-sm md:text-base">{alt}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-8 flex justify-between">
                                        <button disabled={qIndex === 0} onClick={() => setQIndex(i => i - 1)} className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'} disabled:${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Anterior</button>
                                        <button disabled={qIndex === config.totalQuestions - 1} onClick={() => setQIndex(i => i + 1)} className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'} disabled:${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Próxima</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                                    <LoadingSpinner />
                                    <p className="text-indigo-500 font-bold mt-4">Preparando próxima questão...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`max-w-4xl mx-auto h-full flex flex-col rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                             {essayInputMode === 'text' ? (
                                <>
                                    <div className={`p-6 border-b ${isDark ? 'bg-rose-900/10 border-rose-900/20' : 'bg-rose-50 border-rose-100'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-rose-600 text-xs font-bold uppercase tracking-wide">Proposta</span>
                                                <h2 className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{essayTheme?.titulo || "Carregando tema..."}</h2>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={startCamera} className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>📸</button>
                                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                                <button onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>📂</button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                            {essayTheme?.textos_motivadores.map((t, i) => <p key={i} className={`text-xs italic p-2 rounded border ${isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-white border-rose-100'}`}>{t}</p>)}
                                        </div>
                                    </div>
                                    <textarea 
                                        className={`flex-grow w-full p-6 text-lg leading-relaxed resize-none focus:outline-none bg-white text-slate-900`}
                                        placeholder="Digite sua redação..."
                                        value={userEssayText}
                                        onChange={(e) => dispatch({ type: 'SET_ESSAY', payload: e.target.value })}
                                    />
                                </>
                             ) : (
                                <div className="p-10 text-center text-slate-500">
                                    {essayInputMode === 'camera' ? 'Aguardando captura da foto...' : 'Editando imagem...'}
                                </div>
                             )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// --- EXAM RESULTS COMPONENT ---
const ExamResults: React.FC<{ 
    config: ExamConfig; 
    performance: ExamPerformance; 
    onBack: () => void;
    onStartTurboReview: (topics: string[]) => void;
    onUpgrade: () => void;
}> = ({ config, performance, onBack, onStartTurboReview, onUpgrade }) => {
    const settings = getSettings();
    const isDark = settings.theme === 'dark';
    const textTitle = isDark ? 'text-white' : 'text-slate-800';
    const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
    const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const highlightClass = isDark ? 'bg-indigo-900/20 border-indigo-900/30 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-700';

    const isEssayOnly = config.mode === 'essay_only';

    const showTurboReview = !isEssayOnly && performance.wrongTopics && performance.wrongTopics.length > 0;
    const user = getUserSession();
    const isPremium = user?.planType === 'PREMIUM';

    return (
        <div className="max-w-4xl mx-auto py-12 animate-fade-in pb-12">
            <button onClick={onBack} className={`${textSub} hover:${isDark ? 'text-white' : 'text-indigo-600'} mb-6 font-bold text-sm flex gap-2 transition-colors`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Voltar ao Dashboard</button>
            
            <div className={`${cardClass} rounded-3xl shadow-xl border p-8 text-center mb-8`}>
                <p className={`${textSub} font-bold uppercase tracking-widest text-xs mb-2`}>Sua Nota Final (Média TRI)</p>
                <div className={`text-7xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(performance.totalScore)}</div>
                <p className={`text-lg max-w-xl mx-auto ${textSub}`}>
                    Seu desempenho neste simulado foi de <span className="font-bold text-indigo-600">{Math.round(performance.totalScore)} pontos</span>.
                </p>
                {!isEssayOnly && (
                    <p className={`${textSub} text-sm mt-2`}>Você acertou {performance.correctCount} de {performance.totalQuestions} questões objetivas.</p>
                )}
            </div>

            {/* SISU Comparison */}
            {config.targetCourses && config.targetCourses.length > 0 && performance.sisuComparisons && performance.sisuComparisons.length > 0 && (
                <div className={`${cardClass} rounded-2xl shadow-sm border p-6 mb-8`}>
                    <h3 className={`text-xl font-bold ${textTitle} mb-4 flex items-center gap-2`}>
                        <svg className="w-6 h-6 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Comparativo SISU
                    </h3>
                    <div className="space-y-4">
                        {performance.sisuComparisons.map((comp, idx) => {
                            const diff = comp.nota_corte_media - performance.totalScore;
                            const isApproved = diff <= 0;
                            return (
                                <div key={idx} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isApproved ? (isDark ? 'bg-green-900/20 border-green-900/30' : 'bg-green-50 border-green-200') : (isDark ? 'bg-amber-900/20 border-amber-900/30' : 'bg-amber-50 border-amber-200')}`}>
                                    <div>
                                        <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{comp.curso}</p>
                                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nota de Corte Média ({comp.ano_referencia}): <span className="font-bold">{comp.nota_corte_media}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`block text-lg font-black ${isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                                            {isApproved ? 'APROVADO! 🎉' : `Faltam ${diff.toFixed(1)} pontos`}
                                        </span>
                                        <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{comp.mensagem}</p>
                                        {comp.fontes && comp.fontes.length > 0 && (
                                            <a href={comp.fontes[0]} target="_blank" rel="noopener noreferrer" className={`text-[10px] ${isDark ? 'text-indigo-400' : 'text-indigo-600'} hover:underline block truncate max-w-[150px] ml-auto`}>Ver Fonte</a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Essay Results */}
            {performance.essayResult && (
                <div className="mb-8">
                    <h3 className={`text-xl font-bold ${textTitle} mb-4 flex items-center gap-2`}>
                        <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Análise da Redação
                    </h3>
                    <ResultCard 
                        result={performance.essayResult} 
                        onReset={() => {}} // No reset from here
                        onSave={() => alert("Redação já salva como parte do histórico do simulado.")} // Saved with exam
                    />
                </div>
            )}

            {/* Performance by Area */}
            {!isEssayOnly && performance.scoreByArea && Object.keys(performance.scoreByArea).length > 0 && (
                <div className={`${cardClass} rounded-2xl shadow-sm border p-6 mb-8`}>
                    <h3 className={`text-xl font-bold ${textTitle} mb-4 flex items-center gap-2`}>
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18V2H3v2zm16 0v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4h14z" /></svg>
                        Performance por Área
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(performance.scoreByArea).map(([area, score]) => (
                            <div key={area} className={`p-4 rounded-xl border ${highlightClass}`}>
                                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{AREAS_INFO[area as AreaConhecimento]?.label || area}</p>
                                <div className={`text-3xl font-black mt-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{Math.round(score)} <span className={`text-sm font-normal ${textSub}`}>pts</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Turbo Review Section */}
            {showTurboReview && (
                <div className={`${cardClass} rounded-2xl shadow-sm border p-6 ${isPremium ? '' : 'opacity-70 grayscale'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-xl font-bold ${textTitle} flex items-center gap-2`}>
                            <svg className="w-6 h-6 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Revisão Turbo (Seus Maiores Erros)
                        </h3>
                        {!isPremium && (
                            <span className="bg-fuchsia-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                PREMIUM
                            </span>
                        )}
                    </div>
                    {isPremium ? (
                        <>
                            <p className={`${textSub} mb-4`}>A IA gerou questões focadas nos tópicos que você mais errou:</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {performance.wrongTopics?.map((topic, idx) => (
                                    <span key={idx} className="bg-fuchsia-100 text-fuchsia-800 text-xs font-bold px-3 py-1 rounded-full">{topic}</span>
                                ))}
                            </div>
                            <button onClick={() => onStartTurboReview(performance.wrongTopics || [])} className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl shadow-md transition-all">
                                Gerar Questões Turbo Agora!
                            </button>
                        </>
                    ) : (
                        <div className="text-center p-4">
                            <p className={`${textSub} mb-4`}>Desbloqueie a Revisão Turbo com o plano Premium para focar nos seus erros.</p>
                            <button onClick={onUpgrade} className="py-3 px-6 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl shadow-md transition-all">
                                Fazer Upgrade para Premium
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- MAIN SIMULADO GENERATOR COMPONENT ---

const SimuladoGenerator: React.FC<{ resumeExamId: string | null, onBack: () => void }> = ({ resumeExamId, onBack }) => {
    const [view, setView] = useState<'dashboard' | 'runner' | 'results'>('dashboard');
    const [config, setConfig] = useState<ExamConfig | null>(null);
    const [performance, setPerformance] = useState<ExamPerformance | null>(null);
    const [examId, setExamId] = useState<string | null>(null);

    // Use reducer for complex state management in ExamRunner
    const [examState, dispatch] = useReducer(examReducer, {
        questions: [],
        essayTheme: null,
        userAnswers: {},
        userEssayText: '',
        timeRemaining: 0,
        isFinished: false,
        isLoading: false,
        isBackgroundLoading: false, // New state for non-blocking loading
        loadingProgress: 0,
        batchQueue: [],
        error: null,
    });

    // --- Resume Exam Logic ---
    useEffect(() => {
        if (resumeExamId) {
            const saved = getExamById(resumeExamId);
            if (saved && saved.status === 'in_progress') {
                setConfig(saved.config);
                dispatch({ type: 'SET_QUESTIONS', payload: saved.state.questions });
                dispatch({ type: 'SET_ESSAY_THEME', payload: saved.state.essayTheme || null });
                dispatch({ type: 'SET_USER_ANSWERS', payload: saved.state.userAnswers }); 
                dispatch({ type: 'SET_ESSAY', payload: saved.state.userEssayText || '' });
                dispatch({ type: 'SET_TIME', payload: saved.state.timeRemaining });
                dispatch({ type: 'SET_BATCH_QUEUE', payload: saved.state.batchQueue || [] });
                setExamId(saved.id);
                setView('runner');
            } else if (saved && saved.status === 'completed' && saved.performance) {
                setConfig(saved.config);
                setPerformance(saved.performance);
                setExamId(saved.id);
                setView('results');
            }
        }
    }, [resumeExamId]);

    // --- Timer Effect ---
    useEffect(() => {
        let timer: any;
        if (view === 'runner' && examState.timeRemaining > 0 && !examState.isLoading && !examState.isFinished) {
            timer = setInterval(() => {
                dispatch({ type: 'SET_TIME', payload: examState.timeRemaining - 1 });
            }, 1000);
        } else if (examState.timeRemaining <= 0 && view === 'runner' && !examState.isFinished) {
            handleFinishExam();
        }
        return () => clearInterval(timer);
    }, [view, examState.timeRemaining, examState.isLoading, examState.isFinished]);

    // --- Autosave Effect ---
    useEffect(() => {
        if (view === 'runner' && config && examId) {
            const interval = setInterval(() => saveProgress(), 30000); // Save every 30 seconds
            return () => clearInterval(interval);
        }
    }, [view, config, examId, examState.userAnswers, examState.userEssayText, examState.timeRemaining, examState.batchQueue]);

    // --- Question Batch Processing Effect (NON-BLOCKING) ---
    useEffect(() => {
        if (examState.batchQueue.length > 0 && !examState.isBackgroundLoading && !examState.isLoading) {
            const processNextBatch = async () => {
                dispatch({ type: 'START_BACKGROUND_LOADING' });
                const nextBatch = examState.batchQueue[0];
                try {
                    const newQuestions = await generateQuestionsBatch(nextBatch.area, nextBatch.count, nextBatch.language, nextBatch.isForeign, nextBatch.topics);
                    dispatch({ type: 'ADD_QUESTIONS', payload: { newQuestions, startIndex: nextBatch.startIndex } });
                    dispatch({ type: 'DEQUEUE_BATCH' });
                } catch (e) {
                    // Do not block UI on error, maybe retry later or log
                    console.error("Batch load failed:", e);
                } finally {
                    dispatch({ type: 'STOP_BACKGROUND_LOADING' });
                }
            };
            processNextBatch();
        }
    }, [examState.batchQueue, examState.isBackgroundLoading, examState.isLoading]);


    const saveProgress = useCallback((status: 'in_progress' | 'completed' = 'in_progress', perf?: ExamPerformance) => {
        if (!config) return;
        const stateToSave = { 
            questions: examState.questions, 
            essayTheme: examState.essayTheme, 
            userAnswers: examState.userAnswers, 
            userEssayText: examState.userEssayText, 
            timeRemaining: examState.timeRemaining, 
            isFinished: status === 'completed', 
            loadingProgress: 0, 
            batchQueue: examState.batchQueue,
        };
        const id = saveExamProgress(examId, config, stateToSave, status, perf);
        if (!examId) setExamId(id); // Set examId if it's a new exam being saved for the first time
    }, [config, examState, examId]);

    const handleStartExam = async (newConfig: ExamConfig) => {
        dispatch({ type: 'START_LOADING' });
        setConfig(newConfig);
        dispatch({ type: 'SET_TIME', payload: newConfig.durationMinutes * 60 });
        
        const totalQ = newConfig.totalQuestions;
        const initialQuestions = new Array(totalQ).fill(null);
        dispatch({ type: 'SET_QUESTIONS', payload: initialQuestions });
        dispatch({ type: 'SET_USER_ANSWERS', payload: {} }); // Clear old answers
        dispatch({ type: 'SET_ESSAY', payload: '' }); // Clear old essay
        
        const queue: BatchRequest[] = [];
        // Day 1: 45 Ling (5 foreign), 45 Humanas, 1 Redação
        if (newConfig.mode === 'day1') {
            // Initial foreign language questions (e.g., 5-10 questions)
            // Use INITIAL_BATCH_SIZE for the very first fetch to be super fast
            const firstBatchSize = INITIAL_BATCH_SIZE;
            
            queue.push({ area: 'Linguagens', count: firstBatchSize, startIndex: 0, isForeign: true, language: newConfig.foreignLanguage });
            
            // Remaining Foreign (if any) + Linguistics
            // Assuming 5 foreign questions total
            if (5 > firstBatchSize) {
                 queue.push({ area: 'Linguagens', count: 5 - firstBatchSize, startIndex: firstBatchSize, isForeign: true, language: newConfig.foreignLanguage });
            }

            // Remaining Linguistics questions (up to 45 total for linguistics area)
            for(let i = 5; i < 45; i += DEFAULT_BATCH_SIZE) {
                queue.push({ area: 'Linguagens', count: Math.min(DEFAULT_BATCH_SIZE, 45 - i), startIndex: i });
            }
            // Humanas questions
            for(let i = 0; i < 45; i += DEFAULT_BATCH_SIZE) {
                queue.push({ area: 'Humanas', count: Math.min(DEFAULT_BATCH_SIZE, 45 - i), startIndex: 45 + i });
            }
            // Essay theme is handled below
        } 
        // Day 2: 45 Natureza, 45 Matemática
        else if (newConfig.mode === 'day2') {
            // Start very fast
            queue.push({ area: 'Natureza', count: INITIAL_BATCH_SIZE, startIndex: 0 });
            
            for(let i = INITIAL_BATCH_SIZE; i < 45; i += DEFAULT_BATCH_SIZE) {
                queue.push({ area: 'Natureza', count: Math.min(DEFAULT_BATCH_SIZE, 45 - i), startIndex: i });
            }
            for(let i = 0; i < 45; i += DEFAULT_BATCH_SIZE) {
                queue.push({ area: 'Matemática', count: Math.min(DEFAULT_BATCH_SIZE, 45 - i), startIndex: 45 + i });
            }
        } 
        // Area Training: 45 questions for a specific area
        else if (newConfig.mode === 'area_training' && newConfig.areas.length > 0) {
            const area = newConfig.areas[0];
            queue.push({ area: area, count: INITIAL_BATCH_SIZE, startIndex: 0, isForeign: area === 'Linguagens', language: newConfig.foreignLanguage });
            for(let i = INITIAL_BATCH_SIZE; i < 45; i += DEFAULT_BATCH_SIZE) {
                queue.push({ area: area, count: Math.min(DEFAULT_BATCH_SIZE, 45 - i), startIndex: i, isForeign: area === 'Linguagens', language: newConfig.foreignLanguage });
            }
        }
        // Turbo Review & Essay Only
        else if (newConfig.mode === 'turbo_review') {
             // For turbo, we might want slightly larger batches or just normal flow
             if (newConfig.turboTopics && newConfig.turboTopics.length > 0) {
                 // Simplified logic for Turbo: 1 batch per topic or similar. 
                 // Assuming strict 15 questions total for now based on previous logic
                 queue.push({ area: 'Geral', count: 3, startIndex: 0, topics: newConfig.turboTopics });
                 for(let i = 3; i < 15; i += 3) {
                     queue.push({ area: 'Geral', count: 3, startIndex: i, topics: newConfig.turboTopics });
                 }
             }
        }

        dispatch({ type: 'SET_BATCH_QUEUE', payload: queue });

        try {
            // Load the FIRST batch synchronously to start quickly (blocking UI for a moment)
            if (queue.length > 0) {
                const firstBatch = queue[0];
                const initialQuestionsLoad = await generateQuestionsBatch(firstBatch.area, firstBatch.count, firstBatch.language, firstBatch.isForeign, firstBatch.topics);
                const updatedQuestionsArray = [...initialQuestions];
                initialQuestionsLoad.forEach((q, i) => {
                    if (firstBatch.startIndex + i < updatedQuestionsArray.length) {
                        updatedQuestionsArray[firstBatch.startIndex + i] = q;
                    }
                });
                dispatch({ type: 'SET_QUESTIONS', payload: updatedQuestionsArray });
                dispatch({ type: 'DEQUEUE_BATCH' }); // Remove first batch from queue
            }
            
            // Generate essay theme if needed
            if (newConfig.areas.includes('Redação')) {
                const theme = await generateEssayTheme();
                dispatch({ type: 'SET_ESSAY_THEME', payload: theme });
            }

            // Save initial state and get exam ID
            const newExamId = saveExamProgress(
                null, 
                newConfig, 
                { 
                    questions: initialQuestions, 
                    essayTheme: examState.essayTheme, 
                    userAnswers: {}, 
                    userEssayText: '', 
                    timeRemaining: newConfig.durationMinutes * 60, 
                    isFinished: false,
                    loadingProgress: 0, 
                    batchQueue: queue.slice(1) // Remaining queue
                }, 
                'in_progress'
            );
            setExamId(newExamId);
            incrementUsage('exam'); // Log usage
            setView('runner'); // Switch to runner view
        } catch (e) {
            console.error(e);
            dispatch({ type: 'SET_ERROR', payload: "Erro ao iniciar simulado." });
        } finally {
            dispatch({ type: 'STOP_LOADING' });
        }
    };

    const handleFinishExam = async () => {
        dispatch({ type: 'START_LOADING' });
        try {
            // 1. Calculate Objective Scores (TRI-like simulation)
            const scores: Record<string, number> = {};
            let totalCorrect = 0;
            const wrongTopics: string[] = [];

            if (config?.mode !== 'essay_only') {
                const areaCounts: Record<string, { total: number, correct: number }> = {};
                examState.questions.forEach((q, idx) => {
                    // Include all questions, even if not loaded/answered (they count as wrong/skipped)
                    if (!q) return; 
                    const area = q.area || 'Geral';
                    if (!areaCounts[area]) areaCounts[area] = { total: 0, correct: 0 };
                    areaCounts[area].total++;
                    if (examState.userAnswers[idx] === q.correta_index) {
                        areaCounts[area].correct++;
                        totalCorrect++;
                    } else {
                        // Collect wrong topics for turbo review
                        if (q.topic) wrongTopics.push(q.topic);
                    }
                });

                Object.keys(areaCounts).forEach(area => {
                    const { total, correct } = areaCounts[area];
                    // Simple TRI simulation: 300 (base) + %correct * 600
                    scores[area] = 300 + ((correct / total) * 600); 
                });
            }

            // 2. Grade Essay if present
            let essayResult: CorrectionResult | null = null;
            if (examState.userEssayText.length > 10 && config?.areas.includes('Redação')) {
                essayResult = await gradeEssay(examState.userEssayText, null, examState.essayTheme);
            }

            // 3. Estimate SISU Cutoffs if target courses are defined
            let sisuComparisons: SisuEstimation[] = [];
            if (config?.targetCourses && config.targetCourses.length > 0) {
                sisuComparisons = await estimateSisuCutoff(config.targetCourses);
            }

            // Calculate overall average score
            const objectiveScoreSum = (Object.values(scores) as number[]).reduce((acc, curr) => acc + curr, 0);
            const objectiveAreaCount = Object.keys(scores).length;
            const essayScore = essayResult?.nota_total || 0;
            const totalAreas = objectiveAreaCount + (essayResult ? 1 : 0);
            
            const overallAverage = totalAreas > 0 
                ? (objectiveScoreSum + essayScore) / totalAreas
                : 0; // Should not happen if there's at least one part

            const finalPerformance: ExamPerformance = {
                scoreByArea: scores,
                totalScore: overallAverage,
                correctCount: totalCorrect,
                totalQuestions: config?.totalQuestions || 0,
                essayResult: essayResult,
                sisuComparisons: sisuComparisons,
                wrongTopics: [...new Set(wrongTopics)], // Unique wrong topics
            };
            setPerformance(finalPerformance);
            saveProgress('completed', finalPerformance); // Save as completed
            dispatch({ type: 'FINISH_EXAM', payload: finalPerformance });
            setView('results'); // Switch to results view
        } catch (e) {
            console.error("Erro ao finalizar simulado:", e);
            dispatch({ type: 'SET_ERROR', payload: "Erro ao finalizar simulado. Tente novamente." });
        } finally {
            dispatch({ type: 'STOP_LOADING' });
        }
    };

    const handleStartTurboReview = (topics: string[]) => {
        const user = getUserSession();
        if (!user || user.planType !== 'PREMIUM') {
            alert("A Revisão Turbo é um recurso Premium. Faça upgrade para acessá-lo!");
            return;
        }

        const newConfig: ExamConfig = {
            mode: 'turbo_review',
            targetCourses: [], // Not relevant for turbo
            areas: [], // Not relevant for turbo
            durationMinutes: 60, // Default for turbo
            totalQuestions: 15, // Default for turbo
            turboTopics: topics,
        };
        // Reset state for new exam
        setExamId(null); 
        setPerformance(null);
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_USER_ANSWERS', payload: {} });
        dispatch({ type: 'SET_ESSAY', payload: '' });
        dispatch({ type: 'SET_ESSAY_THEME', payload: null });
        
        handleStartExam(newConfig); // Reuse start exam logic
    };

    const handleUpgrade = () => {
        // This function would typically navigate to a plan selection page
        // For now, we'll alert and suggest checking settings
        alert("Para acessar este recurso, por favor, faça upgrade para o plano Premium nas suas configurações ou na página de planos.");
    };

    const handleCancelExam = () => {
        if (examId) {
            deleteExam(examId); // Delete if user cancels
        }
        // Reset all states and go back to dashboard
        setConfig(null);
        setPerformance(null);
        setExamId(null);
        dispatch({ type: 'SET_QUESTIONS', payload: [] });
        dispatch({ type: 'SET_ESSAY_THEME', payload: null });
        dispatch({ type: 'SET_USER_ANSWERS', payload: {} });
        dispatch({ type: 'SET_ESSAY', payload: '' });
        dispatch({ type: 'SET_TIME', payload: 0 });
        dispatch({ type: 'SET_BATCH_QUEUE', payload: [] });
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'STOP_LOADING' }); // Ensure loading is off
        setView('dashboard');
        onBack(); // Navigate back to the main dashboard
    };

    // Main render logic based on 'view' state
    // Only show global loading spinner if it is blocking loading (initial load or finish)
    if (examState.isLoading && view !== 'dashboard') { 
        return <LoadingSpinner />;
    }

    if (view === 'results' && config && performance) {
        return <ExamResults config={config} performance={performance} onBack={onBack} onStartTurboReview={handleStartTurboReview} onUpgrade={handleUpgrade} />;
    }

    if (view === 'runner' && config) {
        return (
            <ExamRunner 
                config={config} 
                questions={examState.questions} 
                essayTheme={examState.essayTheme}
                userAnswers={examState.userAnswers} 
                userEssayText={examState.userEssayText} 
                timeRemaining={examState.timeRemaining} 
                dispatch={dispatch} 
                onFinish={handleFinishExam} 
                onSaveAndExit={() => { saveProgress(); onBack(); }}
                onCancel={handleCancelExam}
            />
        );
    }

    return <Dashboard onStart={handleStartExam} onBack={onBack} />;
};

export default SimuladoGenerator;
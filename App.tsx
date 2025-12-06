import React, { useState, useCallback, useRef, useEffect } from 'react';
import { gradeEssay, transcribeImage, generateEssayTheme } from './services/geminiService';
import { saveUserSession, getUserSession, clearUserSession, getSettings, checkUsageLimit, incrementUsage, upgradeUser, saveStandaloneEssay, setUserPlan, getExamById, saveExamProgress } from './services/storageService';
import { CorrectionResult, ImageData, User, UserSettings, EssayTheme, PlanType, SisuGoal, ImageFilter } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import ResultCard from './components/ResultCard';
import ScheduleGenerator from './components/ScheduleGenerator';
import SimuladoGenerator from './components/SimuladoGenerator';
import UserDashboard from './components/UserDashboard';
import { LoginPage } from './components/LoginPage';
import { SettingsPage } from './components/SettingsPage';
import OnboardingTour from './components/OnboardingTour';
import PlanSelection from './components/PlanSelection';
import Logo from './components/Logo';
import OnboardingGoalSetter from './components/OnboardingGoalSetter';
import EssayCorrectionDemo from './components/EssayCorrectionDemo';
import AdminDashboard from './components/AdminDashboard';

type InputMode = 'text' | 'camera' | 'upload' | 'editor';
type AppView = 'essay' | 'schedule' | 'simulado' | 'user_area' | 'settings' | 'admin';

const MAX_IMAGE_DIMENSION = 2000;
const OPTIMIZED_JPEG_QUALITY = 0.8;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [scrolled, setScrolled] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('user_area');
  const [resumeExamId, setResumeExamId] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [showGoalSetter, setShowGoalSetter] = useState(false);
  const [showEssayDemo, setShowEssayDemo] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [essayTheme, setEssayTheme] = useState<EssayTheme | null>(null);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ImageFilter>('none');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Helper to determine if selectedImage string is actually an image (and not a PDF data URI)
  const isImageFile = (selectedImage?.startsWith('data:image') && !selectedImage.includes('application/pdf')) ?? false;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUser = getUserSession();
    const storedSettings = getSettings();
    if (storedUser) {
        setUser(storedUser);
        // Direct admin check on load
        if (storedUser.isAdmin) {
            setCurrentView('admin');
        } else if (!storedUser.hasSeenOnboardingGoalSetter && (!storedSettings.sisuGoals || storedSettings.sisuGoals.length === 0)) {
            setShowGoalSetter(true);
        } else if (!storedUser.hasSeenOnboarding) {
            setShowTour(true);
        }
    }
    setSettings(storedSettings);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (currentView === 'essay' && !text && !selectedImage && !result && !loading && inputMode === 'text' && user && !user.hasSeenEssayDemo) {
        setShowEssayDemo(true);
    } else {
        setShowEssayDemo(false);
    }
  }, [currentView, text, selectedImage, result, loading, inputMode, user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAppClasses = () => {
      let classes = "min-h-screen transition-all duration-300 flex flex-col ";
      if (settings.fontStyle === 'serif') classes += "font-serif ";
      else if (settings.fontStyle === 'mono') classes += "font-mono ";
      else classes += "font-sans ";
      if (settings.fontSize === 'small') classes += "text-sm ";
      else if (settings.fontSize === 'large') classes += "text-lg ";
      else classes += "text-base ";
      if (settings.theme === 'dark') classes += "bg-slate-950 text-slate-200 selection:bg-indigo-500 selection:text-white ";
      else classes += "bg-slate-50 text-slate-900 ";
      return classes;
  };

  const handleLogin = (newUser: User) => {
    // --- ADMIN CHECK LOGIC ---
    if (newUser.email === 'admin@estude.ia') {
        const adminUser = { ...newUser, isAdmin: true, planType: 'PREMIUM' as PlanType, name: 'Administrador' };
        setUser(adminUser);
        saveUserSession(adminUser);
        setCurrentView('admin');
        return;
    }
    
    setUser(newUser);
    saveUserSession(newUser);
    if (!newUser.hasSeenOnboardingGoalSetter && (!settings.sisuGoals || settings.sisuGoals.length === 0)) {
        setShowGoalSetter(true);
    } else if (newUser.planType === 'FREE') {
        setShowPlanSelection(true);
    } else if (!newUser.hasSeenOnboarding) {
        setShowTour(true);
    }
  };

  const handlePlanSelect = (plan: PlanType) => {
      setUserPlan(plan);
      const updatedUser = getUserSession();
      if(updatedUser) setUser(updatedUser);
      setShowPlanSelection(false);
      if (updatedUser && !updatedUser.hasSeenOnboardingGoalSetter && (!settings.sisuGoals || settings.sisuGoals.length === 0)) {
          setShowGoalSetter(true);
      } else if (updatedUser && !updatedUser.hasSeenOnboarding) {
          setShowTour(true);
      }
  };

  const handleCompleteGoalSetting = (updatedSettings: UserSettings) => {
      setSettings(updatedSettings);
      if (user) {
          const updatedUser = { ...user, hasSeenOnboardingGoalSetter: true };
          saveUserSession(updatedUser);
          setUser(updatedUser);
          setShowGoalSetter(false);
          if (updatedUser.planType === 'FREE') setShowPlanSelection(true);
          else if (!updatedUser.hasSeenOnboarding) setShowTour(true);
      }
  };

  const handleLogout = () => {
    clearUserSession();
    setUser(null);
    setCurrentView('user_area');
    setShowPlanSelection(false);
    setShowGoalSetter(false);
  };

  const handleUpdateUser = (updatedUser: User) => setUser(updatedUser);

  const handleCloseTour = () => {
      setShowTour(false);
      if (user) {
          const updated = { ...user, hasSeenOnboarding: true };
          setUser(updated);
          saveUserSession(updated);
      }
  };

  const handleUpgradeClick = () => setShowPlanSelection(true);

  const handleDismissEssayDemo = () => {
      if (user) {
          const updatedUser = { ...user, hasSeenEssayDemo: true };
          saveUserSession(updatedUser);
          setUser(updatedUser);
          setShowEssayDemo(false);
      }
  };

  const navigateToResumeExam = (id: string) => {
      const exam = getExamById(id);
      if (exam) {
          if (exam.config.mode === 'essay_only') {
              setCurrentExamId(exam.id);
              setText(exam.state.userEssayText || '');
              setEssayTheme(exam.state.essayTheme);
              setSelectedImage(exam.state.essayImage || null);
              setActiveFilter(exam.state.activeFilter || 'none');
              setCurrentView('essay');
          } else {
              setResumeExamId(id);
              setCurrentView('simulado');
          }
      }
  };
  
  const handleChangeView = (view: string) => {
      setCurrentView(view as AppView);
      setLimitError(null);
      if (view !== 'essay') handleReset();
  };

  const handleBackToDashboard = () => {
      setCurrentView('user_area');
      setResumeExamId(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (error) setError(null);
    if (showEssayDemo) setShowEssayDemo(false);
  };

  const optimizeImage = async (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        let width = img.width;
        let height = img.height;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', OPTIMIZED_JPEG_QUALITY));
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const startCamera = async () => {
    try {
      setInputMode('camera');
      setIsCameraActive(true);
      setShowEssayDemo(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      setInputMode('text');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawImageBase64 = canvas.toDataURL('image/jpeg', 1.0);
        const optimizedImageBase64 = await optimizeImage(rawImageBase64);
        setSelectedImage(optimizedImageBase64);
        stopCamera();
        setInputMode('editor');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setShowEssayDemo(false);
    
    // Robust file type checking
    const isTextFile = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
    const isImageFile = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    const isPdfFile = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isDocFile = file.type === 'application/msword' || file.name.endsWith('.doc');
    const isDocxFile = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');

    const reader = new FileReader();
    reader.onloadend = async (ev) => {
        if (!ev.target?.result) return;
        const fileContent = ev.target.result as string;
        
        if (isTextFile) {
            setText(fileContent);
            setSelectedImage(null);
            setInputMode('text');
        } else if (isImageFile) {
            const optimizedImageBase64 = await optimizeImage(fileContent);
            setSelectedImage(optimizedImageBase64);
            setInputMode('editor');
        } else if (isPdfFile || isDocFile || isDocxFile) {
            setSelectedImage(fileContent); 
            setText(''); 
            setInputMode('text');
            setError(`"${file.name}" anexado. A IA processará o texto diretamente do documento.`);
        } else {
            // Fallback for other types - treat as attachment
            setSelectedImage(fileContent);
            setText(''); 
            setInputMode('text'); 
            setError(`Arquivo "${file.name}" anexado. A IA tentará processá-lo.`);
        }
        
        // Reset input to allow re-uploading the same file if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.onerror = () => {
        setError("Erro ao ler o arquivo.");
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (isTextFile) {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }
  };

  const applyFilterAndGetImage = async (): Promise<ImageData | null> => {
     if (!selectedImage) return null;
     const match = selectedImage.match(/^data:(.*);base64,/);
     const mimeType = match ? match[1] : '';
     const base64Content = selectedImage.split(',')[1];
     
     // Only apply canvas filtering to images
     if (!mimeType.startsWith('image/')) return { base64: base64Content, mimeType };

     return new Promise((resolve) => {
        const img = new Image();
        img.src = selectedImage!;
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
            const processedBase64 = canvas.toDataURL('image/jpeg', OPTIMIZED_JPEG_QUALITY);
            resolve({ base64: processedBase64.split(',')[1], mimeType: 'image/jpeg' });
        };
        img.onerror = () => resolve(null);
     });
  };

  const handleExtractText = async () => {
    setIsTranscribing(true);
    setError(null);
    try {
        const imageData = await applyFilterAndGetImage();
        if (!imageData) throw new Error("Erro ao processar imagem.");
        const transcribedText = await transcribeImage(imageData);
        setText(transcribedText);
        setInputMode('text');
        setSelectedImage(null);
        setActiveFilter('none');
    } catch (err: any) {
        setError(err.message || "Erro ao ler o texto da imagem.");
    } finally {
        setIsTranscribing(false);
    }
  };

  const handleGenerateTheme = async () => {
      setLoading(true);
      setError(null);
      setShowEssayDemo(false);
      try {
          const newTheme = await generateEssayTheme();
          setEssayTheme(newTheme);
      } catch (err) {
          setError("Erro ao gerar tema. Tente novamente.");
      } finally {
          setLoading(false);
      }
  };

  const handleCorrection = useCallback(async () => {
    const limitCheck = checkUsageLimit('essay');
    if (!limitCheck.allowed) {
        setLimitError(limitCheck.message || "Limite atingido.");
        return;
    }
    const hasAttachment = !!selectedImage;
    const hasText = text.trim().length >= 10;
    if (!hasText && !hasAttachment) {
      setError("Por favor, digite sua redação ou anexe um arquivo.");
      return;
    }
    setLoading(true);
    setError(null);
    setLimitError(null);
    try {
      let imageData: ImageData | undefined = undefined;
      if (selectedImage) imageData = (await applyFilterAndGetImage()) || undefined; 
      const data = await gradeEssay(text, imageData, essayTheme);
      incrementUsage('essay');
      const updated = getUserSession();
      if(updated) setUser(updated);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [text, selectedImage, activeFilter, essayTheme]); 

  const handleSaveEssay = () => {
    if (result) saveStandaloneEssay(text, result);
  };

  const handleSaveDraft = () => {
      const config = { mode: 'essay_only', targetCourses: [], areas: ['Redação'], durationMinutes: 60, totalQuestions: 0 };
      const state = { questions: [], essayTheme, userAnswers: {}, userEssayText: text, timeRemaining: 0, isFinished: false, loadingProgress: 0, essayImage: selectedImage, activeFilter: activeFilter, lastEssayImageData: null };
      saveExamProgress(currentExamId, config as any, state, 'in_progress');
      handleBackToDashboard();
  };

  const handleCancelEssay = () => {
      if(text.length > 20 && !confirm("Descartar rascunho? O progresso não será salvo no histórico.")) return;
      handleReset();
      if (user && !user.hasSeenEssayDemo) setShowEssayDemo(true);
  };

  const handleReset = () => {
    setResult(null);
    setText('');
    setSelectedImage(null);
    setInputMode('text');
    setActiveFilter('none');
    setEssayTheme(null);
    setError(null);
    setLimitError(null);
    setCurrentExamId(null);
  };

  const getFilterClass = () => {
    switch(activeFilter) {
      case 'grayscale': return 'grayscale contrast-125';
      case 'contrast': return 'contrast-150 grayscale brightness-90'; 
      default: return '';
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><LoadingSpinner/></div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;
  
  // Admin Route
  if (currentView === 'admin' && user.isAdmin) {
      return <AdminDashboard onLogout={handleLogout} onBackToApp={() => setCurrentView('user_area')} />;
  }

  if (showGoalSetter) return <OnboardingGoalSetter user={user} onComplete={handleCompleteGoalSetting} onUpdateSettings={setSettings} />;
  if (showPlanSelection) return <PlanSelection onSelectPlan={handlePlanSelect} />;

  return (
    <div className={getAppClasses()}>
      {showTour && <OnboardingTour user={user} onClose={handleCloseTour} onNavigate={(view) => setCurrentView(view as AppView)} />}
      <canvas ref={canvasRef} className="hidden" />
      
      <nav className={`sticky top-0 z-30 transition-all duration-300 ${scrolled ? (settings.theme === 'dark' ? 'bg-slate-900/90 shadow-lg border-b border-slate-800 backdrop-blur' : 'bg-white/95 shadow-lg border-b border-slate-200 backdrop-blur') : (settings.theme === 'dark' ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200')}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo variant={settings.theme === 'dark' ? 'dark' : 'light'} onClick={() => setCurrentView('user_area')} />
          <div className="flex items-center gap-4">
             <div className={`flex gap-1 p-1 rounded-lg overflow-x-auto no-scrollbar ${settings.theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100'}`}>
                {['user_area', 'simulado', 'schedule', 'essay'].map((view) => (
                    <button key={view} id={`nav-${view}`} onClick={() => setCurrentView(view as AppView)} className={`flex-shrink-0 px-4 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap capitalize ${currentView === view ? (settings.theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : (settings.theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                        {view === 'user_area' ? 'Dashboard' : view === 'schedule' ? 'Cronograma' : view === 'essay' ? 'Redação' : view}
                    </button>
                ))}
             </div>
             <div className={`flex items-center gap-3 pl-4 border-l ${settings.theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                {/* Admin Button Here */}
                {user.isAdmin && (
                    <button 
                        onClick={() => setCurrentView('admin')}
                        className={`p-2 rounded-full transition-colors ${settings.theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`} 
                        title="Painel Admin"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><path d="m9 16 3-3 3 3"/></svg>
                    </button>
                )}
                {user.planType !== 'PREMIUM' && (
                    <button onClick={handleUpgradeClick} className="hidden md:block bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:shadow-lg transition-all animate-pulse">
                        {user.planType === 'FREE' ? 'SEJA PREMIUM' : 'UPGRADE'}
                    </button>
                )}
                <button onClick={() => setCurrentView('settings')} className={`p-2 rounded-full transition-colors ${settings.theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`} title="Configurações">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                </button>
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`} className={`w-9 h-9 rounded-full border ${settings.theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} alt="User" loading="lazy" />
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full pt-8">
        {currentView === 'schedule' ? (
            <ScheduleGenerator onNavigate={(view) => setCurrentView(view as AppView)} onBack={handleBackToDashboard} />
        ) : currentView === 'simulado' ? (
            <SimuladoGenerator resumeExamId={resumeExamId} onBack={handleBackToDashboard} />
        ) : currentView === 'user_area' ? (
            <UserDashboard onResumeExam={navigateToResumeExam} onChangeView={handleChangeView} onLogout={handleLogout} />
        ) : currentView === 'settings' ? (
            <SettingsPage onUpdateUser={handleUpdateUser} onUpdateSettings={setSettings} onBack={handleBackToDashboard} onResumeExam={navigateToResumeExam} />
        ) : (
            <>
                <button onClick={handleCancelEssay} className={`mb-6 flex items-center gap-2 transition-colors text-sm font-bold group ${settings.theme === 'dark' ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>
                    <div className={`p-1 rounded-full transition-colors ${settings.theme === 'dark' ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-100 group-hover:bg-indigo-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    </div>
                    Voltar / Cancelar
                </button>

                {!result && !loading && inputMode !== 'camera' && inputMode !== 'editor' && !showEssayDemo && (
                <div className="text-center mb-8 space-y-3">
                    <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${settings.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Corretor de Redação</h1>
                    <p className={`text-lg max-w-2xl mx-auto ${settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Correção instantânea de manuscritos e documentos com Inteligência Artificial.</p>
                </div>
                )}
                
                {showEssayDemo && <EssayCorrectionDemo onDismiss={handleDismissEssayDemo} />}

                {inputMode === 'camera' && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-10 flex gap-8 items-center">
                    <button onClick={() => { stopCamera(); setInputMode('text'); }} className="p-4 rounded-full bg-white/20 text-white backdrop-blur-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 shadow-2xl ring-4 ring-white/30"></button>
                    </div>
                </div>
                )}

                {inputMode === 'editor' && selectedImage && isImageFile && (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-3xl mx-auto">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Editor de Imagem</h3>
                    <button onClick={() => { setInputMode('text'); setSelectedImage(null); }} className="text-red-500 text-sm font-semibold hover:bg-red-50 px-2 py-1 rounded">Descartar</button>
                    </div>
                    <div className="p-6 bg-slate-100 flex justify-center overflow-auto max-h-[50vh] relative">
                    <img src={selectedImage} className={`max-w-full shadow-lg transition-all duration-300 ${getFilterClass()}`} alt="Captured Essay" loading="lazy" />
                    {isTranscribing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                            <p className="text-indigo-800 font-bold animate-pulse">Lendo manuscrito...</p>
                        </div>
                    )}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex justify-center gap-2 mb-6">
                        {['none', 'grayscale', 'contrast'].map((f) => (
                        <button key={f} onClick={() => setActiveFilter(f as ImageFilter)} disabled={isTranscribing} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
                )}

                {!result && !loading && inputMode === 'text' && !showEssayDemo && (
                <div className="space-y-4">
                    {limitError && (
                        <div className="bg-fuchsia-50 border-l-4 border-fuchsia-500 p-6 rounded-r-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                            <div><h3 className="text-fuchsia-800 font-bold text-lg">Limite Atingido 🛑</h3><p className="text-fuchsia-700 text-sm">{limitError}</p></div>
                            <button onClick={handleUpgradeClick} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold px-6 py-2 rounded-lg shadow whitespace-nowrap">Fazer Upgrade Agora</button>
                        </div>
                    )}
                    <div className={`border-l-4 border-blue-400 p-4 rounded-r-lg ${settings.theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                        <div className="flex">
                            <div className="flex-shrink-0"><svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg></div>
                            <div className="ml-3"><p className={`text-sm ${settings.theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}><span className="font-bold">Dica:</span> Use o botão de upload para enviar fotos, PDFs ou arquivos de texto. A IA analisará o conteúdo automaticamente.</p></div>
                        </div>
                    </div>
                    <div className={`rounded-2xl shadow-xl border overflow-hidden transition-all hover:shadow-2xl duration-300 ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-700 shadow-slate-900/50' : 'bg-white border-slate-200'}`}>
                    <div className={`px-6 py-4 border-b flex flex-wrap gap-4 items-center justify-between ${settings.theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Upload</button>
                            <button onClick={startCamera} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-8.9l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Escanear</button>
                            <button onClick={handleGenerateTheme} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors whitespace-nowrap bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>Gerar Tema</button>
                        </div>
                        <span className={`text-xs font-mono font-medium ${text.length > 3000 ? 'text-red-500' : 'text-slate-500'}`}>{text.length} caracteres</span>
                    </div>
                    {essayTheme && (
                        <div className="p-6 bg-amber-50 border-b border-amber-100 relative animate-fade-in">
                            <button onClick={() => setEssayTheme(null)} className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 font-bold">X</button>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Tema Gerado pela IA</p>
                            <h2 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{essayTheme.titulo}</h2>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                {essayTheme.textos_motivadores.map((t, i) => <p key={i} className="text-xs text-slate-600 italic bg-white/50 p-2 rounded border border-amber-100/50">{t}</p>)}
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>A correção considerará este tema.
                            </div>
                        </div>
                    )}
                    {selectedImage && (
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4 animate-fade-in">
                            <div className="relative group flex-shrink-0">
                                {isImageFile ? (
                                    <img src={selectedImage} alt="Attached" className={`w-24 h-24 object-cover rounded-lg border border-slate-300 ${getFilterClass()}`} loading="lazy" />
                                ) : (
                                    <div className="w-24 h-24 flex flex-col items-center justify-center bg-slate-200 rounded-lg border border-slate-300 text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg><span className="text-[10px] font-bold uppercase">Arquivo</span></div>
                                )}
                                <button onClick={() => { setSelectedImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600" title="Remover arquivo"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div><p className="text-sm font-bold text-slate-700">Arquivo Anexado</p><p className="text-xs text-slate-500 mt-1 leading-relaxed">{isImageFile ? "Imagem pronta para análise. Você pode editar o texto abaixo se necessário." : "Este arquivo será enviado para a IA analisar junto com suas instruções."}</p></div>
                                    {isImageFile && (<button onClick={() => setInputMode('editor')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200 px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors">Editar / Extrair Texto</button>)}
                                </div>
                            </div>
                        </div>
                    )}
                    <textarea className={`w-full h-[40vh] p-6 text-lg leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 border-none ${settings.theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-900'}`} placeholder="Digite sua redação aqui..." value={text} onChange={handleTextChange} spellCheck={false} />
                    <div className={`p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        {error && ( <div className="text-red-600 text-sm font-medium flex items-center gap-2 animate-pulse bg-red-50 px-3 py-1 rounded-md border border-red-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>{error}</div> )}
                        <div className="flex-grow flex justify-end gap-3">
                            <button onClick={handleSaveDraft} disabled={text.trim().length < 10 && !selectedImage} className={`px-6 py-3 rounded-xl font-bold border-2 transition-all text-sm disabled:opacity-50 ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>Salvar Rascunho</button>
                            <button onClick={handleCorrection} disabled={text.trim().length < 10 && !selectedImage} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${(text.trim().length < 10 && !selectedImage) ? 'bg-slate-500 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/30'}`}>Corrigir Redação</button>
                        </div>
                    </div>
                    </div>
                </div>
                )}
                {loading && ( <div className="min-h-[50vh] flex items-center justify-center"><LoadingSpinner /></div> )}
                {result && ( <ResultCard result={result} onReset={handleReset} onSave={handleSaveEssay} /> )}
            </>
        )}
      </main>
      <footer className="mt-auto py-6 text-center text-slate-400 text-sm"><p>&copy; {new Date().getFullYear()} ESTUDE.IA - Powered by Gemini</p></footer>
    </div>
  );
};

export default App;

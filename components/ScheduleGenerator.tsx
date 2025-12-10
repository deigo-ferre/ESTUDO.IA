import React, { useState, useEffect } from 'react';
import { generateStudySchedule } from '../services/geminiService';
import { saveSchedule, getSchedules, toggleScheduleTask, getSettings, getUserSession, checkUsageLimit, incrementUsage, upgradeUser } from '../services/storageService';
import { StudyProfile, StudyScheduleResult, DailySchedule, EnemScores, SavedSchedule, User, TopicDetail } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ScheduleGeneratorProps {
    onNavigate?: (view: string) => void;
    onBack?: () => void;
}

const SUBJECTS = ["Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Filosofia/Sociologia", "Português/Literatura", "Língua Estrangeira", "Redação"];

const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({ onNavigate, onBack }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'scores'>('manual');
  // FIX: Removed 'name' property which caused TS error as it's not in StudyProfile type
  const [profile, setProfile] = useState<StudyProfile>({ course: '', hoursPerDay: '4 horas', difficulties: '' });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [scores, setScores] = useState<EnemScores>({ linguagens: 0, humanas: 0, natureza: 0, matematica: 0, redacao: 0 });
  const [activeSchedule, setActiveSchedule] = useState<SavedSchedule | null>(null);
  const [history, setHistory] = useState<SavedSchedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  // Add currentUser state to make the user object available in the component's scope
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Theme Logic
  const settings = getSettings();
  const isDark = settings.theme === 'dark';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  // Input class now explicitly white background and dark text
  const inputClass = 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400';

  useEffect(() => {
      // Initialize currentUser state
      setCurrentUser(getUserSession());

      setProfile(prev => ({ ...prev, course: settings.targetCourse || 'Curso Geral' }));
      const allSchedules = getSchedules();
      const current = allSchedules.find(s => !s.archived);
      const past = allSchedules.filter(s => s.archived);
      if (current) setActiveSchedule(current);
      setHistory(past);
  }, []);

  // AUTO-COMPLETE TASKS ON MOUNT (Check if user did exam/essay today)
  useEffect(() => {
      // Use currentUser from state for checks
      if (!activeSchedule || !currentUser) return;

      const today = new Date().toDateString();
      const lastExamDate = currentUser.usage.lastExamDate ? new Date(currentUser.usage.lastExamDate).toDateString() : null;
      const lastEssayDate = currentUser.usage.lastEssayDate ? new Date(currentUser.usage.lastEssayDate).toDateString() : null;
      const lastScheduleDate = currentUser.usage.lastScheduleDate ? new Date(currentUser.usage.lastScheduleDate).toDateString() : null; // Added for completeness

      const currentDayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
      const currentDayIndex = activeSchedule.result.semana.findIndex((d: DailySchedule) => d.dia.toLowerCase() === currentDayName.toLowerCase());
      
      let changed = false;
      let newCompleted = [...(activeSchedule.completedItems || [])];

      if (currentDayIndex !== -1) {
          const currentDayTasks = activeSchedule.result.semana[currentDayIndex].materias;
          
          currentDayTasks.forEach((m: string | TopicDetail, mIdx: number) => {
              const name = typeof m === 'string' ? m : m.name;
              const taskId = `${currentDayIndex}-${mIdx}`;
              
              if (name.toLowerCase().includes('simulado')) {
                  if (lastExamDate === today && !newCompleted.includes(taskId)) {
                      newCompleted.push(taskId);
                      toggleScheduleTask(activeSchedule.id, taskId); // Persist
                      changed = true;
                  }
              }

              if (name.toLowerCase().includes('redação')) {
                  if (lastEssayDate === today && !newCompleted.includes(taskId)) {
                      newCompleted.push(taskId);
                      toggleScheduleTask(activeSchedule.id, taskId); // Persist
                      changed = true;
                  }
              }
          });
      }

      if (changed) {
          setActiveSchedule(prev => prev ? { ...prev, completedItems: newCompleted } : null);
      }

  }, [activeSchedule?.id, currentUser?.usage.lastExamDate, currentUser?.usage.lastEssayDate, currentUser?.usage.lastScheduleDate]);


  const toggleSubject = (subject: string) => setSelectedSubjects((prev: string[]) => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  const handleSelectAll = () => setSelectedSubjects(selectedSubjects.length === SUBJECTS.length ? [] : [...SUBJECTS]);
  const handleScoreChange = (field: keyof EnemScores, value: string) => { const num = parseInt(value) || 0; if (num <= 1000) setScores((prev: EnemScores) => ({ ...prev, [field]: num })); };
  const handleStartNew = () => { if (activeSchedule) { setProfile(activeSchedule.profile); if (activeSchedule.profile.scores) { setScores(activeSchedule.profile.scores); setActiveTab('scores'); } else if (activeSchedule.profile.difficulties) { setSelectedSubjects(activeSchedule.profile.difficulties.split(', ').filter(Boolean)); setActiveTab('manual'); } } setActiveSchedule(null); setError(null); setLimitError(null); };
  
    const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'manual' && selectedSubjects.length === 0) { setError("Selecione pelo menos uma matéria."); return; }
    if (activeTab === 'scores' && Object.values(scores).some(v => v === 0)) { setError("Por favor, preencha todas as notas."); return; }
    
    const user = getUserSession();
    if (!user) { setError('Usuário não autenticado.'); return; }

    const limit = checkUsageLimit(user, 'schedule');
    if (!limit.allowed) { setLimitError(limit.message || "Limite atingido."); return; }

    setIsGenerating(true);
    setError(null);
    try {
      const profilePayload: StudyProfile = { ...profile, difficulties: activeTab === 'manual' ? selectedSubjects.join(', ') : '', scores: activeTab === 'scores' ? scores : undefined };
      const result = await generateStudySchedule(profilePayload);
    const saved = saveSchedule(profilePayload, result);
    incrementUsage(user, 'schedule');
      setActiveSchedule(saved);
      const allSchedules = getSchedules();
      setHistory(allSchedules.filter((s: SavedSchedule) => s.archived));
    } catch (err: any) { setError(err.message); } finally { setIsGenerating(false); }
  };

  const handleRegenerate = async () => {
      if (!activeSchedule) return;
    const user = getUserSession();
    if (!user) { setError('Usuário não autenticado.'); return; }
    const limit = checkUsageLimit(user, 'schedule');
    if (!limit.allowed) { setLimitError(limit.message || "Limite atingido."); return; }
      if (!window.confirm("A IA criará uma nova versão. Continuar?")) return;
      setIsGenerating(true); setError(null);
      try {
          const result = await generateStudySchedule(activeSchedule.profile);
          const saved = saveSchedule(activeSchedule.profile, result);
          incrementUsage(user, 'schedule');
          setActiveSchedule(saved);
      } catch (err: any) { setError(err.message); } finally { setIsGenerating(false); }
  };

  const handleToggleTask = (dayIndex: number, subjectIndex: number) => {
      if (!activeSchedule) return;
      const taskId = `${dayIndex}-${subjectIndex}`;
      toggleScheduleTask(activeSchedule.id, taskId);
      const isCompleted = activeSchedule.completedItems?.includes(taskId);
      let newCompleted = activeSchedule.completedItems || [];
      if (isCompleted) newCompleted = newCompleted.filter((id: string) => id !== taskId); else newCompleted = [...newCompleted, taskId];
      setActiveSchedule({ ...activeSchedule, completedItems: newCompleted });
  };

  const calculateProgress = (schedule: SavedSchedule) => {
      let total = 0; schedule.result.semana.forEach((d: DailySchedule) => total += d.materias.length);
      const completed = schedule.completedItems?.length || 0;
      return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  if (isGenerating) return <div className="flex flex-col items-center justify-center min-h-[50vh]"><LoadingSpinner /><p className={`mt-4 font-medium animate-pulse ${textSub}`}>Gerando estratégia...</p></div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-12">
      {onBack && <button onClick={onBack} className={`mb-6 flex items-center gap-2 font-bold text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Voltar ao Dashboard</button>}

      {!activeSchedule ? (
        <div className={`max-w-xl mx-auto rounded-2xl shadow-xl border p-8 ${cardClass}`}>
          <div className="text-center mb-8">
            <h2 className={`text-2xl font-bold ${textTitle}`}>Novo Cronograma</h2>
            <p className={`mt-1 ${textSub}`}>Foco na aprovação em <strong className="text-indigo-600">{profile.course || 'seu curso'}</strong>.</p>
          </div>

          {limitError && <div className="bg-fuchsia-50 border-l-4 border-fuchsia-500 p-6 rounded-r-xl shadow-md mb-8"><p className="text-fuchsia-800 font-bold text-center">{limitError}</p><button onClick={() => { const u = getUserSession(); if (u) upgradeUser(u, 'PREMIUM'); }} className="mt-2 w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold px-4 py-2 rounded-lg">Fazer Upgrade</button></div>}

          <div className={`flex p-1 rounded-xl mb-8 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button type="button" onClick={() => { setActiveTab('manual'); setError(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'manual' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-indigo-600 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>Seleção Manual</button>
            <button type="button" onClick={() => { setActiveTab('scores'); setError(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'scores' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-indigo-600 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>Minhas Notas</button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Tempo disponível por dia</label>
              <select className={`w-full px-4 py-3 rounded-xl border appearance-none cursor-pointer outline-none ${inputClass}`} value={profile.hoursPerDay} onChange={(e) => setProfile({...profile, hoursPerDay: e.target.value})}>
                  <option value="2 horas">2 horas (Leve)</option>
                  <option value="4 horas">4 horas (Moderado)</option>
                  <option value="6 horas">6 horas (Intenso)</option>
                  <option value="8 horas+">8 horas+ (Hardcore)</option>
              </select>
            </div>

            {activeTab === 'manual' ? (
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Suas maiores dificuldades</label>
                    <button type="button" onClick={handleSelectAll} className="text-xs font-bold text-indigo-500 hover:underline">{selectedSubjects.length === SUBJECTS.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SUBJECTS.map((subject) => (
                        <button key={subject} type="button" onClick={() => toggleSubject(subject)} className={`py-2.5 px-2 rounded-lg text-sm font-semibold border transition-all ${selectedSubjects.includes(subject) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')}`}>{subject}</button>
                    ))}
                  </div>
                </div>
            ) : (
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="space-y-3">
                        {['linguagens', 'humanas', 'natureza', 'matematica', 'redacao'].map((field) => (
                             <div key={field} className="flex items-center justify-between">
                                <label className={`text-sm font-medium capitalize ${textSub}`}>{field}</label>
                                <input type="number" placeholder="0" className={`w-24 px-3 py-2 rounded-lg border text-center outline-none ${inputClass}`} value={scores[field as keyof EnemScores] || ''} onChange={(e) => handleScoreChange(field as keyof EnemScores, e.target.value)} />
                             </div>
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm text-center font-medium rounded-lg">{error}</div>}
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all">Gerar Plano Personalizado</button>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
            <div className={`flex flex-col md:flex-row justify-between items-center gap-4 p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-indigo-900/20 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Semana Atual</span>
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>Plano de Estudos</h2>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Foco em <span className="font-bold">{activeSchedule.profile.course}</span></p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right mr-2 hidden sm:block">
                        <span className="text-xs font-bold text-indigo-400 uppercase">Progresso</span>
                        <div className={`text-xl font-black leading-none ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>{calculateProgress(activeSchedule)}%</div>
                    </div>
                    <button onClick={handleRegenerate} className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg></button>
                    <button onClick={handleStartNew} className="px-5 py-2.5 text-white font-bold hover:bg-indigo-700 rounded-xl bg-indigo-600 shadow-md transition-all flex items-center gap-2">Editar / Novo</button>
                </div>
            </div>

            {activeSchedule.result.diagnostico && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-xl shadow-sm flex items-start gap-4">
                    <div className="mt-1 text-amber-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-800 text-sm uppercase mb-1">Diagnóstico Inicial</h4>
                        <p className="text-amber-700 text-sm leading-relaxed">{activeSchedule.result.diagnostico}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSchedule.result.semana.map((day: DailySchedule, dIdx: number) => (
                    <div key={dIdx} className={`rounded-xl shadow-sm border overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow ${cardClass}`}>
                        <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 ' + (day.dia.toLowerCase().includes('domingo') ? 'bg-red-50' : 'bg-slate-50')}`}>
                            <h3 className={`font-bold capitalize ${textTitle}`}>{day.dia}</h3>
                            <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-400'}`}>{day.foco}</span>
                        </div>
                        <div className="p-4 space-y-3 flex-grow">
                             {day.materias.map((subject: string | TopicDetail, sIdx: number) => {
                                 const subjectName = typeof subject === 'string' ? subject : subject.name;
                                 const subjectSnippet = typeof subject === 'object' ? subject.snippet : null;
                                 const taskId = `${dIdx}-${sIdx}`;
                                 const isDone = activeSchedule.completedItems?.includes(taskId);
                                 return (
                                     <div key={sIdx} className={`group p-3 rounded-lg border transition-all ${isDone ? (isDark ? 'bg-green-900/20 border-green-900/30 opacity-75' : 'bg-green-50 border-green-200 opacity-75') : (isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-200')}`}>
                                         <div className="flex items-start gap-3">
                                             <button onClick={() => handleToggleTask(dIdx, sIdx)} className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : (isDark ? 'bg-slate-700 border-slate-600 hover:border-indigo-400' : 'bg-white border-slate-300 hover:border-indigo-400')}`}>
                                                 {isDone && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                             </button>
                                             <div>
                                                 <p className={`text-sm font-medium transition-colors ${isDone ? 'text-green-600 line-through' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>{subjectName}</p>
                                                 {subjectSnippet && !isDone && <p className={`text-xs mt-1 leading-relaxed border-l-2 pl-2 ${isDark ? 'text-slate-500 border-indigo-900' : 'text-slate-500 border-indigo-100'}`}>{subjectSnippet}</p>}
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Dicas de Ouro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSchedule.result.dicas_personalizadas.map((tip: string, idx: number) => (
                        <div key={idx} className="flex gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-200 text-yellow-800 font-bold flex items-center justify-center text-sm">{idx + 1}</span>
                            <p className="text-slate-700 text-sm leading-relaxed">{tip}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
      
      {/* --- HISTORY SECTION --- */}
      {history.length > 0 && !activeSchedule && (
          <div className="mt-16 pt-12 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Histórico de Cronogramas</h3>
              <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
                  {history.map((h) => (
                      <div key={h.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                              <p className="font-bold text-slate-700">{h.profile.course}</p>
                              <p className="text-xs text-slate-500">Gerado em {new Date(h.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                              <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                                  {calculateProgress(h)}% Concluído
                              </span>
                              <button onClick={() => { setActiveSchedule({...h, archived: false}); window.scrollTo(0,0); }} className="text-xs font-bold text-indigo-600 hover:underline">
                                  Restaurar
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
};

export default ScheduleGenerator;
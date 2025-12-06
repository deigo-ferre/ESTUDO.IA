import React, { useState, useEffect } from 'react';
import { User, UserSettings, SisuGoal, SavedReport, SavedExam } from '../types';
import { getSettings, saveSettings, getUserSession, saveUserSession, getReports, deleteReport, getExams, deleteExam } from '../services/storageService';
import { estimateSisuCutoff } from '../services/geminiService';
import WeeklyReportModal from './WeeklyReportModal';

interface SettingsPageProps {
  onUpdateUser: (user: User) => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onBack: () => void;
  onResumeExam?: (id: string) => void; 
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onUpdateUser, onUpdateSettings, onBack, onResumeExam }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'sisu' | 'history' | 'reports' | 'theme' | 'system'>('profile');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'simulados' | 'redacoes'>('simulados');
  
  const [user, setUser] = useState<User | null>(getUserSession());
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const isDark = settings.theme === 'dark';
  
  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // SISU Goal States
  const [courseInput1, setCourseInput1] = useState('');
  const [courseInput2, setCourseInput2] = useState('');
  const [courseInput3, setCourseInput3] = useState('');
  const [isSearchingSisu, setIsSearchingSisu] = useState(false);
  const [pendingGoals, setPendingGoals] = useState<SisuGoal[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Data States
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const [exams, setExams] = useState<SavedExam[]>([]);

  useEffect(() => {
    if (user) {
        setName(user.name);
        setEmail(user.email);
        setPhone(user.phone || '');
    }
    const currentSettings = getSettings();
    setSettings(currentSettings);
    
    if (currentSettings.sisuGoals && currentSettings.sisuGoals.length > 0) {
        setCourseInput1(currentSettings.sisuGoals[0]?.course || '');
        setCourseInput2(currentSettings.sisuGoals[1]?.course || '');
        setCourseInput3(currentSettings.sisuGoals[2]?.course || '');
    }

    setReports(getReports());
    setExams(getExams());
  }, [user]);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedUser = { ...user, name, email, phone };
    saveUserSession(updatedUser);
    onUpdateUser(updatedUser);
    alert("Perfil atualizado com sucesso!");
  };

  const handlePhotoUpload = () => {
     const fileInput = document.createElement('input');
     fileInput.type = 'file';
     fileInput.accept = 'image/*';
     fileInput.onchange = (e) => {
         const file = (e.target as HTMLInputElement).files?.[0];
         if (file) {
             const reader = new FileReader();
             reader.onloadend = () => {
                 if (user && reader.result) {
                     const updatedUser = { ...user, avatar: reader.result as string };
                     saveUserSession(updatedUser);
                     onUpdateUser(updatedUser);
                     setUser(updatedUser);
                 }
             };
             reader.readAsDataURL(file);
         }
     };
     fileInput.click();
  };

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      saveSettings(newSettings);
      onUpdateSettings(newSettings);
  };

  // --- SISU LOGIC ---

  const handleSearchSisu = async () => {
      const courses = [courseInput1, courseInput2, courseInput3].filter(c => c.trim().length > 3);
      if (courses.length === 0) {
          alert("Digite pelo menos um curso válido.");
          return;
      }

      setIsSearchingSisu(true);
      setSaveSuccess(false);
      try {
          const results = await estimateSisuCutoff(courses);
          const goals: SisuGoal[] = results.map(r => ({
              course: r.curso,
              cutoff: r.nota_corte_media,
              lastUpdated: new Date().toLocaleDateString('pt-BR'),
              source: r.fontes?.[0]
          }));
          setPendingGoals(goals);
      } catch (error) {
          alert("Erro ao buscar dados do SISU. Tente novamente.");
      } finally {
          setIsSearchingSisu(false);
      }
  };

  const handleSaveSisuGoals = () => {
      const newSettings = { ...settings, sisuGoals: pendingGoals };
      setSettings(newSettings);
      saveSettings(newSettings);
      onUpdateSettings(newSettings);
      
      setSaveSuccess(true);
      setTimeout(() => {
          setPendingGoals([]); // Clear pending to "reset" the view
      }, 3000);
  };

  const handleDeleteReport = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("Tem certeza que deseja excluir este relatório permanentemente?")) {
          deleteReport(id);
          setReports(prev => prev.filter(r => r.id !== id));
      }
  };

  const handleDeleteExam = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("Tem certeza que deseja excluir este item do histórico?")) {
          deleteExam(id);
          setExams(prev => prev.filter(e => e.id !== id));
      }
  };

  const ChangePasswordModal = () => (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'} rounded-xl p-6 max-w-sm w-full shadow-2xl border`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Alterar Senha</h3>
              <div className="space-y-3">
                  <input type="password" placeholder="Senha Atual" className="w-full p-2 border rounded bg-white border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500" />
                  <input type="password" placeholder="Nova Senha" className="w-full p-2 border rounded bg-white border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500" />
                  <input type="password" placeholder="Confirmar Nova Senha" className="w-full p-2 border rounded bg-white border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowPasswordModal(false)} className={`flex-1 py-2 font-bold rounded ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancelar</button>
                  <button onClick={() => { setShowPasswordModal(false); alert("Senha alterada!"); }} className="flex-1 py-2 bg-indigo-600 font-bold text-white rounded hover:bg-indigo-700">Salvar</button>
              </div>
          </div>
      </div>
  );

  const renderExamList = (items: SavedExam[], type: 'simulado' | 'redacao') => {
      if (items.length === 0) {
          return (
              <div className={`text-center py-12 rounded-xl border border-dashed ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <p className="font-medium">Nenhum histórico encontrado.</p>
              </div>
          );
      }

      return (
          <div className="space-y-3">
              {items.map((item) => {
                  const isFinished = item.status === 'completed';
                  const date = new Date(item.updatedAt || item.createdAt).toLocaleDateString();
                  let title = "";
                  let subtitle = "";
                  
                  if (type === 'redacao') {
                      title = item.state.essayTheme?.titulo || "Redação sem tema (Livre)";
                      subtitle = isFinished ? `Nota: ${item.performance?.essayResult?.nota_total}` : "Rascunho salvo";
                  } else {
                      const modeMap: any = { 'day1': 'Dia 1 (Hum/Ling)', 'day2': 'Dia 2 (Nat/Mat)', 'area_training': 'Treino por Área', 'turbo_review': 'Revisão Turbo' };
                      title = modeMap[item.config.mode] || "Simulado Personalizado";
                      if (item.config.mode === 'area_training') title += ` - ${item.config.areas.join(', ')}`;
                      subtitle = isFinished ? `Acertos: ${item.performance?.correctCount || 0}/${item.config.totalQuestions}` : `Parou na questão ${Object.keys(item.state.userAnswers).length + 1}`;
                  }

                  return (
                      <div key={item.id} className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-xl p-4 flex justify-between items-center hover:shadow-md transition-shadow`}>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-2 h-2 rounded-full ${isFinished ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                  <span className="text-[10px] font-bold uppercase text-slate-400">{isFinished ? 'Concluído' : 'Em Andamento'}</span>
                                  <span className="text-[10px] text-slate-500">•</span>
                                  <span className="text-[10px] text-slate-500">{date}</span>
                              </div>
                              <h4 className={`font-bold text-sm md:text-base line-clamp-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
                              <p className={`text-xs font-bold mt-0.5 ${isFinished ? 'text-indigo-500' : 'text-amber-500'}`}>{subtitle}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                              {!isFinished && onResumeExam && (
                                  <button 
                                    onClick={() => onResumeExam(item.id)}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                  >
                                      Continuar
                                  </button>
                              )}
                              
                              <button 
                                onClick={(e) => handleDeleteExam(e, item.id)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                title="Excluir do Histórico"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400';
  const labelClass = isDark ? 'text-slate-400' : 'text-slate-700';

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      
      <button 
        onClick={onBack} 
        className={`mb-6 flex items-center gap-2 font-bold text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Voltar ao Dashboard
      </button>

      <h1 className={`text-3xl font-bold mb-8 ${textTitle}`}>Configurações</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
            <div className={`${cardClass} rounded-xl border overflow-hidden shadow-sm sticky top-24`}>
                {['profile', 'sisu', 'history', 'reports', 'theme', 'system'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)} 
                        className={`w-full text-left px-6 py-4 font-bold border-l-4 transition-colors flex items-center gap-3 capitalize ${activeTab === tab ? 'border-indigo-600 bg-indigo-500/10 text-indigo-500' : `border-transparent hover:bg-slate-800/50 ${isDark ? 'text-slate-400' : 'text-slate-600 hover:bg-slate-50'}`}`}
                    >
                       {tab === 'profile' && '👤 Perfil'}
                       {tab === 'sisu' && '🎓 Metas SISU'}
                       {tab === 'history' && '📜 Histórico'}
                       {tab === 'reports' && '📊 Relatórios'}
                       {tab === 'theme' && '🎨 Aparência'}
                       {tab === 'system' && '⚙️ Sistema'}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
            
            {activeTab === 'profile' && user && (
                <div className={`${cardClass} p-6 rounded-xl border shadow-sm space-y-8 animate-fade-in`}>
                    <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer" onClick={handlePhotoUpload}>
                            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className={`w-24 h-24 rounded-full border-4 object-cover ${isDark ? 'border-slate-800' : 'border-slate-100'}`} alt="User Avatar" loading="lazy" />
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </div>
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${textTitle}`}>{user.name}</h2>
                            <button onClick={handlePhotoUpload} className="text-sm text-indigo-500 font-bold hover:underline">Alterar Foto</button>
                        </div>
                    </div>

                    <form onSubmit={handleProfileSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-bold mb-1 ${labelClass}`}>Nome Completa</label>
                                <input type="text" className={`w-full px-4 py-2 rounded-lg border outline-none ${inputClass}`} placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-1 ${labelClass}`}>Email</label>
                                <input type="email" className={`w-full px-4 py-2 rounded-lg border outline-none ${inputClass}`} placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-bold mb-1 ${labelClass}`}>Telefone</label>
                            <input type="text" className={`w-full px-4 py-2 rounded-lg border outline-none ${inputClass}`} placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <button type="button" onClick={() => setShowPasswordModal(true)} className="text-sm font-bold text-indigo-600 hover:underline">Alterar Senha</button>
                        <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all">Salvar Alterações</button>
                    </form>
                </div>
            )}

            {activeTab === 'sisu' && (
                <div className={`${cardClass} p-6 rounded-xl border shadow-sm space-y-6 animate-fade-in`}>
                    <h2 className={`text-xl font-bold ${textTitle}`}>Suas Metas SISU</h2>
                    <p className={`${textSub} text-sm`}>Defina até 3 cursos e universidades dos seus sonhos para acompanhar as notas de corte em tempo real.</p>
                    
                    <div className="space-y-4 mb-6">
                        <input 
                            type="text" 
                            className={`w-full px-4 py-3 rounded-xl border outline-none ${inputClass}`} 
                            placeholder="1ª Opção (Ex: Medicina USP)" 
                            value={courseInput1} 
                            onChange={(e) => setCourseInput1(e.target.value)} 
                        />
                        <input 
                            type="text" 
                            className={`w-full px-4 py-3 rounded-xl border outline-none ${inputClass}`} 
                            placeholder="2ª Opção (Ex: Direito UFRJ)" 
                            value={courseInput2} 
                            onChange={(e) => setCourseInput2(e.target.value)} 
                        />
                        <input 
                            type="text" 
                            className={`w-full px-4 py-3 rounded-xl border outline-none ${inputClass}`} 
                            placeholder="3ª Opção (Ex: Engenharia UFMG)" 
                            value={courseInput3} 
                            onChange={(e) => setCourseInput3(e.target.value)} 
                        />
                    </div>
                    
                    <button 
                        onClick={handleSearchSisu} 
                        disabled={isSearchingSisu}
                        className={`w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${isSearchingSisu ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSearchingSisu ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path></svg>
                                Buscando...
                            </>
                        ) : 'Atualizar Notas de Corte'}
                    </button>

                    {pendingGoals.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-200 animate-fade-in">
                            <h3 className={`text-lg font-bold ${textTitle} mb-3`}>Notas de Corte Encontradas:</h3>
                            <div className="space-y-3">
                                {pendingGoals.map((goal, idx) => (
                                    <div key={idx} className="p-4 rounded-lg border border-indigo-100 bg-indigo-50 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-800">{goal.course}</p>
                                            {goal.source && (
                                                <a href={goal.source} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline block truncate max-w-[200px]" title="Ver fonte original">
                                                    Fonte: {new URL(goal.source).hostname}
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-2xl font-black text-fuchsia-600">{goal.cutoff}</span>
                                            <span className="text-[10px] text-slate-500">Nota de Corte</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={handleSaveSisuGoals}
                                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all"
                            >
                                {saveSuccess ? 'Metas Salvas! 🎉' : 'Salvar Estas Metas'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className={`${cardClass} p-6 rounded-xl border shadow-sm animate-fade-in`}>
                    <h2 className={`text-xl font-bold ${textTitle} mb-4`}>Histórico de Atividades</h2>
                    
                    <div className={`flex p-1 rounded-lg mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button onClick={() => setActiveHistoryTab('simulados')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeHistoryTab === 'simulados' ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>Simulados</button>
                        <button onClick={() => setActiveHistoryTab('redacoes')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeHistoryTab === 'redacoes' ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>Redações</button>
                    </div>

                    {activeHistoryTab === 'simulados' ? renderExamList(exams.filter(e => e.config.mode !== 'essay_only'), 'simulado') : renderExamList(exams.filter(e => e.config.mode === 'essay_only'), 'redacao')}
                </div>
            )}

            {activeTab === 'reports' && (
                <div className={`${cardClass} p-6 rounded-xl border shadow-sm animate-fade-in`}>
                    <h2 className={`text-xl font-bold ${textTitle} mb-4`}>Meus Relatórios Semanais</h2>
                    {reports.length === 0 ? (
                        <div className={`text-center py-12 rounded-xl border border-dashed ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            <p className="font-medium">Nenhum relatório gerado ainda.</p>
                            <p className="text-sm mt-2">Gere um novo relatório na página do Dashboard para ver sua evolução.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(report => (
                                <div key={report.id} onClick={() => setViewingReport(report)} className={`cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} border rounded-xl p-4 flex justify-between items-center transition-colors`}>
                                    <div>
                                        <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Relatório {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}</p>
                                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Simulados: ${report.stats.simCount} • Redações: ${report.stats.essaysCount}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteReport(e, report.id)}
                                        className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                        title="Excluir Relatório"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'theme' && (
                <div className={`${cardClass} p-6 rounded-xl border shadow-sm space-y-6 animate-fade-in`}>
                    <h2 className={`text-xl font-bold ${textTitle}`}>Aparência</h2>
                    <p className={`${textSub} text-sm`}>Personalize o visual da sua plataforma.</p>

                    <div>
                        <label className={`block text-sm font-bold mb-2 ${labelClass}`}>Tema</label>
                        <div className="flex gap-4">
                            {['light', 'dark', 'system'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => handleSettingChange('theme', t)}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${settings.theme === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {t === 'light' && 'Claro'}
                                    {t === 'dark' && 'Escuro'}
                                    {t === 'system' && 'Sistema'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-bold mb-2 ${labelClass}`}>Estilo da Fonte</label>
                        <div className="flex gap-4">
                            {['sans', 'serif', 'mono'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => handleSettingChange('fontStyle', f)}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${settings.fontStyle === f ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {f === 'sans' && 'Sans-serif'}
                                    {f === 'serif' && 'Serif'}
                                    {f === 'mono' && 'Monospace'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-bold mb-2 ${labelClass}`}>Tamanho da Fonte</label>
                        <div className="flex gap-4">
                            {['small', 'base', 'large'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSettingChange('fontSize', s)}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${settings.fontSize === s ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {s === 'small' && 'Pequena'}
                                    {s === 'base' && 'Normal'}
                                    {s === 'large' && 'Grande'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'system' && user && (
                <div className={`${cardClass} p-6 rounded-xl border shadow-sm space-y-6 animate-fade-in`}>
                    <h2 className={`text-xl font-bold ${textTitle}`}>Informações do Sistema</h2>
                    <p className={`${textSub} text-sm`}>Detalhes sobre sua conta e uso da plataforma.</p>

                    <div className="space-y-4">
                        <div>
                            <p className={`text-sm font-bold ${labelClass}`}>Plano Atual</p>
                            <p className={`text-lg font-black ${textTitle}`}>{user.planType}</p>
                            {user.planType !== 'PREMIUM' && (
                                <button onClick={() => alert("Navegar para seleção de planos")} className="text-indigo-600 text-sm font-bold hover:underline">
                                    Fazer Upgrade
                                </button>
                            )}
                        </div>

                        <div>
                            <p className={`text-sm font-bold ${labelClass}`}>Tokens de IA Consumidos (Total)</p>
                            <p className={`text-lg font-black ${textTitle}`}>{user.tokensConsumed.toLocaleString('pt-BR')}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className={`text-sm font-bold ${labelClass}`}>Redações Corrigidas (Mês Atual)</p>
                                <p className={`text-lg font-black ${textTitle}`}>{user.usage.essaysCount}</p>
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${labelClass}`}>Última Redação</p>
                                <p className={`text-lg font-black ${textTitle}`}>{user.usage.lastEssayDate ? new Date(user.usage.lastEssayDate).toLocaleDateString() : '-'}</p>
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${labelClass}`}>Simulados Realizados (Últimos 7 Dias)</p>
                                <p className={`text-lg font-black ${textTitle}`}>{user.usage.examsCount}</p>
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${labelClass}`}>Último Simulado</p>
                                <p className={`text-lg font-black ${textTitle}`}>{user.usage.lastExamDate ? new Date(user.usage.lastExamDate).toLocaleDateString() : '-'}</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200">
                             <button onClick={() => alert("Limpar cache de dados")} className="text-red-500 font-bold text-sm hover:underline">Limpar Dados Locais</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
        {/* Modals outside content area */}
        {showPasswordModal && <ChangePasswordModal />}
        {viewingReport && <WeeklyReportModal user={user!} onClose={() => setViewingReport(null)} existingReport={viewingReport} />}
    </div>
  );
};
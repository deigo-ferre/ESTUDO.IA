import React, { useState, useEffect } from 'react';
import { User, UserSettings, SisuGoal } from '../types';
import { estimateSisuCutoff } from '../services/geminiService';
import { saveSettings, saveUserSession } from '../services/storageService';
import LoadingSpinner from './LoadingSpinner';

interface OnboardingGoalSetterProps {
    user: User;
    onComplete: (updatedSettings: UserSettings) => void;
    onUpdateSettings: (settings: UserSettings) => void;
}

const OnboardingGoalSetter: React.FC<OnboardingGoalSetterProps> = ({ user, onComplete, onUpdateSettings }) => {
    const [courseInput1, setCourseInput1] = useState('');
    const [courseInput2, setCourseInput2] = useState('');
    const [courseInput3, setCourseInput3] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingGoals, setPendingGoals] = useState<SisuGoal[]>([]);

    useEffect(() => {
        // Prefill from current user settings if available
        const currentSettings = JSON.parse(localStorage.getItem('enem_ai_settings') || '{}');
        if (currentSettings.sisuGoals && currentSettings.sisuGoals.length > 0) {
            setCourseInput1(currentSettings.sisuGoals[0]?.course || '');
            setCourseInput2(currentSettings.sisuGoals[1]?.course || '');
            setCourseInput3(currentSettings.sisuGoals[2]?.course || '');
        }
    }, []);

    const handleSearchSisu = async () => {
        const courses = [courseInput1, courseInput2, courseInput3].filter(c => c.trim().length > 3);
        if (courses.length === 0) {
            setError("Por favor, digite pelo menos um curso e universidade válidos (ex: Medicina USP).");
            setPendingGoals([]);
            return;
        }

        setIsSearching(true);
        setError(null);
        setPendingGoals([]); // Clear previous results
        try {
            const results = await estimateSisuCutoff(courses);
            // FIX: Added fallbacks to ensure type compatibility with SisuGoal interface
            const goals: SisuGoal[] = results.map(r => ({
                course: r.curso || "Curso Desconhecido",
                cutoff: r.nota_corte_media || 0,
                lastUpdated: new Date().toLocaleDateString('pt-BR'),
                source: r.fontes?.[0]
            }));
            setPendingGoals(goals);
            if (results.length === 0) {
                setError("Não encontramos notas de corte para os cursos informados. Tente termos mais gerais.");
            }
        } catch (err) {
            console.error("Erro ao buscar dados do SISU:", err);
            setError("Erro ao buscar dados do SISU. Verifique sua conexão e tente novamente. (Permissão Google Search API Key?)");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSaveGoals = () => {
        // Save goals to settings
        const currentSettings = JSON.parse(localStorage.getItem('enem_ai_settings') || '{}');
        const updatedSettings: UserSettings = { ...currentSettings, sisuGoals: pendingGoals };
        saveSettings(updatedSettings);
        onUpdateSettings(updatedSettings); // Update parent's state

        // Mark onboarding as complete for this user
        const updatedUser = { ...user, hasSeenOnboardingGoalSetter: true };
        saveUserSession(updatedUser);

        onComplete(updatedSettings); // Proceed to next step in App.tsx
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-700 to-fuchsia-700 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-slate-200">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-fuchsia-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Defina Suas Metas SISU</h2>
                    <p className="text-slate-500 text-sm mb-6">Quais são os cursos e universidades dos seus sonhos? A IA buscará as notas de corte reais do SISU.</p>

                    <div className="space-y-4 mb-6">
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:border-indigo-500 outline-none" 
                            placeholder="1ª Opção (Ex: Medicina USP)" 
                            value={courseInput1} 
                            onChange={(e) => setCourseInput1(e.target.value)} 
                        />
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:border-indigo-500 outline-none" 
                            placeholder="2ª Opção (Ex: Direito UFRJ)" 
                            value={courseInput2} 
                            onChange={(e) => setCourseInput2(e.target.value)} 
                        />
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:border-indigo-500 outline-none" 
                            placeholder="3ª Opção (Ex: Engenharia UFMG)" 
                            value={courseInput3} 
                            onChange={(e) => setCourseInput3(e.target.value)} 
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-md mb-6 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    {!isSearching && pendingGoals.length === 0 && (
                        <button 
                            onClick={handleSearchSisu}
                            className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl shadow-md transition-all"
                        >
                            Buscar Notas de Corte Oficiais
                        </button>
                    )}

                    {isSearching && (
                        <div className="py-6">
                            <LoadingSpinner />
                            <p className="mt-4 text-indigo-600 font-bold animate-pulse">Buscando dados do SISU...</p>
                        </div>
                    )}

                    {pendingGoals.length > 0 && !isSearching && (
                        <div className="mt-8 pt-6 border-t border-slate-200 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Dados Encontrados:</h3>
                            <div className="space-y-4">
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
                                onClick={handleSaveGoals}
                                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all"
                            >
                                Confirmar Minhas Metas
                            </button>
                        </div>
                    )}
                    
                    {!isSearching && pendingGoals.length === 0 && (
                        <button 
                            onClick={() => { 
                                const currentSettings = JSON.parse(localStorage.getItem('enem_ai_settings') || '{}');
                                const updatedSettings: UserSettings = { ...currentSettings, sisuGoals: [] }; // Clear any previous attempts
                                saveSettings(updatedSettings);
                                onUpdateSettings(updatedSettings);
                                const updatedUser = { ...user, hasSeenOnboardingGoalSetter: true };
                                saveUserSession(updatedUser);
                                onComplete(updatedSettings); 
                            }} 
                            className="mt-6 text-slate-500 hover:text-slate-700 text-sm font-bold"
                        >
                            Pular esta etapa por enquanto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingGoalSetter;
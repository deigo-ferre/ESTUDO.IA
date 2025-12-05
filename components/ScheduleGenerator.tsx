import React, { useState, useEffect } from 'react';
import { generateStudySchedule } from '../services/geminiService';
import { saveSchedule, getSettings, checkUsageLimit, incrementUsage, getUserSession } from '../services/storageService';
import { StudyProfile, SavedSchedule, User, StudyScheduleResult } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ScheduleGeneratorProps {
    onNavigate: (view: string) => void;
    onBack: () => void;
}

const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({ onNavigate, onBack }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estado do perfil de estudo
    const [profile, setProfile] = useState<StudyProfile>({
        name: '',
        targetCourse: '',
        course: '', 
        availableTime: 120, 
        hoursPerDay: 2, 
        weaknesses: [],
        difficulties: '', // Começa como string para o input
        strengths: [],
        scores: { linguagens: 0, humanas: 0, natureza: 0, matematica: 0, redacao: 0 }
    });

    const [generatedSchedule, setGeneratedSchedule] = useState<SavedSchedule | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const user = getUserSession();
        const settings = getSettings();
        setCurrentUser(user);
        if (user) {
            setProfile(prev => ({ 
                ...prev, 
                name: user.name, 
                targetCourse: settings.targetCourse || '' 
            }));
        }
    }, []);

    const handleInputChange = (field: keyof StudyProfile, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        const limit = checkUsageLimit('chat');
        if (!limit.allowed) {
            setError(limit.message || "Limite atingido");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // CORREÇÃO 1: Trata 'difficulties' com segurança
            let diffString = "";
            let diffArray: string[] = [];

            if (typeof profile.difficulties === 'string') {
                diffString = profile.difficulties;
                diffArray = profile.difficulties.split(',').map(s => s.trim()).filter(s => s);
            } else if (Array.isArray(profile.difficulties)) {
                diffString = profile.difficulties.join(', ');
                diffArray = profile.difficulties;
            }

            // CORREÇÃO 2: Garante números
            const hours = Number(profile.hoursPerDay) || 2;

            // Prepara o perfil para envio
            const profileToSend: StudyProfile = {
                ...profile,
                difficulties: diffString, // Envia string para o Gemini entender melhor
                weaknesses: diffArray,    // Guarda array para uso interno
                hoursPerDay: hours,
                availableTime: hours * 60
            };

            // Chama o serviço
            const apiResult = await generateStudySchedule(profileToSend);
            
            // CORREÇÃO 3: Constrói o objeto SavedSchedule COMPLETO
            const scheduleToSave: SavedSchedule = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                profile: profileToSend,
                result: {
                    diagnostico: "Cronograma gerado via IA",
                    semana: apiResult.schedule.weeks[0]?.days || [], // Adapta a resposta do Gemini
                    dicas_personalizadas: apiResult.tips || [],
                    schedule: apiResult.schedule, // Mantém backup do original
                    tips: apiResult.tips
                },
                completedItems: [],
                archived: false,
                weeks: apiResult.schedule.weeks || [] // Compatibilidade
            };

            setGeneratedSchedule(scheduleToSave);
            incrementUsage('chat');
            setStep(2);

        } catch (err) {
            console.error(err);
            setError("Erro ao gerar cronograma. Tente novamente ou verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndExit = () => {
        if (generatedSchedule) {
            saveSchedule(generatedSchedule);
            onNavigate('user_area');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;

    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in">
            <button onClick={onBack} className="mb-4 text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-2">← Voltar</button>
            
            {step === 1 && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Gerador de Cronograma IA</h2>
                    
                    {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>}

                    {/* CORREÇÃO 4: Uso seguro de user?.usage?. */}
                    {currentUser?.usage && (
                        <div className="mb-4 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                            Cronogramas gerados: {currentUser.usage.schedulesCount ?? 0}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Curso Alvo</label>
                            <input type="text" className="w-full p-3 border rounded-lg" 
                                value={profile.targetCourse || profile.course} 
                                onChange={e => {
                                    handleInputChange('targetCourse', e.target.value);
                                    handleInputChange('course', e.target.value);
                                }} 
                                placeholder="Ex: Medicina, Direito..." 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Horas por Dia</label>
                            <input type="number" className="w-full p-3 border rounded-lg" 
                                value={profile.hoursPerDay} 
                                onChange={e => {
                                    const hours = Number(e.target.value);
                                    handleInputChange('availableTime', hours * 60);
                                    handleInputChange('hoursPerDay', hours);
                                }} 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Dificuldades (separadas por vírgula)</label>
                            <input type="text" className="w-full p-3 border rounded-lg" 
                                placeholder="Ex: Matemática Básica, Redação..."
                                value={typeof profile.difficulties === 'string' ? profile.difficulties : ''}
                                onChange={e => handleInputChange('difficulties', e.target.value)} 
                            />
                        </div>

                        <button onClick={handleGenerate} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg mt-4">
                            Gerar Cronograma Personalizado
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && generatedSchedule && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Cronograma Pronto! 🎉</h2>
                    <p className="text-slate-600 mb-6">Seu plano de estudos foi gerado com sucesso pela IA. Ele foi adaptado para {generatedSchedule.profile.hoursPerDay} horas diárias.</p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 max-h-60 overflow-y-auto">
                        <h3 className="font-bold text-slate-700 mb-2">Prévia da Semana:</h3>
                        <ul className="space-y-2">
                            {generatedSchedule.result.semana.map((dia: any, idx: number) => (
                                <li key={idx} className="text-sm text-slate-600">
                                    <strong className="text-indigo-600">{dia.dia}:</strong> {dia.foco}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
                            Refazer
                        </button>
                        <button onClick={handleSaveAndExit} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg">
                            Salvar e Ver no Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleGenerator;
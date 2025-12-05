import React, { useState } from 'react';

interface CutoffSimulatorTeaserProps {
    onClose: () => void;
}

const STATIC_SISU_DB_SIMPLIFIED: Record<string, number> = {
    'medicina': 800,
    'direito': 750,
    'engenharia de computacao': 780,
    'ciencia da computacao': 760,
    'psicologia': 730,
    'biomedicina': 720,
    'arquitetura': 700,
    'odontologia': 710,
    'administracao': 680,
    'contabilidade': 650,
    'pedagogia': 600,
};

const normalizeCourse = (course: string) => course.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').trim();

const CutoffSimulatorTeaser: React.FC<CutoffSimulatorTeaserProps> = ({ onClose }) => {
    const [course, setCourse] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [estimatedCutoff, setEstimatedCutoff] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [showEmailCapture, setShowEmailCapture] = useState(false);

    const handleSimulate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!course) {
            alert("Por favor, digite o curso dos seus sonhos.");
            return;
        }

        const normalizedCourse = normalizeCourse(course);
        let baseCutoff = 0;
        let found = false;

        // Try exact match first
        if (STATIC_SISU_DB_SIMPLIFIED[normalizedCourse]) {
            baseCutoff = STATIC_SISU_DB_SIMPLIFIED[normalizedCourse];
            found = true;
        } else {
            // Try partial match
            const partialMatch = Object.keys(STATIC_SISU_DB_SIMPLIFIED).find(key => normalizedCourse.includes(key) || key.includes(normalizedCourse));
            if (partialMatch) {
                baseCutoff = STATIC_SISU_DB_SIMPLIFIED[partialMatch];
                found = true;
            } else {
                baseCutoff = 700; // Default if not found
            }
        }
        
        // Adjust based on perceived difficulty
        let adjustment = 0;
        if (difficulty === 'easy') adjustment = -20;
        else if (difficulty === 'hard') adjustment = +30;
        else adjustment = Math.random() * 10 - 5; // Slight random for medium

        const finalCutoff = Math.round(baseCutoff + adjustment);
        setEstimatedCutoff(finalCutoff);
        setMessage(found 
            ? `Para o curso de "${course}", a nota de corte estimada é de aproximadamente ${finalCutoff} pontos.`
            : `Não encontramos dados específicos para "${course}". Uma estimativa geral é de ${finalCutoff} pontos.`
        );
        setShowEmailCapture(true);
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            alert("Por favor, insira um e-mail válido.");
            return;
        }
        // Simulate lead capture
        alert(`Obrigado! Seu e-mail (${email}) foi salvo. Acesse o Estude.IA para rastrear sua nota de corte oficial e personalizada!`);
        onClose(); // Close modal
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-fuchsia-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Simulador de Nota de Corte</h2>
                    <p className="text-slate-500 text-sm mb-6">Descubra a nota que você precisa para o seu curso dos sonhos.</p>

                    <form onSubmit={handleSimulate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Curso e Universidade</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-fuchsia-500 outline-none" 
                                value={course} 
                                onChange={(e) => setCourse(e.target.value)} 
                                placeholder="Ex: Medicina USP" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Qual a sua percepção de dificuldade para este curso?</label>
                            <div className="flex gap-2">
                                {['easy', 'medium', 'hard'].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDifficulty(d as 'easy' | 'medium' | 'hard')}
                                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${difficulty === d ? 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl shadow-md transition-all">
                            Simular Nota de Corte
                        </button>
                    </form>

                    {estimatedCutoff !== null && (
                        <div className="mt-8 pt-6 border-t border-slate-200 animate-fade-in">
                            <p className="text-xl font-bold text-slate-800 mb-2">Nota de Corte Estimada:</p>
                            <div className="text-5xl font-black text-fuchsia-600 mb-4">{estimatedCutoff}</div>
                            <p className="text-sm text-slate-600 mb-4">{message}</p>
                            <p className="text-sm text-slate-600 mb-4">Para rastrear sua nota de corte oficial e personalizada em tempo real, com dados reais do SISU e um plano de estudos focado, defina sua meta no ESTUDE.IA!</p>
                            
                            {showEmailCapture && (
                                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mt-4">
                                    <input 
                                        type="email" 
                                        required 
                                        className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-fuchsia-500 outline-none" 
                                        placeholder="Seu melhor e-mail"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all">
                                        Quero Acompanhar Minha Meta
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CutoffSimulatorTeaser;
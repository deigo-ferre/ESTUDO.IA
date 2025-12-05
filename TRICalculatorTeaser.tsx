
import React, { useState } from 'react';

interface TRICalculatorTeaserProps {
    onClose: () => void;
}

const TRICalculatorTeaser: React.FC<TRICalculatorTeaserProps> = ({ onClose }) => {
    const [linguagens, setLinguagens] = useState('');
    const [humanas, setHumanas] = useState('');
    const [natureza, setNatureza] = useState('');
    const [matematica, setMatematica] = useState('');
    const [email, setEmail] = useState('');
    const [estimatedScore, setEstimatedScore] = useState<number | null>(null);
    const [showEmailCapture, setShowEmailCapture] = useState(false);

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        const l = parseInt(linguagens) || 0;
        const h = parseInt(humanas) || 0;
        const n = parseInt(natureza) || 0;
        const m = parseInt(matematica) || 0;

        if (l === 0 && h === 0 && n === 0 && m === 0) {
            alert("Por favor, insira suas notas estimadas.");
            return;
        }

        // Simple mock TRI calculation: weighted average + some random adjustment
        const rawAvg = (l * 0.25 + h * 0.2 + n * 0.3 + m * 0.25); // Simplified weights
        const triAdjust = Math.random() * 50 - 25; // Random +/- 25 points
        const score = Math.round(rawAvg + triAdjust);
        setEstimatedScore(Math.max(450, Math.min(950, score))); // Keep it within a reasonable range

        setShowEmailCapture(true);
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            alert("Por favor, insira um e-mail válido.");
            return;
        }
        // Simulate lead capture
        alert(`Obrigado! Seu e-mail (${email}) foi salvo. Acesse o Estude.IA para a análise completa!`);
        onClose(); // Close modal
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="12" y2="9"/></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculadora de TRI Simplificada</h2>
                    <p className="text-slate-500 text-sm mb-6">Estime sua nota no ENEM rapidamente.</p>

                    <form onSubmit={handleCalculate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Linguagens</label>
                                <input type="number" min="0" max="1000" className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400" value={linguagens} onChange={(e) => setLinguagens(e.target.value)} placeholder="Ex: 700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Humanas</label>
                                <input type="number" min="0" max="1000" className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400" value={humanas} onChange={(e) => setHumanas(e.target.value)} placeholder="Ex: 650" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Natureza</label>
                                <input type="number" min="0" max="1000" className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400" value={natureza} onChange={(e) => setNatureza(e.target.value)} placeholder="Ex: 720" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Matemática</label>
                                <input type="number" min="0" max="1000" className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400" value={matematica} onChange={(e) => setMatematica(e.target.value)} placeholder="Ex: 810" />
                            </div>
                        </div>
                        <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all">
                            Calcular Minha Nota
                        </button>
                    </form>

                    {estimatedScore !== null && (
                        <div className="mt-8 pt-6 border-t border-slate-200 animate-fade-in">
                            <p className="text-xl font-bold text-slate-800 mb-2">Sua TRI Estimada:</p>
                            <div className="text-5xl font-black text-indigo-600 mb-4">{estimatedScore}</div>
                            <p className="text-sm text-slate-600 mb-4">Esta é uma estimativa simplificada e não inclui a nota da redação. Para uma análise 100% precisa e personalizada, com cálculo da sua nota de corte para o curso dos sonhos, cadastre-se no ESTUDE.IA!</p>
                            
                            {showEmailCapture && (
                                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mt-4">
                                    <input 
                                        type="email" 
                                        required 
                                        className="flex-1 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 outline-none placeholder-slate-400" 
                                        placeholder="Seu melhor e-mail"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all">
                                        Quero a Análise Completa
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

export default TRICalculatorTeaser;
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import Logo from './Logo';
import TRICalculatorTeaser from './TRICalculatorTeaser';
import CutoffSimulatorTeaser from './CutoffSimulatorTeaser';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type PageView = 'landing' | 'auth';
type AuthMode = 'login' | 'register' | 'forgot';

// --- HERO CAROUSEL COMPONENT ---
const HEADLINES = [
  {
    content: (
      <>
        Pare de Estudar Errado. A <span className="text-cyan-500">IA</span> te diz, dia a dia, exatamente qual matéria vai garantir sua vaga.
      </>
    )
  },
  {
    content: (
      <>
        Redação 1000 Sem Mistério. Receba o <span className="text-cyan-500">feedback cirúrgico</span> por Competência e saiba o que reescrever.
      </>
    )
  },
  {
    content: (
      <>
        A Incerteza Acabou. Descubra agora a sua <span className="text-cyan-500">Nota de Aprovação</span> e veja quantos pontos faltam.
      </>
    )
  },
  {
    content: (
      <>
        Chega de Esquecer o Conteúdo. A inteligência artificial cria provas-relâmpago sobre tudo que você <span className="text-cyan-500">errou</span>.
      </>
    )
  },
  {
    content: (
      <>
        Treine o ENEM de Verdade. Simule o Dia 1 e 2 com o cronômetro oficial e a <span className="text-cyan-500">pressão da prova</span>.
      </>
    )
  }
];

const HeroCarousel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center px-4" aria-live="polite">
       <div className="grid place-items-center w-full min-h-[160px] sm:min-h-[180px]">
         {HEADLINES.map((item, i) => (
           <h1
             key={i}
             style={{ textWrap: 'balance' }}
             className={`col-start-1 row-start-1 w-full text-center
               text-xl sm:text-2xl md:text-3xl lg:text-4xl 
               font-extrabold leading-tight text-white tracking-tight 
               transition-all duration-700 ease-in-out transform 
               ${i === index 
                 ? 'opacity-100 translate-y-0 z-10 blur-0 scale-100' 
                 : 'opacity-0 translate-y-4 z-0 pointer-events-none blur-sm scale-95'
               }`}
           >
             {item.content}
           </h1>
         ))}
       </div>
       
       <div className="flex gap-3 relative z-20 mt-4 sm:mt-6">
         {HEADLINES.map((_, i) => (
           <div 
             key={i} 
             className={`h-1.5 rounded-full transition-all duration-500 ease-out cursor-pointer ${
               i === index ? 'bg-cyan-500 w-8' : 'bg-slate-700 w-2 hover:bg-slate-600'
             }`} 
             onClick={() => setIndex(i)}
           />
         ))}
       </div>
    </div>
  );
};

// --- MOCKUP COMPONENTS ---

const MockupSchedule = () => {
    const [step, setStep] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                const loop = () => {
                    setStep(0);
                    setTimeout(() => setStep(1), 1000);
                    setTimeout(() => setStep(2), 2500);
                    setTimeout(() => setStep(3), 3500);
                    setTimeout(() => setStep(4), 4500);
                };
                loop();
                const interval = setInterval(loop, 8000);
                return () => clearInterval(interval);
            }
        }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="w-full h-56 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative p-4 flex flex-col gap-3 group-hover:bg-white transition-colors">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 animate-pulse">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <div className="w-20 h-2 bg-slate-200 rounded mb-1"></div>
                        <div className="w-12 h-1.5 bg-slate-100 rounded"></div>
                    </div>
                </div>
                <div className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">SEMANA 12</div>
            </div>

            <div className="relative flex flex-col gap-3">
                <div className={`absolute w-full flex items-center gap-3 p-3 rounded-lg border bg-white border-green-100 transition-all duration-700 ease-in-out z-0
                    ${step >= 2 ? 'translate-y-[60px]' : 'translate-y-0'}`}
                >
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="flex-1">
                        <span className="text-xs font-bold text-slate-700 block">Análise Combinatória</span>
                        <span className="text-[9px] text-green-600 font-medium">Em dia • Revisão Leve</span>
                    </div>
                </div>

                <div className={`absolute w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-700 ease-in-out z-10 top-[60px]
                    ${step >= 2 ? '-translate-y-[60px]' : 'translate-y-0'} 
                    ${step >= 3 ? 'bg-cyan-50 border-cyan-200 shadow-lg scale-[1.02]' : step >= 1 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
                >
                    <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${step >= 3 ? 'bg-cyan-500' : step >= 1 ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                    <div className="flex-1">
                        <span className={`text-xs font-bold block transition-colors ${step >= 3 ? 'text-cyan-900' : 'text-slate-700'}`}>Química Orgânica</span>
                        {step < 3 ? (
                            <span className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                                <span className="animate-pulse">●</span> Atrasado (3h)
                            </span>
                        ) : (
                            <span className="text-[9px] text-cyan-600 font-bold flex items-center gap-1 animate-fade-in">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Prioridade Definida
                            </span>
                        )}
                    </div>
                </div>

                <div className="absolute top-[120px] w-full flex items-center gap-3 p-3 rounded-lg border bg-white border-slate-100 opacity-60">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                     <div className="flex-1">
                        <span className="text-xs font-bold text-slate-500 block">Função de 1º Grau</span>
                        <span className="text-[9px] text-slate-400">Concluído</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center transition-all duration-300 ${step >= 4 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MockupCorrection = () => {
    const [visible, setVisible] = useState(false);
    const [score, setScore] = useState(0);
    const [typing, setTyping] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const fullText = "Foco em C4: Coesão";

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                setScore(0);
                setTyping("");

                let start = 0;
                const end = 920;
                const duration = 1500;
                const increment = end / (duration / 16);
                const timer = setInterval(() => {
                    start += increment;
                    if (start >= end) {
                        setScore(end);
                        clearInterval(timer);
                        let i = 0;
                        const typeTimer = setInterval(() => {
                            setTyping(fullText.substring(0, i + 1));
                            i++;
                            if (i >= fullText.length) clearInterval(typeTimer);
                        }, 50);
                    } else {
                        setScore(Math.floor(start));
                    }
                }, 16);
            }
        }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="w-full h-56 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative p-5 flex flex-col justify-between group-hover:bg-white transition-colors">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                 <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nota Final</span>
                     <div className="text-5xl font-black text-indigo-900 tracking-tighter tabular-nums">
                         {score}
                     </div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </div>
            </div>

            <div className="space-y-2 mt-2">
                {[1, 2, 3, 4, 5].map((c) => (
                    <div key={c} className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-400 w-4">C{c}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out delay-100 
                                ${c === 4 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-indigo-500'}`} 
                                style={{ width: visible ? (c === 4 ? '60%' : '95%') : '0%' }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

             <div className={`absolute bottom-4 right-4 bg-white border-l-4 border-amber-400 pl-3 pr-4 py-2 rounded shadow-xl transition-all duration-500 ${typing.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                 <div className="flex items-center gap-2 mb-0.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                     <p className="text-[9px] text-amber-700 font-bold uppercase">IA Suggestion</p>
                 </div>
                 <p className="text-xs text-slate-800 font-bold">{typing}<span className="animate-blink">|</span></p>
             </div>
        </div>
    );
};

const MockupTurbo = () => {
    const [phase, setPhase] = useState<'list' | 'click' | 'loading' | 'done'>('list');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
               const cycle = () => {
                   setPhase('list');
                   setTimeout(() => setPhase('click'), 1500);
                   setTimeout(() => setPhase('loading'), 1800);
                   setTimeout(() => setPhase('done'), 3500);
                   setTimeout(() => setPhase('list'), 7000);
               };
               cycle();
            }
        }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="w-full h-56 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative p-0 group-hover:bg-white transition-colors flex flex-col">
            
            <div className={`p-4 w-full h-full absolute inset-0 transition-all duration-300 ${phase === 'list' || phase === 'click' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-red-600 uppercase">3 Erros Recorrentes</span>
                     </div>
                </div>
                <div className="space-y-2">
                    {['Logaritmos', 'Eletroquímica'].map((topic, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white border border-red-100 rounded-lg text-xs shadow-sm">
                            <span className="text-slate-700 font-bold">{topic}</span>
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">ERRADO</span>
                        </div>
                    ))}
                </div>
                <div className="mt-auto pt-4">
                    <button className={`w-full bg-fuchsia-600 text-white p-3 rounded-lg text-xs font-bold shadow-md shadow-fuchsia-200 transition-transform duration-200 ${phase === 'click' ? 'scale-95 bg-fuchsia-700' : 'scale-100 animate-pulse'}`}>
                        ⚡ GERAR REVISÃO TURBO
                    </button>
                </div>
            </div>

             <div className={`absolute inset-0 bg-white z-10 flex flex-col items-center justify-center transition-opacity duration-200 ${phase === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-fuchsia-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-fuchsia-800 font-bold text-xs mt-3 animate-pulse">Criando Questões...</p>
            </div>

            <div className={`absolute inset-0 bg-white p-4 transition-all duration-500 ${phase === 'done' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">5 Questões Geradas</span>
                </div>
                
                <div className="space-y-2 opacity-60">
                     <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                     <div className="h-2 bg-slate-200 rounded w-full"></div>
                     <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                </div>
                
                <div className="mt-4 p-3 bg-fuchsia-50 rounded-lg border border-fuchsia-100">
                    <p className="text-[10px] text-fuchsia-800 font-bold mb-1">Foco:</p>
                    <div className="flex gap-1">
                        <span className="text-[9px] bg-white border border-fuchsia-200 px-1.5 py-0.5 rounded text-fuchsia-700">Logaritmos</span>
                        <span className="text-[9px] bg-white border-fuchsia-200 px-1.5 py-0.5 rounded text-fuchsia-700">Eletro...</span>
                    </div>
                </div>

                <button className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold w-full hover:bg-black transition-colors">Começar Agora</button>
            </div>
        </div>
    );
};

const MockupSisu = () => {
    const [scenario, setScenario] = useState<'med' | 'law'>('med');
    const [progress, setProgress] = useState(0); 
    const [currentScore, setCurrentScore] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const config = {
        med: { course: 'Medicina (USP)', cutoff: 812.50, myScore: 769.50, color: 'indigo' },
        law: { course: 'Direito (PUC)', cutoff: 740.00, myScore: 755.00, color: 'indigo' }
    };

    const activeConfig = config[scenario];
    const diff = activeConfig.cutoff - activeConfig.myScore;
    const isPassing = diff <= 0;
    
    const maxScale = 900;
    const scoreHeight = (activeConfig.myScore / maxScale) * 100;
    const cutoffHeight = (activeConfig.cutoff / maxScale) * 100;

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setProgress(0);
                setCurrentScore(600);
                
                let start = 600;
                const end = activeConfig.myScore;
                const duration = 2000;
                const steps = 60;
                const increment = (end - start) / steps;
                let stepCount = 0;

                const timer = setInterval(() => {
                    stepCount++;
                    start += increment;
                    
                    setProgress(stepCount / steps);
                    setCurrentScore(Math.floor(start * 10) / 10);

                    if (stepCount >= steps) {
                        setCurrentScore(end);
                        clearInterval(timer);
                    }
                }, duration / steps);

                return () => clearInterval(timer);
            }
        }, { threshold: 0.5 });
        
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [scenario]);

    const toggleScenario = () => {
        setScenario(prev => prev === 'med' ? 'law' : 'med');
    };

    return (
        <div ref={ref} className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden relative h-80 flex flex-col p-6 group hover:shadow-2xl transition-shadow duration-300">
            <div className="flex justify-between items-start mb-6 z-10">
                <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulação SISU 2024</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                        {activeConfig.course}
                        <button onClick={toggleScenario} className="text-[10px] bg-cyan-50 text-cyan-600 px-2 py-1 rounded-full border border-cyan-100 hover:bg-cyan-100 transition-colors">
                            Mudar Curso ↻
                        </button>
                    </h3>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-500 transform ${progress > 0.8 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'} ${isPassing ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {isPassing ? 'APROVADO 🎉' : `Faltam ${diff.toFixed(1)} pontos`}
                </div>
            </div>

            <div className="flex-grow relative mt-4 mx-4 border-b border-slate-200 flex items-end justify-center gap-12">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                     <div className="w-full h-px bg-slate-50"></div>
                     <div className="w-full h-px bg-slate-50"></div>
                     <div className="w-full h-px bg-slate-50"></div>
                     <div className="w-full h-px bg-slate-50"></div>
                </div>

                <div 
                    className="absolute w-full border-t-2 border-dashed border-fuchsia-500 z-10 transition-all duration-700 ease-out flex items-center"
                    style={{ bottom: `${cutoffHeight}%`, opacity: progress > 0.2 ? 1 : 0 }}
                >
                    <span className="absolute right-0 -top-6 text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded">
                        Corte: {activeConfig.cutoff.toFixed(1)}
                    </span>
                </div>

                <div className="w-24 relative group/bar">
                     <div 
                        className="bg-indigo-600 rounded-t-lg shadow-lg shadow-indigo-200 w-full absolute bottom-0 transition-all duration-75 ease-linear"
                        style={{ height: `${(currentScore / maxScale) * 100}%` }}
                     >
                         <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg whitespace-nowrap">
                             {currentScore.toFixed(1)}
                             <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                         </div>
                     </div>
                </div>
            </div>
            
            <div className="mt-2 text-center text-xs text-slate-400 font-medium">
                 Comparativo em Tempo Real: Sua TRI vs Corte SISU
            </div>
        </div>
    );
};

const MockupInteractiveEssay = () => {
    const [animationState, setAnimationState] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                const loop = () => {
                    setAnimationState(0);
                    setTimeout(() => setAnimationState(1), 1000); 
                    setTimeout(() => setAnimationState(2), 2500); 
                    setTimeout(() => setAnimationState(3), 4000); 
                };
                loop();
                const interval = setInterval(loop, 9000);
                return () => clearInterval(interval);
            }
        }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="w-full h-80 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative shadow-lg group hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-2 bg-white rounded-lg shadow-sm p-6 overflow-hidden flex flex-col">
                <div className="h-full relative font-serif text-slate-700 text-sm leading-relaxed text-justify">
                    <p>
                        A persistência da violência contra a mulher na sociedade brasileira é um problema complexo.
                        Embora a Lei Maria da Penha represente um avanço, observa-se que a cultura patriarcal ainda
                        <span className={`mx-1 transition-all duration-500 ${animationState >= 2 ? 'bg-red-100 text-red-600 px-1 rounded border-b-2 border-red-200' : ''}`}>
                            prevalesse
                        </span>
                        nas relações sociais. 
                        <span className={`mx-1 transition-all duration-500 ${animationState >= 2 ? 'bg-green-100 text-green-700 px-1 rounded border-b-2 border-green-200 font-bold' : ''}`}>
                            Portanto
                        </span>,
                        medidas educativas são essenciais para desconstruir esteriótipos de gênero desde a infância.
                    </p>
                    <p className="mt-4">
                        Nesse sentido, é fundamental que o Ministério da Educação promova palestras...
                    </p>

                    {animationState === 0 && <span className="inline-block w-0.5 h-4 bg-black animate-blink align-middle ml-1"></span>}

                    <div className={`absolute top-12 left-20 bg-slate-800 text-white p-3 rounded-lg shadow-xl z-20 w-48 transform transition-all duration-500 ${animationState >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'}`}>
                        <div className="flex items-center gap-2 mb-1 border-b border-slate-700 pb-1">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-[10px] font-bold uppercase text-slate-400">Ortografia</span>
                        </div>
                        <p className="text-[10px]">A grafia correta é "prevalece". Verifique a conjugação.</p>
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                    </div>
                </div>
            </div>

            <div 
                className={`absolute left-0 w-full h-1 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-10 transition-all duration-[1500ms] ease-linear ${animationState >= 1 ? 'top-full opacity-100' : 'top-0 opacity-0'}`}
                style={{ transitionProperty: 'top, opacity' }}
            ></div>

            <div className={`absolute top-4 right-4 bg-white border-l-4 border-indigo-600 p-4 rounded-lg shadow-xl z-30 w-40 transform transition-all duration-700 ${animationState >= 3 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nota Total</p>
                <div className="text-4xl font-black text-indigo-900 mb-2">960</div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-600"><span>C1</span><span className="text-amber-500">160</span></div>
                    <div className="w-full bg-slate-100 h-1 rounded-full"><div className="w-[80%] h-full bg-amber-500 rounded-full"></div></div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-600 pt-1"><span>C2</span><span className="text-green-500">200</span></div>
                    <div className="w-full bg-slate-100 h-1 rounded-full"><div className="w-full h-full bg-green-500 rounded-full"></div></div>
                </div>
            </div>
        </div>
    );
};


export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<PageView>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [showTRITeaser, setShowTRITeaser] = useState(false); 
  const [showCutoffTeaser, setShowCutoffTeaser] = useState(false); 

  useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToAuth = (mode: AuthMode) => {
      setAuthMode(mode);
      setView('auth');
      window.scrollTo(0, 0);
  };

  const goToLanding = () => {
      setView('landing');
      window.scrollTo(0, 0);
  };

  const checkPasswordStrength = (pass: string) => {
      let score = 0;
      if (pass.length > 5) score += 1;
      if (pass.length > 8) score += 1;
      if (/[A-Z]/.test(pass)) score += 1;
      if (/[0-9]/.test(pass)) score += 1;
      setPasswordStrength(score);
  };

  const handleRegPassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setRegPass(val);
      checkPasswordStrength(val);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setTimeout(() => {
        // Dynamic User ID
        const userId = 'user-' + btoa(email).substring(0, 12);
        const mockUser: User = {
            id: userId,
            name: email.split('@')[0],
            email: email,
            phone: '(11) 99999-9999',
            avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=4338CA&color=fff`,
            planType: 'FREE',
            hasSeenOnboarding: false,
            hasSeenOnboardingGoalSetter: false,
            hasSeenEssayDemo: false,
            usage: { essaysCount: 0, lastEssayDate: null, examsCount: 0, lastExamDate: null, schedulesCount: 0, lastScheduleDate: null },
            tokensConsumed: 0
        };
        onLogin(mockUser);
    }, 1000);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regPass !== regConfirmPass) {
        alert("As senhas não coincidem!");
        return;
    }

    setLoading(true);
    setTimeout(() => {
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: regName || 'Estudante',
            email: regEmail,
            phone: regPhone,
            avatar: `https://ui-avatars.com/api/?name=${regName}&background=D946EF&color=fff`,
            planType: 'FREE',
            hasSeenOnboarding: false,
            hasSeenOnboardingGoalSetter: false,
            hasSeenEssayDemo: false,
            usage: { essaysCount: 0, lastEssayDate: null, examsCount: 0, lastExamDate: null, schedulesCount: 0, lastScheduleDate: null },
            tokensConsumed: 0
        };
        onLogin(newUser);
    }, 1500);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 11) val = val.substring(0, 11);
      if (val.length > 2) val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
      if (val.length > 9) val = `${val.substring(0, 9)}-${val.substring(9)}`; 
      setRegPhone(val);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        alert("Por favor, digite seu email.");
        return;
    }
    setLoading(true);
    setTimeout(() => {
        alert(`Um link de recuperação foi enviado para ${email}`);
        setLoading(false);
        setAuthMode('login');
    }, 1500);
  };

  if (view === 'auth') {
      return (
        <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans animate-fade-in relative">
          <button 
            onClick={goToLanding} 
            className="absolute top-6 left-6 z-50 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Voltar
          </button>

          <div className="lg:w-1/2 w-full bg-slate-900 relative hidden lg:flex flex-col items-center justify-center p-16 text-center overflow-hidden">
             <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
             
             <div className="relative z-10">
                <div className="mx-auto mb-8">
                    <Logo variant="dark" />
                </div>
                <h2 className="text-4xl font-extrabold text-white mb-4">Sua Aprovação Começa Aqui.</h2>
                <p className="text-indigo-200 text-lg max-w-md mx-auto leading-relaxed">
                   Junte-se a mais de 18.000 estudantes que estão usando Inteligência Artificial para dominar o ENEM.
                </p>
             </div>
          </div>

          <div className="lg:w-1/2 w-full flex flex-col justify-center items-center p-6 lg:p-12 relative">
             <div className="w-full max-w-md">
                {authMode === 'login' && (
                    <div className="animate-fade-in">
                        <div className="mb-8 text-center">
                            <h2 className="text-3xl font-bold text-slate-900">Bem-Vindo de Volta.</h2>
                            <p className="text-slate-500 mt-2">Sua aprovação continua.</p>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wide">Email</label>
                                <input type="email" required className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-400" placeholder="estudante@enem.ai" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Senha</label>
                                </div>
                                <input type="password" required className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-400" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} value="on" className="w-4 h-4 text-cyan-500 accent-cyan-500 rounded border-slate-300 bg-white focus:ring-cyan-500" />
                                    <span className="text-sm text-slate-600">Lembrar-me</span>
                                </label>
                                <button type="button" onClick={() => setAuthMode('forgot')} className="text-sm text-cyan-600 font-bold hover:text-cyan-700 hover:underline">Esqueci minha senha</button>
                            </div>
                            
                            <button type="submit" disabled={loading} className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                                {loading ? 'Acessando...' : 'Entrar'}
                            </button>
                        </form>
                        <p className="text-center text-slate-500 text-sm mt-8">
                            Novo por aqui? <button onClick={() => setAuthMode('register')} className="text-fuchsia-600 font-bold hover:text-fuchsia-700 hover:underline">Criar Conta Grátis</button>
                        </p>
                    </div>
                )}
                {authMode === 'register' && (
                    <div className="animate-fade-in">
                        <div className="mb-6 text-center">
                            <span className="bg-fuchsia-100 text-fuchsia-600 px-3 py-1 rounded-full text-[10px] font-bold mb-3 inline-block uppercase tracking-wider">Acesso Imediato à IA</span>
                            <h2 className="text-3xl font-bold text-slate-900">Comece Grátis.</h2>
                            <p className="text-slate-500 mt-2">Sem Cartão de Crédito.</p>
                        </div>
                        
                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
                                <input type="text" required className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 outline-none" placeholder="Seu nome" value={regName} onChange={e => setRegName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                                <input type="email" required className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 outline-none" placeholder="seu@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone <span className="text-slate-400 font-normal">(Opcional)</span></label>
                                <input type="text" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 outline-none" placeholder="(00) 00000-0000" value={regPhone} onChange={handlePhoneChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha</label>
                                    <input type="password" required minLength={8} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 outline-none" placeholder="Min 8 chars" value={regPass} onChange={handleRegPassChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirmar</label>
                                    <input type="password" required className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 outline-none" placeholder="Repita" value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} />
                                </div>
                            </div>
                            
                            {regPass.length > 0 && (
                                <div className="flex gap-1 h-1 mt-1">
                                    <div className={`flex-1 rounded-full ${passwordStrength >= 1 ? 'bg-red-500' : 'bg-slate-200'}`}></div>
                                    <div className={`flex-1 rounded-full ${passwordStrength >= 2 ? 'bg-yellow-500' : 'bg-slate-200'}`}></div>
                                    <div className={`flex-1 rounded-full ${passwordStrength >= 3 ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                    <div className={`flex-1 rounded-full ${passwordStrength >= 4 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
                                </div>
                            )}
                            <button type="submit" disabled={loading} className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 mt-4">
                                {loading ? 'Criando Conta...' : 'Começar Agora 🚀'}
                            </button>
                        </form>
                        <p className="text-center text-slate-500 text-sm mt-6">
                            Já tem conta? <button onClick={() => setAuthMode('login')} className="text-indigo-600 font-bold hover:underline">Fazer Login</button>
                        </p>
                    </div>
                )}
                {authMode === 'forgot' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-slate-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Recuperar Senha</h2>
                            <p className="text-slate-500 text-sm mt-1">Enviaremos as instruções para seu email.</p>
                        </div>
                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Cadastrado</label>
                                <input type="email" required className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-cyan-500 outline-none" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-colors border border-slate-800">
                                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                            </button>
                        </form>
                        <button onClick={() => setAuthMode('login')} className="w-full mt-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-700">Voltar para Login</button>
                    </div>
                )}
             </div>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans selection:bg-fuchsia-500 selection:text-white">
      
      {showTRITeaser && <TRICalculatorTeaser onClose={() => setShowTRITeaser(false)} />}
      {showCutoffTeaser && <CutoffSimulatorTeaser onClose={() => setShowCutoffTeaser(false)} />}

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/90 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-16 flex justify-between items-center">
            <Logo variant="dark" />
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => goToAuth('login')}
                    className="text-white font-bold hover:text-cyan-400 transition-colors hidden sm:block"
                >
                    Já tenho conta
                </button>
                <button 
                    id="btn-register-hero"
                    onClick={() => goToAuth('register')} 
                    className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold px-6 py-2.5 rounded-full shadow-lg hover:shadow-fuchsia-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    🚀 Começar Grátis
                </button>
            </div>
          </div>
      </nav>

      <section className="bg-slate-900 pt-32 pb-16 px-6 lg:px-16 relative overflow-hidden text-center">
             <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

             <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                
                <div className="animate-fade-in-up w-full flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-900/50 border border-indigo-500/30 rounded-full px-3 py-1 mb-6">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-indigo-200 text-xs font-bold uppercase tracking-wide">Plataforma Inteligente</span>
                    </div>

                    <div className="mb-6 w-full">
                        <HeroCarousel />
                    </div>
                    
                    <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                       A única IA que cria um cronograma baseado no que você <strong>não sabe</strong>. Corrija redações, faça simulados e garanta sua vaga com tecnologia oficial do INEP.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={() => goToAuth('register')} 
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all transform hover:-translate-y-1 text-center"
                        >
                            Criar Conta Gratuita
                        </button>
                        <button 
                            onClick={() => setShowTRITeaser(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold px-8 py-4 rounded-xl border border-slate-700 transition-all text-center"
                        >
                            Calcular minha Nota
                        </button>
                    </div>

                    <div className="mt-10 flex items-center justify-center gap-4 text-sm text-slate-500 font-medium">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                            <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-900"></div>
                            <div className="w-8 h-8 rounded-full bg-slate-500 border-2 border-slate-900"></div>
                        </div>
                        <p>Junte-se a +18.000 estudantes</p>
                    </div>
                </div>
             </div>
      </section>

        <section className="bg-slate-900 py-16 px-8 text-center relative overflow-hidden">
            <h2 className="text-3xl font-extrabold text-white mb-10">Ferramentas Gratuitas para Impulsionar Seus Estudos.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <button 
                    onClick={() => setShowTRITeaser(true)}
                    className="p-8 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all duration-300 text-white shadow-lg flex flex-col items-center justify-center group"
                >
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="12" y2="9"/></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Calculadora de TRI Simplificada</h3>
                    <p className="text-slate-400 text-sm">Estime sua nota no ENEM rapidamente.</p>
                    <span className="mt-4 text-indigo-400 group-hover:text-white font-bold text-sm flex items-center gap-2">
                        Calcular Agora <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                </button>
                <button 
                    onClick={() => setShowCutoffTeaser(true)}
                    className="p-8 bg-slate-800 rounded-2xl border border-slate-700 hover:border-fuchsia-500 transition-all duration-300 text-white shadow-lg flex flex-col items-center justify-center group"
                >
                     <div className="w-16 h-16 bg-fuchsia-500/20 rounded-full flex items-center justify-center mb-4 text-fuchsia-400 group-hover:bg-fuchsia-500 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Simulador de Nota de Corte</h3>
                    <p className="text-slate-400 text-sm">Descubra a nota que você precisa para o seu curso.</p>
                    <span className="mt-4 text-fuchsia-400 group-hover:text-white font-bold text-sm flex items-center gap-2">
                        Simular Agora <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                </button>
            </div>
        </section>

        <section className="bg-slate-50 py-24 px-8 lg:px-16">
            <div className="max-w-4xl mx-auto mb-16 text-center">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4">Chega de Perder Tempo.</h2>
                <p className="text-slate-600 text-lg">Veja a IA Trabalhando Pela Sua Aprovação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col hover:border-indigo-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 group-hover:bg-indigo-50/50 transition-colors">
                        <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-widest mb-3 bg-indigo-100 inline-block px-2 py-1 rounded">
                             DESAFIO: Otimização
                        </h3>
                        <p className="text-slate-700 font-serif text-lg leading-relaxed italic">
                            "Não sei onde focar. Perco tempo estudando o que já sei."
                        </p>
                    </div>
                    <div className="p-4 bg-white flex-grow flex items-center justify-center overflow-hidden">
                        <MockupSchedule />
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-white relative z-10">
                         <div>
                             <h4 className="text-xl font-bold text-slate-900 mb-2">Cronograma Data-Driven</h4>
                             <p className="text-slate-600 text-sm leading-relaxed">
                                 O seu GPS de Estudo. Nossa IA inverte a lógica: <strong className="text-cyan-600">prioriza o que você sabe menos</strong> e constrói um plano focado na sua aprovação.
                             </p>
                         </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col hover:border-indigo-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 group-hover:bg-indigo-50/50 transition-colors">
                         <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-widest mb-3 bg-indigo-100 inline-block px-2 py-1 rounded">
                             DESAFIO: Correção
                        </h3>
                        <p className="text-slate-700 font-serif text-lg leading-relaxed italic">
                            "Recebo 780, mas não sei como chegar ao 1000."
                        </p>
                    </div>
                    <div className="p-4 bg-white flex-grow flex items-center justify-center overflow-hidden">
                        <MockupCorrection />
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-white relative z-10">
                         <div>
                             <h4 className="text-xl font-bold text-slate-900 mb-2">Corretor 5-Competências</h4>
                             <p className="text-slate-600 text-sm leading-relaxed">
                                 Feedback Cirúrgico. Receba a nota exata de cada competência (C1 a C5) e saiba <strong className="text-amber-600">exatamente o que corrigir</strong>.
                             </p>
                         </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col relative hover:border-indigo-200">
                    <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-20 shadow-sm">PREMIUM</div>
                    <div className="p-6 bg-slate-50 border-b border-slate-200 group-hover:bg-indigo-50/50 transition-colors">
                        <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-widest mb-3 bg-indigo-100 inline-block px-2 py-1 rounded">
                             DESAFIO: Recorrência
                        </h3>
                        <p className="text-slate-700 font-serif text-lg leading-relaxed italic">
                            "Estudo, estudo, mas erro sempre as mesmas coisas."
                        </p>
                    </div>
                    <div className="p-4 bg-white flex-grow flex items-center justify-center overflow-hidden">
                        <MockupTurbo />
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-white relative z-10">
                         <div>
                             <h4 className="text-xl font-bold text-slate-900 mb-2">Simulados & Revisão Turbo</h4>
                             <p className="text-slate-600 text-sm leading-relaxed">
                                 Sua IA Anti-Esquecimento. Faça simulados completos (Dia 1/2) e gere <strong className="text-fuchsia-600">mini-testes instantâneos</strong> só com o que você errou.
                             </p>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="bg-white py-24 px-8 lg:px-16 border-t border-slate-100">
             <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                 <div className="flex-1">
                     <span className="text-cyan-500 font-bold tracking-wider text-xs uppercase mb-2 block">TECNOLOGIA GEMINI</span>
                     <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-6">Pensa como um Mentor. Corrige como a Banca.</h2>
                     <p className="text-slate-600 mb-6 leading-relaxed text-lg">
                         Nossa IA não apenas corrige. Ela ensina. Com o <strong className="text-indigo-600">Corretor Multimodal</strong>, você tira uma foto da redação e recebe um feedback completo em segundos, exatamente como a banca do INEP faria, com foco nas 5 Competências.
                     </p>
                     
                     <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
                         <div className="flex items-center gap-2 group cursor-pointer hover:text-green-600 transition-colors">
                             <span className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] group-hover:animate-ping"></span> OCR Ativo
                         </div>
                         <div className="flex items-center gap-2 group cursor-pointer hover:text-cyan-600 transition-colors">
                            <span className="w-3 h-3 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)] group-hover:animate-ping"></span> Feedback Instantâneo
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex-1 relative group w-full">
                     <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-2xl transform rotate-2 group-hover:rotate-1 transition-all opacity-20"></div>
                     <MockupInteractiveEssay />
                 </div>
             </div>
        </section>

        <section className="bg-slate-50 py-24 px-8 lg:px-16 border-t border-slate-100">
             <div className="max-w-6xl mx-auto flex flex-col-reverse md:flex-row items-center gap-16">
                 
                 <div className="flex-1 w-full relative group">
                     <div className="absolute top-10 left-10 w-full h-full bg-indigo-900/5 rounded-2xl transform rotate-2 pointer-events-none"></div>
                     <MockupSisu />
                 </div>

                 <div className="flex-1">
                     <span className="text-cyan-600 font-bold tracking-wider text-xs uppercase mb-2 block">VISÃO DE APROVAÇÃO SISU</span>
                     <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-6">Seu Próximo Passo Rumo à Aprovação.</h2>
                     <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                         Chega de fazer simulados sem saber o que fazer com a nota. Nosso sistema busca <strong className="text-indigo-600">dados reais do SISU via Google</strong> e compara seu desempenho TRI em tempo real, te dando o mapa exato até a aprovação.
                     </p>
                     
                     <ul className="space-y-4 mb-8">
                         <li className="flex items-start gap-3">
                             <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-1 flex-shrink-0">
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                             </div>
                             <p className="text-slate-700 text-sm">Monitoramento de nota de corte em tempo real.</p>
                         </li>
                         <li className="flex items-start gap-3">
                             <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-1 flex-shrink-0">
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                             </div>
                             <p className="text-slate-700 text-sm">Cálculo automático de gap (pontos faltantes).</p>
                         </li>
                         <li className="flex items-start gap-3">
                             <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-1 flex-shrink-0">
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                             </div>
                             <p className="text-slate-700 text-sm">Planejamento reverso baseado na meta.</p>
                         </li>
                     </ul>

                     <button onClick={() => goToAuth('register')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg">
                         Começar Minha Simulação
                     </button>
                 </div>
             </div>
        </section>

        <section className="bg-white py-24 px-8 lg:px-16 border-t border-slate-100">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">Feras de Verdade. Resultados Reais.</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {[
                        { name: "Lucas S.", course: "Engenharia (USP)", text: "O cronograma dinâmico salvou meu ano. Parei de perder tempo." },
                        { name: "Mariana L.", course: "Direito (PUC)", text: "A revisão turbo é surreal. Errei crase, fiz o treino e nunca mais errei." },
                        { name: "Pedro H.", course: "Medicina (Unifesp)", text: "Subi 200 pontos na redação só ajustando a C3 com as dicas da IA." }
                    ].map((testimonial, i) => (
                        <div key={i} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-600 italic text-lg mb-6">"{testimonial.text}"</p>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                                    {testimonial.name[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{testimonial.name}</p>
                                    <p className="text-xs text-slate-500">{testimonial.course}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-center">
                     <div className="bg-slate-900 text-white px-8 py-4 rounded-full flex items-center gap-4 shadow-xl">
                         <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                         <span className="font-mono font-bold text-lg">Mais de 18.000 Redações Corrigidas</span>
                     </div>
                </div>
            </div>
        </section>

        <section className="bg-indigo-900 py-24 px-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-white rounded-full blur-[150px]"></div>
            </div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 tracking-tight">Não Perca Mais Tempo.</h2>
                <p className="text-indigo-200 mb-10 text-xl font-light">Seu cronograma data-driven e a vaga na universidade estão a um clique de distância.</p>
                
                <button 
                    onClick={() => goToAuth('register')} 
                    className="px-14 py-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-full shadow-[0_0_30px_rgba(217,70,239,0.6)] transform transition-all hover:scale-105 text-xl"
                >
                    🚀 Começar Grátis Agora
                </button>
            </div>

            <div className="mt-20 border-t border-indigo-800/50 pt-8 flex justify-center gap-8 text-sm text-indigo-400 relative z-10">
                <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>
        </section>
    </div>
  );
};
  
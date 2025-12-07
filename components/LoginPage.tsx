import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import Logo from './Logo';
import TRICalculatorTeaser from './TRICalculatorTeaser';
import CutoffSimulatorTeaser from './CutoffSimulatorTeaser';
import { authenticateUser } from '../services/storageService';

interface LoginPageProps {
  onLogin: (user: User) => void;
  user?: User | null;
  onEnterApp?: () => void;
}

type PageView = 'landing' | 'auth';
type AuthMode = 'login' | 'register' | 'forgot';

// --- HIGH FIDELITY REALISTIC MOCKUPS ---

const MockupSchedule = () => (
  <div className="w-full h-72 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative group hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.15)] transition-all duration-500">
      {/* Header do Sistema */}
      <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cronograma Inteligente v2.0</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          {/* Sidebar fake */}
          <div className="w-12 border-r border-slate-100 bg-slate-50 flex flex-col items-center py-4 gap-3">
              <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">📅</div>
              <div className="w-6 h-6 rounded hover:bg-slate-200 text-slate-400 flex items-center justify-center text-[10px]">📊</div>
              <div className="w-6 h-6 rounded hover:bg-slate-200 text-slate-400 flex items-center justify-center text-[10px]">⚙️</div>
          </div>

          {/* Conteúdo Principal - Kanban Realista */}
          <div className="flex-1 p-4 bg-slate-50/30">
              <div className="flex justify-between items-end mb-4">
                  <div>
                      <div className="text-xs text-slate-500 font-medium">Meta: Medicina USP</div>
                      <div className="text-sm font-bold text-slate-800">Semana 12 - Foco: Natureza</div>
                  </div>
                  <div className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Em dia ✅</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  {/* Card 1 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden group/card">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">FÍSICA</span>
                          <input type="checkbox" checked readOnly className="accent-indigo-600 w-3 h-3" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 mb-1">Termodinâmica: Ciclo de Carnot</p>
                      <div className="flex gap-1 mt-2">
                          <span className="h-1 w-8 bg-green-500 rounded-full"></span>
                          <span className="h-1 w-8 bg-green-500 rounded-full"></span>
                          <span className="h-1 w-8 bg-slate-200 rounded-full"></span>
                      </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden opacity-60">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500"></div>
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">QUÍMICA</span>
                          <input type="checkbox" className="accent-pink-600 w-3 h-3" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 mb-1">Estequiometria Avançada</p>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
                          <div className="bg-pink-500 h-1 rounded-full w-1/3"></div>
                      </div>
                  </div>
              </div>

              {/* Botão Flutuante Sugerido pela IA */}
              <div className="mt-3 flex items-center gap-2 bg-indigo-600 text-white p-2 rounded-lg shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✨</div>
                  <div className="text-[10px] font-medium leading-tight">
                      <span className="font-bold block">Sugestão da IA:</span>
                      Revise "Leis de Newton" hoje. Você errou 2 questões ontem.
                  </div>
              </div>
          </div>
      </div>
  </div>
);

const MockupCorrection = () => (
  <div className="w-full h-72 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden relative group hover:shadow-[0_20px_50px_rgba(217,_70,_239,_0.15)] transition-all duration-500 flex">
      {/* Lado Esquerdo - A Redação (Simulação visual) */}
      <div className="w-1/2 bg-slate-50 p-4 border-r border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-slate-50 to-transparent z-10"></div>
          <div className="space-y-3 opacity-70 font-serif text-[10px] leading-relaxed text-slate-600 select-none">
              <p>A Constituição Federal de 1988, documento jurídico mais importante do país, prevê em seu artigo 6º, o direito à educação como inerente a todo cidadão brasileiro.</p>
              <p>Conquanto, tal prerrogativa não tem se reverberado com ênfase na prática quando se observa <span className="bg-red-100 text-red-700 px-0.5 border-b border-red-300">a evasão escolar</span> e a falta de infraestrutura.</p>
              <p>Diante desse cenário, faz-se imperioso analisar as causas...</p>
              <div className="h-2 w-full bg-slate-200 rounded animate-pulse"></div>
              <div className="h-2 w-3/4 bg-slate-200 rounded animate-pulse"></div>
          </div>
          {/* Marcação da IA */}
          <div className="absolute top-20 left-4 right-4 border border-red-400 bg-red-50/20 h-6 rounded pointer-events-none"></div>
          <div className="absolute top-16 right-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">Erro de Coesão</div>
      </div>

      {/* Lado Direito - O Feedback da IA */}
      <div className="w-1/2 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-50 text-center bg-fuchsia-50/30">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Nota Final</div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600">960</div>
          </div>
          
          <div className="p-3 space-y-2 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-600">C1. Norma Culta</span>
                  <span className="font-bold text-fuchsia-600 bg-fuchsia-50 px-1.5 rounded">160</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full"><div className="w-[80%] bg-fuchsia-500 h-1 rounded-full"></div></div>
              
              <div className="flex justify-between items-center text-[10px] mt-2">
                  <span className="font-bold text-slate-600">C2. Tema</span>
                  <span className="font-bold text-green-600 bg-green-50 px-1.5 rounded">200</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full"><div className="w-full bg-green-500 h-1 rounded-full"></div></div>

              <div className="mt-3 bg-slate-50 p-2 rounded border border-slate-100">
                  <p className="text-[9px] text-slate-500 italic">"Excelente uso de repertório sociocultural ao citar a Constituição. Na competência 1, atenção ao uso de crase..."</p>
              </div>
          </div>
      </div>
  </div>
);

const MockupSisu = () => (
    <div className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative flex flex-col group hover:border-emerald-500/50 transition-colors duration-500">
        {/* Top Bar */}
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">SISU Live Tracking</span>
            </div>
            <div className="text-[10px] text-slate-500">Atualizado: Hoje</div>
        </div>

        <div className="p-5 flex flex-col h-full justify-between relative">
            {/* Chart Background Grid */}
            <div className="absolute inset-0 p-5 z-0 opacity-10">
                <div className="h-full w-full border-l border-b border-slate-500 flex items-end">
                    <div className="w-1/4 h-[40%] bg-white mx-1"></div>
                    <div className="w-1/4 h-[60%] bg-white mx-1"></div>
                    <div className="w-1/4 h-[50%] bg-white mx-1"></div>
                    <div className="w-1/4 h-[80%] bg-white mx-1"></div>
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-end mb-1">
                    <div className="text-sm font-medium text-slate-400">Medicina - USP</div>
                    <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Aprovado Virtualmente</div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                    <div className="text-4xl font-black text-white">812.4</div>
                    <div className="text-xs text-slate-400">sua média</div>
                </div>

                {/* Progress Bar vs Cutoff */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span>Minha Nota</span>
                        <span>Corte (805.2)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                        {/* Cutoff Marker */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: '85%' }}></div>
                        {/* User Progress */}
                        <div className="h-full w-[88%] bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full relative z-10"></div>
                    </div>
                </div>
            </div>

            {/* Bottom Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Probabilidade</div>
                    <div className="text-lg font-bold text-emerald-400">94%</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Evolução Mês</div>
                    <div className="text-lg font-bold text-white">+12.5</div>
                </div>
            </div>
        </div>
    </div>
);

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

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, user, onEnterApp }) => {
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
        const existingUser = authenticateUser(email);
        if (existingUser) {
            onLogin(existingUser);
        } else {
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
                hasSelectedPlan: false,
                usage: { essaysCount: 0, lastEssayDate: null, examsCount: 0, lastExamDate: null, schedulesCount: 0, lastScheduleDate: null },
                tokensConsumed: 0
            };
            onLogin(mockUser);
        }
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
            hasSelectedPlan: false,
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

  // View: LANDING
  return (
    <div className="min-h-screen bg-slate-900 font-sans selection:bg-fuchsia-500 selection:text-white">
      
      {showTRITeaser && <TRICalculatorTeaser onClose={() => setShowTRITeaser(false)} />}
      {showCutoffTeaser && <CutoffSimulatorTeaser onClose={() => setShowCutoffTeaser(false)} />}

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/90 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-16 flex justify-between items-center">
            <Logo variant="dark" />
            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        <span className="text-slate-300 font-medium hidden sm:block">Olá, <span className="text-white font-bold">{user.name.split(' ')[0]}</span></span>
                        <button 
                            onClick={onEnterApp} 
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold px-6 py-2.5 rounded-full shadow-lg hover:shadow-fuchsia-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            Ir para o App <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </button>
                    </>
                ) : (
                    <>
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
                    </>
                )}
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
                        {user ? (
                            <button 
                                onClick={onEnterApp} 
                                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all transform hover:-translate-y-1 text-center"
                            >
                                Acessar Dashboard
                            </button>
                        ) : (
                            <button 
                                onClick={() => goToAuth('register')} 
                                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all transform hover:-translate-y-1 text-center"
                            >
                                Criar Conta Gratuita
                            </button>
                        )}
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

      {/* --- FEATURES GRID --- */}
      <section className="py-20 px-6 bg-slate-800 relative">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all group">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-indigo-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Simulados Oficiais</h3>
                  <p className="text-slate-400 leading-relaxed">Treine com questões inéditas e oficiais do INEP. Cronômetro real e pressão de prova para você não travar no dia.</p>
              </div>
              <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 hover:border-fuchsia-500 transition-all group">
                  <div className="w-12 h-12 bg-fuchsia-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-fuchsia-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-fuchsia-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Redação Inteligente</h3>
                  <p className="text-slate-400 leading-relaxed">Envie fotos de folhas manuscritas. Nossa IA transcreve e corrige em segundos, com nota C1-C5 e dicas de intervenção.</p>
              </div>
              <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-all group">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Dados do SISU</h3>
                  <p className="text-slate-400 leading-relaxed">Não estude no escuro. Saiba exatamente qual nota você precisa para Medicina na USP ou Direito na UFRJ.</p>
              </div>
          </div>
      </section>

      {/* --- DEEP DIVE: SCHEDULE --- */}
      <section className="py-24 px-6 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2">
                  <span className="text-indigo-600 font-bold tracking-wider uppercase text-xs">Cronograma Adaptativo</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 mb-6">A IA que planeja sua rotina enquanto você dorme.</h2>
                  <p className="text-slate-600 text-lg leading-relaxed mb-6">
                      Esqueça planilhas genéricas. O Estude.IA analisa seu tempo disponível, suas dificuldades (ex: Trigonometria) e seus pesos no SISU para criar o cronograma perfeito.
                  </p>
                  <ul className="space-y-3 mb-8">
                      {['Priorização baseada em peso x dificuldade', 'Ajuste automático semanal', 'Ciclos de revisão espaçada'].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              {item}
                          </li>
                      ))}
                  </ul>
                  <button onClick={() => goToAuth('register')} className="text-indigo-600 font-bold border-b-2 border-indigo-600 pb-1 hover:text-indigo-800 transition-colors">
                      Criar meu cronograma →
                  </button>
              </div>
              <div className="md:w-1/2 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl transform rotate-3 scale-105 opacity-20 blur-xl"></div>
                  <div className="relative transform transition-transform hover:-rotate-1 duration-500">
                      <MockupSchedule />
                  </div>
              </div>
          </div>
      </section>

      {/* --- DEEP DIVE: CORRECTION --- */}
      <section className="py-24 px-6 bg-slate-50 border-y border-slate-200 overflow-hidden">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
              <div className="md:w-1/2">
                  <span className="text-fuchsia-600 font-bold tracking-wider uppercase text-xs">Correção Oficial</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 mb-6">Seu corretor particular, disponível 24 horas.</h2>
                  <p className="text-slate-600 text-lg leading-relaxed mb-6">
                      Tire uma foto do seu rascunho. Em segundos, nossa Visão Computacional transcreve sua letra e a IA avalia com base nas 5 Competências do ENEM, igual à banca oficial.
                  </p>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">IA</div>
                          <div>
                              <p className="text-sm text-slate-800 font-medium">"Na competência 3, você precisa conectar melhor a citação de Bauman com seu argumento sobre redes sociais..."</p>
                              <p className="text-xs text-slate-400 mt-2">Exemplo de feedback real</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="md:w-1/2 relative">
                  <div className="absolute inset-0 bg-fuchsia-500 rounded-full filter blur-[80px] opacity-20"></div>
                  <MockupCorrection />
              </div>
          </div>
      </section>

      {/* --- DEEP DIVE: SISU & DASHBOARD --- */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-800/50 skew-x-12 transform origin-top-right"></div>
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="md:w-1/2">
                  <span className="text-emerald-400 font-bold tracking-wider uppercase text-xs">Inteligência de Dados</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-6">Não chute. Calcule sua aprovação.</h2>
                  <p className="text-slate-300 text-lg leading-relaxed mb-8">
                      O Estude.IA monitora as notas de corte das principais universidades. Defina sua meta (ex: "Medicina na USP") e veja o gráfico de evolução: o quanto falta para você passar hoje?
                  </p>
                  <div className="flex gap-4">
                      <div className="text-center">
                          <div className="text-3xl font-black text-white">90+</div>
                          <div className="text-xs text-slate-400 uppercase font-bold mt-1">Simulados Oficiais</div>
                      </div>
                      <div className="w-px bg-slate-700 h-12"></div>
                      <div className="text-center">
                          <div className="text-3xl font-black text-white">TRI</div>
                          <div className="text-xs text-slate-400 uppercase font-bold mt-1">Algoritmo Real</div>
                      </div>
                  </div>
                  
                  <div className="mt-8">
                      <button 
                        onClick={() => setShowCutoffTeaser(true)}
                        className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
                      >
                          <span className="border-b border-emerald-400 pb-0.5">Simular minha nota de corte agora</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </button>
                  </div>
              </div>
              <div className="md:w-1/2 h-80">
                  <MockupSisu />
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
                
                {user ? (
                    <button 
                        onClick={onEnterApp} 
                        className="px-14 py-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-full shadow-[0_0_30px_rgba(217,70,239,0.6)] transform transition-all hover:scale-105 text-xl"
                    >
                        🚀 Ir para o App
                    </button>
                ) : (
                    <button 
                        onClick={() => goToAuth('register')} 
                        className="px-14 py-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-full shadow-[0_0_30px_rgba(217,70,239,0.6)] transform transition-all hover:scale-105 text-xl"
                    >
                        🚀 Começar Grátis Agora
                    </button>
                )}
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
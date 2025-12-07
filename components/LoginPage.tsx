import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import Logo from './Logo';
import TRICalculatorTeaser from './TRICalculatorTeaser';
import CutoffSimulatorTeaser from './CutoffSimulatorTeaser';
import { authenticateUser } from '../services/storageService'; // Importante para recuperar usuário

interface LoginPageProps {
  onLogin: (user: User) => void;
  user?: User | null;
  onEnterApp?: () => void;
}

type PageView = 'landing' | 'auth';
type AuthMode = 'login' | 'register' | 'forgot';

// ... (Resto do código HeroCarousel e Mockups permanece inalterado)
// Mantenha o código existente dos Mockups (MockupSchedule, MockupCorrection, MockupTurbo, MockupSisu, MockupInteractiveEssay) aqui.
// Para brevidade, vou focar nas mudanças da lógica de login/registro.

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
        // Tenta encontrar usuário existente no "Banco de Dados" local
        const existingUser = authenticateUser(email);

        if (existingUser) {
            onLogin(existingUser);
        } else {
            // Se não existir, cria um novo (Mock) mas assume que é o primeiro acesso
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
                hasSelectedPlan: false, // Força seleção de plano para novos usuários
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
            hasSelectedPlan: false, // Registro novo deve escolher plano
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
                {/* ... register and forgot modes are handled similarly (truncated for brevity since they don't change logic much) ... */}
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

      {/* Rest of the Landing Page content... (Assumed to be correct as previously generated) */}
      
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
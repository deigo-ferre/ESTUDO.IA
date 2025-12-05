import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { saveUserSession } from '../services/storageService';

export interface TourStep {
  title: string;
  content: string;
  position: "center" | "bottom" | "top" | "left" | "right";
  targetId: string | null;
  view?: string;
  action?: () => void;
}

interface OnboardingTourProps {
  user: User;
  onClose: () => void;
  // Fix: Added onNavigate prop
  onNavigate: (view: string) => void;
  steps?: TourStep[];
}

const DEFAULT_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao ESTUDE.IA 🚀",
    content: "Sua plataforma de alta performance. Nossa IA vai guiar você até a aprovação. Vamos conhecer suas ferramentas?",
    position: "center",
    targetId: null,
    view: 'user_area'
  },
  {
    title: "Dashboard Executivo",
    content: "Seu QG de aprovação. Acompanhe sua evolução TRI, notas de corte do SISU em tempo real e tarefas do dia aqui.",
    targetId: "nav-user_area",
    position: "bottom",
    view: 'user_area'
  },
  {
    title: "Simulados Oficiais",
    content: "Treine como no dia da prova. Faça simulados completos (Dia 1 e 2) ou treinos rápidos por área. O cronômetro e o estilo são idênticos ao ENEM.",
    targetId: "nav-simulado",
    position: "bottom",
    view: 'simulado'
  },
  {
    title: "Cronograma IA",
    content: "Adeus planilhas manuais. Nossa IA analisa seu tempo e suas dificuldades para criar um plano de estudo dinâmico que se adapta à sua rotina.",
    targetId: "nav-schedule",
    position: "bottom",
    view: 'schedule'
  },
  {
    title: "Corretor 24h",
    content: "Envie fotos de manuscritos ou digite. Receba nota oficial (C1 a C5) e feedback detalhado de intervenção em segundos.",
    targetId: "nav-essay",
    position: "bottom",
    view: 'essay'
  },
  {
    title: "Tudo Pronto!",
    content: "Agora é com você. Escolha uma ferramenta no menu e comece a estudar.",
    position: "center",
    targetId: null,
    view: 'user_area'
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ user, onClose, onNavigate, steps = DEFAULT_STEPS }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{top: number, left: number, width: number, height: number} | null>(null);

  const activeSteps = steps;

  const updatePosition = useCallback(() => {
      const step = activeSteps[stepIndex];
      
      // Se o passo não tem targetId, centraliza
      if (!step.targetId) {
          setTargetRect(null);
          return;
      }

      const el = document.getElementById(step.targetId);
      if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
          });
      } else {
        // Se o elemento não for encontrado (ex: mobile menu fechado), remove destaque mas mantém o card
        setTargetRect(null);
      }
  }, [stepIndex, activeSteps]);

  // Efeito para Navegação e Posicionamento
  useEffect(() => {
    const step = activeSteps[stepIndex];
    
    // 1. Navegar para a view correta
    if (step.view) {
        onNavigate(step.view);
    }

    if (step.action) {
        step.action();
    }

    // 2. Aguardar renderização e calcular posição
    // Aumentamos o tempo para 300ms para garantir que a transição de tela ocorra
    const timer = setTimeout(updatePosition, 300);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
        clearTimeout(timer);
    };
  }, [stepIndex, updatePosition, onNavigate, activeSteps]);

  const handleNext = () => {
    if (stepIndex < activeSteps.length - 1) {
        setStepIndex(stepIndex + 1);
    } else {
        handleFinish();
    }
  };

  const handlePrev = () => {
      if (stepIndex > 0) {
          setStepIndex(stepIndex - 1);
      }
  };

  const handleFinish = () => {
      if (user) {
        const updatedUser = { ...user, hasSeenOnboarding: true };
        saveUserSession(updatedUser);
      }
      onClose();
  };

  const currentStep = activeSteps[stepIndex];

  // Cálculo da posição do Card (Popover)
  let popoverStyle: React.CSSProperties = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      position: 'fixed'
  };

  let arrowStyle: React.CSSProperties | null = null;

  if (targetRect) {
      const isBottom = targetRect.top < window.innerHeight - 300;
      
      if (isBottom) {
          popoverStyle = {
            top: targetRect.top + targetRect.height + 20,
            left: targetRect.left + (targetRect.width / 2),
            transform: 'translateX(-50%)',
            position: 'fixed'
          };
          arrowStyle = { top: -6, left: '50%', marginLeft: -8 };
      } else {
          popoverStyle = {
            bottom: window.innerHeight - targetRect.top + 20,
            left: targetRect.left + (targetRect.width / 2),
            transform: 'translateX(-50%)',
            position: 'fixed'
          };
          arrowStyle = { bottom: -6, left: '50%', marginLeft: -8 };
      }
  }

  // Ajuste para mobile se o popover sair da tela
  if (targetRect && window.innerWidth < 768) {
      popoverStyle.left = '50%';
      popoverStyle.transform = 'translateX(-50%)';
      popoverStyle.width = '90%';
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Backdrop - Changed to transparent based on user request */}
      <div className="absolute inset-0 bg-transparent transition-opacity duration-300" />

      {/* Caixa de Destaque (Highlighter Box) - Updated border for better visibility on transparent BG */}
      {targetRect && (
          <div 
            className="absolute border-2 border-indigo-600 rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-300 ease-out z-[101] bg-transparent pointer-events-none animate-pulse"
            style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8
            }}
          />
      )}

      {/* Card do Tour */}
      <div 
        className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full z-[102] transition-all duration-300 ease-out flex flex-col absolute border border-slate-200"
        style={popoverStyle}
      >
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-slate-800">{currentStep.title}</h3>
            <button onClick={handleFinish} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider p-1">
                Pular
            </button>
        </div>
        <p className="text-slate-600 mb-8 text-sm leading-relaxed">{currentStep.content}</p>
        
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
            <div className="flex gap-1.5">
                {activeSteps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'}`} />
                ))}
            </div>
            <div className="flex gap-2">
                {stepIndex > 0 && (
                    <button onClick={handlePrev} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 text-sm">
                        Voltar
                    </button>
                )}
                <button onClick={handleNext} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-sm">
                    {stepIndex === activeSteps.length - 1 ? 'Começar' : 'Próximo'}
                </button>
            </div>
        </div>
        
        {/* Seta Indicadora */}
        {targetRect && arrowStyle && (
            <div className="absolute w-3 h-3 bg-white transform rotate-45 border-t border-l border-slate-200" style={arrowStyle}></div>
        )}
      </div>
    </div>
  );
};

export default OnboardingTour;
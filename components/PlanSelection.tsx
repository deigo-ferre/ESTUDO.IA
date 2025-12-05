import React, { useState, useEffect, useRef } from 'react';
import { PlanType } from '../types';
import Logo from './Logo';
import { initMercadoPago, createPreference, processBrickPayment } from '../services/paymentService';
import { getSettings } from '../services/storageService';

interface PlanSelectionProps {
  onSelectPlan: (plan: PlanType) => void;
}

// --- SUB-COMPONENTS ---

const FeatureItem: React.FC<{ text: string; included: boolean; excluded?: boolean; highlight?: boolean; highlightColor?: string }> = ({ text, included, excluded, highlight, highlightColor }) => (
    <div className={`flex items-center gap-3 text-sm ${excluded ? 'opacity-50' : 'opacity-100'}`}>
        {included ? (
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-white text-indigo-900' : 'bg-emerald-500/20 text-emerald-400'}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
        ) : (
            <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0 text-slate-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
        )}
        <span className={`${highlight ? 'font-bold text-white' : 'text-slate-300'} ${highlightColor ? highlightColor + ' font-bold' : ''} ${excluded ? 'line-through decoration-slate-600' : ''}`}>
            {text}
        </span>
    </div>
);

// --- MODAL WRAPPER WITH MERCADO PAGO BRICK ---

interface PaymentModalProps {
    plan: PlanType;
    onClose: () => void;
    onSuccess: (plan: PlanType) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ plan, onClose, onSuccess }) => {
    const [successMode, setSuccessMode] = useState(false);
    const [loadingBrick, setLoadingBrick] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const brickControllerRef = useRef<any>(null);
    
    const settings = getSettings();
    const isDark = settings.theme === 'dark';

    useEffect(() => {
        const loadBrick = async () => {
            setLoadingBrick(true);
            setError(null);

            const mp = initMercadoPago();
            if (!mp) {
                setError("Erro de configuração: Chave pública do Mercado Pago não encontrada ou SDK falhou.");
                setLoadingBrick(false);
                return;
            }

            // Criação da preferência no backend real
            const { preferenceId, error: prefError } = await createPreference(plan);
            
            if (prefError || !preferenceId) {
                console.error(prefError);
                setError(prefError || "Não foi possível conectar ao servidor de pagamento.");
                setLoadingBrick(false);
                return;
            }
            
            try {
                const bricksBuilder = mp.bricks();
                
                const container = document.getElementById('payment-brick-container');
                if (container) container.innerHTML = '';

                const brickSettings = {
                    initialization: {
                        amount: plan === 'ADVANCED' ? 29.90 : 49.90, // Valor visual
                        preferenceId: preferenceId, // ID real gerado pelo backend
                    },
                    customization: {
                        paymentMethods: {
                            ticket: "all",
                            bankTransfer: "all",
                            creditCard: "all",
                            debitCard: "all",
                            mercadoPago: "all",
                        },
                        visual: {
                            style: {
                                theme: isDark ? 'dark' : 'default',
                            }
                        },
                    },
                    callbacks: {
                        onReady: () => {
                            setLoadingBrick(false);
                        },
                        onSubmit: ({ selectedPaymentMethod, formData }: any) => {
                            return new Promise<void>((resolve, reject) => {
                                processBrickPayment(formData)
                                    .then((result) => {
                                        // A lógica de aprovação real depende do webhook do MP ou resposta imediata
                                        resolve();
                                        handleSuccess(plan);
                                    })
                                    .catch((error) => {
                                        reject();
                                        setError("Erro ao processar pagamento. Tente novamente.");
                                    });
                            });
                        },
                        onError: (error: any) => {
                            console.error("Brick Error:", error);
                            setLoadingBrick(false); 
                            setError("Ocorreu um erro no formulário de pagamento.");
                        },
                    },
                };
                
                brickControllerRef.current = await bricksBuilder.create(
                    "payment",
                    "payment-brick-container",
                    brickSettings
                );
            } catch (e) {
                console.error("Erro ao inicializar Brick", e);
                setError("Falha ao carregar o sistema de pagamento.");
                setLoadingBrick(false);
            }
        };

        loadBrick();

    }, [plan, isDark]);

    const handleSuccess = (p: PlanType) => {
        setSuccessMode(true);
        setTimeout(() => {
            onSuccess(p);
        }, 2500);
    };

    if (successMode) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
                <div className={`rounded-3xl p-8 border border-emerald-500/50 shadow-2xl shadow-emerald-500/20 max-w-md w-full text-center relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/40">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Pagamento Aprovado!</h2>
                        <p className={`${isDark ? 'text-slate-300' : 'text-slate-500'} mb-6`}>Sua assinatura foi ativada com sucesso.<br/>Bem-vindo ao nível superior.</p>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            <div className="h-full bg-emerald-500 animate-[loading_2.5s_ease-in-out_forwards]" style={{width: '0%'}}></div>
                        </div>
                        <style>{`@keyframes loading { to { width: 100%; } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
            <div className={`rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border relative flex flex-col my-8 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button onClick={onClose} className={`absolute top-4 right-4 z-10 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className={`p-6 border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${plan === 'PREMIUM' ? 'bg-fuchsia-600 text-white' : 'bg-indigo-600 text-white'}`}>
                            {plan === 'PREMIUM' ? '👑' : '⭐'}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mercado Pago</p>
                            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan === 'ADVANCED' ? 'Plano Avançado' : 'Plano Premium'}</h3>
                        </div>
                        <div className="ml-auto text-right">
                            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>R$ {plan === 'ADVANCED' ? '29,90' : '49,90'}</p>
                            <p className="text-xs text-slate-500">/mês</p>
                        </div>
                    </div>
                </div>

                <div className={`p-4 md:p-8 ${isDark ? 'bg-slate-900' : 'bg-white'} min-h-[400px]`}>
                    {loadingBrick && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 text-sm animate-pulse">Conectando com Mercado Pago...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-6 p-6 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center gap-3 text-red-600 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h4 className="font-bold text-lg">Erro de Pagamento</h4>
                            <p className="text-sm">{error}</p>
                            <button onClick={onClose} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">Fechar</button>
                        </div>
                    )}

                    <div id="payment-brick-container" className="w-full"></div>
                </div>
            </div>
        </div>
    );
};

const PlanSelection: React.FC<PlanSelectionProps> = ({ onSelectPlan }) => {
    const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanType | null>(null);

    const handleChoosePlan = (plan: PlanType) => {
        if (plan === 'FREE') {
            onSelectPlan(plan);
        } else {
            setSelectedPlanForPayment(plan);
        }
    };

    const handlePaymentSuccess = (plan: PlanType) => {
        setSelectedPlanForPayment(null);
        onSelectPlan(plan);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in text-slate-200">
            <div className="mb-12 text-center">
                <div className="transform scale-150 mb-8 inline-block"><Logo variant="dark" /></div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Escolha o Plano Ideal para Sua Aprovação</h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                    Desbloqueie todo o potencial da IA e garanta sua vaga na universidade com ferramentas exclusivas.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                {/* FREE PLAN */}
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 flex flex-col hover:border-slate-600 transition-colors">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">Gratuito</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-white">R$ 0</span>
                            <span className="text-slate-500">/mês</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-4">Para quem está começando e quer conhecer a plataforma.</p>
                    </div>
                    <div className="space-y-4 mb-8 flex-grow">
                        <FeatureItem text="1 Redação por Mês" included={true} />
                        <FeatureItem text="1 Simulado por Semana" included={true} />
                        <FeatureItem text="Cronograma Básico" included={true} />
                        <FeatureItem text="Correção Detalhada" included={false} excluded={true} />
                        <FeatureItem text="Revisão Turbo" included={false} excluded={true} />
                        <FeatureItem text="Monitoramento SISU" included={false} excluded={true} />
                    </div>
                    <button 
                        onClick={() => handleChoosePlan('FREE')}
                        className="w-full py-3 rounded-xl font-bold border border-slate-600 text-white hover:bg-slate-700 transition-colors"
                    >
                        Começar Grátis
                    </button>
                </div>

                {/* ADVANCED PLAN */}
                <div className="bg-slate-800 rounded-2xl p-8 border border-indigo-500 relative flex flex-col transform md:-translate-y-4 shadow-2xl shadow-indigo-900/20">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        Mais Popular
                    </div>
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">Avançado</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-white">R$ 29,90</span>
                            <span className="text-slate-500">/mês</span>
                        </div>
                        <p className="text-indigo-200 text-sm mt-4">Para quem quer evoluir rápido com correção e métricas.</p>
                    </div>
                    <div className="space-y-4 mb-8 flex-grow">
                        <FeatureItem text="5 Redações por Mês" included={true} highlight={true} highlightColor="text-white" />
                        <FeatureItem text="3 Simulados por Semana" included={true} />
                        <FeatureItem text="Cronograma Adaptativo" included={true} />
                        <FeatureItem text="Correção Detalhada (C1-C5)" included={true} />
                        <FeatureItem text="Monitoramento SISU" included={true} />
                        <FeatureItem text="Revisão Turbo (Limitada)" included={true} />
                    </div>
                    <button 
                        onClick={() => handleChoosePlan('ADVANCED')}
                        className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        Assinar Avançado
                    </button>
                </div>

                {/* PREMIUM PLAN */}
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-8 border border-fuchsia-500/50 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-fuchsia-500/20"></div>
                    <div className="mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">Premium <span className="bg-fuchsia-500/20 text-fuchsia-300 text-[10px] px-2 py-0.5 rounded uppercase">Ilimitado</span></h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-white">R$ 49,90</span>
                            <span className="text-slate-500">/mês</span>
                        </div>
                        <p className="text-fuchsia-200 text-sm mt-4">A experiência completa para garantir sua aprovação.</p>
                    </div>
                    <div className="space-y-4 mb-8 flex-grow relative z-10">
                        <FeatureItem text="Redações Ilimitadas" included={true} highlight={true} highlightColor="text-fuchsia-300" />
                        <FeatureItem text="Simulados Ilimitados" included={true} />
                        <FeatureItem text="Cronograma Inteligente Full" included={true} />
                        <FeatureItem text="Correção Prioritária" included={true} />
                        <FeatureItem text="Monitoramento SISU Pro" included={true} />
                        <FeatureItem text="Revisão Turbo Ilimitada" included={true} highlight={true} highlightColor="text-white" />
                    </div>
                    <button 
                        onClick={() => handleChoosePlan('PREMIUM')}
                        className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:shadow-lg hover:shadow-fuchsia-600/30 transition-all relative z-10"
                    >
                        Ser Premium
                    </button>
                </div>
            </div>

            {selectedPlanForPayment && (
                <PaymentModal 
                    plan={selectedPlanForPayment} 
                    onClose={() => setSelectedPlanForPayment(null)} 
                    onSuccess={handlePaymentSuccess} 
                />
            )}
        </div>
    );
};

export default PlanSelection;
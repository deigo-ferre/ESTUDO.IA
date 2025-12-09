
import React from 'react';

interface SuspendedAccountModalProps {
    onRetryPayment: () => void;
    onContactSupport: () => void;
}

const SuspendedAccountModal: React.FC<SuspendedAccountModalProps> = ({ onRetryPayment, onContactSupport }) => {
    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden text-center relative">
                <div className="bg-red-500 h-2 w-full absolute top-0 left-0"></div>
                <div className="p-10">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Acesso Suspenso</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Identificamos uma pendência no pagamento da sua assinatura. Para continuar acessando os simulados, correção de redação e seu cronograma, por favor regularize sua conta.
                    </p>

                    <div className="space-y-3">
                        <button 
                            onClick={onRetryPayment}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all transform hover:-translate-y-1"
                        >
                            Regularizar Pagamento
                        </button>
                        <button 
                            onClick={onContactSupport}
                            className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Falar com Suporte
                        </button>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Se você já realizou o pagamento, aguarde alguns instantes ou relogue na plataforma.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SuspendedAccountModal;
import React from 'react';
import Logo from './Logo';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-6 h-full min-h-[300px]">
      <div className="relative">
        {/* Glow de fundo */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse"></div>
        
        {/* Logo Animado (Scale Up) */}
        <div className="transform scale-150 relative z-10">
            <Logo variant="light" animated={true} />
        </div>
      </div>
      
      <div className="text-center space-y-2">
          <p className="text-slate-800 font-bold text-lg animate-pulse">
            Processando com IA...
          </p>
          <div className="flex justify-center gap-1">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
          </div>
          <p className="text-slate-400 text-xs font-medium">Analisando dados baseados no padrão INEP</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
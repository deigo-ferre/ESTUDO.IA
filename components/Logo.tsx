import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark'; // light = background claro, dark = background escuro
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({ variant = 'light', showTagline = false, className = '', onClick, animated = false }) => {
  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const taglineColor = isDark ? 'text-slate-400' : 'text-slate-500';
  
  // Cores do Ícone
  const bookCoverColor = isDark ? '#ffffff' : '#1e293b'; // Capa do livro
  const accentColor = '#06b6d4'; // Cyan-500 (Tecnologia)
  const secondaryAccent = '#d946ef'; // Fuchsia-500 (IA/Criatividade)

  return (
    <div 
      className={`flex items-center gap-3 select-none group ${onClick ? 'cursor-pointer' : ''} ${className}`} 
      onClick={onClick}
    >
      <style>{`
        @keyframes float-pixel {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-4px); opacity: 0.8; }
        }
        @keyframes scan-line {
          0% { stroke-dashoffset: 40; opacity: 0; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        .pixel-1 { animation: ${animated ? 'float-pixel 2s ease-in-out infinite' : 'none'}; animation-delay: 0s; }
        .pixel-2 { animation: ${animated ? 'float-pixel 2.5s ease-in-out infinite' : 'none'}; animation-delay: 0.2s; }
        .pixel-3 { animation: ${animated ? 'float-pixel 2.2s ease-in-out infinite' : 'none'}; animation-delay: 0.4s; }
      `}</style>
      
      {/* Icon: Geometric Digital Book */}
      <div className={`relative w-10 h-10 flex-shrink-0`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
            
            {/* Capa do Livro (Base Sólida) */}
            <path 
                d="M8 14 C 8 14 14 16 24 15 C 34 16 40 14 40 14 V 36 C 40 36 34 38 24 37 C 14 38 8 36 8 36 V 14 Z" 
                stroke={bookCoverColor} 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                fill="none"
            />
            
            {/* Lombada Central */}
            <path 
                d="M24 15 V 37" 
                stroke={bookCoverColor} 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                opacity="0.2"
            />

            {/* Página Esquerda (Linhas de Texto/Conhecimento Tradicional) */}
            <path d="M13 22 H 19" stroke={bookCoverColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
            <path d="M13 28 H 20" stroke={bookCoverColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />

            {/* Página Direita (Transformando em Dados/Pixels) */}
            {/* Pixel 1: Base */}
            <rect x="28" y="26" width="4" height="4" rx="1" fill={accentColor} className="pixel-1" />
            
            {/* Pixel 2: Subindo */}
            <rect x="34" y="22" width="4" height="4" rx="1" fill={secondaryAccent} className="pixel-2" />
            
            {/* Pixel 3: Topo (A "Ideia") */}
            <rect x="29" y="18" width="3" height="3" rx="0.5" fill={accentColor} className="pixel-3" />

            {/* Conexão sutil (Circuito) */}
            <path d="M28 30 L 29 27" stroke={accentColor} strokeWidth="1" opacity="0.5" />

        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center">
        <div className={`font-extrabold text-2xl leading-none tracking-tight ${textColor} font-sans flex items-center`}>
          ESTUDE<span className="text-cyan-500">.ia</span>
        </div>
        {showTagline && (
            <span className={`text-[9px] font-bold tracking-[0.2em] uppercase mt-0.5 ${taglineColor}`}>
                Inteligência Oficial
            </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
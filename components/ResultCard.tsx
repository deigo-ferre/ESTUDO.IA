import React, { useState } from 'react';
import { CorrectionResult, Competencia } from '../types';

interface ResultCardProps {
  result: CorrectionResult;
  onReset: () => void;
  onSave: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 800) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 600) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getBarColor = (score: number) => {
    // Escala de competências (0 a 200)
    if (score >= 160) return 'bg-green-500'; // 80%+ (Equivalente a 800+)
    if (score >= 120) return 'bg-yellow-500'; // 60%-79% (Equivalente a 600-799)
    return 'bg-red-500'; // <60%
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onReset, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  const scoreStyle = getScoreColor(result.nota_total);

  const handleSaveClick = () => {
    if (isSaved) return;
    onSave();
    setIsSaved(true);
  };

  const handleShare = () => {
      const message = `Acabei de corrigir minha redação no Estude.IA! 📝\n\nMinha nota: *${result.nota_total}* / 1000\n\n"${result.comentario_geral}"\n\n🚀 Corrija a sua agora com Inteligência Artificial: ${window.location.origin}`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  return (
    <div className="w-full animate-fade-in pb-12">
      {/* Header with Score */}
      <div className={`rounded-2xl border-2 p-8 text-center mb-8 shadow-sm ${scoreStyle}`}>
        <h2 className="text-lg font-semibold uppercase tracking-wide opacity-80">Nota Final</h2>
        <div className="text-7xl font-bold my-2 tracking-tighter">{result.nota_total}</div>
        <p className="max-w-2xl mx-auto mt-4 text-base opacity-90 italic">
          "{result.comentario_geral}"
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Competencies Column */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Detalhamento por Competência
          </h3>
          <div className="space-y-6">
            {result.competencias.map((comp: Competencia, idx: number) => (
              <div key={idx} className="group">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-medium text-slate-700 text-sm">{comp.nome}</span>
                  <span className="font-bold text-slate-900">{comp.nota} <span className="text-slate-400 text-xs font-normal">/ 200</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ease-out ${getBarColor(comp.nota)}`} 
                    style={{ width: `${(comp.nota / 200) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{comp.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Improvements Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-grow">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Plano de Melhoria
            </h3>
            <ul className="space-y-4">
              {result.melhorias.map((tip, idx) => (
                <li key={idx} className="flex gap-3 items-start bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-slate-700 text-sm leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex flex-col gap-3">
             <button 
                onClick={handleShare}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
             >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartilhar Resultado
             </button>

             <button 
                onClick={handleSaveClick}
                disabled={isSaved}
                className={`w-full py-4 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 border-2 ${isSaved 
                    ? 'bg-green-100 text-green-700 border-green-200 cursor-default' 
                    : 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50'}`}
             >
                {isSaved ? (
                     <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Salvo no Dashboard!
                     </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        Salvar Resultado
                    </>
                )}
             </button>

             <button 
                onClick={onReset}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Corrigir Outra Redação
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
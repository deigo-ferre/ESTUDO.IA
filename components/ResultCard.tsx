import React, { useState } from 'react';
import { CorrectionResult, Competencia } from '../types';

interface ResultCardProps {
  result: CorrectionResult;
  onReset: () => void;
  onSave: () => void;
}

// --- Styles Configuration ---
const styles = {
  container: "w-full animate-fade-in pb-12",
  
  // Header Section
  header: (colorClass: string) => `rounded-2xl border-2 p-8 text-center mb-8 shadow-sm ${colorClass}`,
  headerLabel: "text-lg font-semibold uppercase tracking-wide opacity-80",
  headerScore: "text-7xl font-bold my-2 tracking-tighter",
  headerComment: "max-w-2xl mx-auto mt-4 text-base opacity-90 italic",

  // Layout
  grid: "grid grid-cols-1 lg:grid-cols-2 gap-8",
  columnGap: "flex flex-col gap-6",
  
  // Cards
  card: "bg-white rounded-xl shadow-sm border border-slate-200 p-6",
  cardFlexGrow: "bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-grow",
  sectionTitle: "text-xl font-bold text-slate-800 mb-6 flex items-center gap-2",

  // Competencies List
  competencyList: "space-y-6",
  competencyItem: "group",
  competencyMeta: "flex justify-between items-end mb-1",
  competencyName: "font-medium text-slate-700 text-sm",
  competencyValue: "font-bold text-slate-900",
  competencyMax: "text-slate-400 text-xs font-normal",
  progressBarContainer: "w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden",
  progressBarFill: (colorClass: string, width: number) => ({
    className: `h-3 rounded-full transition-all duration-1000 ease-out ${colorClass}`,
    style: { width: `${width}%` }
  }),
  competencyFeedback: "text-xs text-slate-500 leading-relaxed",

  // Improvements List
  improvementList: "space-y-4",
  improvementItem: "flex gap-3 items-start bg-amber-50 p-4 rounded-lg border border-amber-100",
  improvementBadge: "flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold mt-0.5",
  improvementText: "text-slate-700 text-sm leading-relaxed",

  // Actions / Buttons
  actionsGroup: "flex flex-col gap-3",
  baseButton: "w-full py-4 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2",
  buttonHoverEffect: "transform hover:-translate-y-0.5 active:translate-y-0",
  
  // Button Variants
  btnShare: "bg-green-500 hover:bg-green-600 text-white",
  btnSaveSaved: "bg-green-100 text-green-700 border-green-200 border-2 cursor-default shadow-none",
  btnSaveUnsaved: "bg-white text-indigo-600 border-indigo-600 border-2 hover:bg-indigo-50",
  btnReset: "bg-slate-800 hover:bg-slate-900 text-white",
};

// --- Helpers ---
const getScoreColor = (score: number) => {
  if (score >= 800) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 600) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getBarColor = (score: number) => {
    if (score >= 160) return 'bg-green-500';
    if (score >= 120) return 'bg-yellow-500';
    return 'bg-red-500';
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
    <div className={styles.container}>
      {/* Header with Score */}
      <div className={styles.header(scoreStyle)}>
        <h2 className={styles.headerLabel}>Nota Final</h2>
        <div className={styles.headerScore}>{result.nota_total}</div>
        <p className={styles.headerComment}>
          "{result.comentario_geral}"
        </p>
      </div>

      <div className={styles.grid}>
        {/* Competencies Column */}
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Detalhamento por Competência
          </h3>
          <div className={styles.competencyList}>
            {result.competencias.map((comp: Competencia, idx: number) => {
              const barProps = styles.progressBarFill(getBarColor(comp.nota), (comp.nota / 200) * 100);
              return (
                <div key={idx} className={styles.competencyItem}>
                  <div className={styles.competencyMeta}>
                    <span className={styles.competencyName}>{comp.nome}</span>
                    <span className={styles.competencyValue}>{comp.nota} <span className={styles.competencyMax}>/ 200</span></span>
                  </div>
                  <div className={styles.progressBarContainer}>
                    <div className={barProps.className} style={barProps.style}></div>
                  </div>
                  <p className={styles.competencyFeedback}>{comp.feedback}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Improvements Column */}
        <div className={styles.columnGap}>
          <div className={styles.cardFlexGrow}>
            <h3 className={styles.sectionTitle}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Plano de Melhoria
            </h3>
            <ul className={styles.improvementList}>
              {result.melhorias.map((tip, idx) => (
                <li key={idx} className={styles.improvementItem}>
                  <span className={styles.improvementBadge}>
                    {idx + 1}
                  </span>
                  <p className={styles.improvementText}>{tip}</p>
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.actionsGroup}>
             <button 
                onClick={handleShare}
                className={`${styles.baseButton} ${styles.btnShare} ${styles.buttonHoverEffect}`}
             >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartilhar Resultado
             </button>

             <button 
                onClick={handleSaveClick}
                disabled={isSaved}
                className={`${styles.baseButton} ${isSaved ? styles.btnSaveSaved : `${styles.btnSaveUnsaved} ${styles.buttonHoverEffect}`}`}
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
                className={`${styles.baseButton} ${styles.btnReset} ${styles.buttonHoverEffect}`}
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
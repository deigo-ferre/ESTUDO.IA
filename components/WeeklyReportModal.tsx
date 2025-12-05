
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, SavedReport, WeeklyReportStats } from '../types';
import { calculateReportStats, saveReport } from '../services/storageService';

interface WeeklyReportModalProps {
    onClose: () => void;
    user: User;
    existingReport?: SavedReport; // If provided, viewing mode. If null, creation mode.
}

const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ onClose, user, existingReport }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    
    // Default range: Last 7 days
    const defaultEnd = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultEnd.getDate() - 7);

    const [startDate, setStartDate] = useState(existingReport ? new Date(existingReport.startDate) : defaultStart);
    const [endDate, setEndDate] = useState(existingReport ? new Date(existingReport.endDate) : defaultEnd);
    const [stats, setStats] = useState<WeeklyReportStats | null>(existingReport ? existingReport.stats : null);
    const [isSaved, setIsSaved] = useState(!!existingReport);

    // Calculate stats on date change (debounced or effect)
    useEffect(() => {
        if (!existingReport) {
            const calculated = calculateReportStats(startDate, endDate);
            setStats(calculated);
            setIsSaved(false); // Reset save state if dates change
        }
    }, [startDate, endDate, existingReport]);

    const dateRangeStr = `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;

    const handleSave = () => {
        if (!stats) return;
        saveReport(stats, startDate, endDate, 'manual');
        setIsSaved(true);
    };

    const handleWhatsApp = () => {
        if (!stats) return;
        const text = `📊 *Relatório de Performance Estude.IA*\n` +
            `Aluno: ${user.name}\n` +
            `Período: ${dateRangeStr}\n\n` +
            `✅ Simulados Completos: ${stats.simCount}\n` +
            `📈 Média TRI do Período: ${stats.avgSim}\n` +
            `📝 Redações Entregues: ${stats.essaysCount}\n` +
            `🎖️ Média Redação: ${stats.avgEssay}\n` +
            `📅 Cronograma: ${stats.tasksProgress}% concluído (${stats.tasksCompleted} tarefas)\n\n` +
            `Acesse detalhes completos em: ${window.location.origin}`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handlePrint = () => {
        const content = reportRef.current;
        if (!content) return;

        // Create a dedicated print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Por favor, permita popups para imprimir o relatório.");
            return;
        }

        // Clone content to manipulate for print view if necessary
        // We use the innerHTML of the ref
        const htmlContent = content.innerHTML;

        // Write HTML to the new window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Relatório Estude.IA - ${user.name}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { 
                        font-family: 'Inter', sans-serif; 
                        background: white; 
                        padding: 40px; 
                        color: #0f172a;
                    }
                    /* Ensure background colors print correctly */
                    * {
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    /* Hide inputs in print, show values if needed (though we use innerHTML, react state values in inputs might not clone perfectly, but usually fine for display) */
                    input { border: none; background: transparent; font-weight: bold; }
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>
                    // Wait for Tailwind to parse
                    setTimeout(() => {
                        window.print();
                        // Optional: window.close() after print;
                    }, 800);
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    };

    // Date Input Handler
    const handleDateChange = (type: 'start' | 'end', val: string) => {
        if (existingReport) return; // Prevent edit in view mode
        const d = new Date(val);
        // Basic validation
        if (!isNaN(d.getTime())) {
            if (type === 'start') {
                if (d > endDate) setEndDate(d);
                setStartDate(d);
            } else {
                if (d < startDate) setStartDate(d);
                setEndDate(d);
            }
        }
    };

    if (!stats) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <h3 className="font-bold text-slate-700">{existingReport ? 'Visualizar Relatório Salvo' : 'Gerar Novo Relatório'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-2">✕</button>
                </div>

                {/* Printable Content */}
                <div id="printable-report" className="p-8 overflow-y-auto bg-white" ref={reportRef}>
                    <div className="flex items-center gap-4 mb-8 border-b-2 border-indigo-600 pb-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xl">E</div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Relatório de Evolução</h2>
                            <p className="text-sm text-slate-500 uppercase tracking-wide">Estude.IA • Performance Acadêmica</p>
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex-1">
                            <span className="font-bold block text-xs uppercase text-slate-400 mb-1">Aluno</span>
                            <div className="font-medium text-slate-900">{user.name}</div>
                        </div>
                        <div className="flex gap-4">
                            <div>
                                <label className="font-bold block text-xs uppercase text-slate-400 mb-1">De</label>
                                {existingReport ? (
                                    <span className="text-sm font-mono text-slate-900 font-bold">{startDate.toLocaleDateString('pt-BR')}</span>
                                ) : (
                                    <input 
                                        type="date" 
                                        className="text-sm border border-slate-300 rounded p-1 bg-white text-slate-900 font-medium"
                                        value={startDate.toISOString().split('T')[0]}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="font-bold block text-xs uppercase text-slate-400 mb-1">Até</label>
                                {existingReport ? (
                                    <span className="text-sm font-mono text-slate-900 font-bold">{endDate.toLocaleDateString('pt-BR')}</span>
                                ) : (
                                    <input 
                                        type="date" 
                                        className="text-sm border border-slate-300 rounded p-1 bg-white text-slate-900 font-medium"
                                        value={endDate.toISOString().split('T')[0]}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <h4 className="font-bold text-indigo-900 text-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Resumo de Atividades & Médias
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                            <p className="text-xs text-slate-500 uppercase font-bold">Simulados</p>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-3xl font-black text-slate-900">{stats.simCount}</span>
                                <span className="text-xs text-slate-400 mb-1">realizados</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase">Média do Período</p>
                                <p className={`text-lg font-bold ${stats.avgSim > 700 ? 'text-green-600' : 'text-indigo-600'}`}>
                                    {stats.avgSim > 0 ? stats.avgSim : '-'} <span className="text-xs font-normal text-slate-400">pts</span>
                                </p>
                            </div>
                        </div>
                        
                        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                            <p className="text-xs text-slate-500 uppercase font-bold">Redações</p>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-3xl font-black text-slate-900">{stats.essaysCount}</span>
                                <span className="text-xs text-slate-400 mb-1">entregues</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase">Média do Período</p>
                                <p className={`text-lg font-bold ${stats.avgEssay > 800 ? 'text-green-600' : 'text-indigo-600'}`}>
                                    {stats.avgEssay > 0 ? stats.avgEssay : '-'} <span className="text-xs font-normal text-slate-400">pts</span>
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border border-slate-200 rounded-xl col-span-2 bg-white shadow-sm">
                            <div className="flex justify-between mb-1">
                                <p className="text-xs text-slate-500 uppercase font-bold">Cronograma</p>
                                <span className="text-xs font-bold text-slate-900">{stats.tasksProgress}% Concluído</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: `${stats.tasksProgress}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">{stats.tasksCompleted} tarefas marcadas como feitas neste período.</p>
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-sm text-indigo-800 font-medium italic">
                            "A consistência é a chave da aprovação. Estes dados refletem seu esforço entre {startDate.toLocaleDateString('pt-BR')} e {endDate.toLocaleDateString('pt-BR')}."
                        </p>
                        <p className="text-right text-xs text-indigo-500 mt-2 font-bold">— IA Estude.IA</p>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex gap-3 flex-wrap">
                    <button onClick={handlePrint} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 flex items-center justify-center gap-2 transition-colors text-xs md:text-sm shadow-md">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Imprimir / PDF
                    </button>
                    <button onClick={handleWhatsApp} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 transition-colors text-xs md:text-sm shadow-md">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                    </button>
                    {!existingReport && (
                        <button 
                            onClick={handleSave} 
                            disabled={isSaved}
                            className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-xs md:text-sm shadow-md ${isSaved ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            {isSaved ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Salvo
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                    Salvar no Histórico
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklyReportModal;

import React, { useState, useEffect, useMemo } from 'react';
import { getSchedules, getExams, getSettings, getUserSession, toggleScheduleTask, calculateReportStats, saveReport, saveUserSession } from '../services/storageService';
import { SavedSchedule, SavedExam, UserSettings, User, SisuGoal } from '../types';
import WeeklyReportModal from './WeeklyReportModal';

// --- SUB-COMPONENTS & UTILS ---

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
    return (
        <div className="absolute z-50 invisible group-hover/tooltip:visible bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl -top-16 left-1/2 transform -translate-x-1/2 w-64 text-center pointer-events-none transition-all opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-2">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
        </div>
    );
};

const KPICard: React.FC<{ label: string; value: number | string; suffix?: string; color: string; icon: React.ReactNode; subtext?: string; tooltipText?: string; isDark: boolean }> = ({ label, value, suffix = '', color, icon, subtext, tooltipText, isDark }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const targetValue = typeof value === 'number' ? value : 0;
    const isString = typeof value === 'string';

    useEffect(() => {
        if (isString) return;
        let start = 0;
        const duration = 1500;
        const increment = targetValue / (duration / 16);
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= targetValue) {
                setDisplayValue(targetValue);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.ceil(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [targetValue, isString]);

    const bgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textLabel = isDark ? 'text-slate-500' : 'text-slate-400';
    const textValue = isDark ? 'text-white' : 'text-slate-900';
    const iconBg = isDark ? `bg-${color}-900/20 text-${color}-400` : `bg-${color}-50 text-${color}-600`;
    const decorationBg = isDark ? `bg-${color}-500/10` : `bg-${color}-50 opacity-50`;

    return (
        <div className={`${bgClass} rounded-2xl p-6 border shadow-sm flex items-center gap-5 hover:shadow-md transition-all relative overflow-visible group/tooltip`}>
            {tooltipText && <InfoTooltip text={tooltipText} />}
            <div className={`absolute right-0 top-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform pointer-events-none ${decorationBg} group-hover:scale-110`}></div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center relative z-10 flex-shrink-0 ${iconBg}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${textLabel}`}>
                    {label}
                    {tooltipText && (
                        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                </p>
                <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black tracking-tight ${textValue}`}>
                        {isString ? value : displayValue}
                    </span>
                    {suffix && <span className={`text-sm font-bold ${isDark ? `text-${color}-400` : `text-${color}-600`}`}>{suffix}</span>}
                </div>
                {subtext && <p className={`text-[10px] font-medium mt-1 truncate max-w-[150px] ${textLabel}`} title={subtext}>{subtext}</p>}
            </div>
        </div>
    );
};

const SisuSummaryCard: React.FC<{ goals: SisuGoal[], currentScore: number, isDark: boolean }> = ({ goals, currentScore, isDark }) => {
    const passingCount = goals.filter(g => currentScore >= g.cutoff).length;
    
    return (
        <KPICard 
            label="Metas Batidas" 
            value={passingCount} 
            suffix={`/ ${goals.length}`}
            color="fuchsia" 
            isDark={isDark}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
            subtext="Cursos aprovados (Simulado Completo)"
        />
    );
};

// --- SISU GOAL TRACKER COMPONENT ---
const SisuGoalTracker: React.FC<{ goals: SisuGoal[], exams: SavedExam[], isDark: boolean }> = ({ goals, exams, isDark }) => {
    const stats = useMemo(() => {
        // Filtrar exames válidos (que tenham nota total e não sejam só redação)
        const validExams = exams.filter(e => e.status === 'completed' && e.config.mode !== 'essay_only' && e.performance?.totalScore);
        
        // Ordenar por data (recente primeiro)
        const sortedExams = [...validExams].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const lastScore = sortedExams.length > 0 ? Math.round(sortedExams[0].performance!.totalScore) : 0;
        const avgScore = sortedExams.length > 0 ? Math.round(sortedExams.reduce((acc, e) => acc + e.performance!.totalScore, 0) / sortedExams.length) : 0;
        
        const trend = lastScore - avgScore;

        return { avgScore, lastScore, trend, hasData: sortedExams.length > 0 };
    }, [exams]);

    const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textTitle = isDark ? 'text-white' : 'text-slate-800';
    const textSub = isDark ? 'text-slate-400' : 'text-slate-500';

    if (!goals || goals.length === 0) return null;

    return (
        <div className={`${cardClass} rounded-2xl shadow-sm border p-6 mb-8`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className={`text-xl font-bold ${textTitle} flex items-center gap-2`}>
                        <svg className="w-6 h-6 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Monitoramento de Metas SISU
                    </h3>
                    <p className={`text-sm ${textSub}`}>Comparativo da sua média geral vs notas de corte oficiais.</p>
                </div>
                
                {stats.hasData && (
                    <div className={`flex gap-4 p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <div className="text-center px-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Sua Média</span>
                            <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.avgScore}</span>
                        </div>
                        <div className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                        <div className="text-center px-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Último Simulado</span>
                            <div className="flex items-center gap-1">
                                <span className={`text-lg font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{stats.lastScore}</span>
                                {stats.trend !== 0 && (
                                    <span className={`text-xs font-bold ${stats.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {stats.trend > 0 ? '▲' : '▼'} {Math.abs(stats.trend)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!stats.hasData ? (
                <div className={`text-center py-8 rounded-xl border border-dashed ${isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`${textSub}`}>Realize simulados completos (Dia 1 ou Dia 2) para ver sua projeção no SISU.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {goals.map((goal, idx) => {
                        const diff = stats.avgScore - goal.cutoff;
                        const progress = Math.min(100, Math.max(0, (stats.avgScore / goal.cutoff) * 100));
                        const isPassing = diff >= 0;
                        const lastExamDiff = stats.lastScore - goal.cutoff;
                        const isPassingLast = lastExamDiff >= 0;

                        return (
                            <div key={idx} className="relative">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className={`font-bold ${textTitle}`}>{goal.course}</p>
                                        <p className="text-xs text-slate-500">Corte: <span className="font-mono font-bold">{goal.cutoff}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${isPassing ? 'text-green-500' : 'text-amber-500'}`}>
                                            {isPassing ? 'Na média! 🎉' : `Faltam ${Math.abs(diff)} pts na média`}
                                        </span>
                                        <p className={`text-[10px] ${isPassingLast ? 'text-green-400' : 'text-slate-400'}`}>
                                            Último teste: {isPassingLast ? 'Aprovado' : `${lastExamDiff} pts`}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className={`h-4 w-full rounded-full overflow-hidden relative ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                    {/* Goal Marker (Cutoff) - Represented implicitly as 100% of the bar width if we scaled relative to cutoff, but better to scale to max score (1000) */}
                                    {/* Let's map 0-1000 scale */}
                                    <div 
                                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10 opacity-50" 
                                        style={{ left: `${(goal.cutoff / 1000) * 100}%` }}
                                        title={`Corte: ${goal.cutoff}`}
                                    ></div>
                                    
                                    {/* Average Score Bar */}
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${isPassing ? 'bg-green-500' : 'bg-amber-500'}`}
                                        style={{ width: `${(stats.avgScore / 1000) * 100}%` }}
                                    ></div>

                                    {/* Last Exam Dot Marker */}
                                    <div 
                                        className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white shadow-sm z-20 ${isPassingLast ? 'bg-green-400' : 'bg-indigo-500'}`}
                                        style={{ left: `calc(${(stats.lastScore / 1000) * 100}% - 4px)` }}
                                        title={`Último: ${stats.lastScore}`}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                    <span>0</span>
                                    <span>500</span>
                                    <span>1000</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const SimpleLineChart: React.FC<{ data: { label: string, value: number }[], color: string, isDark: boolean }> = ({ data, color, isDark }) => {
    if (data.length < 2) return <div className={`h-32 flex items-center justify-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Dados insuficientes para gráfico de evolução.</div>;

    const height = 100;
    const width = 300;
    const padding = 10;
    
    const maxVal = Math.max(...data.map(d => d.value), 1000);
    const minVal = Math.min(...data.map(d => d.value), 0);
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - ((d.value - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding) - padding;
        return `${x},${y}`;
    }).join(' ');

    const stroke = isDark 
        ? (color === 'indigo' ? '#818cf8' : '#fb7185') 
        : (color === 'indigo' ? '#6366f1' : '#f43f5e');
    
    const dotFill = isDark
        ? (color === 'indigo' ? 'fill-indigo-400' : 'fill-rose-400')
        : (color === 'indigo' ? 'fill-indigo-600' : 'fill-rose-500');

    return (
        <div className="w-full h-32 mt-4 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <polyline 
                    points={points} 
                    fill="none" 
                    stroke={stroke} 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - ((d.value - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding) - padding;
                    return (
                        <g key={i} className="group">
                            <circle cx={x} cy={y} r="4" className={dotFill} />
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <rect x={x - 20} y={y - 25} width="40" height="20" rx="4" fill={isDark ? '#e2e8f0' : '#1e293b'} />
                                <text x={x} y={y - 11} textAnchor="middle" fill={isDark ? '#0f172a' : 'white'} fontSize="10" fontWeight="bold">{d.value}</text>
                            </g>
                        </g>
                    );
                })}
            </svg>
            <div className={`flex justify-between text-[9px] mt-1 uppercase font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>Início</span>
                <span>Atual</span>
            </div>
        </div>
    );
};

const PerformanceHub: React.FC<{ exams: SavedExam[], isDark: boolean }> = ({ exams, isDark }) => {
    const [activeTab, setActiveTab] = useState<'redacao' | 'objetiva' | 'competencia'>('redacao');

    const essayStats = useMemo(() => {
        const essays = exams.filter(e => e.performance?.essayResult);
        if (essays.length === 0) return null;

        const sortedEssays = [...essays].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const evolutionData = sortedEssays.map((e, i) => ({
            label: `Redação ${i+1}`,
            value: e.performance!.essayResult!.nota_total
        }));

        const totals = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, final: 0 };
        essays.forEach(e => {
            const comps = e.performance!.essayResult!.competencias;
            totals.c1 += comps.find(c => c.nome.includes('Norma'))?.nota || 0;
            totals.c2 += comps.find(c => c.nome.includes('Tema'))?.nota || 0;
            totals.c3 += comps.find(c => c.nome.includes('Argumentação'))?.nota || 0;
            totals.c4 += comps.find(c => c.nome.includes('Coesão'))?.nota || 0;
            totals.c5 += comps.find(c => c.nome.includes('Intervenção'))?.nota || 0;
            totals.final += e.performance!.essayResult!.nota_total;
        });

        const count = essays.length;
        const avgs = {
            c1: Math.round(totals.c1 / count),
            c2: Math.round(totals.c2 / count),
            c3: Math.round(totals.c3 / count),
            c4: Math.round(totals.c4 / count),
            c5: Math.round(totals.c5 / count),
            final: Math.round(totals.final / count)
        };

        const compEntries = Object.entries(avgs).filter(([k]) => k !== 'final');
        const weakest = compEntries.sort((a, b) => a[1] - b[1])[0];
        
        const feedbackMap: Record<string, string> = {
            c1: "Foco na Gramática: Revise crase, concordância e regência.",
            c2: "Estrutura Dissertativa: Cuidado para não tangenciar o tema.",
            c3: "Argumentação: Melhore a defesa do ponto de vista.",
            c4: "Coesão Textual: Diversifique os conectivos entre parágrafos.",
            c5: "Proposta de Intervenção: Lembre-se dos 5 elementos."
        };

        return { avgs, weakest: { key: weakest[0], val: weakest[1], text: feedbackMap[weakest[0]] }, evolutionData };
    }, [exams]);

    const objectiveStats = useMemo(() => {
        const objs = exams.filter(e => e.status === 'completed' && (e.config.mode === 'day1' || e.config.mode === 'day2') && e.performance?.scoreByArea);
        if (objs.length === 0) return null;

        const sortedObjs = [...objs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const evolutionData = sortedObjs.map((e, i) => ({
            label: `Simulado ${i+1}`,
            value: e.performance!.totalScore
        }));

        const totals = { L: 0, H: 0, N: 0, M: 0 };
        const counts = { L: 0, H: 0, N: 0, M: 0 };
        
        objs.forEach(e => {
            const p = e.performance!;
            if (p.scoreByArea) {
                const sL = p.scoreByArea['Linguagens'];
                if(typeof sL === 'number') { totals.L += sL; counts.L++; }
                const sH = p.scoreByArea['Humanas'];
                if(typeof sH === 'number') { totals.H += sH; counts.H++; }
                const sN = p.scoreByArea['Natureza'];
                if(typeof sN === 'number') { totals.N += sN; counts.N++; }
                const sM = p.scoreByArea['Matemática'];
                if(typeof sM === 'number') { totals.M += sM; counts.M++; }
            }
        });

        const avgs = {
            L: counts.L ? Math.round(totals.L / counts.L) : 0,
            H: counts.H ? Math.round(totals.H / counts.H) : 0,
            N: counts.N ? Math.round(totals.N / counts.N) : 0,
            M: counts.M ? Math.round(totals.M / counts.M) : 0,
            final: Math.round(evolutionData.reduce((acc, curr) => acc + curr.value, 0) / evolutionData.length)
        };

        return { avgs, evolutionData };
    }, [exams]);

    const containerClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textTitle = isDark ? 'text-white' : 'text-slate-800';
    const textSub = isDark ? 'text-slate-500' : 'text-slate-400';
    const tileBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100';

    if (!essayStats && !objectiveStats) return (
        <div className={`text-center py-10 rounded-xl border ${tileBg}`}>
            <p className={textSub}>Faça simulados ou redações para ver sua análise de performance.</p>
        </div>
    );

    return (
        <div className={`${containerClass} rounded-2xl shadow-sm border p-6`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${textTitle}`}>Hub de Performance</h3>
                <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-1 rounded-lg flex gap-1`}>
                    {['redacao', 'objetiva'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${activeTab === tab ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                            {tab === 'redacao' ? 'Redação' : 'Simulados TRI'}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'redacao' && essayStats ? (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="col-span-2">
                             <p className={`text-xs font-bold ${textSub} uppercase mb-2`}>Evolução da Nota</p>
                             <SimpleLineChart data={essayStats.evolutionData} color="indigo" isDark={isDark} />
                        </div>
                        <div className={`rounded-xl p-5 border ${isDark ? 'bg-rose-900/20 border-rose-900/30' : 'bg-rose-50 border-rose-100'}`}>
                             <p className="text-xs font-bold text-rose-400 uppercase mb-2">Ponto de Atenção</p>
                             <div className="text-2xl font-black text-rose-500 mb-1">{essayStats.weakest.val} pts</div>
                             <p className={`text-sm font-bold mb-2 ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>{essayStats.weakest.key.toUpperCase()}</p>
                             <p className={`text-xs leading-relaxed ${isDark ? 'text-rose-300/80' : 'text-rose-700'}`}>{essayStats.weakest.text}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                        {Object.entries(essayStats.avgs).map(([key, val]) => (
                            <div key={key} className={`p-2 rounded-lg border ${tileBg}`}>
                                <span className={`block text-[10px] font-bold uppercase ${textSub}`}>{key}</span>
                                <span className={`font-bold ${key === 'final' ? 'text-indigo-500' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>{val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'redacao' ? (
                <div className={`text-center py-8 text-sm ${textSub}`}>Nenhuma redação corrigida ainda.</div>
            ) : null}

            {activeTab === 'objetiva' && objectiveStats ? (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="col-span-2">
                             <p className={`text-xs font-bold ${textSub} uppercase mb-2`}>Evolução TRI Geral</p>
                             <SimpleLineChart data={objectiveStats.evolutionData} color="rose" isDark={isDark} />
                        </div>
                        <div className={`rounded-xl p-5 border flex flex-col justify-center text-center ${isDark ? 'bg-indigo-900/20 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}>
                             <p className="text-xs font-bold text-indigo-400 uppercase mb-2">Média Geral</p>
                             <div className="text-4xl font-black text-indigo-500 mb-1">{objectiveStats.avgs.final}</div>
                             <p className="text-xs text-indigo-400">Pontos TRI</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                            { k: 'L', l: 'Linguagens', v: objectiveStats.avgs.L },
                            { k: 'H', l: 'Humanas', v: objectiveStats.avgs.H },
                            { k: 'N', l: 'Natureza', v: objectiveStats.avgs.N },
                            { k: 'M', l: 'Matemática', v: objectiveStats.avgs.M },
                        ].map((item) => (
                            <div key={item.k} className={`p-2 rounded-lg border ${tileBg}`}>
                                <span className={`block text-[10px] font-bold uppercase ${textSub}`}>{item.k}</span>
                                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.v}</span>
                            </div>
                        ))}
                    </div>
                </div>
             ) : activeTab === 'objetiva' ? (
                <div className={`text-center py-8 text-sm ${textSub}`}>Nenhum simulado completo realizado ainda.</div>
            ) : null}
        </div>
    );
};

const UserDashboard: React.FC<{ onResumeExam: (id: string) => void; onChangeView: (view: string) => void; onLogout: () => void; onUpgrade?: () => void; }> = ({ onResumeExam, onChangeView, onLogout, onUpgrade }) => {
    const [user] = useState<User | null>(getUserSession());
    const [settings] = useState<UserSettings>(getSettings());
    const [activeExams, setActiveExams] = useState<SavedExam[]>([]);
    const [completedExams, setCompletedExams] = useState<SavedExam[]>([]);
    const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
    const [showReportModal, setShowReportModal] = useState(false);

    const isDark = settings.theme === 'dark';

    useEffect(() => {
        const allExams = getExams();
        setActiveExams(allExams.filter(e => e.status === 'in_progress'));
        setCompletedExams(allExams.filter(e => e.status === 'completed'));
        setSchedules(getSchedules());
    }, []);

    const activeSchedule = schedules.find(s => !s.archived);
    const completedTasksCount = activeSchedule ? (activeSchedule.completedItems?.length || 0) : 0;
    const totalTasksCount = activeSchedule ? activeSchedule.result.semana.reduce((acc, d) => acc + d.materias.length, 0) : 0;
    const lastFullExam = completedExams.find(e => (e.config.mode === 'day1' || e.config.mode === 'day2') && e.performance?.sisuComparisons);
    const currentScore = lastFullExam?.performance?.totalScore || 0;

    const handleGenerateReport = () => setShowReportModal(true);

    if (!user) return null;

    const quickActionClass = isDark 
        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' 
        : 'bg-white border-slate-200 hover:bg-slate-50';
    
    const quickActionIconBg = isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600';

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Olá, {user.name.split(' ')[0]} 👋</h1>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aqui está o resumo da sua preparação hoje.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleGenerateReport} className={`px-4 py-2 border font-bold rounded-xl text-sm shadow-sm transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        Relatório Semanal
                    </button>
                    <button onClick={onLogout} className={`px-4 py-2 font-bold rounded-xl text-sm transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        Sair
                    </button>
                </div>
            </div>

            {activeExams.length > 0 && (
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-indigo-200 text-xs font-bold uppercase mb-1">Em Andamento</p>
                        <h3 className="text-xl font-bold mb-1">Você tem um simulado não finalizado</h3>
                        <p className="text-sm opacity-90">{activeExams[0].config.mode === 'essay_only' ? 'Redação' : 'Simulado Oficial'}</p>
                    </div>
                    <button onClick={() => onResumeExam(activeExams[0].id)} className="relative z-10 bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold hover:bg-indigo-50 shadow-md transition-all">Continuar</button>
                    <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
                </div>
            )}

            {/* UPGRADE BANNER - ONLY FOR FREE/ADVANCED USERS */}
            {user.planType !== 'PREMIUM' && onUpgrade && (
                <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-center relative overflow-hidden gap-4">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-2">🚀 Acelere sua Aprovação</h3>
                        <p className="text-sm opacity-90">Desbloqueie simulados ilimitados, correção prioritária e revisão turbo com IA.</p>
                    </div>
                    <button onClick={onUpgrade} className="relative z-10 bg-white text-fuchsia-600 px-6 py-2 rounded-xl font-bold hover:bg-fuchsia-50 shadow-md transition-all whitespace-nowrap">
                        Fazer Upgrade Agora
                    </button>
                    <div className="absolute -left-10 -bottom-20 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SisuSummaryCard goals={settings.sisuGoals || []} currentScore={currentScore} isDark={isDark} />
                <KPICard label="Redações" value={completedExams.filter(e => e.performance?.essayResult).length} color="rose" isDark={isDark} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} subtext="Textos corrigidos pela IA" />
                <KPICard label="Simulados" value={completedExams.filter(e => e.config.mode !== 'essay_only').length} color="blue" isDark={isDark} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} subtext="Treinos e Provas Completas" />
                <KPICard label="Cronograma" value={totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0} suffix="%" color="emerald" isDark={isDark} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} subtext="Progresso Semanal" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {/* Monitoramento de Metas SISU */}
                    <SisuGoalTracker goals={settings.sisuGoals || []} exams={completedExams} isDark={isDark} />
                    
                    <PerformanceHub exams={completedExams} isDark={isDark} />
                </div>

                <div className="space-y-6">
                    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl shadow-sm border p-6`}>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} mb-4`}>Acesso Rápido</h3>
                        <div className="space-y-3">
                            <button onClick={() => onChangeView('simulado')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors text-left group border ${quickActionClass}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors group-hover:bg-indigo-600 group-hover:text-white ${quickActionIconBg}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Novo Simulado</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Treinar por área ou prova completa</p>
                                </div>
                            </button>
                            
                            <button onClick={() => onChangeView('essay')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors text-left group border ${quickActionClass}`}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors group-hover:bg-rose-600 group-hover:text-white bg-rose-100 text-rose-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Corrigir Redação</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Envie foto ou digite seu texto</p>
                                </div>
                            </button>

                            <button onClick={() => onChangeView('schedule')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors text-left group border ${quickActionClass}`}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white bg-emerald-100 text-emerald-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Ver Cronograma</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Acompanhe suas metas semanais</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {activeSchedule && (
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-indigo-500/30">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
                             <p className="text-indigo-300 text-xs font-bold uppercase mb-2">Foco de Hoje</p>
                             {(() => {
                                 const todayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
                                 const todaySchedule = activeSchedule.result.semana.find(d => d.dia.toLowerCase() === todayName.toLowerCase());
                                 if (!todaySchedule) return <p className="font-bold">Descanso ou Planejamento</p>;
                                 return (
                                     <>
                                         <h3 className="text-xl font-bold mb-1 capitalize">{todaySchedule.foco}</h3>
                                         <p className="text-sm text-indigo-200 mb-4">{todaySchedule.materias.length} matérias listadas</p>
                                         <button onClick={() => onChangeView('schedule')} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10">Ver Tarefas →</button>
                                     </>
                                 );
                             })()}
                        </div>
                    )}
                </div>
            </div>

            {showReportModal && user && <WeeklyReportModal user={user} onClose={() => setShowReportModal(false)} />}
        </div>
    );
};

export default UserDashboard;
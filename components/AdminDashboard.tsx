import React, { useEffect, useState } from 'react';
import { getAdminStats, getSettings, saveSettings } from '../services/storageService';
import { checkConnection } from '../services/supabaseClient';
import Logo from './Logo';

interface AdminDashboardProps {
    onLogout: () => void;
    onBackToApp: () => void;
}

type AdminView = 'dashboard' | 'users' | 'finance' | 'settings';

// --- MOCK DATA GENERATORS ---
const generateMockUsers = () => {
    const plans = ['FREE', 'ADVANCED', 'PREMIUM'];
    const statuses = ['Active', 'Active', 'Active', 'Churned', 'Active'];
    return Array.from({ length: 15 }).map((_, i) => ({
        id: `usr_${i + 100}`,
        name: [`Lucas Pereira`, `Mariana Souza`, `Carlos Lima`, `Fernanda Alves`, `João Silva`][i % 5] + (i > 4 ? ` ${i}` : ''),
        email: `user${i}@exemplo.com`,
        plan: plans[i % 3],
        status: statuses[i % 5],
        joined: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toLocaleDateString('pt-BR'),
        spent: (i % 3 === 0 ? 0 : i % 3 === 1 ? 29.90 : 49.90) * (Math.floor(Math.random() * 5) + 1)
    }));
};

const generateTransactions = () => {
    return Array.from({ length: 8 }).map((_, i) => ({
        id: `tx_${Math.random().toString(36).substr(2, 9)}`,
        user: `user${i}@exemplo.com`,
        amount: i % 2 === 0 ? 49.90 : 29.90,
        status: i === 0 ? 'Failed' : 'Succeeded',
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('pt-BR')
    }));
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackToApp }) => {
    const [stats, setStats] = useState<any>(null);
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [users] = useState(generateMockUsers());
    const [transactions] = useState(generateTransactions());
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    
    const settings = getSettings();
    const isDark = settings.theme === 'dark';

    // API Config State
    const [apiKey, setApiKey] = useState('sk-proj-************************');
    const [stripeKey, setStripeKey] = useState('pk_test_************************');
    const [systemPrompt, setSystemPrompt] = useState('Você é um especialista no ENEM. Seja didático e rigoroso.');

    useEffect(() => {
        setStats(getAdminStats());
        
        // Verifica conexão com Supabase
        checkConnection().then(isConnected => {
            setDbStatus(isConnected ? 'connected' : 'error');
        });
    }, []);

    if (!stats) return null;

    const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textMain = isDark ? 'text-white' : 'text-slate-900';
    const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputClass = `w-full px-4 py-2 rounded-lg border outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'}`;

    // --- SUB-VIEWS ---

    const DashboardView = () => (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Usuários Totais</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>{stats.totalUsers}</div>
                    <p className="text-xs text-emerald-500 font-bold mt-1">▲ 12% este mês</p>
                </div>
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Receita Mensal (MRR)</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>R$ {stats.mrr.toLocaleString('pt-BR')}</div>
                    <p className="text-xs text-emerald-500 font-bold mt-1">▲ 5% este mês</p>
                </div>
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Tokens Consumidos</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>{stats.tokensConsumedGlobal.toLocaleString()}</div>
                    <p className="text-xs text-amber-500 font-bold mt-1">Alto consumo hoje</p>
                </div>
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Usuários Ativos Hoje</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>{stats.activeUsersToday}</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: '65%' }}></div>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className={`w-full ${cardClass} rounded-2xl shadow-sm border p-6`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`font-bold text-lg ${textMain}`}>Uso da API (Tokens)</h3>
                    <select className={`text-xs p-1 rounded border outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200'}`}>
                        <option>Últimos 7 dias</option>
                    </select>
                </div>
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                    {[45, 60, 75, 50, 80, 95, 100].map((h, i) => (
                        <div key={i} className="w-full bg-indigo-500/20 hover:bg-indigo-500/40 rounded-t-lg relative group transition-all" style={{ height: `${h}%` }}></div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500 uppercase font-bold">
                    <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                </div>
            </div>
        </div>
    );

    const UsersView = () => (
        <div className={`${cardClass} rounded-2xl shadow-sm border overflow-hidden animate-fade-in`}>
            <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'} flex justify-between items-center`}>
                <h3 className={`font-bold text-lg ${textMain}`}>Gerenciamento de Usuários</h3>
                <input type="text" placeholder="Buscar usuário..." className={`text-sm px-3 py-1.5 rounded border outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                        <tr>
                            <th className="px-6 py-3">Nome</th>
                            <th className="px-6 py-3">Plano</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Entrou em</th>
                            <th className="px-6 py-3 text-right">LTV (R$)</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                        {users.map((u, i) => (
                            <tr key={i} className={`hover:${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} transition-colors`}>
                                <td className="px-6 py-4 font-medium">
                                    <div className={`text-sm font-bold ${textMain}`}>{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                        u.plan === 'PREMIUM' ? 'bg-fuchsia-500/20 text-fuchsia-500' :
                                        u.plan === 'ADVANCED' ? 'bg-indigo-500/20 text-indigo-500' :
                                        'bg-slate-500/20 text-slate-500'
                                    }`}>{u.plan}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-1.5 text-xs font-bold ${u.status === 'Active' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                        {u.status}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 ${textSub}`}>{u.joined}</td>
                                <td className={`px-6 py-4 text-right font-mono ${textMain}`}>{u.spent.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button className="text-indigo-500 hover:underline mr-3">Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const FinanceView = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Finance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Receita Total (Líquida)</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>R$ {stats.totalRevenue.toLocaleString('pt-BR')}</div>
                </div>
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Churn Rate</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>2.4%</div>
                    <p className="text-xs text-rose-500 mt-1">▲ 0.2% vs mês passado</p>
                </div>
                <div className={`${cardClass} p-6 rounded-2xl shadow-sm border relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>LTV (Lifetime Value)</p>
                    <div className={`text-3xl font-black mt-2 ${textMain}`}>R$ 145,00</div>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className={`${cardClass} p-6 rounded-2xl shadow-sm border`}>
                <h3 className={`font-bold text-lg mb-6 ${textMain}`}>Receita Recorrente (Últimos 12 Meses)</h3>
                <div className="h-48 flex items-end justify-between gap-1 px-2">
                    {[30, 45, 40, 55, 60, 75, 70, 85, 90, 80, 95, 100].map((h, i) => (
                        <div key={i} className="w-full bg-emerald-500/80 hover:bg-emerald-400 rounded-t sm:rounded-t-md relative group transition-all" style={{ height: `${h}%` }}>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                R$ {h * 150}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transactions Table */}
            <div className={`${cardClass} rounded-2xl shadow-sm border overflow-hidden`}>
                <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h3 className={`font-bold text-lg ${textMain}`}>Transações Recentes</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Usuário</th>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                        {transactions.map((t, i) => (
                            <tr key={i}>
                                <td className={`px-6 py-4 font-mono text-xs ${textSub}`}>{t.id}</td>
                                <td className={`px-6 py-4 ${textMain}`}>{t.user}</td>
                                <td className={`px-6 py-4 ${textSub}`}>{t.date}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${t.status === 'Succeeded' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${textMain}`}>R$ {t.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const SettingsView = () => (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            <div className={`${cardClass} p-8 rounded-2xl shadow-sm border`}>
                <h3 className={`text-xl font-bold mb-6 ${textMain}`}>Configurações de API & Chaves</h3>
                
                <div className="space-y-6">
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${textSub}`}>Google Gemini API Key</label>
                        <div className="flex gap-2">
                            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className={inputClass} />
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Verificar</button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Usada para geração de questões e correção de redações.</p>
                    </div>

                    <div>
                        <label className={`block text-sm font-bold mb-2 ${textSub}`}>Mercado Pago Public Key</label>
                        <input type="text" value={stripeKey} onChange={e => setStripeKey(e.target.value)} className={inputClass} />
                    </div>

                    <div>
                        <label className={`block text-sm font-bold mb-2 ${textSub}`}>Webhooks Secret (Backend)</label>
                        <input type="password" value="sk_live_************************" disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                        <p className="text-[10px] text-slate-500 mt-1">Gerenciado via variáveis de ambiente do servidor.</p>
                    </div>
                </div>
            </div>

            <div className={`${cardClass} p-8 rounded-2xl shadow-sm border`}>
                <h3 className={`text-xl font-bold mb-6 ${textMain}`}>Parâmetros da IA</h3>
                <div>
                    <label className={`block text-sm font-bold mb-2 ${textSub}`}>System Instruction (Global)</label>
                    <textarea 
                        className={`w-full px-4 py-3 rounded-lg border outline-none h-32 resize-none ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'}`}
                        value={systemPrompt}
                        onChange={e => setSystemPrompt(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Define o comportamento base de todos os modelos.</p>
                </div>
            </div>

            <div className={`${cardClass} p-8 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/30`}>
                <h3 className="text-xl font-bold mb-4 text-red-600">Zona de Perigo</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`font-bold ${textMain}`}>Modo de Manutenção</p>
                        <p className={`text-xs ${textSub}`}>Bloqueia acesso de usuários não-admin.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button className={`px-6 py-2 font-bold rounded-lg text-sm ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancelar</button>
                <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 shadow-lg">Salvar Configurações</button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'} font-sans`}>
            {/* Sidebar / Navigation */}
            <nav className={`fixed top-0 left-0 h-full w-64 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'} hidden md:flex flex-col z-20`}>
                <div className="p-6 flex justify-center border-b border-slate-800/50">
                    <Logo variant={isDark ? 'dark' : 'light'} showTagline={false} />
                </div>
                
                <div className="flex-grow p-4 space-y-2">
                    <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider opacity-50 mb-2">Gerenciamento</div>
                    
                    <button 
                        onClick={() => setCurrentView('dashboard')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        Dashboard
                    </button>
                    
                    <button 
                        onClick={() => setCurrentView('users')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${currentView === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Usuários
                    </button>
                    
                    <button 
                        onClick={() => setCurrentView('finance')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${currentView === 'finance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Finanças
                    </button>
                    
                    <button 
                        onClick={() => setCurrentView('settings')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${currentView === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Configurações API
                    </button>
                </div>

                <div className="p-4 border-t border-slate-800/50 space-y-2">
                    <button onClick={onBackToApp} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isDark ? 'text-indigo-400 hover:bg-indigo-900/20' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Voltar ao App
                    </button>
                    <button onClick={onLogout} className="w-full text-left px-4 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sair (Admin)
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="md:ml-64 p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className={`text-3xl font-black ${textMain}`}>
                            {currentView === 'dashboard' && 'Visão Geral'}
                            {currentView === 'users' && 'Usuários'}
                            {currentView === 'finance' && 'Financeiro'}
                            {currentView === 'settings' && 'Configurações'}
                        </h1>
                        <p className={textSub}>
                            {currentView === 'dashboard' && 'Bem-vindo ao painel de controle do Estude.IA.'}
                            {currentView === 'users' && 'Gerencie sua base de alunos.'}
                            {currentView === 'finance' && 'Acompanhe a saúde financeira do SaaS.'}
                            {currentView === 'settings' && 'Gerencie integrações e parâmetros do sistema.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase transition-colors ${dbStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : dbStatus === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            <span className={`w-2 h-2 rounded-full ${dbStatus === 'checking' ? 'bg-slate-500 animate-pulse' : dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {dbStatus === 'checking' ? 'Verificando DB...' : dbStatus === 'connected' ? 'Supabase: ON' : 'Supabase: OFF'}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">A</div>
                    </div>
                </header>

                {currentView === 'dashboard' && <DashboardView />}
                {currentView === 'users' && <UsersView />}
                {currentView === 'finance' && <FinanceView />}
                {currentView === 'settings' && <SettingsView />}
            </main>
        </div>
    );
};

export default AdminDashboard;
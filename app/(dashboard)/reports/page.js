'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import {
    Download,
    TrendingUp,
    Percent,
    Clock,
    ChevronDown,
    ChevronLeft,
    Activity,
    Hash,
    BarChart2,
    TableProperties,
    ChevronRight,
    ChevronUp,
    ArrowDownLeft,
    ArrowUpRight,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Legend,
} from 'recharts';

// ─── Helper ──────────────────────────────────────────────────────────────────
function fmt(n, decimals = 0) {
    if (!n && n !== 0) return '—';
    return Number(n).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function getMonthOptions(transactions) {
    const seen = new Set();
    const options = [];
    [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(tx => {
            const d    = new Date(tx.date);
            const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!seen.has(key)) { seen.add(key); options.push({ key, label }); }
        });
    return options;
}

export default function ReportsPage() {
    const { clients, allTransactions, loading } = useData();
    const [activeTab, setActiveTab]             = useState('analytics'); // 'analytics' | 'statement'

    // ── Analytics filters ─────────────────────────────────────────────────
    const [timeFilter, setTimeFilter]   = useState('Last 30 Days');
    const [clientFilter, setClientFilter] = useState('All Clients');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd]     = useState('');

    // ── Statement filters ─────────────────────────────────────────────────
    const monthOptions = useMemo(() => getMonthOptions(allTransactions || []), [allTransactions]);
    const [stmtMonth, setStmtMonth]           = useState('');
    const [stmtClient, setStmtClient]         = useState('All Clients');
    const [collapsedDays, setCollapsedDays]   = useState({});

    const selectedMonthKey  = stmtMonth || (monthOptions[0]?.key ?? '');
    const stmtMonthIndex    = monthOptions.findIndex(m => m.key === selectedMonthKey);
    const canGoPrev         = stmtMonthIndex < monthOptions.length - 1;
    const canGoNext         = stmtMonthIndex > 0;
    const goPrevMonth       = () => canGoPrev && setStmtMonth(monthOptions[stmtMonthIndex + 1].key);
    const goNextMonth       = () => canGoNext && setStmtMonth(monthOptions[stmtMonthIndex - 1].key);

    // ── Filtered transactions (analytics) ─────────────────────────────────
    const filteredTransactions = useMemo(() => {
        if (!allTransactions || allTransactions.length === 0) return [];
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return allTransactions.filter(tx => {
            if (clientFilter !== 'All Clients' && String(tx.client_id) !== String(clientFilter)) return false;
            const txDate = new Date(tx.date);

            switch (timeFilter) {
                case 'Last 30 Days': {
                    const limit = new Date(today); limit.setDate(limit.getDate() - 30);
                    return txDate >= limit;
                }
                case 'Last 90 Days': {
                    const limit = new Date(today); limit.setDate(limit.getDate() - 90);
                    return txDate >= limit;
                }
                case 'Year to Date': {
                    return txDate >= new Date(today.getFullYear(), 0, 1);
                }
                case 'Custom Range': {
                    if (customStart && txDate < new Date(customStart)) return false;
                    if (customEnd) {
                        const end = new Date(customEnd); end.setHours(23, 59, 59, 999);
                        if (txDate > end) return false;
                    }
                    return true;
                }
                case 'All Time':
                default:
                    return true;
            }
        });
    }, [allTransactions, timeFilter, clientFilter, customStart, customEnd]);

    // ── Statement data ─────────────────────────────────────────────────────
    const statementDays = useMemo(() => {
        if (!allTransactions || allTransactions.length === 0) return [];
        const [yr, mo] = (selectedMonthKey || '').split('-').map(Number);
        if (!yr || !mo) return [];

        const filtered = allTransactions.filter(tx => {
            const d = new Date(tx.date);
            if (d.getFullYear() !== yr || d.getMonth() + 1 !== mo) return false;
            if (stmtClient !== 'All Clients' && String(tx.client_id) !== String(stmtClient)) return false;
            return true;
        });

        // Group by day
        const byDay = {};
        filtered.forEach(tx => {
            const d   = new Date(tx.date);
            const key = `${yr}-${String(mo).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!byDay[key]) byDay[key] = { dateKey: key, date: d, rows: [] };
            byDay[key].rows.push(tx);
        });

        return Object.values(byDay)
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
            .map(group => {
                const totalNaira = group.rows
                    .filter(t => t.type === 'IN')
                    .reduce((s, t) => s + (t.amount_naira || 0), 0);
                const totalAed = group.rows
                    .reduce((s, t) => s + (t.type === 'IN' ? (t.amount_aed || 0) : -(t.amount_aed || 0)), 0);
                return { ...group, totalNaira, totalAed };
            });
    }, [allTransactions, selectedMonthKey, stmtClient]);

    const grandTotalNaira = useMemo(() => statementDays.reduce((s, d) => s + d.totalNaira, 0), [statementDays]);
    const grandTotalAed   = useMemo(() => statementDays.reduce((s, d) => s + d.totalAed,   0), [statementDays]);
    const grandTxCount    = useMemo(() => statementDays.reduce((s, d) => s + d.rows.length, 0), [statementDays]);

    const toggleDay = (key) => setCollapsedDays(p => ({ ...p, [key]: !p[key] }));

    // ── Chart data ─────────────────────────────────────────────────────────
    const { trendData, comparisonData } = useMemo(() => {
        if (filteredTransactions.length === 0) return { trendData: [], comparisonData: [] };
        const groupByDay = timeFilter === 'Last 30 Days' || timeFilter === 'Custom Range';

        const aggregated = filteredTransactions.reduce((acc, tx) => {
            const date = new Date(tx.date);
            let groupKey, displayLabel;

            if (groupByDay) {
                groupKey     = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                displayLabel = date.toLocaleString('default', { month: 'short', day: 'numeric' });
            } else {
                groupKey     = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                displayLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            }

            if (!acc[groupKey]) acc[groupKey] = { sortKey: groupKey, name: displayLabel, volume: 0, inflows: 0, payouts: 0 };

            if (tx.type === 'IN') {
                acc[groupKey].volume  += (tx.amount_naira || 0) / 1000000;
                acc[groupKey].inflows += (tx.amount_naira || 0) / 1000000;
            } else {
                acc[groupKey].payouts += ((tx.amount_aed || 0) * (tx.exchange_rate || 1650)) / 1000000;
            }
            return acc;
        }, {});

        const limitedData = Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-24);
        return {
            trendData:      limitedData.map(d => ({ name: d.name, volume: parseFloat(d.volume.toFixed(2)) })),
            comparisonData: limitedData.map(d => ({ name: d.name, inflows: parseFloat(d.inflows.toFixed(2)), payouts: parseFloat(d.payouts.toFixed(2)) }))
        };
    }, [filteredTransactions, timeFilter]);

    // ── Top clients ────────────────────────────────────────────────────────
    const topClients = useMemo(() => {
        return clients.map(client => {
            const clientTx = filteredTransactions.filter(tx => tx.client_id === client.id);
            const volume   = clientTx.reduce((sum, tx) => sum + (tx.amount_naira || 0), 0);
            return { ...client, totalVolume: volume, txCount: clientTx.length };
        }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    }, [clients, filteredTransactions]);

    // ── Summary stats ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        if (filteredTransactions.length === 0) return { avgTx: 0, freq: 0, convRate: 1650, txCount: 0 };
        const totalVolume = filteredTransactions.reduce((acc, tx) => acc + (tx.amount_naira || 0), 0);
        let days = 30;
        if (timeFilter === 'Last 90 Days')  days = 90;
        else if (timeFilter === 'Year to Date') days = Math.max(1, Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 86400000));
        else if (timeFilter === 'All Time') days = 365;
        else if (timeFilter === 'Custom Range' && customStart && customEnd) {
            days = Math.max(1, Math.floor((new Date(customEnd) - new Date(customStart)) / 86400000));
        }
        return {
            avgTx:    totalVolume / filteredTransactions.length,
            freq:     filteredTransactions.length / days,
            convRate: allTransactions?.[0]?.exchange_rate || 1650,
            txCount:  filteredTransactions.length
        };
    }, [filteredTransactions, timeFilter, customStart, customEnd, allTransactions]);

    // ── Export CSV (analytics view) ────────────────────────────────────────
    const handleExport = () => {
        if (filteredTransactions.length === 0) return;
        const headers = ['Date', 'Time', 'Client/Counterparty', 'Recipient/Narration', 'Type', 'Amount (NGN)', 'Balance Effect (AED)', 'Unique ID'];
        const rows = filteredTransactions.map(tx => {
            const d = new Date(tx.date);
            return [
                d.toLocaleDateString(),
                d.toLocaleTimeString(),
                `"${(tx.client_name  || '').replace(/"/g, '""')}"`,
                `"${(tx.recipient   || tx.narration || '').replace(/"/g, '""')}"`,
                tx.type === 'IN' ? 'INFLOW' : 'PAYOUT',
                tx.amount_naira || '',
                `${tx.type === 'IN' ? '+' : '-'}${tx.amount_aed}`,
                tx.transaction_unique_id || tx.id
            ].join(',');
        });
        const csv    = [headers.join(','), ...rows].join('\n');
        const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url    = URL.createObjectURL(blob);
        const link   = document.createElement('a');
        const client = clientFilter === 'All Clients' ? 'all_clients' : `client_${clientFilter}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `finance_report_${client}_${timeFilter.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Export statement CSV ───────────────────────────────────────────────
    const handleExportStatement = () => {
        if (statementDays.length === 0) return;
        const rows = ['Date,Client,Type,Recipient/Narration,Naira Amount,AED Amount,Unique ID'];
        statementDays.forEach(day => {
            day.rows.forEach(tx => {
                const d = new Date(tx.date);
                rows.push([
                    d.toLocaleDateString(),
                    `"${(tx.client_name || '').replace(/"/g, '""')}"`,
                    tx.type === 'IN' ? 'INFLOW' : 'PAYOUT',
                    `"${(tx.recipient || tx.narration || '').replace(/"/g, '""')}"`,
                    tx.type === 'IN' ? (tx.amount_naira || 0) : '',
                    tx.amount_aed || '',
                    tx.transaction_unique_id || tx.id
                ].join(','));
            });
            rows.push([
                `DAY TOTAL (${new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
                '', '', '',
                day.totalNaira,
                day.totalAed.toFixed(2),
                ''
            ].join(','));
            rows.push('');
        });
        rows.push(['MONTHLY GRAND TOTAL','','','', grandTotalNaira, grandTotalAed.toFixed(2), ''].join(','));
        const csv  = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `statement_${selectedMonthKey}_${stmtClient === 'All Clients' ? 'all' : stmtClient}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Loading Reports...</div>;

    return (
        <div className="animate-fade">
            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Financial Reports</h1>
                    <p className="text-slate-500 font-medium">Comprehensive analytics and daily transaction statements.</p>
                </div>
            </div>

            {/* ── Tab switcher ── */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: 14, width: 'fit-content' }}>
                <button
                    onClick={() => setActiveTab('analytics')}
                    style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        background: activeTab === 'analytics' ? 'white' : 'transparent',
                        color: activeTab === 'analytics' ? '#7c3aed' : '#64748b',
                        boxShadow: activeTab === 'analytics' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    }}
                >
                    <BarChart2 size={16} /> Analytics
                </button>
                <button
                    onClick={() => setActiveTab('statement')}
                    style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        background: activeTab === 'statement' ? 'white' : 'transparent',
                        color: activeTab === 'statement' ? '#7c3aed' : '#64748b',
                        boxShadow: activeTab === 'statement' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    }}
                >
                    <TableProperties size={16} /> Daily Statement
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════
                ANALYTICS TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
                <>
                    {/* Filters row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.75rem' }}>
                        <div className="report-select-wrapper">
                            <select className="report-select" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
                                <option value="All Clients">All Clients</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="report-select-icon" />
                        </div>
                        <div className="report-select-wrapper">
                            <select className="report-select" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                                <option>Last 30 Days</option>
                                <option>Last 90 Days</option>
                                <option>Year to Date</option>
                                <option>All Time</option>
                                <option>Custom Range</option>
                            </select>
                            <ChevronDown className="report-select-icon" />
                        </div>
                        {timeFilter === 'Custom Range' && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600 }} />
                                <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>to</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600 }} />
                            </div>
                        )}
                        <button
                            onClick={handleExport}
                            disabled={filteredTransactions.length === 0}
                            className="btn-premium btn-primary-premium shadow-lg shadow-violet-200 py-2"
                            style={{ opacity: filteredTransactions.length === 0 ? 0.5 : 1, marginLeft: 'auto' }}
                        >
                            <Download size={18} /> Export CSV
                        </button>
                    </div>

                    {/* Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="premium-card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Transaction Volume Trend</h3>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '0.2rem 0.65rem', borderRadius: 20 }}>NGN</span>
                            </div>
                            <div style={{ height: 300, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={v => `₦${v}M`} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={v => [`₦${v}M`, 'Volume']} />
                                        <Area type="monotone" dataKey="volume" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 3, fill: '#a855f7' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="premium-card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Inflow vs Payout</h3>
                            </div>
                            <div style={{ height: 300, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={v => `₦${v}M`} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v, name) => [`₦${v}M`, name.charAt(0).toUpperCase() + name.slice(1)]} />
                                        <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="inflows" name="Inflows" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="payouts" name="Payouts" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="stats-grid-premium" style={{ marginBottom: '1.5rem' }}>
                        <div className="premium-card stat-card-green">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><TrendingUp size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Average Transaction</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">₦ {stats.avgTx ? stats.avgTx.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</div>
                            <div className="text-xs text-slate-400 font-medium">Per transaction (NGN)</div>
                        </div>
                        <div className="premium-card stat-card-purple">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><Activity size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Transaction Frequency</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">{stats.freq.toFixed(1)}</div>
                            <div className="text-xs text-slate-400 font-medium">Per day average</div>
                        </div>
                        <div className="premium-card stat-card-amber">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><Percent size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Exchange Rate</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">{stats.convRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="text-xs text-slate-400 font-medium">NGN per AED</div>
                        </div>
                        <div className="premium-card stat-card-blue">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><Hash size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Total Transactions</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">{stats.txCount.toLocaleString()}</div>
                            <div className="text-xs text-slate-400 font-medium">In selected period</div>
                        </div>
                    </div>

                    {/* Top clients table */}
                    <div className="premium-card">
                        <h3 className="font-bold text-lg text-slate-800 mb-6">Top Performing Clients</h3>
                        <div className="table-container shadow-none mt-0 border-none">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr className="text-slate-400 text-xs tracking-wider uppercase border-b border-slate-100">
                                        <th className="pb-4 font-semibold w-24 text-center">Rank</th>
                                        <th className="pb-4 font-semibold">Client</th>
                                        <th className="pb-4 font-semibold text-right">Total Volume</th>
                                        <th className="pb-4 font-semibold text-right">Transactions</th>
                                        <th className="pb-4 font-semibold text-right">Avg. Transaction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {topClients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontWeight: 600 }}>
                                                No data for the selected filters.
                                            </td>
                                        </tr>
                                    ) : topClients.map((client, idx) => (
                                        <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex justify-center">
                                                    <div className={`rank-badge ${idx < 3 ? `rank-badge-${idx + 1}` : 'rank-badge-other'}`}>{idx + 1}</div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="client-avatar bg-violet-100 text-violet-700">
                                                        {client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{client.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right font-bold text-slate-800">₦ {client.totalVolume.toLocaleString()}</td>
                                            <td className="py-4 text-right text-slate-500 font-medium">{client.txCount}</td>
                                            <td className="py-4 text-right font-medium text-slate-600">
                                                ₦ {(client.totalVolume / (client.txCount || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════
                DAILY STATEMENT TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'statement' && (
                <>
                    {/* Statement header / filters */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Month navigator — prev/next arrows */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}>
                                <button
                                    onClick={goPrevMonth}
                                    disabled={!canGoPrev}
                                    title="Previous month"
                                    style={{
                                        padding: '0.55rem 0.75rem',
                                        border: 'none',
                                        borderRight: '1px solid #e2e8f0',
                                        background: canGoPrev ? 'white' : '#f8fafc',
                                        cursor: canGoPrev ? 'pointer' : 'not-allowed',
                                        color: canGoPrev ? '#7c3aed' : '#cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{
                                    padding: '0.55rem 1.1rem',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: '#1e293b',
                                    minWidth: 140,
                                    textAlign: 'center',
                                    letterSpacing: '0.01em',
                                }}>
                                    {monthOptions.find(m => m.key === selectedMonthKey)?.label ?? '—'}
                                </span>
                                <button
                                    onClick={goNextMonth}
                                    disabled={!canGoNext}
                                    title="Next month"
                                    style={{
                                        padding: '0.55rem 0.75rem',
                                        border: 'none',
                                        borderLeft: '1px solid #e2e8f0',
                                        background: canGoNext ? 'white' : '#f8fafc',
                                        cursor: canGoNext ? 'pointer' : 'not-allowed',
                                        color: canGoNext ? '#7c3aed' : '#cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={16} />
                                </button>
                            </div>

                            {/* Client picker */}
                            <div className="report-select-wrapper">
                                <select
                                    className="report-select"
                                    value={stmtClient}
                                    onChange={e => setStmtClient(e.target.value)}
                                >
                                    <option value="All Clients">All Clients</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="report-select-icon" />
                            </div>
                        </div>

                        <button
                            onClick={handleExportStatement}
                            disabled={statementDays.length === 0}
                            className="btn-premium btn-primary-premium shadow-lg shadow-violet-200 py-2"
                            style={{ opacity: statementDays.length === 0 ? 0.5 : 1 }}
                        >
                            <Download size={18} /> Export Statement
                        </button>
                    </div>

                    {/* Monthly summary banner */}
                    {statementDays.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                        }}>
                            <div className="premium-card" style={{ padding: '1.25rem', borderLeft: '4px solid #7c3aed' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Inflows (NGN)</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>₦ {fmt(grandTotalNaira)}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 600 }}>{monthOptions.find(m => m.key === selectedMonthKey)?.label}</div>
                            </div>
                            <div className="premium-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Net AED Balance</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: grandTotalAed >= 0 ? '#10b981' : '#ef4444' }}>
                                    {grandTotalAed >= 0 ? '+' : ''}{fmt(grandTotalAed, 2)} AED
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 600 }}>Inflows minus payouts</div>
                            </div>
                            <div className="premium-card" style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Transactions</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>{fmt(grandTxCount)}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 600 }}>Across {statementDays.length} active days</div>
                            </div>
                        </div>
                    )}

                    {/* Daily statement groups */}
                    {statementDays.length === 0 ? (
                        <div className="premium-card" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                            <TableProperties size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No transactions found</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>Try selecting a different month or client.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {statementDays.map(day => {
                                const isCollapsed = collapsedDays[day.dateKey];
                                const dayLabel    = new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
                                const dayInflows  = day.rows.filter(t => t.type === 'IN').length;
                                const dayPayouts  = day.rows.filter(t => t.type !== 'IN').length;

                                return (
                                    <div key={day.dateKey} className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
                                        {/* Day header — clickable to collapse */}
                                        <div
                                            onClick={() => toggleDay(day.dateKey)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.5rem',
                                                cursor: 'pointer',
                                                background: '#fafafa',
                                                borderBottom: isCollapsed ? 'none' : '1px solid #f1f5f9',
                                                userSelect: 'none',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                                                    {new Date(day.date).getDate()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{dayLabel}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.1rem' }}>
                                                        {day.rows.length} transaction{day.rows.length !== 1 ? 's' : ''}
                                                        {dayInflows > 0 && <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>· {dayInflows} inflow{dayInflows !== 1 ? 's' : ''}</span>}
                                                        {dayPayouts > 0 && <span style={{ marginLeft: '0.5rem', color: '#ef4444' }}>· {dayPayouts} payout{dayPayouts !== 1 ? 's' : ''}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Day Inflows</div>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>₦ {fmt(day.totalNaira)}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Net AED</div>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: day.totalAed >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {day.totalAed >= 0 ? '+' : ''}{fmt(day.totalAed, 2)}
                                                    </div>
                                                </div>
                                                <div style={{ color: '#94a3b8' }}>
                                                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronUp size={18} />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transaction rows */}
                                        {!isCollapsed && (
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead style={{ background: '#f8fafc' }}>
                                                    <tr>
                                                        {['Client', 'Recipient / Narration', 'Type', 'NGN Amount', 'AED Amount'].map(h => (
                                                            <th key={h} style={{
                                                                padding: '0.6rem 1.5rem',
                                                                textAlign: h === 'NGN Amount' || h === 'AED Amount' ? 'right' : 'left',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                color: '#94a3b8',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em',
                                                                borderBottom: '1px solid #f1f5f9',
                                                                whiteSpace: 'nowrap',
                                                            }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {day.rows.map((tx, i) => (
                                                        <tr key={tx.id || i} style={{ borderBottom: '1px solid #f8fafc' }} className="client-table-row">
                                                            <td style={{ padding: '0.85rem 1.5rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                                                                        {(tx.client_name || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                                    </div>
                                                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>{tx.client_name || '—'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.82rem', color: '#64748b', fontWeight: 500, maxWidth: 240 }}>
                                                                {tx.recipient || tx.narration || <span style={{ color: '#cbd5e1' }}>—</span>}
                                                            </td>
                                                            <td style={{ padding: '0.85rem 1.5rem' }}>
                                                                <span style={tx.type === 'IN'
                                                                    ? { background: '#ecfdf5', color: '#10b981', border: '1px solid #d1fae5', padding: '0.2rem 0.65rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }
                                                                    : { background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', padding: '0.2rem 0.65rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }
                                                                }>
                                                                    {tx.type === 'IN' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                                                    {tx.type === 'IN' ? 'INFLOW' : 'PAYOUT'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.85rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: tx.type === 'IN' ? '#1e293b' : '#94a3b8' }}>
                                                                {tx.type === 'IN' ? `₦ ${fmt(tx.amount_naira)}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                                                            </td>
                                                            <td style={{ padding: '0.85rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: tx.type === 'IN' ? '#10b981' : '#ef4444' }}>
                                                                {tx.type === 'IN' ? '+' : '-'}{fmt(tx.amount_aed, 2)}
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* Day total row */}
                                                    <tr style={{ background: 'linear-gradient(90deg, #fefce8 0%, #fef9c3 100%)', borderTop: '2px solid #fde68a' }}>
                                                        <td colSpan={2} style={{ padding: '0.9rem 1.5rem' }}>
                                                            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                                TOTAL — {new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.9rem 1.5rem' }}>
                                                            <span style={{ fontSize: '0.7rem', color: '#a16207', fontWeight: 700 }}>
                                                                {day.rows.length} tx
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.9rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                                                            ₦ {fmt(day.totalNaira)}
                                                        </td>
                                                        <td style={{ padding: '0.9rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '0.92rem', color: day.totalAed >= 0 ? '#10b981' : '#ef4444' }}>
                                                            {day.totalAed >= 0 ? '+' : ''}{fmt(day.totalAed, 2)} AED
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Grand total footer */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                gap: '3rem',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                                borderRadius: 16,
                                padding: '1.25rem 2rem',
                                marginTop: '0.5rem',
                            }}>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Monthly Grand Total</div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                        {monthOptions.find(m => m.key === selectedMonthKey)?.label} · {grandTxCount} transactions
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Total Inflows (NGN)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>₦ {fmt(grandTotalNaira)}</div>
                                </div>
                                <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Net AED Balance</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: grandTotalAed >= 0 ? '#86efac' : '#fca5a5' }}>
                                        {grandTotalAed >= 0 ? '+' : ''}{fmt(grandTotalAed, 2)} AED
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

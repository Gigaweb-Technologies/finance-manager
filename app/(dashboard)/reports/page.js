'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import {
    Download,
    TrendingUp,
    Percent,
    Clock,
    ChevronDown,
    Activity,
    Hash,
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

export default function ReportsPage() {
    const { clients, allTransactions, loading } = useData();
    const [timeFilter, setTimeFilter]           = useState('Last 30 Days');
    const [clientFilter, setClientFilter]       = useState('All Clients');
    const [customStart, setCustomStart]         = useState('');
    const [customEnd, setCustomEnd]             = useState('');

    // ── Filtered transactions ─────────────────────────────────────────────
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

    // ── Chart data ────────────────────────────────────────────────────────
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

    // ── Top clients ───────────────────────────────────────────────────────
    const topClients = useMemo(() => {
        return clients.map(client => {
            const clientTx = filteredTransactions.filter(tx => tx.client_id === client.id);
            const volume   = clientTx.reduce((sum, tx) => sum + (tx.amount_naira || 0), 0);
            return { ...client, totalVolume: volume, txCount: clientTx.length };
        }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    }, [clients, filteredTransactions]);

    // ── Summary stats ─────────────────────────────────────────────────────
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

    // ── Export CSV ────────────────────────────────────────────────────────
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

        const csv     = [headers.join(','), ...rows].join('\n');
        const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url     = URL.createObjectURL(blob);
        const link    = document.createElement('a');
        const client  = clientFilter === 'All Clients' ? 'all_clients' : `client_${clientFilter}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `finance_report_${client}_${timeFilter.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Loading Reports...</div>;

    return (
        <div className="animate-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Financial Reports</h1>
                    <p className="text-slate-500 font-medium">Comprehensive analytics and performance insights.</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Client filter */}
                    <div className="report-select-wrapper">
                        <select
                            className="report-select"
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value)}
                        >
                            <option value="All Clients">All Clients</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="report-select-icon" />
                    </div>

                    {/* Time filter */}
                    <div className="report-select-wrapper">
                        <select
                            className="report-select"
                            value={timeFilter}
                            onChange={e => setTimeFilter(e.target.value)}
                        >
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>Year to Date</option>
                            <option>All Time</option>
                            <option>Custom Range</option>
                        </select>
                        <ChevronDown className="report-select-icon" />
                    </div>

                    {/* Custom date range pickers */}
                    {timeFilter === 'Custom Range' && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                style={{ padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600 }}
                            />
                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                style={{ padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600 }}
                            />
                        </div>
                    )}

                    <button
                        onClick={handleExport}
                        disabled={filteredTransactions.length === 0}
                        className="btn-premium btn-primary-premium shadow-lg shadow-violet-200 py-2"
                        style={{ opacity: filteredTransactions.length === 0 ? 0.5 : 1 }}
                    >
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Trend */}
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
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={v => [`₦${v}M`, 'Volume']}
                                />
                                <Area type="monotone" dataKey="volume" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 3, fill: '#a855f7' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Inflow vs Payout */}
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
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(v, name) => [`₦${v}M`, name.charAt(0).toUpperCase() + name.slice(1)]}
                                />
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
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        ₦ {stats.avgTx ? stats.avgTx.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Per transaction (NGN)</div>
                </div>

                <div className="premium-card stat-card-purple">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container"><Activity size={20} /></div>
                        <span className="text-slate-500 font-semibold text-sm">Transaction Frequency</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        {stats.freq.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Per day average</div>
                </div>

                <div className="premium-card stat-card-amber">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container"><Percent size={20} /></div>
                        <span className="text-slate-500 font-semibold text-sm">Exchange Rate</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        {stats.convRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">NGN per AED</div>
                </div>

                <div className="premium-card stat-card-blue">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container"><Hash size={20} /></div>
                        <span className="text-slate-500 font-semibold text-sm">Total Transactions</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        {stats.txCount.toLocaleString()}
                    </div>
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
                                            <div className={`rank-badge ${idx < 3 ? `rank-badge-${idx + 1}` : 'rank-badge-other'}`}>
                                                {idx + 1}
                                            </div>
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
                                    <td className="py-4 text-right font-bold text-slate-800">
                                        ₦ {client.totalVolume.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right text-slate-500 font-medium">
                                        {client.txCount}
                                    </td>
                                    <td className="py-4 text-right font-medium text-slate-600">
                                        ₦ {(client.totalVolume / (client.txCount || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

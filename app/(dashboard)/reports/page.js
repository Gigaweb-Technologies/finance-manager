'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import {
    FileText,
    Download,
    Calendar,
    Filter,
    TrendingUp,
    User,
    Percent,
    Clock,
    ChevronDown,
    Activity
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
    Cell
} from 'recharts';

export default function ReportsPage() {
    const { clients, allTransactions, loading } = useData();
    const [timeFilter, setTimeFilter] = useState('Last 30 Days');
    const [clientFilter, setClientFilter] = useState('All Clients');

    const filteredTransactions = useMemo(() => {
        if (!allTransactions || allTransactions.length === 0) return [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return allTransactions.filter(tx => {
            if (clientFilter !== 'All Clients' && String(tx.client_id) !== String(clientFilter)) return false;
            const txDate = new Date(tx.date);

            switch (timeFilter) {
                case 'Last 30 Days': {
                    const limit = new Date(today);
                    limit.setDate(limit.getDate() - 30);
                    return txDate >= limit;
                }
                case 'Last 90 Days': {
                    const limit = new Date(today);
                    limit.setDate(limit.getDate() - 90);
                    return txDate >= limit;
                }
                case 'Year to Date': {
                    const limit = new Date(today.getFullYear(), 0, 1);
                    return txDate >= limit;
                }
                case 'All Time':
                default:
                    return true;
            }
        });
    }, [allTransactions, timeFilter, clientFilter]);

    const { trendData, comparisonData } = useMemo(() => {
        if (filteredTransactions.length === 0) return { trendData: [], comparisonData: [] };
        const groupByDay = timeFilter === 'Last 30 Days';

        const aggregated = filteredTransactions.reduce((acc, tx) => {
            const date = new Date(tx.date);
            let groupKey, displayLabel;

            if (groupByDay) {
                groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                displayLabel = date.toLocaleString('default', { month: 'short', day: 'numeric' });
            } else {
                groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                displayLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            }

            if (!acc[groupKey]) {
                acc[groupKey] = { sortKey: groupKey, name: displayLabel, volume: 0, inflows: 0, payouts: 0 };
            }

            if (tx.type === 'IN') {
                acc[groupKey].volume += (tx.amount_naira || 0) / 1000000;
                acc[groupKey].inflows += (tx.amount_naira || 0) / 1000000;
            } else {
                acc[groupKey].payouts += (tx.amount_aed * 1650) / 1000000; // Using 1650 as a ref rate
            }
            return acc;
        }, {});

        const sortedData = Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        const limitedData = sortedData.slice(-24);

        return {
            trendData: limitedData.map(d => ({ name: d.name, volume: parseFloat(d.volume.toFixed(2)) })),
            comparisonData: limitedData.map(d => ({
                name: d.name,
                inflows: parseFloat(d.inflows.toFixed(2)),
                payouts: parseFloat(d.payouts.toFixed(2))
            }))
        };
    }, [filteredTransactions, timeFilter]);

    const topClients = useMemo(() => {
        return clients.map(client => {
            const clientTx = filteredTransactions.filter(tx => tx.client_id === client.id);
            const volume = clientTx.reduce((sum, tx) => sum + (tx.amount_naira || 0), 0);
            const transactionsCount = clientTx.length;
            const avgTx = transactionsCount > 0 ? volume / transactionsCount : 0;
            return { ...client, totalVolume: volume, transactionsCount, avgTx };
        }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    }, [clients, filteredTransactions]);

    const stats = useMemo(() => {
        if (filteredTransactions.length === 0) return { avgTx: 0, freq: 0, convRate: 1650, processTime: 0 };
        const totalVolume = filteredTransactions.reduce((acc, tx) => acc + (tx.amount_naira || 0), 0);
        const avgTx = totalVolume / filteredTransactions.length;

        // Rough frequency calculation based on filter 
        let days = 30;
        if (timeFilter === 'Last 90 Days') days = 90;
        else if (timeFilter === 'Year to Date') days = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)) || 1;
        else if (timeFilter === 'All Time') days = 365;

        const freq = filteredTransactions.length / days;

        return {
            avgTx,
            freq,
            convRate: allTransactions && allTransactions.length > 0 ? (allTransactions[0].exchange_rate || 1650) : 1650,
            processTime: 2.4 // Mock value as per typical dashboard
        };
    }, [filteredTransactions, timeFilter, allTransactions]);


    if (loading) return <div>Loading Reports...</div>;

    return (
        <div className="animate-fade">
            <div className="reports-header-wrapper">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Financial Reports</h1>
                    <p className="text-slate-500 font-medium">Comprehensive analytics and performance insights.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="report-select-wrapper">
                        <select
                            className="report-select"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>Year to Date</option>
                            <option>All Time</option>
                        </select>
                        <ChevronDown className="report-select-icon" />
                    </div>
                    <button className="btn-premium btn-primary-premium shadow-lg shadow-violet-200 py-2">
                        <Download size={18} /> Export Report
                    </button>
                </div>
            </div>

            <div className="charts-grid-premium">
                <div className="premium-card">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Transaction Volume Trend</h3>
                        <div className="currency-toggle">
                            <div className="currency-toggle-btn active">NGN</div>
                            <div className="currency-toggle-btn">AED</div>
                        </div>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={true} horizontal={true} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `₦${value}M`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                    formatter={(value) => [`₦${value}M`, 'Volume']}
                                />
                                <Area type="monotone" dataKey="volume" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 4, fill: '#a855f7' }} />
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
                                <CartesianGrid vertical={false} horizontal={true} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `₦${value}M`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value, name) => [`₦${value}M`, name.charAt(0).toUpperCase() + name.slice(1)]}
                                />
                                <Legend iconType="rect" wrapperStyle={{ paddingTop: '20px' }} verticalAlign="bottom" />
                                <Bar dataKey="inflows" name="Inflows" fill="#22c55e" radius={[2, 2, 0, 0]} barSize={16} />
                                <Bar dataKey="payouts" name="Payouts" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="stats-grid-premium">
                <div className="premium-card stat-card-green">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-slate-500 font-semibold text-sm">Average Transaction</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        ₦ {stats.avgTx ? stats.avgTx.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Per transaction</div>
                </div>

                <div className="premium-card stat-card-purple">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container">
                            <Activity size={20} />
                        </div>
                        <span className="text-slate-500 font-semibold text-sm">Transaction Frequency</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        {stats.freq.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Per day average</div>
                </div>

                <div className="premium-card stat-card-amber">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container">
                            <Percent size={20} />
                        </div>
                        <span className="text-slate-500 font-semibold text-sm">Conversion Rate</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        {stats.convRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">NGN per AED</div>
                </div>

                <div className="premium-card stat-card-blue">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-card-icon-container">
                            <Clock size={20} />
                        </div>
                        <span className="text-slate-500 font-semibold text-sm">Processing Time</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mb-1">
                        {stats.processTime}h
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Average turnaround</div>
                </div>
            </div>

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
                            {topClients.map((client, idx) => (
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
                                                {client.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800">{client.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right font-bold text-slate-800">
                                        ₦ {client.totalVolume.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right text-slate-500 font-medium">
                                        {client.transactionsCount}
                                    </td>
                                    <td className="py-4 text-right font-medium text-slate-600">
                                        ₦ {client.avgTx.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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

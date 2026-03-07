'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import {
    FileText,
    Download,
    Calendar,
    Filter,
    TrendingUp,
    Activity,
    User
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
            return { ...client, totalVolume: volume };
        }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    }, [clients, filteredTransactions]);

    if (loading) return <div>Loading Reports...</div>;

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Analytics & Reports</h1>
                    <p className="text-slate-500 font-medium">Analyze financial performance and trends across your client network.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <Calendar size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none outline-none font-bold text-sm text-slate-700"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>Year to Date</option>
                            <option>All Time</option>
                        </select>
                    </div>
                    <button className="btn-premium btn-primary-premium shadow-lg shadow-violet-200">
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="premium-card">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Activity size={18} className="text-violet-500" />
                            <h3 className="font-bold text-slate-800">Inflow Trend (Millions NGN)</h3>
                        </div>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="volume" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="premium-card">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-500" />
                            <h3 className="font-bold text-slate-800">Inflow vs Payout Comparison</h3>
                        </div>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="inflows" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="payouts" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 premium-card">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Top Performing Clients</h3>
                    <div className="table-container shadow-none mt-0 border-none">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Total Inflow</th>
                                    <th>Growth</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topClients.map((client, idx) => (
                                    <tr key={client.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold">{client.name}</span>
                                            </div>
                                        </td>
                                        <td className="font-bold text-emerald-600">₦ {client.totalVolume.toLocaleString()}</td>
                                        <td>
                                            <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs">
                                                <TrendingUp size={12} /> High
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="premium-card bg-violet-600 text-white border-none shadow-violet-200">
                    <div className="flex flex-col h-full">
                        <FileText size={40} className="mb-4 text-violet-200" />
                        <h3 className="text-xl font-bold mb-2">Network Insights</h3>
                        <p className="text-violet-100 mb-6 text-sm">
                            Based on your transactions in {timeFilter}, the average exchange rate has been stable at {allTransactions[0]?.exchange_rate || '1,650'} NGN/AED.
                        </p>
                        <div className="mt-auto pt-6 border-t border-violet-500 flex justify-between items-center">
                            <div>
                                <div className="text-xs text-violet-200 font-bold uppercase tracking-wider mb-1">Active Clients</div>
                                <div className="text-2xl font-extrabold">{clients.filter(c => c.balance_aed > 0).length}</div>
                            </div>
                            <div className="w-12 h-12 rounded-full border-2 border-violet-400 flex items-center justify-center">
                                <User size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

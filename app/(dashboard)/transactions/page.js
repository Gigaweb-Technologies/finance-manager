'use client';

import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import {
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    Download,
    Calendar
} from 'lucide-react';

export default function TransactionsPage() {
    const { allTransactions, loading, searchQuery } = useData();

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(t =>
            (t.client_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            t.description?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            t.recipient?.toLowerCase().includes((searchQuery || '').toLowerCase())
        );
    }, [allTransactions, searchQuery]);

    const stats = useMemo(() => {
        const totalIn = filteredTransactions
            .filter(t => t.type === 'IN')
            .reduce((sum, t) => sum + (t.amount_naira || 0), 0);
        const totalOut = filteredTransactions
            .filter(t => t.type === 'OUT')
            .reduce((sum, t) => sum + t.amount_aed, 0);

        return { totalIn, totalOut };
    }, [filteredTransactions]);

    if (loading) return <div>Loading Transactions...</div>;

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Transaction History</h1>
                    <p className="text-slate-500 font-medium">Detailed log of all financial movements across your network.</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-premium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                        <Download size={18} /> Export CSV
                    </button>
                    <button className="btn-premium btn-primary-premium">
                        <Filter size={18} /> Filter
                    </button>
                </div>
            </div>

            <div className="stats-grid-premium" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="premium-card">
                    <div className="flex gap-4 items-center mb-4">
                        <div className="card-header-icon icon-inflow mb-0">
                            <TrendingUp size={20} />
                        </div>
                        <span className="card-label mb-0">Total Inflow (Filtered)</span>
                    </div>
                    <div className="card-value">₦ {stats.totalIn.toLocaleString()}</div>
                </div>

                <div className="premium-card">
                    <div className="flex gap-4 items-center mb-4">
                        <div className="card-header-icon icon-liabilities mb-0">
                            <TrendingDown size={20} />
                        </div>
                        <span className="card-label mb-0">Total Payout (Filtered)</span>
                    </div>
                    <div className="card-value">AED {stats.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            <div className="table-container border border-slate-100 shadow-sm mt-8">
                <div className="p-6 border-bottom flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="font-bold text-slate-700">Latest Transactions</span>
                    </div>
                </div>
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Ref ID</th>
                            <th>Client</th>
                            <th>Type</th>
                            <th>Amount (Naira)</th>
                            <th>Amount (AED)</th>
                            <th>Rate</th>
                            <th>Recipient</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="text-slate-500 font-medium whitespace-nowrap">
                                    {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="text-[10px] font-bold text-slate-400 font-mono">
                                    {tx.transaction_unique_id?.substring(0, 8) || 'MANUAL'}
                                </td>
                                <td>
                                    <div className="font-bold text-slate-800">{tx.client_name}</div>
                                </td>
                                <td>
                                    <span className={`pill ${tx.type === 'IN' ? 'pill-active' : 'pill-pending'}`}>
                                        {tx.type === 'IN' ? 'Deposit' : 'Payout'}
                                    </span>
                                </td>
                                <td className="cell-amount">
                                    {tx.amount_naira ? `₦ ${tx.amount_naira.toLocaleString()}` : '-'}
                                </td>
                                <td className="cell-amount font-bold text-slate-900">
                                    AED {tx.amount_aed.toLocaleString()}
                                </td>
                                <td className="text-xs font-bold text-violet-600">
                                    {tx.exchange_rate ? `${tx.exchange_rate}` : '-'}
                                </td>
                                <td className="text-slate-500 text-sm italic max-w-[200px] truncate">
                                    {tx.recipient || tx.description || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

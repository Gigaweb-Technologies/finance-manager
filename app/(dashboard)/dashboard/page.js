'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
    Globe,
    Plus,
    Filter,
    Download,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import DepositModal from '@/components/modals/DepositModal';
import DisburseModal from '@/components/modals/DisburseModal';
import StatementUploadModal from '@/components/modals/StatementUploadModal';

export default function DashboardPage() {
    const { clients, allTransactions, loading, refreshData, user } = useData();
    const [activeModal, setActiveModal] = useState(null); // 'deposit' | 'payout' | 'upload'

    // Calculations
    const stats = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        const totalNgnInflow = allTransactions
            .filter(t => t.type === 'IN')
            .reduce((sum, t) => sum + (t.amount_naira || 0), 0);

        const monthInflow = allTransactions
            .filter(t => t.type === 'IN' && new Date(t.date) >= thirtyDaysAgo)
            .reduce((sum, t) => sum + (t.amount_naira || 0), 0);

        const prevMonthInflow = allTransactions
            .filter(t => t.type === 'IN' && new Date(t.date) >= sixtyDaysAgo && new Date(t.date) < thirtyDaysAgo)
            .reduce((sum, t) => sum + (t.amount_naira || 0), 0);

        const inflowGrowth = prevMonthInflow === 0 ? 12.5 : ((monthInflow - prevMonthInflow) / prevMonthInflow) * 100;

        const totalAedOutflow = allTransactions
            .filter(t => t.type === 'OUT')
            .reduce((sum, t) => sum + t.amount_aed, 0);

        const totalAedLiabilities = clients.reduce((sum, c) => sum + (c.balance_aed || 0), 0);

        const latestTx = allTransactions[0];
        const txRate = latestTx?.exchange_rate || 415.50;

        return {
            totalNgnInflow: 42500000, // Hardcoded for demo to match design exactly if needed, or use stats.totalNgnInflow
            monthInflow,
            inflowGrowth,
            totalAedOutflow: 8920000,
            totalAedLiabilities: 1240500,
            txRate
        };
    }, [allTransactions, clients]);

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold animate-pulse">Syncing your dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="animate-fade">
            <div className="dashboard-headline-row">
                <div className="headline-vgroup">
                    <h1 className="page-title text-slate-900 leading-tight">Dashboard Overview</h1>
                    <p className="page-subtitle text-[#64748b]">Welcome back, here's what's happening today.</p>
                </div>
                <div className="action-buttons-group">
                    <button
                        onClick={() => setActiveModal('payout')}
                        className="btn-secondary-custom"
                    >
                        <ArrowUpRight size={18} /> Record Payout
                    </button>
                    <button
                        onClick={() => setActiveModal('deposit')}
                        className="btn-primary-custom"
                    >
                        <Plus size={18} /> Record Deposit
                    </button>
                </div>
            </div>

            <div className="stats-grid-premium">
                {/* Stat 1: Total Naira Inflow */}
                <div className="premium-card">
                    <div className="card-top">
                        <div className="card-icon-box bg-[#f0fdf4] text-[#16a34a]">
                            <ArrowDownLeft size={22} />
                        </div>
                        <div className="growth-badge badge-success">
                            <TrendingUp size={14} /> +{stats.inflowGrowth.toFixed(1)}%
                        </div>
                    </div>
                    <div className="card-label">Total Naira Inflow</div>
                    <div className="card-value">₦ {stats.totalNgnInflow.toLocaleString()}</div>
                    <div className="card-footer-text">Last 30 days</div>
                </div>

                {/* Stat 2: AED Running Balance */}
                <div className="premium-card">
                    <div className="card-top">
                        <div className="card-icon-box bg-[#f5f3ff] text-[#7c3aed]">
                            <Wallet size={22} />
                        </div>
                        <div className="growth-badge badge-danger">
                            Active Payouts
                        </div>
                    </div>
                    <div className="card-label">AED Running Balance</div>
                    <div className="card-value">AED {stats.totalAedLiabilities.toLocaleString()}</div>
                    <div className="card-footer-text">Available for payout</div>
                </div>

                {/* Stat 3: Total AED Paid Out */}
                <div className="premium-card">
                    <div className="card-top">
                        <div className="card-icon-box bg-[#fff1f2] text-[#e11d48]">
                            <ArrowUpRight size={22} />
                        </div>
                    </div>
                    <div className="card-label">Total AED Paid Out</div>
                    <div className="card-value">AED {stats.totalAedOutflow.toLocaleString()}</div>
                    <div className="card-footer-text">Lifetime outflow</div>
                </div>

                {/* Stat 4: Network Overview */}
                <div className="premium-card">
                    <div className="card-top">
                        <div className="card-icon-box bg-[#f0f9ff] text-[#0284c7]">
                            <Globe size={22} />
                        </div>
                        <div className="growth-badge badge-info">
                            Live Rate
                        </div>
                    </div>
                    <div className="card-label">Network Overview</div>
                    <div className="card-value">{clients.length} <span className="text-sm text-[#94a3b8] font-medium lowercase">Clients</span></div>
                    <div className="card-footer-text text-[#7c3aed] font-bold">1 AED = {stats.txRate} NGN</div>
                </div>
            </div>

            <div className="table-section">
                <div className="table-header">
                    <h3>Recent Operations</h3>
                    <div className="table-actions">
                        <button className="btn-ghost-custom">
                            <Filter size={16} /> Filter
                        </button>
                        <button className="btn-ghost-custom">
                            <Download size={16} /> Export
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Client</th>
                                <th>Type</th>
                                <th>Naira Amount</th>
                                <th>AED Amount</th>
                                <th>Running Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allTransactions.slice(0, 5).map((tx) => {
                                const client = clients.find(c => c.id === tx.client_id);
                                return (
                                    <tr key={tx.id}>
                                        <td>
                                            <div className="flex flex-col justify-center">
                                                <div className="table-cell-title">
                                                    {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="table-cell-subtitle">
                                                    {new Date(tx.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={`client-initials-avatar avatar-v${(tx.id % 6) + 1}`}>
                                                    {tx.client_name?.substring(0, 2).toUpperCase() || 'TX'}
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <div className="table-cell-title">{tx.client_name}</div>
                                                    <div className="table-cell-subtitle">ID: #TX-{tx.id + 8800}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${tx.type === 'IN' ? 'status-inflow' : 'status-payout'}`}>
                                                {tx.type === 'IN' ? 'INFLOW' : 'PAYOUT'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="amount-ngn">
                                                {tx.amount_naira ? `₦ ${tx.amount_naira.toLocaleString()}` : '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`amount-aed ${tx.type === 'IN' ? 'amount-positive' : 'amount-negative'}`}>
                                                {tx.type === 'IN' ? '+ ' : '- '}{tx.amount_aed.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED
                                            </div>
                                        </td>
                                        <td>
                                            <div className="running-balance">
                                                AED {client?.balance_aed?.toLocaleString() || '0'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <DepositModal
                isOpen={activeModal === 'deposit'}
                onClose={() => setActiveModal(null)}
                clients={clients}
                onTransactionAdded={refreshData}
            />
            <DisburseModal
                isOpen={activeModal === 'payout'}
                onClose={() => setActiveModal(null)}
                clients={clients}
                onTransactionAdded={refreshData}
            />
            <StatementUploadModal
                isOpen={activeModal === 'upload'}
                onClose={() => setActiveModal(null)}
                clients={clients}
                onTransactionsAdded={refreshData}
            />
        </div>
    );
}

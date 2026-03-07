'use client';

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/DataContext';
import {
    Users,
    UserCheck,
    Clock,
    Plus,
    TrendingUp,
    Edit,
    Trash2,
    ExternalLink
} from 'lucide-react';
import AddClientModal from '@/components/modals/AddClientModal';

export default function ClientsPage() {
    const { clients, allTransactions, loading, refreshData, searchQuery } = useData();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const enrichedClients = useMemo(() => {
        return clients.map(client => {
            const clientTx = allTransactions.filter(tx => tx.client_id === client.id);
            const volume = clientTx.reduce((sum, tx) => sum + (tx.amount_naira || 0), 0);
            const lastTx = clientTx[0];
            return {
                ...client,
                txCount: clientTx.length,
                totalVolume: volume,
                status: clientTx.length > 0 ? 'Active' : 'Pending',
                lastActive: lastTx ? new Date(lastTx.date) : null
            };
        });
    }, [clients, allTransactions]);

    const filteredClients = useMemo(() => {
        return enrichedClients.filter(c =>
            (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            c.email?.toLowerCase().includes((searchQuery || '').toLowerCase())
        );
    }, [enrichedClients, searchQuery]);

    const activeCount = enrichedClients.filter(c => c.txCount > 0).length;
    const pendingCount = enrichedClients.filter(c => c.txCount === 0).length;

    if (loading) return <div>Loading Clients...</div>;

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Client Management</h1>
                    <p className="text-slate-500 font-medium">Manage your client network and their transaction history.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-premium btn-primary-premium shadow-lg shadow-violet-200"
                >
                    <Plus size={18} /> Add New Client
                </button>
            </div>

            <div className="stats-grid-premium" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="premium-card">
                    <div className="flex gap-4 items-center mb-4">
                        <div className="card-header-icon icon-info mb-0">
                            <Users size={20} />
                        </div>
                        <span className="card-label mb-0">Total Clients</span>
                    </div>
                    <div className="card-value">{clients.length}</div>
                    <div className="text-emerald-500 font-bold text-xs mt-2 flex items-center gap-1">
                        <TrendingUp size={14} /> Live network size
                    </div>
                </div>

                <div className="premium-card">
                    <div className="flex gap-4 items-center mb-4">
                        <div className="card-header-icon icon-inflow mb-0">
                            <UserCheck size={20} />
                        </div>
                        <span className="card-label mb-0">Active Clients</span>
                    </div>
                    <div className="card-value">{activeCount}</div>
                    <div className="text-slate-400 font-medium text-xs mt-2">Transacting users</div>
                </div>

                <div className="premium-card">
                    <div className="flex gap-4 items-center mb-4">
                        <div className="card-header-icon bg-orange-50 text-orange-500 mb-0">
                            <Clock size={20} />
                        </div>
                        <span className="card-label mb-0">Initial Onboarding</span>
                    </div>
                    <div className="card-value">{pendingCount}</div>
                    <div className="text-orange-500 font-bold text-xs mt-2">Awaiting first transaction</div>
                </div>
            </div>

            <div className="table-container border border-slate-100 shadow-sm mt-8">
                <div className="p-6 border-bottom flex justify-between items-center bg-white">
                    <h3 className="font-bold text-lg">All Entities</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Balance (AED)</th>
                                <th>Total Volume (NGN)</th>
                                <th>Last Active</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="client-table-avatar">
                                                {client.photo_url ? (
                                                    <img src={client.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : client.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold">{client.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">{client.email || 'No email provided'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`pill ${client.status === 'Active' ? 'pill-active' : 'pill-pending'}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="font-bold text-emerald-600">AED {client.balance_aed.toLocaleString()}</div>
                                    </td>
                                    <td>
                                        <div className="text-slate-600 font-medium">₦ {client.totalVolume.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{client.txCount} Records</div>
                                    </td>
                                    <td className="text-slate-500 text-sm font-medium">
                                        {client.lastActive ? client.lastActive.toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-violet-600 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-violet-600 transition-colors">
                                                <ExternalLink size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onClientAdded={refreshData}
            />
        </div>
    );
}

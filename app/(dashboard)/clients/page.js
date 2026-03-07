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
    ExternalLink,
    Filter,
    Search
} from 'lucide-react';
import AddClientModal from '@/components/modals/AddClientModal';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import axios from 'axios';

export default function ClientsPage() {
    const { clients, allTransactions, loading, refreshData, searchQuery } = useData();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEdit = (client) => {
        setSelectedClient(client);
        setIsAddModalOpen(true);
    };

    const handleDeleteClick = (client) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedClient) return;
        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/api/clients/${selectedClient.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            refreshData();
            setIsDeleteModalOpen(false);
            setSelectedClient(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete client');
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setSelectedClient(null);
    };

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
            <div className="flex-between page-header">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e293b] mb-1">Client Management</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage your client network and their transaction history.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-add-client"
                >
                    <Plus size={18} /> Add New Client
                </button>
            </div>

            <div className="stats-cards-row">
                <div className="stat-card-horizontal">
                    <div className="stat-card-icon-wrapper bg-[#f5f3ff] text-[#7c3aed]">
                        <Users size={20} />
                    </div>
                    <div className="stat-card-content">
                        <span className="stat-card-label">Total Clients</span>
                        <div className="stat-card-value">{clients.length}</div>
                        <div className="stat-card-trend text-[#10b981] flex items-center gap-1">
                            <TrendingUp size={12} /> +8 this month
                        </div>
                    </div>
                </div>

                <div className="stat-card-horizontal">
                    <div className="stat-card-icon-wrapper bg-[#ecfdf5] text-[#10b981]">
                        <UserCheck size={20} />
                    </div>
                    <div className="stat-card-content">
                        <span className="stat-card-label">Active Clients</span>
                        <div className="stat-card-value">{activeCount}</div>
                        <div className="stat-card-trend text-[#64748b]">
                            {enrichedClients.length > 0 ? ((activeCount / enrichedClients.length) * 100).toFixed(1) : 0}% activity rate
                        </div>
                    </div>
                </div>

                <div className="stat-card-horizontal">
                    <div className="stat-card-icon-wrapper bg-[#fff7ed] text-[#f59e0b]">
                        <Clock size={20} />
                    </div>
                    <div className="stat-card-content">
                        <span className="stat-card-label">Pending Verifications</span>
                        <div className="stat-card-value">{pendingCount}</div>
                        <div className="stat-card-trend text-[#f59e0b]">Requires attention</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-[#f1f5f9] overflow-hidden shadow-sm mt-8">
                <div className="table-toolbar">
                    <div className="table-toolbar-title">All Clients</div>
                    <div className="table-toolbar-actions">
                        <div className="search-input-wrapper">
                            <Search className="search-input-icon" size={16} />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                className="search-input-field"
                            />
                        </div>
                        <button className="filter-button">
                            <Filter size={16} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-premium w-full text-left">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Total Transactions</th>
                                <th>Total Volume (NGN)</th>
                                <th>Last Activity</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9]">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className={`client-avatar ${['bg-[#f5f3ff] text-[#7c3aed]', 'bg-[#ecfdf5] text-[#10b981]', 'bg-[#fff7ed] text-[#f59e0b]', 'bg-[#fef2f2] text-[#ef4444]'][client.id % 4]}`}>
                                                {client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="client-name">{client.name}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="client-id">ID: #CL-{1000 + client.id}</div>
                                                    {client.contact_person && (
                                                        <div className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                                                            {client.contact_person}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${client.status === 'Active' ? 'status-active' : 'status-pending'}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="tx-count-cell">{client.txCount} transactions</div>
                                    </td>
                                    <td>
                                        <div className="volume-cell">₦ {client.totalVolume.toLocaleString()}</div>
                                    </td>
                                    <td>
                                        <div className="activity-cell">
                                            {client.lastActive ? `${Math.floor((new Date() - client.lastActive) / (1000 * 60 * 60 * 24))} days ago` : 'Never'}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <a href={`/clients/${client.id}`} className="action-link mr-3">
                                                View Details
                                            </a>
                                            <button
                                                onClick={() => handleEdit(client)}
                                                className="action-icon-btn action-icon-btn-edit"
                                                title="Edit Client"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(client)}
                                                className="action-icon-btn action-icon-btn-delete"
                                                title="Delete Client"
                                            >
                                                <Trash2 size={16} />
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
                onClose={closeAddModal}
                onClientAdded={refreshData}
                client={selectedClient}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Client"
                message={`Are you sure you want to delete ${selectedClient?.name}? This will remove all their records from the system.`}
                loading={isSubmitting}
            />
        </div>
    );
}

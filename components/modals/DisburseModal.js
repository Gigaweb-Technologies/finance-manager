'use client';

import React, { useState } from 'react';
import { X, ArrowUpFromLine, Lock, Loader2, UserPlus, Users } from 'lucide-react';
import axios from 'axios';
import { useData } from '@/lib/DataContext';

const DisburseModal = ({ isOpen, onClose, clients, onTransactionAdded }) => {
    const { recipients, refreshData } = useData();
    const [recipientMode, setRecipientMode] = useState('select'); // 'select' | 'new'
    const [form, setForm] = useState({
        client_id: '',
        amount_aed: '',
        recipient: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const selectedClient = clients.find(c => String(c.id) === String(form.client_id));
    const clientRecipients = recipients.filter(r => String(r.client_id) === String(form.client_id));

    const currentBalance = selectedClient?.balance_aed || 0;
    const disbursAmount = parseFloat(form.amount_aed) || 0;
    const balanceAfter = currentBalance - disbursAmount;
    const isInsufficient = disbursAmount > currentBalance;

    const refId = `PAY-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    const handleRecipientSelected = (name) => {
        setForm({ ...form, recipient: name });
    };

    const handleClientChange = (clientId) => {
        const hasRecipients = recipients.some(r => String(r.client_id) === String(clientId));
        setForm({ ...form, client_id: clientId, recipient: '' });
        setRecipientMode(hasRecipients ? 'select' : 'new');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.client_id || !form.amount_aed || !form.recipient) return setError('Missing required fields');
        if (isInsufficient) return setError('Insufficient balance in client wallet');

        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            // 1. If new recipient, save it first (optional, but requested to link them)
            if (recipientMode === 'new') {
                try {
                    await axios.post('/api/recipients', {
                        client_id: form.client_id,
                        name: form.recipient
                    }, { headers: { Authorization: `Bearer ${token}` } });
                    refreshData(); // Refresh global recipients list
                } catch (rErr) {
                    console.error('Failed to auto-save recipient:', rErr);
                    // Silently fail recipient save, don't block transaction
                }
            }

            // 2. Process transaction
            await axios.post('/api/transactions', {
                ...form,
                type: 'OUT',
                amount_aed: parseFloat(form.amount_aed),
                amount_naira: 0,
                exchange_rate: 0,
                date: form.date
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onTransactionAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record payout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-payout-container animate-fade">

                {/* Header */}
                <div className="modal-payout-header">
                    <div className="modal-payout-header-left">
                        <div className="modal-payout-icon">
                            <ArrowUpFromLine size={18} />
                        </div>
                        <div>
                            <h3 className="modal-payout-title">Record AED Payout</h3>
                            <p className="modal-payout-subtitle">Disburse funds from a client wallet</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-payout-close-btn">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-payout-body">
                    {error && <div className="auth-error-badge mb-6">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="payout-grid">
                            {/* Client Name */}
                            <div className="payout-field-group">
                                <label className="payout-label">Client Name</label>
                                <select
                                    className="payout-input payout-select"
                                    value={form.client_id}
                                    onChange={(e) => handleClientChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select corporate account...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Reference ID */}
                            <div className="payout-field-group">
                                <label className="payout-label">Reference ID</label>
                                <div className="payout-input-icon-wrapper">
                                    <input
                                        type="text"
                                        className="payout-input payout-input-with-icon"
                                        value={refId}
                                        disabled
                                    />
                                    <Lock size={14} className="payout-input-icon" />
                                </div>
                            </div>

                            {/* Category */}
                            <div className="payout-field-group">
                                <label className="payout-label">Category</label>
                                <select className="payout-input payout-select" defaultValue="standard">
                                    <option value="standard">Standard Payout</option>
                                    <option value="priority">Priority Payout</option>
                                    <option value="refund">Refund</option>
                                </select>
                            </div>

                            {/* Date Field */}
                            <div className="payout-field-group">
                                <label className="payout-label">Transaction Date</label>
                                <input
                                    type="date"
                                    className="payout-input"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </div>

                            {/* Recipient Selection */}
                            <div className="payout-field-group" style={{ gridColumn: 'span 2' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="payout-label mb-0">Recipient Details</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button 
                                            type="button"
                                            onClick={() => setRecipientMode('select')}
                                            className={`text-[10px] px-2 py-1 rounded-md transition-all ${recipientMode === 'select' ? 'bg-white shadow-sm text-violet-600 font-bold' : 'text-slate-500'}`}
                                        >
                                            Saved
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setRecipientMode('new')}
                                            className={`text-[10px] px-2 py-1 rounded-md transition-all ${recipientMode === 'new' ? 'bg-white shadow-sm text-violet-600 font-bold' : 'text-slate-500'}`}
                                        >
                                            New
                                        </button>
                                    </div>
                                </div>

                                {recipientMode === 'select' ? (
                                    <select
                                        className="payout-input payout-select"
                                        value={form.recipient}
                                        onChange={(e) => handleRecipientSelected(e.target.value)}
                                        required
                                        disabled={!form.client_id}
                                    >
                                        <option value="">Select a saved recipient...</option>
                                        {clientRecipients.map(r => (
                                            <option key={r.id} value={r.name}>{r.name} {r.bank_name ? `(${r.bank_name})` : ''}</option>
                                        ))}
                                        {clientRecipients.length === 0 && form.client_id && (
                                            <option value="" disabled>No recipients saved for this client</option>
                                        )}
                                    </select>
                                ) : (
                                    <div className="payout-input-icon-wrapper">
                                        <input
                                            type="text"
                                            className="payout-input payout-input-with-icon"
                                            placeholder="Enter recipient name..."
                                            value={form.recipient}
                                            onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                                            required
                                        />
                                        <UserPlus size={14} className="payout-input-icon" />
                                    </div>
                                )}
                            </div>

                            {/* Amount AED */}
                            <div className="payout-field-group">
                                <label className="payout-label">Amount (AED)</label>
                                <div className="payout-amount-wrapper">
                                    <span className="payout-currency-chip">AED</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="payout-input payout-amount-input"
                                        placeholder="0.00"
                                        value={form.amount_aed}
                                        onChange={(e) => setForm({ ...form, amount_aed: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Purpose / Notes */}
                            <div className="payout-field-group">
                                <label className="payout-label">Purpose / Notes</label>
                                <textarea
                                    className="payout-input payout-textarea"
                                    placeholder="Add a note..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Balance Summary Card */}
                        <div className="payout-balance-card">
                            <div className="payout-balance-col">
                                <div className="payout-balance-label">Current Balance</div>
                                <div className="payout-balance-value">
                                    {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
                                </div>
                            </div>
                            <div className="payout-balance-divider" />
                            <div className="payout-balance-col">
                                <div className="payout-balance-label">Balance After Disburse</div>
                                <div className={`payout-balance-value payout-balance-after ${isInsufficient ? 'payout-balance-danger' : 'payout-balance-accent'}`}>
                                    {balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="payout-actions">
                            <button
                                type="submit"
                                disabled={loading || isInsufficient}
                                className="btn-payout-confirm"
                            >
                                {loading && <Loader2 className="inline mr-2 animate-spin" size={16} />}
                                Confirm &amp; Disburse
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-payout-cancel"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DisburseModal;

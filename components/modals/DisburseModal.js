'use client';

import React, { useState } from 'react';
import { X, ArrowUpFromLine, Lock, Loader2 } from 'lucide-react';
import axios from 'axios';

const DisburseModal = ({ isOpen, onClose, clients, onTransactionAdded }) => {
    const [form, setForm] = useState({
        client_id: '',
        amount_aed: '',
        recipient: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const selectedClient = clients.find(c => String(c.id) === String(form.client_id));
    const currentBalance = selectedClient?.balance_aed || 0;
    const disbursAmount = parseFloat(form.amount_aed) || 0;
    const balanceAfter = currentBalance - disbursAmount;
    const isInsufficient = disbursAmount > currentBalance;

    const refId = `PAY-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.client_id || !form.amount_aed) return setError('Missing required fields');
        if (isInsufficient) return setError('Insufficient balance in client wallet');

        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            await axios.post('/api/transactions', {
                ...form,
                type: 'OUT',
                amount_aed: parseFloat(form.amount_aed),
                amount_naira: 0,
                exchange_rate: 0
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
                                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
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

                            {/* Recipient Name */}
                            <div className="payout-field-group">
                                <label className="payout-label">Recipient Name</label>
                                <input
                                    type="text"
                                    className="payout-input"
                                    placeholder="Enter recipient..."
                                    value={form.recipient}
                                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                                    required
                                />
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

'use client';

import React, { useState } from 'react';
import { X, Plus, DollarSign, FileText, Loader2, ArrowRightLeft } from 'lucide-react';
import axios from 'axios';

const DepositModal = ({ isOpen, onClose, clients, onTransactionAdded }) => {
    const [form, setForm] = useState({
        client_id: '',
        amount_naira: '',
        amount_aed: '',
        exchange_rate: '1650',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleNairaChange = (val) => {
        const rate = parseFloat(form.exchange_rate) || 1;
        setForm({
            ...form,
            amount_naira: val,
            amount_aed: val ? (parseFloat(val) / rate).toFixed(2) : ''
        });
    };

    const handleRateChange = (val) => {
        const rate = parseFloat(val) || 1;
        setForm({
            ...form,
            exchange_rate: val,
            amount_aed: form.amount_naira ? (parseFloat(form.amount_naira) / rate).toFixed(2) : ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.client_id || !form.amount_aed) return setError('Missing required fields');

        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            await axios.post('/api/transactions', {
                ...form,
                type: 'IN',
                amount_naira: parseFloat(form.amount_naira),
                amount_aed: parseFloat(form.amount_aed),
                exchange_rate: parseFloat(form.exchange_rate)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onTransactionAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record deposit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-payout-container animate-fade">
                <div className="modal-payout-header">
                    <h3 className="font-bold text-base tracking-tight">Record Client Deposit</h3>
                    <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                        <X size={20} />
                    </button>
                </div>

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
                                <input
                                    type="text"
                                    className="payout-input"
                                    value={`DEP-${Math.floor(Math.random() * 100000)}`}
                                    disabled
                                    placeholder="Auto-generated"
                                />
                            </div>

                            {/* Amount in Naira */}
                            <div className="payout-field-group">
                                <label className="payout-label">Amount in Naira (NGN)</label>
                                <div className="payout-input-wrapper">
                                    <input
                                        type="number"
                                        className="payout-input"
                                        placeholder="0.00"
                                        value={form.amount_naira}
                                        onChange={(e) => handleNairaChange(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Exchange Rate */}
                            <div className="payout-field-group">
                                <label className="payout-label">Exchange Rate</label>
                                <input
                                    type="number"
                                    className="payout-input"
                                    value={form.exchange_rate}
                                    onChange={(e) => handleRateChange(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Amount AED */}
                            <div className="payout-field-group">
                                <label className="payout-label">Amount AED (Credit)</label>
                                <input
                                    type="text"
                                    className="payout-input bg-slate-50"
                                    value={form.amount_aed || '0.00'}
                                    disabled
                                />
                            </div>

                            {/* Purpose / Proof */}
                            <div className="payout-field-group">
                                <label className="payout-label">Purpose / Proof</label>
                                <textarea
                                    className="payout-input min-h-[44px]"
                                    rows="1"
                                    placeholder="TextArea..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Credit Card */}
                        <div className="deposit-balance-card">
                            <div className="deposit-balance-label">Credit to Client Wallet:</div>
                            <div className="deposit-balance-value">
                                Amount: {parseFloat(form.amount_aed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="payout-actions">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-deposit-confirm"
                            >
                                {loading && <Loader2 className="inline mr-2 animate-spin" size={16} />}
                                Confirm Deposit
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-deposit-cancel"
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

export default DepositModal;

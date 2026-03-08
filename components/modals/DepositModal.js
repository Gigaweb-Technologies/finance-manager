'use client';

import React, { useState } from 'react';
import { X, Plus, Lock, ArrowRight, Loader2, ArrowRightLeft } from 'lucide-react';
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

    const refId = `DEP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-payout-container animate-fade" style={{ maxWidth: '650px' }}>
                
                {/* Header */}
                <div className="modal-deposit-header">
                    <div className="modal-deposit-header-left">
                        <div className="modal-deposit-icon">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h3 className="modal-deposit-title">Record Client Deposit</h3>
                            <p className="modal-deposit-subtitle">Credit funds to a client wallet</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-deposit-close-btn">
                        <X size={18} />
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

                            {/* Amount in Naira */}
                            <div className="payout-field-group">
                                <label className="payout-label">Amount in Naira (NGN)</label>
                                <div className="payout-amount-wrapper">
                                    <span className="payout-currency-chip deposit-input-ngn-chip">NGN</span>
                                    <input
                                        type="number"
                                        className="payout-input payout-amount-input"
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
                                <div className="payout-input-icon-wrapper">
                                    <input
                                        type="number"
                                        className="payout-input"
                                        value={form.exchange_rate}
                                        onChange={(e) => handleRateChange(e.target.value)}
                                        required
                                    />
                                    <ArrowRightLeft size={14} className="deposit-input-rate-icon" />
                                </div>
                            </div>

                            {/* Amount AED (Auto-calculated) */}
                            <div className="payout-field-group" style={{ gridColumn: 'span 2' }}>
                                <label className="payout-label">Amount AED (Credit) — <span className="text-slate-400 font-normal">Auto-calculated</span></label>
                                <div className="payout-amount-wrapper" style={{ background: '#f8fafc' }}>
                                    <span className="payout-currency-chip">AED</span>
                                    <input
                                        type="text"
                                        className="payout-input payout-amount-input"
                                        value={form.amount_aed || '0.00'}
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Purpose / Proof */}
                            <div className="payout-field-group" style={{ gridColumn: 'span 2' }}>
                                <label className="payout-label">Purpose / Proof</label>
                                <textarea
                                    className="payout-input payout-textarea"
                                    placeholder="Add notes or proof reference..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Conversion Summary Card */}
                        <div className="deposit-summary-card">
                            <div className="deposit-summary-col">
                                <div className="deposit-summary-label">NGN Amount</div>
                                <div className="deposit-summary-value">
                                    {parseFloat(form.amount_naira || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NGN
                                </div>
                            </div>
                            
                            <div className="deposit-summary-arrow">
                                <ArrowRight size={18} />
                            </div>

                            <div className="deposit-summary-col" style={{ alignItems: 'flex-end' }}>
                                <div className="deposit-summary-label">AED Credited</div>
                                <div className="deposit-summary-value deposit-summary-value-accent">
                                    {parseFloat(form.amount_aed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
                                </div>
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

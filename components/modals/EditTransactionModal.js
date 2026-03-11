'use client';

import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, List, Calendar, Loader2 } from 'lucide-react';
import axios from 'axios';

const EditTransactionModal = ({ isOpen, onClose, onTransactionUpdated, transaction, clients }) => {
    const [form, setForm] = useState({
        client_id: '',
        type: 'IN',
        amount_naira: '',
        amount_aed: '',
        exchange_rate: '',
        recipient: '',
        description: '',
        date: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (transaction) {
            const client = clients.find(c => c.id === transaction.client_id);
            setForm({
                client_id: transaction.client_id || '',
                type: transaction.type || 'IN',
                amount_naira: transaction.amount_naira || '',
                amount_aed: transaction.amount_aed || '',
                exchange_rate: transaction.exchange_rate || '',
                recipient: transaction.recipient || '',
                description: transaction.description || '',
                currency: client?.currency || 'AED',
                date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : ''
            });
        }
    }, [transaction, clients]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            await axios.put(`/api/transactions/${transaction.id}`, form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onTransactionUpdated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-premium animate-fade max-w-xl">
                <div className="modal-header-premium">
                    <h3 className="font-bold text-base tracking-tight text-slate-800">
                        Edit Transaction Details
                    </h3>
                    <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body-premium">
                    {error && <div className="auth-error-badge mb-4">{error}</div>}

                    <form onSubmit={handleSubmit} className="modal-form-premium">
                        <div className="modal-grid-premium">
                            <div className="payout-field-group">
                                <label className="payout-label">Client</label>
                                <div className="premium-input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <select
                                        value={form.client_id}
                                        onChange={(e) => {
                                            const cid = e.target.value;
                                            const client = clients.find(c => String(c.id) === String(cid));
                                            setForm({ ...form, client_id: cid, currency: client?.currency || 'AED' });
                                        }}
                                        required
                                    >
                                        <option value="">Select Client</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="payout-field-group">
                                <label className="payout-label">Type</label>
                                <div className="premium-input-wrapper">
                                    <List className="input-icon" size={18} />
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                        required
                                    >
                                        <option value="IN">Inflow (Deposit)</option>
                                        <option value="OUT">Outflow (Payout)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="modal-grid-premium">
                            <div className="payout-field-group">
                                <label className="payout-label">Source Amount ({form.type === 'IN' ? (form.currency || 'AED') : 'AED'})</label>
                                <div className="premium-input-wrapper">
                                    <span className="input-icon text-[10px] font-bold">{form.type === 'IN' ? (form.currency || 'AED') : 'AED'}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.amount_naira}
                                        onChange={(e) => setForm({ ...form, amount_naira: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="payout-field-group">
                                <label className="payout-label">{form.type === 'IN' ? (form.currency || 'AED') : 'AED'} Amount</label>
                                <div className="premium-input-wrapper">
                                    <span className="input-icon text-[10px] font-bold">{form.type === 'IN' ? (form.currency || 'AED') : 'AED'}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={form.amount_aed}
                                        onChange={(e) => setForm({ ...form, amount_aed: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="payout-field-group">
                            <label className="payout-label">Transaction Date</label>
                            <div className="premium-input-wrapper">
                                <Calendar className="input-icon" size={18} />
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="payout-field-group">
                            <label className="payout-label">Exchange Rate (1 {form.type === 'IN' ? (form.currency || 'AED') : 'AED'} = ? NGN)</label>
                            <div className="premium-input-wrapper">
                                <DollarSign className="input-icon" size={18} />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.exchange_rate}
                                    onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
                                    placeholder="e.g. 450.5"
                                />
                            </div>
                        </div>

                        <div className="payout-field-group">
                            <label className="payout-label">Recipient / Source</label>
                            <div className="premium-input-wrapper">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    value={form.recipient}
                                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                                    placeholder="Enter recipient name"
                                />
                            </div>
                        </div>

                        <div className="payout-field-group">
                            <label className="payout-label">Description / Notes</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Add any relevant notes"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm min-h-[80px]"
                            />
                        </div>

                        <div className="modal-actions-premium border-t border-slate-100 pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-premium btn-primary-premium flex-1 justify-center shadow-lg shadow-violet-100"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Update Transaction'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-premium border border-slate-200 bg-white text-slate-600 flex-1 justify-center"
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

export default EditTransactionModal;

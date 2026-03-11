'use client';

import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, List, Calendar, Loader2, Edit3 } from 'lucide-react';
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
            <div className="modal-payout-container animate-fade" style={{ maxWidth: '600px' }}>
                <div className="modal-client-header">
                    <div className="modal-client-header-left">
                        <div className="modal-client-icon-circle">
                            <Edit3 size={22} />
                        </div>
                        <div>
                            <h3 className="modal-client-title">
                                Edit Transaction Details
                            </h3>
                            <p className="modal-client-subtitle">
                                Update the details of this transaction record
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-client-close-btn">
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-client-body">
                    {error && <div className="auth-error-badge mb-6">{error}</div>}

                    <form onSubmit={handleSubmit} className="client-form-grid">
                        <div className="client-form-row">
                            <div>
                                <label className="client-label">Client</label>
                                <div className="client-input-wrapper">
                                    <User className="client-input-icon" size={18} />
                                    <select
                                        className="client-input"
                                        style={{ paddingLeft: '2.85rem' }}
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
                            <div>
                                <label className="client-label">Type</label>
                                <div className="client-input-wrapper">
                                    <List className="client-input-icon" size={18} />
                                    <select
                                        className="client-input"
                                        style={{ paddingLeft: '2.85rem' }}
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

                        <div className="client-form-row">
                            <div>
                                <label className="client-label">Source Amount ({form.type === 'IN' ? (form.currency || 'AED') : 'AED'})</label>
                                <div className="client-input-wrapper">
                                    <span className="client-input-icon text-[10px] font-bold" style={{ left: '1rem' }}>{form.type === 'IN' ? (form.currency || 'AED') : 'AED'}</span>
                                    <input
                                        className="client-input"
                                        type="number"
                                        step="0.01"
                                        value={form.amount_naira}
                                        onChange={(e) => setForm({ ...form, amount_naira: e.target.value })}
                                        placeholder="0.00"
                                        style={{ paddingLeft: '3.5rem' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="client-label">{form.type === 'IN' ? (form.currency || 'AED') : 'AED'} Amount</label>
                                <div className="client-input-wrapper">
                                    <span className="client-input-icon text-[10px] font-bold" style={{ left: '1rem' }}>{form.type === 'IN' ? (form.currency || 'AED') : 'AED'}</span>
                                    <input
                                        className="client-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={form.amount_aed}
                                        onChange={(e) => setForm({ ...form, amount_aed: e.target.value })}
                                        placeholder="0.00"
                                        style={{ paddingLeft: '3.5rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="client-form-row">
                            <div style={{ flex: 1 }}>
                                <label className="client-label">Transaction Date</label>
                                <div className="client-input-wrapper">
                                    <Calendar className="client-input-icon" size={18} />
                                    <input
                                        className="client-input"
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        style={{ paddingLeft: '2.85rem' }}
                                    />
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="client-label">Exchange Rate (1 {form.type === 'IN' ? (form.currency || 'AED') : 'AED'} = ? NGN)</label>
                                <div className="client-input-wrapper">
                                    <DollarSign className="client-input-icon" size={18} />
                                    <input
                                        className="client-input"
                                        type="number"
                                        step="0.01"
                                        value={form.exchange_rate}
                                        onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
                                        placeholder="e.g. 450.5"
                                        style={{ paddingLeft: '2.85rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="client-label">Recipient / Source</label>
                            <div className="client-input-wrapper">
                                <User className="client-input-icon" size={18} />
                                <input
                                    className="client-input"
                                    type="text"
                                    value={form.recipient}
                                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                                    placeholder="Enter recipient name"
                                    style={{ paddingLeft: '2.85rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="client-label">Description / Notes</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Add any relevant notes"
                                className="client-input"
                                style={{ padding: '1rem', minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>

                        <div className="modal-client-footer">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-client-confirm"
                            >
                                {loading && <Loader2 className="inline mr-2 animate-spin" size={16} />}
                                Update Transaction
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-client-cancel"
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

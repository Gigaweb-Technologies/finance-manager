'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Contact, UserPlus, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddClientModal = ({ isOpen, onClose, onClientAdded, client = null }) => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        contact_person: '',
        photo_url: '',
        currency: 'AED'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setForm({
                    name: client.name || '',
                    email: client.email || '',
                    phone: client.phone || '',
                    address: client.address || '',
                    contact_person: client.contact_person || '',
                    photo_url: client.photo_url || '',
                    currency: client.currency || 'AED'
                });
            } else {
                setForm({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    contact_person: '',
                    photo_url: '',
                    currency: 'AED'
                });
            }
        }
    }, [client, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) return setError('Client name is required');

        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            if (client) {
                // Update existing client
                const res = await axios.put(`/api/clients/${client.id}`, form, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                onClientAdded(res.data);
            } else {
                // Add new client
                const res = await axios.post('/api/clients', form, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                onClientAdded(res.data);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || `Failed to ${client ? 'update' : 'add'} client`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-payout-container animate-fade" style={{ maxWidth: '520px' }}>
                
                {/* Header */}
                <div className="modal-client-header">
                    <div className="modal-client-header-left">
                        <div className="modal-client-icon-circle">
                            <UserPlus size={22} />
                        </div>
                        <div>
                            <h3 className="modal-client-title">
                                {client ? 'Edit Client Details' : 'Register New Client'}
                            </h3>
                            <p className="modal-client-subtitle">
                                {client ? 'Update existing corporate account' : 'Add a new corporate account to the platform'}
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
                        {/* Full Name */}
                        <div>
                            <label className="client-label">Full Name</label>
                            <div className="client-input-wrapper">
                                <User className="client-input-icon" size={18} />
                                <input
                                    type="text"
                                    className="client-input"
                                    placeholder="Enter client's legal name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email & Phone Row */}
                        <div className="client-form-row">
                            <div>
                                <label className="client-label">Email Address</label>
                                <div className="client-input-wrapper">
                                    <Mail className="client-input-icon" size={18} />
                                    <input
                                        type="email"
                                        className="client-input"
                                        placeholder="client@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="client-label">Phone Number</label>
                                <div className="client-input-wrapper">
                                    <Phone className="client-input-icon" size={18} />
                                    <input
                                        type="text"
                                        className="client-input"
                                        placeholder="+234..."
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Office Address */}
                        <div>
                            <label className="client-label">Office Address</label>
                            <div className="client-input-wrapper">
                                <MapPin className="client-input-icon" size={18} />
                                <input
                                    type="text"
                                    className="client-input"
                                    placeholder="Street, City, Country"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Contact Person & Currency Row */}
                        <div className="client-form-row">
                            <div>
                                <label className="client-label">Contact Person</label>
                                <div className="client-input-wrapper">
                                    <Contact className="client-input-icon" size={18} />
                                    <input
                                        type="text"
                                        className="client-input"
                                        placeholder="Name of primary contact"
                                        value={form.contact_person}
                                        onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="client-label">Base Currency</label>
                                <div className="client-input-wrapper">
                                    <select
                                        className="client-input"
                                        value={form.currency}
                                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                        style={{ paddingLeft: '12px' }}
                                    >
                                        <option value="AED">AED - Emirati Dirham</option>
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="EUR">EUR - Euro</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="modal-client-footer">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-client-confirm"
                            >
                                {loading && <Loader2 className="inline mr-2 animate-spin" size={16} />}
                                {client ? 'Save Changes' : 'Register Client'}
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

export default AddClientModal;

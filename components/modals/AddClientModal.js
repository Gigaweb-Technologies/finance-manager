'use client';

import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Contact, Camera, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddClientModal = ({ isOpen, onClose, onClientAdded }) => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        contact_person: '',
        photo_url: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) return setError('Client name is required');

        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('/api/clients', form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onClientAdded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-premium animate-fade">
                <div className="modal-header-premium">
                    <h3 className="font-bold text-lg">Add New Client</h3>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body-premium">
                    {error && <div className="auth-error-badge mb-4">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="input-group">
                            <label>Full Name *</label>
                            <div className="premium-input-wrapper">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Enter client's legal name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="modal-grid-premium">
                            <div className="input-group">
                                <label>Email Address</label>
                                <div className="premium-input-wrapper">
                                    <Mail className="input-icon" size={18} />
                                    <input
                                        type="email"
                                        placeholder="client@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <div className="premium-input-wrapper">
                                    <Phone className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        placeholder="+234..."
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Office Address</label>
                            <div className="premium-input-wrapper">
                                <MapPin className="input-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Street, City, Country"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Contact Person</label>
                            <div className="premium-input-wrapper">
                                <Contact className="input-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Name of primary contact"
                                    value={form.contact_person}
                                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-premium border border-slate-200 bg-white text-slate-600 flex-1 justify-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-premium btn-primary-premium flex-1 justify-center shadow-lg shadow-violet-100"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register Client'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddClientModal;

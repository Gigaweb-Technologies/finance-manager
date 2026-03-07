'use client';

import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Contact, Camera, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddClientModal = ({ isOpen, onClose, onClientAdded, client = null }) => {
    const [form, setForm] = useState(client ? {
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        contact_person: client.contact_person || '',
        photo_url: client.photo_url || ''
    } : {
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
            <div 
                className="animate-fade" 
                style={{ 
                    width: '100%',
                    maxWidth: '520px', 
                    background: 'white', 
                    borderRadius: '20px', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    position: 'relative',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}
            >
                <div 
                    style={{ 
                        padding: '1.25rem 1.5rem', 
                        borderBottom: '1px solid #f1f5f9', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}
                >
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                        {client ? 'Edit Client Details' : 'Add New Client'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '2rem 1.5rem 1.5rem' }}>
                    {error && <div className="auth-error-badge mb-4">{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Full Name */}
                        <div>
                            <label className="edit-modal-label">Full Name</label>
                            <div className="edit-modal-input-wrapper">
                                <User className="edit-modal-icon" size={20} />
                                <input
                                    type="text"
                                    className="edit-modal-input"
                                    placeholder="Enter client's legal name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email & Phone Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                            <div>
                                <label className="edit-modal-label">Email Address</label>
                                <div className="edit-modal-input-wrapper">
                                    <Mail className="edit-modal-icon" size={20} />
                                    <input
                                        type="email"
                                        className="edit-modal-input"
                                        placeholder="client@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="edit-modal-label">Phone Number</label>
                                <div className="edit-modal-input-wrapper">
                                    <Phone className="edit-modal-icon" size={20} />
                                    <input
                                        type="text"
                                        className="edit-modal-input"
                                        placeholder="+234..."
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Office Address */}
                        <div>
                            <label className="edit-modal-label">Office Address</label>
                            <div className="edit-modal-input-wrapper">
                                <MapPin className="edit-modal-icon" size={20} />
                                <input
                                    type="text"
                                    className="edit-modal-input"
                                    placeholder="Street, City, Country"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Contact Person */}
                        <div>
                            <label className="edit-modal-label">Contact Person</label>
                            <div className="edit-modal-input-wrapper">
                                <Contact className="edit-modal-icon" size={20} />
                                <input
                                    type="text"
                                    className="edit-modal-input"
                                    placeholder="Name of primary contact"
                                    value={form.contact_person}
                                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="edit-modal-footer">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-save-changes shadow-lg shadow-violet-100"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (client ? 'Save Changes' : 'Register Client')}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-keep-record"
                            >
                                {client ? 'Keep Record' : 'Cancel'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddClientModal;

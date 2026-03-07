'use client';

import React from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, loading = false, isBlocked = false, blockedMessage = "" }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay modal-overlay-blur" style={{ zIndex: 10000 }}>
            <div 
                className="animate-fade" 
                style={{ 
                    width: '100%',
                    maxWidth: '460px', 
                    background: 'white', 
                    borderRadius: '16px', 
                    padding: '2rem 2.5rem 3rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    position: 'relative',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0'
                }}
            >
                {/* Close button with red X */}
                <button 
                    onClick={onClose} 
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444'
                    }}
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Top Divider */}
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%', marginBottom: '2.5rem' }}></div>

                <h3 style={{ fontSize: '1.85rem', fontWeight: '600', color: '#4b5563', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                    {isBlocked ? 'Action Restricted' : `Delete '${title?.replace('Delete ', '') || 'Record'}'?`}
                </h3>

                <p style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1f2937', marginBottom: '2.5rem', lineHeight: '1.4' }}>
                    {isBlocked ? blockedMessage : message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
                    <div style={{ background: '#ef4444', borderRadius: '4px', padding: '4px', display: 'flex' }}>
                        <AlertTriangle size={18} color="white" fill="white" />
                    </div>
                    <p style={{ fontSize: '1.05rem', color: '#374151' }}>
                        <span style={{ fontWeight: '700' }}>{isBlocked ? 'Required:' : 'Warning:'}</span> {isBlocked ? 'Delete all related transactions before removing this client.' : 'irreversible, data will be permanently removed.'}
                    </p>
                </div>

                {/* Bottom Divider */}
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%', marginBottom: '2.5rem' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {!isBlocked && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            style={{
                                width: '100%',
                                backgroundColor: '#e11d48',
                                color: 'white',
                                padding: '1.15rem',
                                borderRadius: '12px',
                                fontSize: '1.15rem',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 14px 0 rgba(225, 29, 72, 0.39)',
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : `I understand, Delete ${title?.replace('Delete ', '') || 'Record'}`}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: isBlocked ? '#f1f5f9' : 'none',
                            border: 'none',
                            color: '#4b5563',
                            padding: isBlocked ? '1rem' : '0',
                            borderRadius: isBlocked ? '12px' : '0',
                            fontSize: '1.15rem',
                            fontWeight: '700',
                            textDecoration: isBlocked ? 'none' : 'underline',
                            cursor: 'pointer',
                        }}
                    >
                        {isBlocked ? 'Go Back' : 'No, Keep Record'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;

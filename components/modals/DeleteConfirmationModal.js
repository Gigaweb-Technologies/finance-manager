'use client';

import React from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, loading = false, isBlocked = false, blockedMessage = "" }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay modal-overlay-blur" style={{ zIndex: 10000 }}>
            <div 
                className="animate-fade delete-modal-container" 
                style={{ 
                    width: '100%',
                    maxWidth: '520px', 
                    background: 'white', 
                    borderRadius: '20px', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    position: 'relative',
                    border: '1px solid #e2e8f0'
                }}
            >
                <div className="delete-modal-header">
                    <div className="delete-modal-icon-circle">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="delete-modal-title">
                        {isBlocked ? 'Action Restricted' : `Delete ${title?.replace('Delete ', '') || 'Client'}?`}
                    </h3>
                </div>

                <p className="delete-modal-message">
                    {isBlocked ? blockedMessage : message}
                </p>

                <div className="delete-modal-warning-box">
                    <div className="text-slate-400 mt-0.5">
                        <AlertTriangle size={20} />
                    </div>
                    <p className="delete-modal-warning-text">
                        {isBlocked ? (
                            <>
                                <span className="font-bold text-slate-800">Required:</span> Delete all related transactions before removing this client.
                            </>
                        ) : (
                            <>
                                This action is <span className="font-bold text-slate-800">irreversible</span> and will permanently remove this from our systems.
                            </>
                        )}
                    </p>
                </div>

                <div className="delete-modal-actions">
                    {!isBlocked ? (
                        <>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={loading}
                                className="btn-delete-permanent"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : `Permanently Delete ${title?.replace('Delete ', '') || 'Client'}`}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-delete-keep"
                            >
                                Keep Record
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-delete-keep w-full"
                            style={{ gridColumn: 'span 2' }}
                        >
                            Go Back
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;

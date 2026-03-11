'use client';

import React, { useState } from 'react';
import {
    X,
    Upload,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    TrendingUp,
    Loader2,
    ArrowLeft,
} from 'lucide-react';
import axios from 'axios';

const StatementUploadModal = ({ isOpen, onClose, clients, onTransactionsAdded }) => {
    const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'success'
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [extractedData, setExtractedData] = useState([]);
    const [rates, setRates] = useState({});
    const [summary, setSummary] = useState({ success: 0, fail: 0, duplicates: 0 });
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(null); // { current, total }
    const [pendingDelete, setPendingDelete] = useState(null); // originalIdx of row pending delete, or 'all'

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError('');
    };

    const handleUpload = async () => {
        if (!file) return setError('Please select a PDF statement');

        setLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('statement', file);

        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('/api/transactions/upload-statement', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            const transactions = res.data;
            if (transactions.length === 0) {
                setError('No credit transactions found in this statement.');
                setLoading(false);
                return;
            }

            // Smart Auto-Assignment (from legacy)
            const uniqueIds = transactions.map(t => t.transaction_unique_id);
            const dupRes = await axios.post('/api/transactions/check-duplicates', { ids: uniqueIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const duplicateIds = new Set(dupRes.data);
            const enrichedTransactions = transactions.map(t => {
                const matchingClient = clients.find(c =>
                    c.currency === 'NGN' && (
                        t.sender.toLowerCase().includes(c.name.toLowerCase()) ||
                        c.name.toLowerCase().includes(t.sender.toLowerCase())
                    )
                );
                return {
                    ...t,
                    is_duplicate: duplicateIds.has(t.transaction_unique_id),
                    client_id: matchingClient ? matchingClient.id : ''
                };
            });

            const initialRates = {};
            enrichedTransactions.forEach(t => {
                const d = t.date.split('T')[0];
                if (!initialRates[d]) initialRates[d] = '1650';
            });
            setRates(initialRates);
            setExtractedData(enrichedTransactions);
            setStep('review');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process statement');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignClient = (originalIdx, clientId) => {
        setExtractedData(prev => prev.map((t, idx) =>
            idx === originalIdx ? { ...t, client_id: clientId } : t
        ));
    };

    const handleRemove = (idx) => {
        setExtractedData(prev => prev.filter((_, i) => i !== idx));
        setPendingDelete(null);
    };

    const handleClearAll = () => {
        setExtractedData([]);
        setPendingDelete(null);
    };

    const handleRecord = async () => {
        const validTransactions = extractedData.filter(t => t.client_id && !t.is_duplicate);
        if (validTransactions.length === 0) return;

        setLoading(true);
        setProgress({ current: 0, total: validTransactions.length });
        const token = localStorage.getItem('token');
        let success = 0;
        let fail = 0;

        for (let i = 0; i < validTransactions.length; i++) {
            const tx = validTransactions[i];
            try {
                await axios.post('/api/transactions', {
                    client_id: tx.client_id,
                    type: 'IN',
                    amount_naira: tx.amount_naira,
                    amount_aed: parseFloat((tx.amount_naira / parseFloat(rates[tx.date.split('T')[0]] || 1650)).toFixed(2)),
                    exchange_rate: parseFloat(rates[tx.date.split('T')[0]] || 1650),
                    description: tx.narration,
                    transaction_unique_id: tx.transaction_unique_id,
                    date: tx.date
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                success++;
            } catch (err) {
                console.error('Failed to record transaction', tx, err);
                fail++;
            }
            setProgress({ current: i + 1, total: validTransactions.length });
        }

        setSummary({
            success,
            fail,
            duplicates: extractedData.filter(t => t.is_duplicate).length
        });
        setProgress(null);
        setStep('success');
        onTransactionsAdded();
    };

    const handleClose = () => {
        setStep('upload');
        setFile(null);
        setExtractedData([]);
        setError('');
        setProgress(null);
        setLoading(false);
        setPendingDelete(null);
        onClose();
    };

    // Group by date for per-date rate assignment
    const groupedData = extractedData.reduce((acc, tx, idx) => {
        const d = tx.date.split('T')[0];
        if (!acc[d]) acc[d] = { date: d, items: [] };
        acc[d].items.push({ ...tx, originalIdx: idx });
        return acc;
    }, {});
    const sortedDates = Object.keys(groupedData).sort((a,b) => new Date(a) - new Date(b));

    const recordableCount = extractedData.filter(t => t.client_id && !t.is_duplicate).length;
    const autoAssignedCount = extractedData.filter(t => t.client_id).length;

    // ─── REVIEW STEP: Full-page overlay ───────────────────────────────────────
    if (step === 'review') {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: '#f8fafc',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Top Bar */}
                <div style={{
                    background: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '0 2rem',
                    height: 64,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setStep('upload')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            <ArrowLeft size={16} /> Back to Upload
                        </button>
                        <span style={{ color: '#e2e8f0' }}>|</span>
                        <div>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>Review Extracted Transactions</span>
                            <span style={{ marginLeft: '0.75rem', background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                                {extractedData.length} found · {autoAssignedCount} matched
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                        <button
                            onClick={handleClearAll}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            <Trash2 size={13} /> Clear All
                        </button>
                        <button
                            onClick={handleRecord}
                            disabled={loading || recordableCount === 0}
                            style={{
                                background: recordableCount === 0 || loading ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                color: 'white', border: 'none', borderRadius: 8,
                                padding: '0.55rem 1.5rem', fontSize: '0.875rem', fontWeight: 700,
                                cursor: recordableCount === 0 || loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                minWidth: 180, justifyContent: 'center'
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    {progress ? `${progress.current} / ${progress.total}` : 'Recording...'}
                                </>
                            ) : `Record ${recordableCount} Transactions`}
                        </button>
                        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {progress && (
                    <div style={{ height: 3, background: '#f1f5f9', flexShrink: 0 }}>
                        <div style={{
                            height: '100%',
                            width: `${(progress.current / progress.total) * 100}%`,
                            background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                            transition: 'width 0.2s ease'
                        }} />
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {sortedDates.map((dateKey) => {
                            const group = groupedData[dateKey];
                            return (
                            <div key={dateKey} style={{
                                background: 'white', borderRadius: 14,
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                            }}>
                                {/* Group Header */}
                                <div style={{
                                    background: '#f8fafc', padding: '0.85rem 1.5rem',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <TrendingUp size={14} style={{ color: '#10b981' }} />
                                        </div>
                                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{group.date}</span>
                                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                                            {group.items.length} transaction{group.items.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Rate (₦/AED):</span>
                                        <input
                                            type="number"
                                            value={rates[group.date] || ''}
                                            onChange={(e) => setRates(prev => ({ ...prev, [group.date]: e.target.value }))}
                                            style={{
                                                width: 80, height: 34, padding: '0 0.5rem',
                                                border: '1px solid #e2e8f0', borderRadius: 8,
                                                fontSize: '0.85rem', fontWeight: 700, textAlign: 'center',
                                                color: '#7c3aed', outline: 'none', background: '#faf5ff'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Transactions table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assign Client</th>
                                            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sender / Narration</th>
                                            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (₦)</th>
                                            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Credit</th>
                                            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.items.map((it, iIdx) => (
                                            <tr
                                                key={iIdx}
                                                style={{
                                                    borderBottom: iIdx < group.items.length - 1 ? '1px solid #f8fafc' : 'none',
                                                    opacity: it.is_duplicate ? 0.4 : 1,
                                                    background: it.is_duplicate ? '#fef9f9' : 'white'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}>
                                                    <select
                                                        style={{
                                                            border: '1px solid #e2e8f0', borderRadius: 8,
                                                            padding: '0.4rem 0.5rem', fontSize: '0.82rem',
                                                            fontWeight: 700, color: '#374151',
                                                            background: 'white', cursor: 'pointer',
                                                            width: 160, outline: 'none',
                                                            borderColor: !it.client_id && !it.is_duplicate ? '#fecdd3' : '#e2e8f0'
                                                        }}
                                                        value={it.client_id || ''}
                                                        onChange={(e) => handleAssignClient(it.originalIdx, e.target.value)}
                                                    >
                                                        <option value="">Select client...</option>
                                                        {clients.filter(c => c.currency === 'NGN').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.82rem', color: '#374151', fontWeight: 500, maxWidth: 400 }}>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '0.1rem' }}>{it.sender}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{it.narration}</div>
                                                    {it.is_duplicate && (
                                                        <span style={{ display: 'inline-block', marginTop: '0.3rem', background: '#ffe4e6', color: '#e11d48', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                                                            DUPLICATE
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                    ₦ {it.amount_naira.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                                                    {(it.amount_naira / parseFloat(rates[group.date] || 1650)).toFixed(2)} {clients.find(c => c.id === it.client_id)?.currency || 'AED'}
                                                </td>
                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {pendingDelete === it.originalIdx ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Remove?</span>
                                                            <button
                                                                onClick={() => handleRemove(it.originalIdx)}
                                                                style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: 5, padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                            >Yes</button>
                                                            <button
                                                                onClick={() => setPendingDelete(null)}
                                                                style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 5, padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                            >Cancel</button>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setPendingDelete(it.originalIdx)}
                                                            style={{
                                                                background: '#fff1f2', color: '#e11d48',
                                                                border: '1px solid #fecdd3', borderRadius: 6,
                                                                padding: '0.3rem 0.5rem', cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            title="Remove this transaction"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {group.items.some(it => it.is_duplicate) && (
                                    <div style={{ padding: '0.6rem 1.5rem', background: '#fff1f2', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <AlertTriangle size={12} style={{ color: '#e11d48' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48' }}>
                                            Some transactions are already recorded and will be skipped.
                                        </span>
                                    </div>
                                )}
                            </div>
                        );})}

                        {extractedData.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                <Trash2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p style={{ fontWeight: 600 }}>All transactions have been removed.</p>
                                <button onClick={() => setStep('upload')} style={{ marginTop: '1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '0.6rem 1.5rem', cursor: 'pointer', fontWeight: 700 }}>Upload New Statement</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom status bar */}
                <div style={{
                    background: 'white', borderTop: '1px solid #e2e8f0',
                    padding: '0.75rem 2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0, fontSize: '0.8rem', color: '#64748b'
                }}>
                    <span>{extractedData.length} total · <span style={{ color: '#10b981', fontWeight: 700 }}>{autoAssignedCount} assigned</span> · <span style={{ color: '#e11d48', fontWeight: 700 }}>{extractedData.filter(t => t.is_duplicate).length} duplicates</span></span>
                    <span style={{ fontWeight: 600 }}>{extractedData.filter(t => !t.client_id && !t.is_duplicate).length} transactions still need a client assignment</span>
                </div>
            </div>
        );
    }

    // ─── UPLOAD & SUCCESS STEPS: compact modal ─────────────────────────────────
    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-premium animate-fade" style={{ maxWidth: 560 }}>
                <div className="modal-header-premium">
                    <div>
                        <h3 className="font-bold text-lg">
                            {step === 'upload' && 'Bulk Statement Upload'}
                            {step === 'success' && 'Processing Complete'}
                        </h3>
                        {step === 'upload' && <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.1rem' }}>Extract and record multiple deposits from PDF</p>}
                    </div>
                    <button onClick={handleClose} className="hover:rotate-90 transition-transform">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body-premium">
                    {error && <div className="auth-error-badge mb-4">{error}</div>}

                    {step === 'upload' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Drop Zone */}
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                                id="statement-upload"
                            />
                            <label
                                htmlFor="statement-upload"
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.6rem', padding: '2rem 1rem', cursor: 'pointer',
                                    border: '1.5px dashed #d1d5db', borderRadius: 12, background: '#fafafa',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                    <Upload size={32} />
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
                                    Click to choose or drag and drop your<br /><strong>Nigerian Naira Statement PDF</strong>
                                </span>
                            </label>

                            {/* File Preview Row */}
                            {file && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', border: '1px solid #e2e8f0',
                                    borderRadius: 10, background: 'white'
                                }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <FileText size={18} style={{ color: '#64748b' }} />
                                    </div>
                                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {file.name}
                                    </span>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                </div>
                            )}

                            {/* Metadata Row */}
                            {file && (
                                <div style={{ display: 'flex', gap: '1.5rem', padding: '0.6rem 1rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                                    <span>Files to upload: <strong style={{ color: '#1e293b' }}>1</strong></span>
                                    <span>Valid: <strong style={{ color: '#10b981' }}>Yes</strong></span>
                                    <span>File Type: <strong style={{ color: '#1e293b' }}>PDF</strong></span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={handleUpload}
                                    disabled={loading || !file}
                                    style={{
                                        flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none',
                                        background: loading || !file ? '#c4b5fd' : '#7c3aed',
                                        color: 'white', fontSize: '0.9rem', fontWeight: 700,
                                        cursor: loading || !file ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : 'Analyze Statement'}
                                </button>
                                <button
                                    onClick={handleClose}
                                    style={{
                                        flex: 1, padding: '0.75rem', borderRadius: 10,
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: '#374151', fontSize: '0.9rem', fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel Upload
                                </button>
                            </div>


                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-10">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h4 className="font-bold text-lg mb-2">Done!</h4>
                            <p className="text-slate-500 mb-8">Statement processing completed.</p>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <div className="text-2xl font-extrabold text-emerald-600">{summary.success}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Recorded</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <div className="text-2xl font-extrabold text-orange-500">{summary.duplicates}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Duplicates</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <div className="text-2xl font-extrabold text-rose-500">{summary.fail}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Failed</div>
                                </div>
                            </div>

                            <button
                                onClick={handleClose}
                                className="btn-premium btn-primary-premium w-full justify-center"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatementUploadModal;

'use client';

import React, { useState } from 'react';
import {
    X,
    Upload,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    Plus,
    ArrowRight,
    TrendingUp,
    Loader2,
    Search
} from 'lucide-react';
import axios from 'axios';

const StatementUploadModal = ({ isOpen, onClose, clients, onTransactionsAdded }) => {
    const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'success'
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [extractedData, setExtractedData] = useState([]);
    const [rate, setRate] = useState('1650');
    const [summary, setSummary] = useState({ success: 0, fail: 0, duplicates: 0 });
    const [error, setError] = useState('');

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

            // Check for duplicates
            const uniqueIds = transactions.map(t => t.transaction_unique_id);
            const dupRes = await axios.post('/api/transactions/check-duplicates', { ids: uniqueIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const enrichedTransactions = transactions.map(t => ({
                ...t,
                is_duplicate: dupRes.data.duplicates.includes(t.transaction_unique_id),
                client_id: ''
            }));

            setExtractedData(enrichedTransactions);
            setStep('review');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process statement');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignClient = (sender, clientId) => {
        setExtractedData(prev => prev.map(t =>
            t.sender === sender ? { ...t, client_id: clientId } : t
        ));
    };

    const handleRemove = (idx) => {
        setExtractedData(prev => prev.filter((_, i) => i !== idx));
    };

    const handleRecord = async () => {
        const validTransactions = extractedData.filter(t => t.client_id && !t.is_duplicate);
        if (validTransactions.length === 0) return;

        setLoading(true);
        const token = localStorage.getItem('token');
        let success = 0;
        let fail = 0;

        for (const tx of validTransactions) {
            try {
                await axios.post('/api/transactions', {
                    ...tx,
                    exchange_rate: parseFloat(rate),
                    amount_aed: (tx.amount_naira / parseFloat(rate)).toFixed(2)
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                success++;
            } catch (err) {
                console.error('Failed to record transaction', tx, err);
                fail++;
            }
        }

        setSummary({
            success,
            fail,
            duplicates: extractedData.filter(t => t.is_duplicate).length
        });
        setStep('success');
        onTransactionsAdded();
    };

    // Group by sender for easier assignment
    const groupedData = extractedData.reduce((acc, tx, idx) => {
        if (!acc[tx.sender]) acc[tx.sender] = { sender: tx.sender, items: [] };
        acc[tx.sender].items.push({ ...tx, originalIdx: idx });
        return acc;
    }, {});

    return (
        <div className="modal-overlay modal-overlay-blur">
            <div className="modal-premium animate-fade" style={{ maxWidth: step === 'review' ? '900px' : '600px' }}>
                <div className="modal-header-premium">
                    <h3 className="font-bold text-lg">
                        {step === 'upload' && 'Bulk Statement Upload'}
                        {step === 'review' && 'Review Extracted Transactions'}
                        {step === 'success' && 'Processing Complete'}
                    </h3>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body-premium">
                    {error && <div className="auth-error-badge mb-4">{error}</div>}

                    {step === 'upload' && (
                        <div className="text-center py-10">
                            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Upload size={40} />
                            </div>
                            <h4 className="font-bold text-lg mb-2">Select Naira Statement PDF</h4>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Upload a Nigerian bank statement to automatically extract credits and record deposits.</p>

                            <div className="flex flex-col items-center gap-4">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="statement-upload"
                                />
                                <label
                                    htmlFor="statement-upload"
                                    className="btn-premium border-2 border-dashed border-slate-200 hover:border-violet-400 p-8 w-full cursor-pointer flex flex-col items-center gap-2"
                                >
                                    <FileText size={20} className="text-slate-400" />
                                    <span className="font-bold text-slate-600">{file ? file.name : 'Click to choose file or drag and drop'}</span>
                                </label>

                                <button
                                    onClick={handleUpload}
                                    disabled={loading || !file}
                                    className="btn-premium btn-primary-premium w-full mt-4 justify-center"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Analyze Statement'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-800">Identify Clients</h4>
                                    <p className="text-xs text-slate-500 font-medium">Map senders to system clients and review transaction details.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-500">Rate:</span>
                                    <input
                                        type="number"
                                        value={rate}
                                        onChange={(e) => setRate(e.target.value)}
                                        className="w-20 h-10 px-2 rounded-lg border border-slate-200 font-bold text-center text-violet-600"
                                    />
                                </div>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                                {Object.values(groupedData).map((group, gIdx) => (
                                    <div key={gIdx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                        <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={16} className="text-emerald-500" />
                                                <span className="font-bold text-slate-800 truncate max-w-[300px]">{group.sender}</span>
                                            </div>
                                            <select
                                                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 w-[250px]"
                                                value={group.items[0].client_id}
                                                onChange={(e) => handleAssignClient(group.sender, e.target.value)}
                                            >
                                                <option value="">Assign to client...</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="p-4">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-50">
                                                        <th className="text-left py-2">Date</th>
                                                        <th className="text-left py-2">Narration</th>
                                                        <th className="text-right py-2">Amount (₦)</th>
                                                        <th className="text-right py-2">Est. AED</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((it, iIdx) => (
                                                        <tr key={iIdx} className={`${it.is_duplicate ? 'opacity-40' : ''}`}>
                                                            <td className="py-2 text-slate-500">{it.date}</td>
                                                            <td className="py-2 font-medium max-w-[400px] truncate">{it.narration}</td>
                                                            <td className="py-2 text-right font-bold">₦ {it.amount_naira.toLocaleString()}</td>
                                                            <td className="py-2 text-right font-bold text-emerald-600">
                                                                {(it.amount_naira / parseFloat(rate)).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {group.items.some(it => it.is_duplicate) && (
                                                <div className="mt-2 text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Some transactions already recorded and will be skipped.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                <button
                                    onClick={() => setStep('upload')}
                                    className="btn-premium border border-slate-200 bg-white text-slate-600 px-6"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleRecord}
                                    disabled={loading || !extractedData.some(t => t.client_id && !t.is_duplicate)}
                                    className="btn-premium btn-primary-premium flex-1 justify-center"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : `Record ${extractedData.filter(t => t.client_id && !t.is_duplicate).length} Transactions`}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-10">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h4 className="font-bold text-lg mb-2">Success!</h4>
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
                                onClick={onClose}
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

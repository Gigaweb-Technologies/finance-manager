'use client';

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import StatementUploadModal from '@/components/modals/StatementUploadModal';
import {
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    Download,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    ListIcon,
    FileText,
    FileUp,
    SlidersHorizontal,
    Clock,
    ChevronDown,
    MoreHorizontal,
    Edit,
    Trash2
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import EditTransactionModal from '@/components/modals/EditTransactionModal';
import axios from 'axios';

export default function TransactionsPage() {
    const { clients, allTransactions, loading, searchQuery, setSearchQuery, refreshData } = useData();
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [timeFilter, setTimeFilter] = useState('This Month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [activeModal, setActiveModal] = useState(null);
    const [selectedTx, setSelectedTx] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start, end = new Date(today);
        end.setHours(23, 59, 59, 999);

        switch (timeFilter) {
            case 'This Month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'Last Month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'Last 3 Months':
                start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'Year to Date':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case 'Custom Range':
                start = customStart ? new Date(customStart) : new Date(2000, 0, 1);
                if (customEnd) {
                    end = new Date(customEnd);
                    end.setHours(23, 59, 59, 999);
                }
                break;
            case 'All Time':
            default:
                return null;
        }
        return { start, end };
    }, [timeFilter, customStart, customEnd]);

    const handleEdit = (tx) => {
        setSelectedTx(tx);
        setActiveModal('edit');
    };

    const handleDeleteClick = (tx) => {
        setSelectedTx(tx);
        setActiveModal('delete');
    };

    const confirmDelete = async () => {
        if (!selectedTx) return;
        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/api/transactions/${selectedTx.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            refreshData();
            setActiveModal(null);
            setSelectedTx(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete transaction');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) return;
        const headers = ['Transaction ID', 'Date', 'Client', 'Type', 'NGN Amount', 'AED Amount', 'Recipient/Narration', 'Status'];
        const rows = filteredTransactions.map(tx => {
            const d = new Date(tx.date);
            const displayId = tx.transaction_unique_id || `TRX-${String(tx.id).padStart(5, '0')}`;
            return [
                displayId,
                d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                `"${(tx.client_name || '').replace(/"/g, '""')}"`,
                tx.type === 'IN' ? 'INFLOW' : 'PAYOUT',
                tx.amount_naira || 0,
                tx.amount_aed || 0,
                `"${(tx.recipient || tx.narration || '').replace(/"/g, '""')}"`,
                tx.status || 'COMPLETED'
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const rangeStr = timeFilter.replace(/\s+/g, '_').toLowerCase();
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${rangeStr}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        if (filteredTransactions.length === 0) return;

        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.setTextColor(124, 58, 237);
        doc.text('Transaction History Report', 14, 22);

        // Subheader
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Period: ${timeFilter}`, 14, 32);
        doc.text(`Total Transactions: ${filteredTransactions.length}`, 14, 37);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

        const totalIn = filteredTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + (t.amount_aed || 0), 0);
        const totalOut = filteredTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + (t.amount_aed || 0), 0);

        doc.setTextColor(16, 185, 129); // Green
        doc.text(`Total Inflow: +${totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED`, 120, 32);
        doc.setTextColor(225, 29, 72); // Red
        doc.text(`Total Outflow: -${totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED`, 120, 37);

        // Table
        const tableRows = filteredTransactions.map(tx => {
            const isOut = tx.type === 'OUT';
            return [
                tx.transaction_unique_id?.substring(0, 8).toUpperCase() || `TRX-${String(tx.id).padStart(5, '0')}`,
                new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                tx.client_name || 'N/A',
                isOut ? 'PAYOUT' : 'INFLOW',
                tx.amount_naira ? tx.amount_naira.toLocaleString() : '-',
                {
                    content: `${isOut ? '-' : '+'}${tx.amount_aed?.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED`,
                    styles: { textColor: isOut ? [225, 29, 72] : [16, 185, 129] }
                },
                tx.status || 'COMPLETED'
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['ID', 'Date', 'Client', 'Type', 'NGN Amount', 'AED Amount', 'Status']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 22 }, // ID
                1: { cellWidth: 25 }, // Date
                2: { cellWidth: "auto" }, // Client
                3: { cellWidth: 18 }, // Type
                4: { cellWidth: 28, halign: "right" }, // NGN
                5: { cellWidth: 32, halign: "right" }, // AED
                6: { cellWidth: 25, halign: "center" } // Status
            },
            margin: { top: 20 },
            didDrawPage: (data) => {
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
            }
        });

        const rangeStr = timeFilter.replace(/\s+/g, '_').toLowerCase();
        doc.save(`Transactions_${rangeStr}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // statsTransactions: date-filtered only (no typeFilter) — used for the summary stat cards
    // so the card totals always reflect the true breakdown for the selected period,
    // regardless of which type filter is active on the table.
    const statsTransactions = useMemo(() => {
        return allTransactions.filter(t => {
            let matchesDate = true;
            if (dateRange) {
                const txDate = new Date(t.date);
                matchesDate = txDate >= dateRange.start && txDate <= dateRange.end;
            }
            return matchesDate;
        });
    }, [allTransactions, dateRange]);

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(t => {
            const matchesSearch = (t.client_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                (t.description || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                (t.recipient || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                (t.transaction_unique_id || '').toLowerCase().includes((searchQuery || '').toLowerCase());
            
            const matchesType = typeFilter === 'All Types' || 
                (typeFilter === 'Inflow' && t.type === 'IN') || 
                (typeFilter === 'Payout' && t.type === 'OUT');

            let matchesDate = true;
            if (dateRange) {
                const txDate = new Date(t.date);
                matchesDate = txDate >= dateRange.start && txDate <= dateRange.end;
            }
            
            return matchesSearch && matchesType && matchesDate;
        });
    }, [allTransactions, searchQuery, typeFilter, dateRange]);

    const stats = useMemo(() => {
        const totalInflowsCount = statsTransactions.filter(t => t.type === 'IN').length;
        const totalPayoutsCount = statsTransactions.filter(t => t.type === 'OUT').length;
        const totalTransactionsCount = statsTransactions.length;

        const inflowPercentage = totalTransactionsCount ? ((totalInflowsCount / totalTransactionsCount) * 100).toFixed(1) : 0;
        const payoutPercentage = totalTransactionsCount ? ((totalPayoutsCount / totalTransactionsCount) * 100).toFixed(1) : 0;

        return {
            totalTransactions: totalTransactionsCount,
            totalInflows: totalInflowsCount,
            inflowPercentage: inflowPercentage,
            totalPayouts: totalPayoutsCount,
            payoutPercentage: payoutPercentage
        };
    }, [statsTransactions]);

    if (loading) return <div>Loading Transactions...</div>;

    return (
      <div className="animate-fade w-full">
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Transaction History</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Complete record of all financial operations.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                onClick={() => setActiveModal('upload')}
                className="btn-premium" 
                style={{ border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-main)', borderRadius: '8px', padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileUp size={18} /> Bulk Upload
            </button>
            <button className="btn-premium" style={{ border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-main)', borderRadius: '8px', padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={18} /> Advanced Filters
            </button>
            <button 
                onClick={handleExportPDF}
                disabled={filteredTransactions.length === 0}
                className="btn-premium" 
                style={{ border: '1px solid #7c3aed', background: 'white', color: '#7c3aed', borderRadius: '8px', padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: filteredTransactions.length === 0 ? 0.5 : 1 }}
            >
              <Download size={18} /> Export PDF
            </button>
            <button 
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className="btn-premium btn-primary-premium" 
                style={{ borderRadius: '8px', padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: filteredTransactions.length === 0 ? 0.5 : 1 }}
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="stats-grid-premium" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2.5rem' }}>
          <div className="premium-card" style={{ padding: '1.25rem', cursor: 'pointer', border: typeFilter === 'All Types' ? '2px solid #7c3aed' : 'none' }} onClick={() => setTypeFilter('All Types')}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <FileText size={20} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Transactions</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{stats.totalTransactions.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All time</div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', cursor: 'pointer', border: typeFilter === 'Inflow' ? '2px solid #10b981' : 'none' }} onClick={() => setTypeFilter('Inflow')}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <TrendingUp size={20} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Inflows</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{stats.totalInflows.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{stats.inflowPercentage}% of total</div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', cursor: 'pointer', border: typeFilter === 'Payout' ? '2px solid #ef4444' : 'none' }} onClick={() => setTypeFilter('Payout')}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <TrendingDown size={20} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Payouts</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{stats.totalPayouts.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{stats.payoutPercentage}% of total</div>
          </div>
        </div>

        {/* Transactions Table Card */}
        <div className="table-container" style={{ border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginTop: 0 }}>
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>All Transactions</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by ID, client..."
                  value={searchQuery || ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    width: '240px',
                    background: '#f8fafc',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 2rem 0.5rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "#f8fafc",
                    fontSize: "0.85rem",
                    appearance: "none",
                    cursor: "pointer",
                    minWidth: "120px",
                    color: "var(--text-main)",
                    outline: "none"
                  }}
                >
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>Last 3 Months</option>
                  <option>Year to Date</option>
                  <option>All Time</option>
                  <option>Custom Range</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
              {timeFilter === 'Custom Range' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 2rem 0.5rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "#f8fafc",
                    fontSize: "0.85rem",
                    appearance: "none",
                    cursor: "pointer",
                    minWidth: "120px",
                    color: "var(--text-main)",
                    outline: "none"
                  }}
                >
                  <option value="All Types">All Types</option>
                  <option value="Inflow">Inflow</option>
                  <option value="Payout">Payout</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <table className="table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>TRANSACTION ID</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>DATE</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>CLIENT</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>SENDER / RECIPIENT</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>TYPE</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>SOURCE AMOUNT</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>CLIENT AMOUNT</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>STATUS</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody style={{ background: 'white' }}>
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="client-table-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span className="tx-id-link" style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '0.85rem' }}>#{tx.transaction_unique_id?.substring(0, 8).toUpperCase() || `TRX-${String(tx.id).padStart(5, '0')}`}</span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="client-table-avatar" style={{ width: 32, height: 32, background: '#f5f3ff', color: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        {tx.client_name ? tx.client_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'NA'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{tx.client_name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{tx.recipient || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.description || tx.narration || ''}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={tx.type === 'IN' ? { background: '#ecfdf5', color: '#10b981', border: '1px solid #d1fae5', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.03em' } : { background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.03em' }}>
                      {tx.type === 'IN' ? 'INFLOW' : 'PAYOUT'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {tx.amount_naira ? `${tx.amount_naira.toLocaleString()} ${clients.find(c => c.id === tx.client_id)?.currency || 'AED'}` : <span style={{ color: 'var(--border-color)' }}>-</span>}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700 }} className={tx.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}>
                    <span style={{ color: tx.type === 'IN' ? '#10b981' : '#f43f5e' }}>
                      {tx.type === "IN" ? "+" : "-"} {tx.amount_aed?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"} AED
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    {(tx.status === 'COMPLETED' || tx.status === 'SUCCESS' || !tx.status) ? (
                      <span style={{ background: '#ecfdf5', color: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.03em' }}>
                        COMPLETED
                      </span>
                    ) : (
                      <span style={{ background: '#fff7ed', color: '#f59e0b', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.03em' }}>
                        PENDING
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-1">
                        <button
                            onClick={() => handleEdit(tx)}
                            className="action-icon-btn action-icon-btn-edit"
                            title="Edit Transaction"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDeleteClick(tx)}
                            className="action-icon-btn action-icon-btn-delete"
                            title="Delete Transaction"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <StatementUploadModal
            isOpen={activeModal === 'upload'}
            onClose={() => setActiveModal(null)}
            clients={clients}
            onTransactionsAdded={refreshData}
        />

        <EditTransactionModal
            isOpen={activeModal === 'edit'}
            onClose={() => { setActiveModal(null); setSelectedTx(null); }}
            transaction={selectedTx}
            clients={clients}
            onTransactionUpdated={refreshData}
        />

        <DeleteConfirmationModal
            isOpen={activeModal === 'delete'}
            onClose={() => { setActiveModal(null); setSelectedTx(null); }}
            onConfirm={confirmDelete}
            title="Delete Transaction"
            message="Are you sure you want to delete this transaction? This will reverse its impact on the client's balance."
            loading={isSubmitting}
        />
      </div>
    );
}

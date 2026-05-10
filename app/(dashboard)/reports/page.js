'use client';

import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '@/lib/DataContext';
import {
    Download,
    TrendingUp,
    Percent,
    Clock,
    ChevronDown,
    ChevronLeft,
    Activity,
    Hash,
    BarChart2,
    TableProperties,
    ChevronRight,
    ChevronUp,
    ArrowDownLeft,
    ArrowUpRight,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Legend,
} from 'recharts';

// ─── Helper ──────────────────────────────────────────────────────────────────
function fmt(n, decimals = 0) {
    if (!n && n !== 0) return '—';
    return Number(n).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function getMonthOptions(transactions) {
    const seen = new Set();
    const options = [];
    [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(tx => {
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!seen.has(key)) { seen.add(key); options.push({ key, label }); }
        });
    return options;
}

export default function ReportsPage() {
    const { clients, allTransactions, loading } = useData();
    const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'statement'

    // ── Analytics filters ─────────────────────────────────────────────────
    const [timeFilter, setTimeFilter] = useState('Last 30 Days');
    const [clientFilter, setClientFilter] = useState('All Clients');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // ── Statement filters ─────────────────────────────────────────────────
    const monthOptions = useMemo(() => getMonthOptions(allTransactions || []), [allTransactions]);
    const [stmtMonth, setStmtMonth] = useState('');
    const [stmtClient, setStmtClient] = useState('All Clients');
    const [collapsedDays, setCollapsedDays] = useState({});

    const selectedMonthKey = stmtMonth || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    const selectedMonthLabel = useMemo(() => {
        const [yr, mo] = selectedMonthKey.split('-').map(Number);
        if (!yr || !mo) return '—';
        return new Date(yr, mo - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [selectedMonthKey]);

    const goPrevMonth = () => {
        const [yr, mo] = selectedMonthKey.split('-').map(Number);
        const d = new Date(yr, mo - 2, 1);
        setStmtMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };
    const goNextMonth = () => {
        const [yr, mo] = selectedMonthKey.split('-').map(Number);
        const d = new Date(yr, mo, 1);
        setStmtMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };
    const canGoPrev = true; // Allow navigating back indefinitely
    const canGoNext = true; // Allow navigating forward indefinitely

    // ── Filtered transactions (analytics) ─────────────────────────────────
    const filteredTransactions = useMemo(() => {
        if (!allTransactions || allTransactions.length === 0) return [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return allTransactions.filter(tx => {
            if (clientFilter !== 'All Clients' && String(tx.client_id) !== String(clientFilter)) return false;
            const txDate = new Date(tx.date);

            switch (timeFilter) {
                case 'Last 30 Days': {
                    const limit = new Date(today); limit.setDate(limit.getDate() - 30);
                    return txDate >= limit;
                }
                case 'Last 90 Days': {
                    const limit = new Date(today); limit.setDate(limit.getDate() - 90);
                    return txDate >= limit;
                }
                case 'Year to Date': {
                    return txDate >= new Date(today.getFullYear(), 0, 1);
                }
                case 'Custom Range': {
                    if (customStart && txDate < new Date(customStart)) return false;
                    if (customEnd) {
                        const end = new Date(customEnd); end.setHours(23, 59, 59, 999);
                        if (txDate > end) return false;
                    }
                    return true;
                }
                case 'All Time':
                default:
                    return true;
            }
        });
    }, [allTransactions, timeFilter, clientFilter, customStart, customEnd]);

    // ── Statement data ─────────────────────────────────────────────────────
    const statementData = useMemo(() => {
        if (!allTransactions || allTransactions.length === 0) return { days: [], payoutRecipients: [] };
        const [yr, mo] = (selectedMonthKey || '').split('-').map(Number);
        if (!yr || !mo) return { days: [], payoutRecipients: [] };

        const monthEnd = new Date(yr, mo, 0);

        // Filter transactions for this month
        const monthTx = allTransactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getFullYear() === yr && d.getMonth() + 1 === mo;
        });

        const startDate = new Date(yr, mo - 1, 1);

        // 0. Calculate Balance Brought Forward
        const prevTx = allTransactions.filter(tx => {
            const d = new Date(tx.date);
            if (d >= startDate) return false;
            if (stmtClient !== 'All Clients' && String(tx.client_id) !== String(stmtClient)) return false;
            return true;
        });
        const startingInflow = prevTx.filter(tx => tx.type === 'IN').reduce((sum, tx) => sum + (tx.amount_aed || 0), 0);
        const startingOutflow = prevTx.filter(tx => tx.type === 'OUT').reduce((sum, tx) => sum + (tx.amount_aed || 0), 0);
        const balanceForward = startingInflow - startingOutflow;

        // 1. Payout Transactions for the month - Right Side
        const payoutTransactions = monthTx
            .filter(tx => tx.type === 'OUT')
            .filter(tx => stmtClient === 'All Clients' || String(tx.client_id) === String(stmtClient))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2. Generate All Days and calculate daily inflow totals - Left Side
        const days = [];
        let runningNetBalance = balanceForward;

        for (let d = 1; d <= monthEnd.getDate(); d++) {
            const date = new Date(yr, mo - 1, d);
            const dateKey = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            // For inflows, we optionally filter by client if stmtClient !== 'All Clients'
            const inflows = monthTx.filter(tx => {
                const txD = new Date(tx.date);
                if (txD.getDate() !== d || tx.type !== 'IN') return false;
                if (stmtClient !== 'All Clients' && String(tx.client_id) !== String(stmtClient)) return false;
                return true;
            });
            
            const payouts = monthTx.filter(tx => {
                const txD = new Date(tx.date);
                if (txD.getDate() !== d || tx.type !== 'OUT') return false;
                if (stmtClient !== 'All Clients' && String(tx.client_id) !== String(stmtClient)) return false;
                return true;
            });

            const dayInflowTotal = inflows.reduce((sum, tx) => sum + (tx.amount_aed || 0), 0);
            const dayInflowTotalNaira = inflows.reduce((sum, tx) => sum + (tx.amount_naira || 0), 0);
            const dayPayoutTotal = payouts.reduce((sum, tx) => sum + (tx.amount_aed || 0), 0);
            
            runningNetBalance += (dayInflowTotal - dayPayoutTotal);
            
            days.push({
                dateKey,
                date,
                inflows,
                payouts,
                dayTotal: dayInflowTotal,
                dayTotalNaira: dayInflowTotalNaira,
                dayPayoutTotal,
                mainTotal: runningNetBalance
            });
        }
        
        return { days, payoutTransactions, balanceForward };
    }, [allTransactions, selectedMonthKey, stmtClient]);

    const statementDays = statementData.days;
    const payoutTransactions = statementData.payoutTransactions;
    const grandTotalAed = useMemo(() => statementDays.reduce((s, d) => s + d.dayTotal, 0), [statementDays]);
    const grandTxCount = useMemo(() => statementDays.reduce((s, d) => s + d.inflows.length, 0), [statementDays]);

    const toggleDay = (key) => setCollapsedDays(p => ({ ...p, [key]: !p[key] }));

    // ── Chart data ─────────────────────────────────────────────────────────
    const { trendData, comparisonData } = useMemo(() => {
        if (filteredTransactions.length === 0) return { trendData: [], comparisonData: [] };
        const groupByDay = timeFilter === 'Last 30 Days' || timeFilter === 'Custom Range';

        const aggregated = filteredTransactions.reduce((acc, tx) => {
            const date = new Date(tx.date);
            let groupKey, displayLabel;

            if (groupByDay) {
                groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                displayLabel = date.toLocaleString('default', { month: 'short', day: 'numeric' });
            } else {
                groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                displayLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            }

            if (!acc[groupKey]) acc[groupKey] = { sortKey: groupKey, name: displayLabel, volume: 0, inflows: 0, payouts: 0 };

            if (tx.type === 'IN') {
                acc[groupKey].volume += (tx.amount_naira || 0) / 1000000;
                acc[groupKey].inflows += (tx.amount_naira || 0) / 1000000;
            } else {
                acc[groupKey].payouts += ((tx.amount_aed || 0) * (tx.exchange_rate || 1650)) / 1000000;
            }
            return acc;
        }, {});

        const limitedData = Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-24);
        return {
            trendData: limitedData.map(d => ({ name: d.name, volume: parseFloat(d.volume.toFixed(2)) })),
            comparisonData: limitedData.map(d => ({ name: d.name, inflows: parseFloat(d.inflows.toFixed(2)), payouts: parseFloat(d.payouts.toFixed(2)) }))
        };
    }, [filteredTransactions, timeFilter]);

    // ── Top clients ────────────────────────────────────────────────────────
    const topClients = useMemo(() => {
        return clients.map(client => {
            const clientTx = filteredTransactions.filter(tx => tx.client_id === client.id);
            const volume = clientTx.reduce((sum, tx) => sum + (tx.amount_naira || 0), 0);
            return { ...client, totalVolume: volume, txCount: clientTx.length };
        }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    }, [clients, filteredTransactions]);

    // ── Summary stats ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        if (filteredTransactions.length === 0) return { avgTx: 0, freq: 0, convRate: 1650, txCount: 0 };
        const totalVolume = filteredTransactions.reduce((acc, tx) => acc + (tx.amount_naira || 0), 0);
        let days = 30;
        if (timeFilter === 'Last 90 Days') days = 90;
        else if (timeFilter === 'Year to Date') days = Math.max(1, Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 86400000));
        else if (timeFilter === 'All Time') days = 365;
        else if (timeFilter === 'Custom Range' && customStart && customEnd) {
            days = Math.max(1, Math.floor((new Date(customEnd) - new Date(customStart)) / 86400000));
        }
        return {
            avgTx: totalVolume / filteredTransactions.length,
            freq: filteredTransactions.length / days,
            convRate: allTransactions?.[0]?.exchange_rate || 1650,
            txCount: filteredTransactions.length
        };
    }, [filteredTransactions, timeFilter, customStart, customEnd, allTransactions]);

    // ── Export CSV (analytics view) ────────────────────────────────────────
    const handleExport = () => {
        if (filteredTransactions.length === 0) return;
        const headers = ['Date', 'Time', 'Client/Counterparty', 'Recipient/Narration', 'Type', 'Amount (NGN)', 'Balance Effect (AED)', 'Unique ID'];
        const rows = filteredTransactions.map(tx => {
            const d = new Date(tx.date);
            return [
                d.toLocaleDateString(),
                d.toLocaleTimeString(),
                `"${(tx.client_name || '').replace(/"/g, '""')}"`,
                `"${(tx.recipient || tx.narration || '').replace(/"/g, '""')}"`,
                tx.type === 'IN' ? 'INFLOW' : 'PAYOUT',
                tx.amount_naira || '',
                `${tx.type === 'IN' ? '+' : '-'}${tx.amount_aed}`,
                tx.transaction_unique_id || tx.id
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const client = clientFilter === 'All Clients' ? 'all_clients' : `client_${clientFilter}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `finance_report_${client}_${timeFilter.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Export statement CSV ───────────────────────────────────────────────
    const handleExportStatement = () => {
        if (statementDays.length === 0) return;
        const rows = ['Date,Client,Type,Recipient/Narration,Naira Amount,AED Amount,Unique ID'];

        if (statementData.balanceForward !== 0) {
            rows.push(['Balance Brought Forward', '', '', '', '', statementData.balanceForward.toFixed(2), ''].join(','));
            rows.push('');
        }

        statementDays.forEach(day => {
            const allDayTx = [...day.inflows, ...day.payouts].sort((a, b) => new Date(a.date) - new Date(b.date));
            allDayTx.forEach(tx => {
                const d = new Date(tx.date);
                rows.push([
                    d.toLocaleDateString(),
                    `"${(tx.client_name || '').replace(/"/g, '""')}"`,
                    tx.type === 'IN' ? 'INFLOW' : 'PAYOUT',
                    `"${(tx.recipient || tx.narration || '').replace(/"/g, '""')}"`,
                    tx.amount_naira || '',
                    tx.amount_aed || '',
                    tx.transaction_unique_id || tx.id
                ].join(','));
            });
            if (allDayTx.length > 0) {
                rows.push([
                    `DAY TOTAL NGN (${new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
                    '', '', '',
                    day.dayTotalNaira,
                    '',
                    ''
                ].join(','));
                rows.push([
                    `DAY TOTAL AED (${new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
                    '', '', '',
                    '',
                    day.dayTotal.toFixed(2),
                    ''
                ].join(','));
                rows.push([
                    'RUNNING NET BALANCE', '', '', '', '', day.mainTotal.toFixed(2), ''
                ].join(','));
                rows.push('');
            }
        });
        rows.push(['MONTHLY FINAL NET BALANCE', '', '', '', '', (statementDays[statementDays.length - 1]?.mainTotal || 0).toFixed(2), ''].join(','));
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `statement_${selectedMonthKey}_${stmtClient === 'All Clients' ? 'all' : stmtClient}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        if (statementDays.length === 0) return;

        const doc = new jsPDF();
        const clientName = stmtClient === 'All Clients' ? 'All Clients' : (clients.find(c => String(c.id) === String(stmtClient))?.name || 'Client');
        const monthYear = selectedMonthKey;

        // Title
        doc.setFontSize(20);
        doc.setTextColor(124, 58, 237); // Primary color
        doc.text('Monthly Financial Statement', 14, 22);

        // Subheader
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Client: ${clientName}`, 14, 32);
        doc.text(`Month: ${monthYear}`, 14, 37);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

        // Summary Boxes
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 50, 182, 20, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('BALANCE BROUGHT FORWARD', 20, 57);
        doc.text('MONTHLY FINAL NET BALANCE', 130, 57);

        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(`${statementData.balanceForward.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED`, 20, 64);
        doc.setTextColor(124, 58, 237);
        doc.text(`${(statementDays[statementDays.length - 1]?.mainTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} AED`, 130, 64);

        // Table
        const tableRows = [];
        
        statementDays.forEach(day => {
            const allDayTx = [...day.inflows, ...day.payouts].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            allDayTx.forEach(tx => {
                tableRows.push([
                    new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                    tx.type === 'IN' ? 'INFLOW' : 'PAYOUT',
                    tx.recipient || tx.narration || '-',
                    tx.amount_naira ? tx.amount_naira.toLocaleString() : '-',
                    tx.amount_aed.toLocaleString(undefined, { minimumFractionDigits: 2 })
                ]);
            });

            if (allDayTx.length > 0) {
                // Day Total Rows
                tableRows.push([
                    { content: `Daily Totals (${new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [245, 243, 255] } },
                    { content: day.dayTotalNaira.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [245, 243, 255], halign: 'right' } },
                    { content: day.dayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [245, 243, 255], halign: 'right' } }
                ]);
                tableRows.push([
                    { content: 'RUNNING NET BALANCE', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', textColor: [124, 58, 237] } },
                    { content: day.mainTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: [124, 58, 237] } }
                ]);
            }
        });

        autoTable(doc, {
            startY: 75,
            head: [['Date', 'Type', 'Description', 'NGN Amount', 'AED Amount']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 20 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' }
            },
            margin: { top: 20 },
            didDrawPage: (data) => {
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`Statement_${clientName.replace(/\s+/g, '_')}_${monthYear}.pdf`);
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Loading Reports...</div>;

    return (
        <div className="animate-fade">
            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">Financial Reports</h1>
                    <p className="text-slate-500 font-medium">Comprehensive analytics and daily transaction statements.</p>
                </div>
            </div>

            {/* ── Tab switcher ── */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: 14, width: 'fit-content' }}>
                <button
                    onClick={() => setActiveTab('analytics')}
                    style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        background: activeTab === 'analytics' ? 'white' : 'transparent',
                        color: activeTab === 'analytics' ? '#7c3aed' : '#64748b',
                        boxShadow: activeTab === 'analytics' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    }}
                >
                    <BarChart2 size={16} /> Analytics
                </button>
                <button
                    onClick={() => setActiveTab('statement')}
                    style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        background: activeTab === 'statement' ? 'white' : 'transparent',
                        color: activeTab === 'statement' ? '#7c3aed' : '#64748b',
                        boxShadow: activeTab === 'statement' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    }}
                >
                    <TableProperties size={16} /> Monthly Statement
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════
                ANALYTICS TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
                <>
                    {/* Filters row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.75rem' }}>
                        <div className="report-select-wrapper">
                            <select className="report-select" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
                                <option value="All Clients">All Clients</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="report-select-icon" />
                        </div>
                        <div className="report-select-wrapper">
                            <select className="report-select" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                                <option>Last 30 Days</option>
                                <option>Last 90 Days</option>
                                <option>Year to Date</option>
                                <option>All Time</option>
                                <option>Custom Range</option>
                            </select>
                            <ChevronDown className="report-select-icon" />
                        </div>
                        {timeFilter === 'Custom Range' && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600 }} />
                                <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>to</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600 }} />
                            </div>
                        )}
                        <button
                            onClick={handleExport}
                            disabled={filteredTransactions.length === 0}
                            className="btn-premium btn-primary-premium shadow-lg shadow-violet-200 py-2"
                            style={{ opacity: filteredTransactions.length === 0 ? 0.5 : 1, marginLeft: 'auto' }}
                        >
                            <Download size={18} /> Export CSV
                        </button>
                    </div>

                    {/* Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="premium-card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Transaction Volume Trend</h3>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '0.2rem 0.65rem', borderRadius: 20 }}>NGN</span>
                            </div>
                            <div style={{ height: 300, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={v => `₦${v}M`} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={v => [`₦${v}M`, 'Volume']} />
                                        <Area type="monotone" dataKey="volume" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 3, fill: '#a855f7' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="premium-card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Inflow vs Payout</h3>
                            </div>
                            <div style={{ height: 300, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={v => `₦${v}M`} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v, name) => [`₦${v}M`, name.charAt(0).toUpperCase() + name.slice(1)]} />
                                        <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="inflows" name="Inflows" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="payouts" name="Payouts" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="stats-grid-premium" style={{ marginBottom: '1.5rem' }}>
                        <div className="premium-card stat-card-green">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><TrendingUp size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Average Transaction</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">₦ {stats.avgTx ? stats.avgTx.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</div>
                            <div className="text-xs text-slate-400 font-medium">Per transaction (NGN)</div>
                        </div>
                        <div className="premium-card stat-card-purple">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><Activity size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Transaction Frequency</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">{stats.freq.toFixed(1)}</div>
                            <div className="text-xs text-slate-400 font-medium">Per day average</div>
                        </div>
                        <div className="premium-card stat-card-amber">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><Percent size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Exchange Rate</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">{stats.convRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="text-xs text-slate-400 font-medium">NGN per AED</div>
                        </div>
                        <div className="premium-card stat-card-blue">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="stat-card-icon-container"><Hash size={20} /></div>
                                <span className="text-slate-500 font-semibold text-sm">Total Transactions</span>
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 mb-1">{stats.txCount.toLocaleString()}</div>
                            <div className="text-xs text-slate-400 font-medium">In selected period</div>
                        </div>
                    </div>

                    {/* Top clients table */}
                    <div className="premium-card">
                        <h3 className="font-bold text-lg text-slate-800 mb-6">Top Performing Clients</h3>
                        <div className="table-container shadow-none mt-0 border-none">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr className="text-slate-400 text-xs tracking-wider uppercase border-b border-slate-100">
                                        <th className="pb-4 font-semibold w-24 text-center">Rank</th>
                                        <th className="pb-4 font-semibold">Client</th>
                                        <th className="pb-4 font-semibold text-right">Total Volume</th>
                                        <th className="pb-4 font-semibold text-right">Transactions</th>
                                        <th className="pb-4 font-semibold text-right">Avg. Transaction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {topClients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontWeight: 600 }}>
                                                No data for the selected filters.
                                            </td>
                                        </tr>
                                    ) : topClients.map((client, idx) => (
                                        <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex justify-center">
                                                    <div className={`rank-badge ${idx < 3 ? `rank-badge-${idx + 1}` : 'rank-badge-other'}`}>{idx + 1}</div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="client-avatar bg-violet-100 text-violet-700">
                                                        {client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{client.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right font-bold text-slate-800">₦ {client.totalVolume.toLocaleString()}</td>
                                            <td className="py-4 text-right text-slate-500 font-medium">{client.txCount}</td>
                                            <td className="py-4 text-right font-medium text-slate-600">
                                                ₦ {(client.totalVolume / (client.txCount || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════
                MONTHLY STATEMENT TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'statement' && (
                <>
                    {/* Statement header / filters */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}>
                                <button
                                    onClick={goPrevMonth}
                                    disabled={!canGoPrev}
                                    title="Previous month"
                                    style={{
                                        padding: '0.55rem 0.75rem',
                                        border: 'none',
                                        borderRight: '1px solid #e2e8f0',
                                        background: canGoPrev ? 'white' : '#f8fafc',
                                        cursor: canGoPrev ? 'pointer' : 'not-allowed',
                                        color: canGoPrev ? '#7c3aed' : '#cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{
                                    padding: '0.55rem 1.1rem',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: '#1e293b',
                                    minWidth: 140,
                                    textAlign: 'center',
                                    letterSpacing: '0.01em',
                                }}>
                                    {selectedMonthLabel}
                                </span>
                                <button
                                    onClick={goNextMonth}
                                    disabled={!canGoNext}
                                    title="Next month"
                                    style={{
                                        padding: '0.55rem 0.75rem',
                                        border: 'none',
                                        borderLeft: '1px solid #e2e8f0',
                                        background: canGoNext ? 'white' : '#f8fafc',
                                        cursor: canGoNext ? 'pointer' : 'not-allowed',
                                        color: canGoNext ? '#7c3aed' : '#cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={16} />
                                </button>
                            </div>

                            <div className="report-select-wrapper">
                                <select
                                    className="report-select"
                                    value={stmtClient}
                                    onChange={e => setStmtClient(e.target.value)}
                                >
                                    <option value="All Clients">All Clients</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="report-select-icon" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={handleExportPDF}
                                disabled={statementDays.length === 0}
                                className="action-button-premium"
                                style={{ background: "#7c3aed", color: "white", padding: "0.6rem 1.25rem", borderRadius: 10, display: "flex", alignItems: "center", gap: "0.5rem", border: "none", cursor: "pointer", opacity: statementDays.length === 0 ? 0.5 : 1 }}
                            >
                                <Download size={18} /> Export PDF
                            </button>
                            <button
                                onClick={handleExportStatement}
                                disabled={statementDays.length === 0}
                                className="action-button-premium"
                                style={{ background: "white", color: "#7c3aed", border: "1px solid #7c3aed", padding: "0.6rem 1.25rem", borderRadius: 10, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", opacity: statementDays.length === 0 ? 0.5 : 1 }}
                            >
                                <TableProperties size={18} /> Export CSV
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                        {/* LEFT COLUMN: DAILY TIMELINE */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {statementDays.length === 0 ? (
                                <div className="premium-card" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                    <TableProperties size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No data for selected period</p>
                                </div>
                            ) : (
                                <>
                                    {statementDays.map(day => {
                                    const isCollapsed = collapsedDays[day.dateKey];
                                    const dayLabel = new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                    const hasInflows = day.inflows.length > 0;

                                    return (
                                        <div key={day.dateKey} className="premium-card" style={{ padding: 0, overflow: 'hidden', opacity: hasInflows ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                                            <div
                                                onClick={() => hasInflows && toggleDay(day.dateKey)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '1rem 1.5rem',
                                                    cursor: hasInflows ? 'pointer' : 'default',
                                                    background: hasInflows ? '#fafafa' : '#ffffff',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                    <div style={{
                                                        width: 42,
                                                        height: 42,
                                                        borderRadius: 12,
                                                        background: hasInflows ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' : '#f1f5f9',
                                                        color: hasInflows ? 'white' : '#94a3b8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 800,
                                                        fontSize: '1.1rem',
                                                        boxShadow: hasInflows ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none'
                                                    }}>
                                                        {new Date(day.date).getDate()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{dayLabel}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                                            {hasInflows ? `${day.inflows.length} inflow transaction${day.inflows.length !== 1 ? 's' : ''}` : 'No inflows recorded'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Total NGN</div>
                                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ef4444', background: '#fef2f2', padding: '0.1rem 0.6rem', borderRadius: 8 }}>{fmt(day.dayTotalNaira)} <span style={{ fontSize: '0.7rem' }}>₦</span></div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Total AED</div>
                                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#854d0e', background: '#fefce8', padding: '0.1rem 0.6rem', borderRadius: 8 }}>{fmt(day.dayTotal, 2)} <span style={{ fontSize: '0.7rem' }}>AED</span></div>
                                                    </div>
                                                    {hasInflows && (
                                                        <div style={{ color: '#94a3b8' }}>
                                                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {hasInflows && !isCollapsed && (
                                                <div style={{ padding: '0.5rem 1.5rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                        {day.inflows.map((tx, idx) => (
                                                            <div key={tx.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ffffff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #e2e8f0' }}>
                                                                        {(tx.client_name || 'N A').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{tx.client_name}</div>
                                                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{tx.narration || 'Regular Inflow'}</div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#059669' }}>+{fmt(tx.amount_aed, 2)} AED</div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>₦ {fmt(tx.amount_naira)}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                </>
                            )}
                        </div>

                        {/* RIGHT COLUMN: MONTHLY PAYOUTS (CHRONOLOGICAL) */}
                        <div style={{ position: "sticky", top: "calc(var(--header-height) + 1.5rem)" }}>
                            <div className="premium-card" style={{ padding: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <ArrowUpRight size={20} />
                                    </div>
                                    <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#1e293b" }}>Monthly Payouts</h3>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    {/* Previous Balance Row */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", width: "100%", padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>Previous Balance</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569" }}>{fmt(statementData.balanceForward, 2)} AED</span>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxHeight: "450px", overflowY: "auto", paddingRight: "0.25rem", paddingBottom: "0.5rem" }}>
                                        {payoutTransactions.length === 0 ? (
                                            <div style={{ textAlign: "center", padding: "2rem 1rem", background: "#f8fafc", borderRadius: 12, border: "1px dashed #e2e8f0" }}>
                                                <p style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>No payouts this month</p>
                                            </div>
                                        ) : (
                                            payoutTransactions.map((tx, idx) => (
                                                <div key={tx.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", background: "#ffffff", borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#334155", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.recipient || tx.narration || "Payout"}</div>
                                                        <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600 }}>{new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#e11d48" }}>
                                                        -{fmt(tx.amount_aed, 2)} <span style={{ fontSize: "0.65rem" }}>AED</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Final Balance Row */}
                                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", width: "100%", padding: "1rem", background: "#f5f3ff", borderRadius: 12, border: "1px solid #ddd6fe" }}>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#7c3aed" }}>Remaining Balance</span>
                                        <span style={{ fontSize: "1rem", fontWeight: 900, color: "#7c3aed", textAlign: 'right' }}>{fmt(statementDays[statementDays.length - 1]?.mainTotal || statementData.balanceForward, 2)} AED</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

import crypto from 'crypto';

export function normalizeDate(dateStr) {
    if (!dateStr) return new Date().toISOString();

    // Handle DD-MMM-YYYY or DD-MMM-YY (e.g., 11-MAR-2024 or 11-MAR-24)
    const dmyMMM = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (dmyMMM) {
        const months = {
            JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
            JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
        };
        const day = dmyMMM[1].padStart(2, '0');
        const month = months[dmyMMM[2].toUpperCase()] || '01';
        let year = dmyMMM[3];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}T12:00:00.000Z`;
    }

    // Handle YYYY-MM-DD (already mostly standard)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return `${dateStr}T12:00:00.000Z`;
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        let year = dmyMatch[3];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}T12:00:00.000Z`;
    }

    // Final fallback: try native JS parsing
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString();
    } catch (e) {}

    return new Date().toISOString();
}

export function normalizeSenderName(narration) {
    if (!narration) return 'UNKNOWN';

    let name = narration.toUpperCase();

    // Remove long alphanumeric codes (references, IDs)
    name = name.replace(/[A-Z0-9]{12,}/g, ' ').trim();

    const bankNames = [
        'GTBANK', 'GTB', 'ZENITH', 'ZENITHBANK', 'ACCESS', 'ACCESSBANK', 'UBA', 'FIRSTBANK', 'FIRST BANK',
        'OPAY', 'PALMPAY', 'KUDA', 'TAJ', 'TAJBANK', 'PROVIDUS', 'PROVIDUSBANK', 'FIDELITY', 'FIDELITYBANK',
        'STANBIC', 'STERLING', 'WEMA', 'UNION', 'KEYSTONE', 'POLARIS', 'HERITAGE', 'VFD', 'MONIEPOINT'
    ];

    // Remove common prefixes iteratively
    const prefixes = [
        /INWARD\s+TRANSFER\s*\(.?\)/i,
        /OUTWARD\s+TRANSFER\s*\(.?\)/i,
        /NIP\s+TRANSFER\s+FROM/i,
        /NIP\s+TRF\s+FROM/i,
        /NIP\s+FRM/i,
        /NIP\s+TRANSFER/i,
        /NIP\s+/i,
        /TRANSFER\s+FROM/i,
        /TRF\s+FROM/i,
        /ONLINE\s+BANKING/i,
        /ONB\s+TRANSFER\s+FROM/i,
        /ONB\s+TRANSFER/i,
        /ONB/i,
        /FROM/i,
        /FRM/i,
        /MOBILE\s+/i,
        /USSD\s+/i,
        /PAYMENT\s+/i,
        /INFLOW\s+/i,
        /TRANSFER\s+/i,
        /TRF\s+/i,
        /ACCOUNT\s+TRANSFERS/i,
        /PIMVA/i,
        /NXG/i
    ];

    let changed = true;
    while (changed) {
        let oldName = name;
        for (const prefix of prefixes) {
            name = name.replace(prefix, ' ');
        }
        name = name.trim();
        if (name === oldName) changed = false;
    }

    // Remove leading reference numbers (up to 10 digits) followed by a space
    name = name.replace(/^\d{4,}\s+/, '').trim();

    // Remove common filler words
    name = name.replace(/INTER\s+BANK\s+TRANSFER/gi, ' ').trim();
    name = name.replace(/FIP:MB:/gi, ' ').trim();
    name = name.replace(/IFO\s+TOP\s+CARE\s+LOGISTICS\s+NIGERIA\s+LTD/gi, ' ').trim();
    name = name.replace(/TO\s+BLAZER\s+SPORT\s+EQUIPMENT\s+NIG\s+LTD/gi, ' ').trim();
    name = name.replace(/MOB:\s+TRF\s+FROM\s+/gi, ' ').trim();

    const amtPattern = /\b(\d{1,3}(,\d{3})*|\d+)\.\d{2}\b/g;
    name = name.replace(amtPattern, ' ').trim();

    name = name.replace(/\s+/g, ' ').trim();

    const delimiters = ['/', '-', '|', ' TO ', ' BY ', '. '];
    let parts = [name];

    for (const delimiter of delimiters) {
        let newParts = [];
        for (const p of parts) {
            newParts.push(...p.split(delimiter));
        }
        parts = newParts.map(p => p.trim()).filter(p => p.length > 0);
    }

    let filteredParts = [];
    let seen = new Set();

    parts.forEach(p => {
        let sp = p.replace(/^\d{4,}\s+/, '').replace(/^FROM\s+/i, '').trim();
        const up = sp.toUpperCase();
        if (bankNames.includes(up)) return;
        if (up.match(/^\d+$/)) return;
        if (up.length < 3) return;

        if (!seen.has(up)) {
            filteredParts.push(sp);
            seen.add(up);
        }
    });

    let result = filteredParts[0] || parts[0] || 'UNKNOWN';
    return result.replace(/^\d{4,}\s+/, '').replace(/^FROM\s+/i, '').trim();
}

export function generateDeterministicId(transaction) {
    const data = `${transaction.date}|${transaction.amount_naira}|${transaction.narration}|${transaction.sender}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

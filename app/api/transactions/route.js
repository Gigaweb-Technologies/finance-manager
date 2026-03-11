import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const sql = `
    SELECT t.*, c.name as client_name 
    FROM transactions t 
    JOIN clients c ON t.client_id = c.id 
    ORDER BY t.date DESC
  `;
    try {
        const rows = await db.query(sql);
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const { client_id, type, amount_naira, amount_aed, exchange_rate, recipient, description, transaction_unique_id, date } = await request.json();

        if (!client_id || !type || !amount_aed) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Use a transaction for atomic update
        await db.runAsync('BEGIN TRANSACTION');
        try {
            const sql = `INSERT INTO transactions (client_id, type, amount_naira, amount_aed, exchange_rate, recipient, description, transaction_unique_id, date) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [client_id, type, amount_naira || null, amount_aed, exchange_rate || null, recipient || null, description || null, transaction_unique_id || null, date || new Date().toISOString()];

            const result = await db.runAsync(sql, params);

            const balanceChange = type === 'IN' ? amount_aed : -amount_aed;
            await db.runAsync('UPDATE clients SET balance_aed = balance_aed + ? WHERE id = ?', [balanceChange, client_id]);

            await db.runAsync('COMMIT');
            return NextResponse.json({ success: true, transaction_id: result.lastID });
        } catch (err) {
            console.error('Transaction POST error:', err);
            try { await db.runAsync('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback failed:', rollbackErr); }
            if (err.message.includes('UNIQUE constraint failed')) {
                return NextResponse.json({ error: 'Transaction already exists' }, { status: 409 });
            }
            throw err;
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

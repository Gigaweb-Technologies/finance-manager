import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request, { params }) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { id } = await params;

    try {
        const row = await db.getAsync('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!row) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        return NextResponse.json(row);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { id } = await params;

    try {
        const { client_id, type, amount_naira, amount_aed, exchange_rate, recipient, description, date } = await request.json();

        // Get original transaction to calculate balance adjustment
        const oldTx = await db.getAsync('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!oldTx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

        try {
            // 1. Reverse old impact
            const oldBalanceChange = oldTx.type === 'IN' ? oldTx.amount_aed : -oldTx.amount_aed;
            await db.runAsync('UPDATE clients SET balance_aed = balance_aed - ? WHERE id = ?', [oldBalanceChange, oldTx.client_id]);

            // 2. Update transaction
            const sql = `UPDATE transactions 
                         SET client_id = ?, type = ?, amount_naira = ?, amount_aed = ?, exchange_rate = ?, recipient = ?, description = ?, date = ?
                         WHERE id = ?`;
            const paramsList = [
                client_id || oldTx.client_id,
                type || oldTx.type,
                amount_naira !== undefined ? amount_naira : oldTx.amount_naira,
                amount_aed !== undefined ? amount_aed : oldTx.amount_aed,
                exchange_rate !== undefined ? exchange_rate : oldTx.exchange_rate,
                recipient !== undefined ? recipient : oldTx.recipient,
                description !== undefined ? description : oldTx.description,
                date || oldTx.date,
                id
            ];
            await db.runAsync(sql, paramsList);

            // 3. Apply new impact
            const newClientId = client_id || oldTx.client_id;
            const newType = type || oldTx.type;
            const newAmountAed = amount_aed !== undefined ? amount_aed : oldTx.amount_aed;
            const newBalanceChange = newType === 'IN' ? newAmountAed : -newAmountAed;
            await db.runAsync('UPDATE clients SET balance_aed = balance_aed + ? WHERE id = ?', [newBalanceChange, newClientId]);

            return NextResponse.json({ success: true });
        } catch (err) {
            console.error('Transaction PUT error:', err);
            throw err;
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { id } = await params;

    try {
        const tx = await db.getAsync('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

        try {
            // Reverse impact
            const balanceChange = tx.type === 'IN' ? tx.amount_aed : -tx.amount_aed;
            await db.runAsync('UPDATE clients SET balance_aed = balance_aed - ? WHERE id = ?', [balanceChange, tx.client_id]);

            // Delete transaction
            await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

            return NextResponse.json({ success: true });
        } catch (err) {
            console.error('Transaction DELETE error:', err);
            throw err;
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const { ids } = await request.json();
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
        }

        if (ids.length === 0) return NextResponse.json([]);

        const placeholders = ids.map(() => '?').join(',');
        const rows = await db.query(`SELECT transaction_unique_id FROM transactions WHERE transaction_unique_id IN (${placeholders})`, ids);
        return NextResponse.json(rows.map(row => row.transaction_unique_id));
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request, { params }) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { id } = await params;

    try {
        const rows = await db.query('SELECT * FROM transactions WHERE client_id = ? ORDER BY date DESC', [id]);
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

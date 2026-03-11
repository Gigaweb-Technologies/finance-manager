import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    let sql = 'SELECT * FROM recipients';
    let params = [];
    
    if (clientId) {
        sql += ' WHERE client_id = ?';
        params.push(clientId);
    }
    
    sql += ' ORDER BY name ASC';

    try {
        const rows = await db.query(sql, params);
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const { client_id, name, bank_name, account_number } = await request.json();

        if (!client_id || !name) {
            return NextResponse.json({ error: 'Client ID and Name are required' }, { status: 400 });
        }

        const sql = `INSERT INTO recipients (client_id, name, bank_name, account_number) VALUES (?, ?, ?, ?)`;
        const params = [client_id, name, bank_name || null, account_number || null];

        const result = await db.runAsync(sql, params);
        return NextResponse.json({ success: true, id: result.lastID });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

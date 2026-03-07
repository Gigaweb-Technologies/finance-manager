import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const rows = await db.query('SELECT * FROM clients ORDER BY name ASC');
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const { name, email, phone, address, contact_person, photo_url } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const result = await db.runAsync(
            'INSERT INTO clients (name, email, phone, address, contact_person, photo_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email || null, phone || null, address || null, contact_person || null, photo_url || null]
        );
        return NextResponse.json({ id: result.lastID, name, balance_aed: 0 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

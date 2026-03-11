import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request, { params }) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { id } = await params;

    try {
        const row = await db.getAsync('SELECT * FROM clients WHERE id = ?', [id]);
        if (!row) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
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
        const { name, email, phone, address, contact_person, photo_url, currency } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const result = await db.runAsync(
            'UPDATE clients SET name = ?, email = ?, phone = ?, address = ?, contact_person = ?, photo_url = ?, currency = ? WHERE id = ?',
            [name, email || null, phone || null, address || null, contact_person || null, photo_url || null, currency || 'AED', id]
        );
        if (result.changes === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        return NextResponse.json({ message: 'Client updated successfully' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    const { id } = await params;

    try {
        // Check for existing transactions
        const txCount = await db.getAsync('SELECT COUNT(*) as count FROM transactions WHERE client_id = ?', [id]);
        if (txCount.count > 0) {
            return NextResponse.json({ error: 'Cannot delete client with existing transactions' }, { status: 400 });
        }

        const result = await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
        if (result.changes === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        return NextResponse.json({ message: 'Client deleted successfully' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const row = await db.getAsync('SELECT id, username, email, full_name, department, photo_url FROM users WHERE id = ?', [user.id]);
        if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json(row);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const { email, full_name, department } = await request.json();
        await db.runAsync(
            'UPDATE users SET email = ?, full_name = ?, department = ? WHERE id = ?',
            [email || null, full_name || null, department || null, user.id]
        );
        return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

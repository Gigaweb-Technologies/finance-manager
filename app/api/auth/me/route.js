import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request) {
    const user = authenticateToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    try {
        const row = await db.getAsync(
            'SELECT id, username, email, full_name, department, photo_url, role FROM users WHERE id = ?',
            [user.id]
        );
        if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json(row);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const { current_password, new_password } = await request.json();
        if (!current_password || !new_password) {
            return NextResponse.json({ error: 'Both current and new passwords are required' }, { status: 400 });
        }
        if (new_password.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        const row = await db.getAsync('SELECT password FROM users WHERE id = ?', [user.id]);
        if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const valid = await bcrypt.compare(current_password, row.password);
        if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

        const hashed = await bcrypt.hash(new_password, 10);
        await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

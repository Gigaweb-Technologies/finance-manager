import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';

// POST /api/users/[id]/reset-password — admin only
export async function POST(request, { params }) {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });

    const { id } = params;
    try {
        const { new_password } = await request.json();
        if (!new_password || new_password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const hashed = await hashPassword(new_password);
        const result = await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);
        if (result.changes === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({ success: true, message: 'Password reset successfully.' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

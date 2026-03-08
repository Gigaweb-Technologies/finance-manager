import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';

// PUT /api/users/[id] — admin only: update role, full_name, email, department
export async function PUT(request, { params }) {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });

    const { id } = params;
    try {
        const { full_name, email, department, role } = await request.json();
        const safeRole = role === 'admin' ? 'admin' : 'user';

        await db.runAsync(
            'UPDATE users SET full_name = ?, email = ?, department = ?, role = ? WHERE id = ?',
            [full_name || null, email || null, department || null, safeRole, id]
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/users/[id] — admin only: delete a user (cannot delete yourself)
export async function DELETE(request, { params }) {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });

    const { id } = params;
    if (String(admin.id) === String(id)) {
        return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    try {
        const changes = await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
        if (changes.changes === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

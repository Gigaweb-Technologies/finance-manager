import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';

// GET /api/users — admin only: list all users
export async function GET(request) {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });

    try {
        const users = await db.query(
            'SELECT id, username, email, full_name, department, photo_url, role, created_at FROM users ORDER BY id ASC'
        );
        return NextResponse.json(users);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/users — admin only: create a new user
export async function POST(request) {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });

    try {
        const { username, password, full_name, email, department, role } = await request.json();
        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const safeRole = role === 'admin' ? 'admin' : 'user';
        const hashed = await hashPassword(password);

        try {
            const result = await db.runAsync(
                'INSERT INTO users (username, password, full_name, email, department, role) VALUES (?, ?, ?, ?, ?, ?)',
                [username, hashed, full_name || null, email || null, department || null, safeRole]
            );
            return NextResponse.json({ success: true, user: { id: result.lastID, username, role: safeRole } }, { status: 201 });
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
            }
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

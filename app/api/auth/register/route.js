import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        try {
            const result = await db.runAsync(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword]
            );
            return NextResponse.json({ success: true, user: { id: result.lastID, username } });
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

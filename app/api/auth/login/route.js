import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const validPassword = await comparePassword(password, user.password);
        if (!validPassword) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
        }

        const token = signToken({ id: user.id, username: user.username });
        return NextResponse.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                department: user.department,
                photo_url: user.photo_url
            }
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

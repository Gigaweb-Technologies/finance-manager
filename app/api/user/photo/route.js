import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('photo');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.name);
        const relativePath = `/uploads/profiles/${filename}`;
        const absolutePath = path.join(process.cwd(), 'public', relativePath);

        await writeFile(absolutePath, buffer);

        await db.runAsync('UPDATE users SET photo_url = ? WHERE id = ?', [relativePath, user.id]);

        return NextResponse.json({ success: true, photo_url: relativePath });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

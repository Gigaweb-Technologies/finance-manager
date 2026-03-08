import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Self-registration is disabled. Contact an administrator to create an account.' },
        { status: 403 }
    );
}

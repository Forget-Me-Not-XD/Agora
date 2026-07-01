// ========== Imports: ==========
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL     = process.env.API_URL     ?? 'http://localhost:3000';
const COOKIE_NAME = 'akademia_token';

export async function GET(
    request: NextRequest,
    { params }: { params: { type: string } },
) {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    const url = `${API_URL}/api/v1/export/${params.type}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache:   'no-store',
    });
    
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        return NextResponse.json(
            { message: body.message ?? 'Uitvoer het misluk.' },
            { status: res.status },
        );
    }

    const csv  = await res.text();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type':        'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${params.type}-${date}.csv"`,
        },
    });
}
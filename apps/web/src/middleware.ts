// ========== IMPORTS: ==========
import { NextRequest, NextResponse } from 'next/server';

// ========== Constants: ==========
const PUBLIC_PATHS = ['/login', '/register'];

// ========== Main Logic: ==========
export function middleware(request: NextRequest) {
    const token    = request.cookies.get('akademia_token')?.value;
    const { pathname } = request.nextUrl;

    const isPublic = PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + '/'),
    );

    if (!token && !isPublic) {
        const url      = request.nextUrl.clone();
        url.pathname   = '/login';
        return NextResponse.redirect(url);
    }

    if (token && isPublic) {
        const url      = request.nextUrl.clone();
        url.pathname   = '/dashboard';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};

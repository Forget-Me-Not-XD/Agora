import { NextRequest, NextResponse } from 'next/server';

const AUTH_ONLY_PATHS = ['/login', '/register'];
const ALWAYS_PUBLIC_PATHS = ['/popia'];
const PASSWORD_CHANGE_PATH = '/change-password';

function matchesPath(pathname: string, paths: string[]): boolean {
    return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
    const token        = request.cookies.get('akademia_token')?.value;
    const userCookie   = request.cookies.get('akademia_user')?.value;
    const { pathname } = request.nextUrl;

    if (matchesPath(pathname, ALWAYS_PUBLIC_PATHS)) {
        return NextResponse.next();
    }

    const isAuthOnly = matchesPath(pathname, AUTH_ONLY_PATHS);

    if (!token && !isAuthOnly) {
        const url    = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    if (token && isAuthOnly) {
        const url    = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    let mustChangePassword = false;
    if (token && userCookie) {
        try {
            mustChangePassword = Boolean(JSON.parse(userCookie)?.mustChangePassword);
        }catch {
            mustChangePassword = false;
        }
    }

    if (token && mustChangePassword && pathname !== PASSWORD_CHANGE_PATH) {
        const url    = request.nextUrl.clone();
        url.pathname = PASSWORD_CHANGE_PATH;
        return NextResponse.redirect(url);
    }

    if (token && !mustChangePassword && pathname === PASSWORD_CHANGE_PATH) {
        const url    = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
};

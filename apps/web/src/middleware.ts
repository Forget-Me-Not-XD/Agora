import { NextRequest, NextResponse } from 'next/server';
import {
    clearAuthCookies,
    COOKIE_NAME,
    COOKIE_USER_NAME,
    COOKIE_REFRESH_NAME,
    COOKIE_REFRESH_GUARD,
} from '@/lib/auth-cookies';

const AUTH_ONLY_PATHS = ['/login', '/register'];
const ALWAYS_PUBLIC_PATHS = ['/popia'];
const PASSWORD_CHANGE_PATH = '/change-password';
const REFRESH_PATH = '/api/auth/refresh';

function matchesPath(pathname: string, paths: string[]): boolean {
    return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
    const token        = request.cookies.get(COOKIE_NAME)?.value;
    const userCookie   = request.cookies.get(COOKIE_USER_NAME)?.value;
    const refreshToken = request.cookies.get(COOKIE_REFRESH_NAME)?.value;
    const { pathname } = request.nextUrl;

    if (matchesPath(pathname, ALWAYS_PUBLIC_PATHS)) {
        return NextResponse.next();
    }

    const isAuthOnly = matchesPath(pathname, AUTH_ONLY_PATHS);

    // Access token is weg maar daar is 'n refresh token (onthou my), so gaan refresh eers.
    // Die guard keer 'n redirect-lus as die nuwe cookie nie gestel kon word nie.
    if (!token && refreshToken && !request.cookies.get(COOKIE_REFRESH_GUARD)) {
        const url    = request.nextUrl.clone();
        url.pathname = REFRESH_PATH;
        url.search   = '';
        // Stuur terug na die bladsy waar hulle was, of dashboard as hulle op /login was
        url.searchParams.set(
            'from',
            isAuthOnly ? '/dashboard' : pathname + request.nextUrl.search,
        );
        // 303 vir POST sodat die browser met GET volg en nie die POST herhaal nie
        return NextResponse.redirect(url, request.method === 'GET' ? 307 : 303);
    }

    if (!token && !isAuthOnly) {
        const url    = request.nextUrl.clone();
        url.pathname = '/login';
        url.search   = '';

        // As daar nog 'n user of refresh cookie is, was hulle ingeteken en het die sessie verval
        const hadSession = Boolean(userCookie || refreshToken);

        if (!hadSession) {
            return NextResponse.redirect(url);
        }

        url.searchParams.set('error', 'session_expired');

        // Maak die ou cookies skoon sodat die boodskap net een keer wys
        const response = NextResponse.redirect(url);
        clearAuthCookies(response.cookies);
        return response;
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

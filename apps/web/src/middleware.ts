import { NextRequest, NextResponse } from 'next/server';
import {
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

    // Die access token leef net 15 minute. Solank 'n refresh token bestaan, ruil
    // ons dit stilweg vir 'n nuwe paar in plaas daarvan om die gebruiker uit te
    // log — dis wat "onthou my" oor blaaier-sessies heen laat werk.
    //
    // Die guard cookie verhoed 'n herlei-lus as die nuwe access cookie nie land nie
    // (bv. secure cookies oor 'n gewone HTTP-verbinding): dan val ons deur na /login.
    if (!token && refreshToken && !request.cookies.get(COOKIE_REFRESH_GUARD)) {
        const url    = request.nextUrl.clone();
        url.pathname = REFRESH_PATH;
        url.search   = '';
        // Na 'n suksesvolle hernuwing gaan die gebruiker terug na waar hulle was.
        // Vanaf /login of /register is dit die dashboard, nie die aanmeldskerm nie.
        url.searchParams.set(
            'from',
            isAuthOnly ? '/dashboard' : pathname + request.nextUrl.search,
        );
        // 303 vir 'n POST (server action / vorm), sodat die blaaier die hernu-roete
        // met GET volg in plaas van om die POST-liggaam daarheen te herhaal.
        return NextResponse.redirect(url, request.method === 'GET' ? 307 : 303);
    }

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

import { NextRequest, NextResponse } from 'next/server';
import {
    clearAuthCookies,
    COOKIE_NAME,
    COOKIE_USER_NAME,
    COOKIE_REFRESH_NAME,
    COOKIE_REFRESH_GUARD,
    COOKIE_SESSION_HINT,
} from '@/lib/auth-cookies';
import { isRscRequest, reloadAsDocument } from '@/lib/rsc-request';

const AUTH_ONLY_PATHS = ['/login', '/register'];
const SERVER_BUSY_PATH = '/server-busy';
const ALWAYS_PUBLIC_PATHS = ['/popia', SERVER_BUSY_PATH];
const PASSWORD_CHANGE_PATH = '/change-password';
const REFRESH_PATH = '/api/auth/refresh';

function matchesPath(pathname: string, paths: string[]): boolean {
    return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Redirect na 'n ander bladsy. Vir 'n RSC-versoek (bv. router.refresh()) laai ons eerder die
 * bladsy van voor af, anders wys die adresbalk nog die ou URL (sien reloadAsDocument).
 */
function redirectTo(request: NextRequest, url: URL, status?: number): NextResponse {
    return isRscRequest(request) ? reloadAsDocument() : NextResponse.redirect(url, status);
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

    // 'n Aanmelding of registrasie (POST op /login of /register) moet altyd by sy server action
    // uitkom. Anders stuur ons dit na die refresh-roete, en die gebruiker se nuwe aanmelding gaan verlore.
    const isLoginSubmit = isAuthOnly && request.method !== 'GET';

    // Die access token is weg maar daar is nog 'n refresh token, so probeer eers refresh.
    // Die guard keer dat ons dit binne 10 s weer probeer (sien REFRESH_GUARD_SECONDS).
    if (!token && refreshToken && !request.cookies.get(COOKIE_REFRESH_GUARD) && !isLoginSubmit) {
        const url    = request.nextUrl.clone();
        url.pathname = REFRESH_PATH;
        url.search   = '';
        // Stuur terug na die bladsy waar hulle was, of na /dashboard as hulle op /login of /register was
        url.searchParams.set(
            'from',
            isAuthOnly ? '/dashboard' : pathname + request.nextUrl.search,
        );
        // 303 vir alles behalwe GET, sodat die blaaier met GET volg en nie die POST herhaal nie.
        // Hier is 'n gewone redirect ook vir RSC-versoeke reg: 'n suksesvolle refresh stuur terug
        // na dieselfde bladsy, so die URL klop. Misluk dit, hanteer die refresh-roete dit self.
        return NextResponse.redirect(url, request.method === 'GET' ? 307 : 303);
    }

    if (!token && !isAuthOnly) {
        const url    = request.nextUrl.clone();
        url.pathname = '/login';
        url.search   = '';

        // Is daar hier nog 'n refresh cookie, het die guard 'n refresh gekeer. As die sessie dood
        // was, sou die refresh-roete die cookie reeds verwyder het, so die backend was waarskynlik
        // net besig. Hou die cookies en wag op /server-busy, wat daarna na hierdie bladsy terugstuur.
        if (refreshToken) {
            url.pathname = SERVER_BUSY_PATH;
            url.searchParams.set('from', pathname + request.nextUrl.search);
            return redirectTo(request, url, request.method === 'GET' ? 307 : 303);
        }

        // Die hint cookie wys dat hulle aangemeld was en dat die sessie intussen verval het
        const hadSession = Boolean(request.cookies.get(COOKIE_SESSION_HINT));

        if (!hadSession) {
            return redirectTo(request, url);
        }

        // Moenie by 'n RSC-versoek die cookies skoonmaak nie. Die bladsylaai wat volg, het die
        // hint cookie nog nodig om die boodskap te wys.
        if (isRscRequest(request)) {
            return reloadAsDocument();
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
        return redirectTo(request, url);
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
        return redirectTo(request, url);
    }

    if (token && !mustChangePassword && pathname === PASSWORD_CHANGE_PATH) {
        const url    = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return redirectTo(request, url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
};

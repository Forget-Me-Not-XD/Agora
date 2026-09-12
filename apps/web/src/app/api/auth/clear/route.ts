// ========== Imports: ==========
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    clearAuthCookies,
    COOKIE_REFRESH_NAME,
    COOKIE_REFRESH_GUARD,
} from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

/**
 * Die dashboard layout stuur hierheen as daar geen token is of /auth/me dit verwerp.
 *
 * As daar nog 'n refresh cookie is probeer ons eers refresh, anders word 'n
 * onthou-my sessie onnodig uitgelog (bv. as die backend die token verwerp na 'n restart).
 */
export function GET(request: NextRequest) {
    const refreshToken = request.cookies.get(COOKIE_REFRESH_NAME)?.value;
    const guarded      = Boolean(request.cookies.get(COOKIE_REFRESH_GUARD));

    // As ons nou net gerefresh het (guard is daar) en dit werk steeds nie, log maar uit
    if (refreshToken && !guarded) {
        const refreshUrl = new URL('/api/auth/refresh', request.url);
        // Die refresh roete check self of 'from' veilig is
        const from = request.nextUrl.searchParams.get('from');
        if (from) refreshUrl.searchParams.set('from', from);

        return noStore(NextResponse.redirect(refreshUrl));
    }

    const loginUrl = new URL('/login?error=session_expired', request.url);
    const response = noStore(NextResponse.redirect(loginUrl));
    clearAuthCookies(response.cookies);
    return response;
}

function noStore(response: NextResponse): NextResponse {
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

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
 * Die dashboard layout stuur hierheen as daar geen access token is nie, of as /auth/me dit
 * met 'n 401 of 403 verwerp.
 *
 * As daar nog 'n refresh cookie is, probeer ons eers refresh. Anders word 'n sessie onnodig
 * uitgelog terwyl net die access token die probleem was. 'n Voorbeeld is 'n 403 omdat die
 * mustChangePassword-vlag intussen gestel is (bv. by 'n aanmelding op 'n ander toestel): die
 * refresh bring dan die nuwe vlag saam, en die middleware stuur die gebruiker na /change-password.
 */
export function GET(request: NextRequest) {
    const refreshToken = request.cookies.get(COOKIE_REFRESH_NAME)?.value;
    const guarded      = Boolean(request.cookies.get(COOKIE_REFRESH_GUARD));

    // Is die guard daar, het ons pas gerefresh en word die nuwe token steeds verwerp. Nog 'n
    // refresh sal dan nie help nie, so ons log uit (hieronder).
    if (refreshToken && !guarded) {
        const refreshUrl = new URL('/api/auth/refresh', request.url);
        // Die refresh-roete kyk self of 'from' veilig is
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

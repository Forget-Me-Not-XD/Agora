// Enige oorsprong werk hier, ons gebruik dit net om te sien of 'n pad op ons eie site bly
const INTERNAL_ORIGIN = 'http://intern.invalid';

/** Los die pad op soos 'n blaaier dit sal doen. null as dit na 'n ander webwerf gaan. */
function sameOriginPath(value: string): string | null {
  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    return url.origin === INTERNAL_ORIGIN ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}

/**
 * Laat net paaie op ons eie site toe, anders is dit 'n open redirect.
 *
 * Ons kyk nie self na karakters nie, want die blaaier maak die URL eers skoon: 'n tab of
 * nuwe reël word weggegooi ("/\t/evil.com" word "//evil.com") en 'n backslash tel as 'n
 * slash. Daarom los ons die pad op met die URL parser, net soos die blaaier.
 *
 * Ons doen dit twee keer. "/.//evil.com" bly eers op ons site, maar word skoongemaak na
 * "//evil.com", en dit stuur wel na 'n ander webwerf as ons dit teruggee.
 */
export function safeRedirectPath(from: string | null, fallback = '/dashboard'): string {
  if (!from) return fallback;

  const path = sameOriginPath(from);
  return path !== null && sameOriginPath(path) === path ? path : fallback;
}

// Die aanmeld- en wagwoordbladsye en /server-busy hoort by die aanmeldvloei self, so as ons
// ná aanmelding daarheen stuur, beland ons in 'n lus. /api is nooit 'n bladsy nie, en die
// refresh-roete se ?from= kan enigiets bevat, so 'n API-roete word ook nooit 'n bestemming nie.
const NOT_AFTER_LOGIN = ['/login', '/register', '/server-busy', '/change-password', '/api'];

/** Waarheen ons ná aanmelding stuur: die onthoude pad as dit veilig is, anders /dashboard. */
export function postLoginRedirect(from: string | null | undefined): string {
  const path     = safeRedirectPath(from ?? null);
  const pathname = path.split(/[?#]/)[0];
  const blocked  = NOT_AFTER_LOGIN.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return blocked ? '/dashboard' : path;
}

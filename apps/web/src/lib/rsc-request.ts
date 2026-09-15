// ========== Imports: ==========
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Is dit 'n versoek van Next se client router (router.refresh(), Link-navigasie of prefetch)?
 *
 * Route handlers sien die header "RSC: 1" wat die router stuur. Die middleware kry dit nie,
 * want Next verwyder dit (en die _rsc-parameter) voordat die middleware loop. Daar gebruik ons
 * die blaaier se Sec-Fetch-Mode: 'n gewone bladsylaai is "navigate", terwyl die router se fetch
 * iets anders stuur. Server actions (POST) laat ons buite, hulle hanteer redirects anders.
 * Stuur 'n ouer blaaier nie Sec-Fetch-Mode nie, gedra alles soos 'n gewone redirect.
 */
export function isRscRequest(request: NextRequest): boolean {
  if (request.headers.get('rsc') === '1') return true;

  const fetchMode = request.headers.get('sec-fetch-mode');
  return request.method === 'GET' && fetchMode !== null && fetchMode !== 'navigate';
}

/**
 * Gebruik dit in plaas van 'n redirect as isRscRequest waar is.
 *
 * Kry router.refresh() 'n redirect, wys Next die nuwe bladsy maar hou die ou URL in die
 * adresbalk (Next 14 se refresh-reducer oorskryf dit). Die bladsy sien dan nie parameters soos
 * ?error=session_expired nie, en 'n server action op daardie bladsy word na die verkeerde URL
 * gestuur.
 *
 * Hierdie antwoord is nie RSC nie, so Next laai die URL eerder as 'n gewone bladsy van voor af.
 * Daardie versoek gaan weer deur die middleware of roete, en kry dan die regte redirect. Moenie
 * hier cookies verander nie, anders het daardie tweede versoek nie meer die inligting nodig om
 * reg te besluit nie.
 */
export function reloadAsDocument(): NextResponse {
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

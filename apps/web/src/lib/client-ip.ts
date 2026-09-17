// ========== Imports: ==========
import { headers } from 'next/headers';

/**
 * Stuur die gebruiker se IP saam wanneer Next die backend namens hulle roep.
 *
 * Cloudflare sit die besoeker se IP in cf-connecting-ip. Roep Next die backend self, sien die
 * backend net die web-pod se IP, en dan deel al die web-gebruikers een throttler-emmer. Een
 * persoon wat login spam, sluit dan almal uit. Die backend lees hierdie header (sien getClientIp),
 * so ons gee dit net aan.
 *
 * Dit werk net vir oproepe na API_URL, die interne adres. 'n Oproep na NEXT_PUBLIC_API_URL gaan
 * weer deur Cloudflare, en Cloudflare vervang die header met die cluster se eie IP.
 *
 * Plaaslik is daar geen Cloudflare nie, so dan stuur ons niks en gebruik die backend req.ip.
 */
export function clientIpHeaders(): Record<string, string> {
  const ip = headers().get('cf-connecting-ip');
  return ip ? { 'cf-connecting-ip': ip } : {};
}

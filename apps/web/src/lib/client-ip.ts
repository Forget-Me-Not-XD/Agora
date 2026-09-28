// ========== Imports: ==========
import { headers } from 'next/headers';

/**
 * Stuur die gebruiker se IP saam wanneer Next die backend namens hulle roep.
 *
 * Cloudflare sit die besoeker se IP in cf-connecting-ip. Roep Next die backend self, sien die
 * backend net die web-pod se IP, en dan sit al die web-gebruikers in een throttler-emmer: een
 * persoon wat login spam, sluit dan al die ander uit. Ons gee die header dus net aan, en die
 * backend lees dit (sien getClientIp).
 *
 * Dit werk net vir oproepe na API_URL, die interne adres. 'n Oproep na NEXT_PUBLIC_API_URL gaan
 * weer deur Cloudflare, wat die header met die cluster se eie IP vervang.
 *
 * Sonder Cloudflare voor is daar geen header om aan te gee nie, en dan gebruik die backend req.ip.
 */
export function clientIpHeaders(): Record<string, string> {
  const ip = headers().get('cf-connecting-ip');
  return ip ? { 'cf-connecting-ip': ip } : {};
}

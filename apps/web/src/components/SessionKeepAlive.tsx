// ========== Imports: ==========
import { cookies } from 'next/headers';
import SessionHeartbeat from './SessionHeartbeat';
import { COOKIE_REMEMBER_NAME } from '@/lib/auth-cookies';

/**
 * Kies die regte heartbeat vir die gebruiker.
 *
 * Die remember cookie is httpOnly, so die blaaier kan dit nie lees nie. Daarom besluit ons
 * hier op die bediener en gee dit deur aan SessionHeartbeat.
 */
export default function SessionKeepAlive() {
    const remembered = cookies().get(COOKIE_REMEMBER_NAME)?.value === '1';
    return <SessionHeartbeat requireActivity={!remembered} />;
}

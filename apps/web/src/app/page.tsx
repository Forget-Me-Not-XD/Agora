// ========== Imports: ==========
import { redirect } from 'next/navigation';

/**
 * Root route — just bounce to the login page.
 * The middleware handles token-based redirects from there.
 */
export default function RootPage() {
  redirect('/login');
}

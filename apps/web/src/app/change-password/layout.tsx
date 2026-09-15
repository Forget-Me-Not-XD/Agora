// ========== Imports: ==========
import SessionKeepAlive from '@/components/SessionKeepAlive';

/**
 * /change-password val buite die dashboard layout, so dit kry nie daar 'n heartbeat nie.
 * Sonder een verval 'n sessie sonder onthou-my hier na 15 min, al is die gebruiker nog besig
 * om die vorm in te vul.
 */
export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SessionKeepAlive />
            {children}
        </>
    );
}

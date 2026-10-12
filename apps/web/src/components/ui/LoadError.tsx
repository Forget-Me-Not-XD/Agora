// ========== Imports: ==========
import { AlertCircle } from 'lucide-react';

/**
 * Vir 'n grafiek of lys waarvan die data nie gelaai het nie. Sonder dit lyk 'n mislukte versoek
 * soos goeie nuus: 'n leë lys sê "Alles lyk goed" en 'n ontbrekende syfer word 0%.
 */
export function LoadError({ what }: { what: string }) {
    return (
        <p className="flex items-center gap-2 text-sm text-[var(--color-red)]">
            <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
            Kon nie {what} laai nie. Herlaai die bladsy om weer te probeer.
        </p>
    );
}

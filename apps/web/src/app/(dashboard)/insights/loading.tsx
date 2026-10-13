// ========== Imports: ==========
import { Loader2 } from 'lucide-react';

/*
 * Next wys hierdie bladsy dadelik wanneer iemand na KI Insigte navigeer, terwyl die bediener nog
 * die geleenthede en sleutelbevindinge haal. Sonder dit bly die vorige bladsy staan tot alles klaar
 * is, en lyk dit of die klik in die sybalk niks gedoen het nie. Die vorm volg die werklike bladsy,
 * sodat niks rondspring wanneer die inhoud inkom nie.
 */

function Block({ className }: { className: string }) {
    return <div className={`rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse ${className}`} />;
}

export default function InsightsLoading() {
    return (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
            {/* Die opskrif is regte teks: die gebruiker sien dadelik op watter bladsy hy is */}
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">KI Insigte</h1>
                    <p className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)] mt-1">
                        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
                        Laai die insigte en sleutelbevindinge…
                    </p>
                </div>
            </div>

            {/* Modelstatus */}
            <Block className="h-20" />

            {/* Sleutelbevindinge */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Block className="h-28" />
                <Block className="h-28" />
                <Block className="h-28" />
                <Block className="h-28" />
            </div>

            {/* Voorspelde bywoning */}
            <Block className="h-48" />

            {/* Die drie syferkaarte */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Block className="h-24" />
                <Block className="h-24" />
                <Block className="h-24" />
            </div>

            {/* Beste en swakste bywoning */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Block className="h-56" />
                <Block className="h-56" />
            </div>
        </div>
    );
}

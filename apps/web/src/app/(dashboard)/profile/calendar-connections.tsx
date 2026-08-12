'use client';

// ========== Imports: ==========
import { useState } from 'react';
import {
    getGoogleCalendarConnectUrlAction,
    getMicrosoftCalendarConnectUrlAction,
    disconnectGoogleCalendarAction,
    disconnectMicrosoftCalendarAction,
} from '@/lib/actions/calendar.actions';
import type { CalendarStatus } from '@/lib/api/calendar';

interface Props {
    initialStatus: CalendarStatus;
}

export default function CalendarConnections({ initialStatus }: Props) {
    const [status, setStatus] = useState<CalendarStatus>(initialStatus);
    const [busy,   setBusy]   = useState<'google' | 'microsoft' | null>(null);
    const [error,  setError]  = useState<string | null>(null);

    async function handleConnectGoogle() {
        setBusy('google');
        setError(null);
        const url = await getGoogleCalendarConnectUrlAction();
        if (url) {
            window.location.href = url;
        } else {
            setError('Kon nie met Google Kalender koppel nie.');
            setBusy(null);
        }
    }

    async function handleConnectMicrosoft() {
        setBusy('microsoft');
        setError(null);
        const url = await getMicrosoftCalendarConnectUrlAction();
        if (url) {
            window.location.href = url;
        } else {
            setError('Kon nie met Outlook Kalender koppel nie.');
            setBusy(null);
        }
    }

    async function handleDisconnectGoogle() {
        setBusy('google');
        setError(null);
        const result = await disconnectGoogleCalendarAction();
        setBusy(null);
        if (result.error) {
            setError(result.error);
        } else {
            setStatus((prev) => ({ ...prev, google: false, googleAccountEmail: null }));
        }
    }

    async function handleDisconnectMicrosoft() {
        setBusy('microsoft');
        setError(null);
        const result = await disconnectMicrosoftCalendarAction();
        setBusy(null);
        if (result.error) {
            setError(result.error);
        } else {
            setStatus((prev) => ({ ...prev, microsoft: false, microsoftAccountEmail: null }));
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
                <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Google Kalender</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        {status.google ? `Gekoppel as ${status.googleAccountEmail}` : 'Nie gekoppel nie'}
                    </p>
                </div>
                {status.google ? (
                    <button
                        onClick={handleDisconnectGoogle}
                        disabled={busy === 'google'}
                        className="text-xs font-medium text-red-500 hover:opacity-80 disabled:opacity-50"
                    >
                        Ontkoppel
                    </button>
                ) : (
                    <button
                        onClick={handleConnectGoogle}
                        disabled={busy === 'google'}
                        className="rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium py-2 px-3 hover:opacity-90 disabled:opacity-50"
                    >
                        Koppel
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
                <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Outlook Kalender</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        {status.microsoft ? `Gekoppel as ${status.microsoftAccountEmail}` : 'Nie gekoppel nie'}
                    </p>
                </div>
                {status.microsoft ? (
                    <button
                        onClick={handleDisconnectMicrosoft}
                        disabled={busy === 'microsoft'}
                        className="text-xs font-medium text-red-500 hover:opacity-80 disabled:opacity-50"
                    >
                        Ontkoppel
                    </button>
                ) : (
                    <button
                        onClick={handleConnectMicrosoft}
                        disabled={busy === 'microsoft'}
                        className="rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-xs font-medium py-2 px-3 hover:opacity-90 disabled:opacity-50"
                    >
                        Koppel
                    </button>
                )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

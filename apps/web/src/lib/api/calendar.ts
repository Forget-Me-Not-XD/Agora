// ========== Imports: ==========

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface CalendarStatus {
    google:                 boolean;
    microsoft:               boolean;
    googleAccountEmail:      string | null;
    microsoftAccountEmail:   string | null;
}

export async function getCalendarStatus(token: string): Promise<CalendarStatus | null> {
    const res = await fetch(`${BASE_URL}/api/v1/calendar/status`, {
        headers: { Authorization: `Bearer ${token}` },
        cache:   'no-store',
    });

    if (!res.ok) return null;

    return res.json() as Promise<CalendarStatus>;
}

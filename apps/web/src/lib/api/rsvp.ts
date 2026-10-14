import { getToken } from '../session';
import { httpErrorMessage } from './http-error';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type RsvpStatus = 'BEVESTIG' | 'HANGENDE' | 'GEKANSELLEER';

// Rou RSVP-dokument soos die backend teruggee
export interface RsvpResponse {
    _id:                     string;
    event:                   string;
    user:                    string;
    status:                  RsvpStatus;
    qrPayload:               string;
    checkedIn:               boolean;
    checkedInAt:             string | null;
    googleCalendarEventId:   string | null;
    outlookCalendarEventId:  string | null;
    plusOneName?:            string;
    plusOneSurname?:         string;
    plusOneEmail?:           string;
    plusOneRsvpId?:          string;
    createdAt:               string;
    updatedAt:               string;
}

// Soos GET /api/v1/rsvp/my dit terugstuur: 'n rou, gepopuleerde Mongoose-dokument (nie 'n DTO nie)
export interface MyRsvpEvent {
    _id:                 string;
    title:               string;
    description:         string;
    date:                string;
    endDate?:             string;
    location:            string;
    address:             string;
    lat:                 number | null;
    lon:                 number | null;
    maxCapacity:         number;
    confirmedAttendees:  number;
    type:                string;
    intendedAttendance:  string;
}

export interface MyRsvp {
    _id:         string;
    event:       MyRsvpEvent | null;
    user:        string;
    status:      RsvpStatus;
    qrPayload:   string;
    checkedIn:   boolean;
    checkedInAt: string | null;
    paid:        boolean;
    payment:     string | null;
    plusOneName?:    string;
    plusOneSurname?: string;
    plusOneEmail?:   string;
    plusOneRsvpId?:  string;
    createdAt:   string;
    updatedAt:   string;
}

async function throwHttpError(res: Response): Promise<never> {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    throw new Error(httpErrorMessage(res, body));
}

// POST /api/v1/rsvp — 409 reeds ingeskryf, 409 vol bespreek, 400 ongeldige eventId
export interface CreateRsvpPlusOne {
    name:    string;
    surname: string;
    email:   string;
}

export async function createRsvp(eventId: string, plusOne?: CreateRsvpPlusOne): Promise<RsvpResponse> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/rsvp`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            eventId,
            plusOneName:    plusOne?.name,
            plusOneSurname: plusOne?.surname,
            plusOneEmail:   plusOne?.email,
        }),
        cache: 'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<RsvpResponse>;
}

// GET /api/v1/rsvp/my — die ingelogde gebruiker se eie RSVPs, met die geleentheid gepopuleer
export async function getMyRsvps(dateFrom?: string, dateTo?: string): Promise<MyRsvp[]> {
    const token = getToken();
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo)   params.set('dateTo', dateTo);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${BASE_URL}/api/v1/rsvp/my${query}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<MyRsvp[]>;
}

// DELETE /api/v1/rsvp/:id — kanselleer jou eie RSVP (204 No Content)
export async function cancelRsvp(rsvpId: string): Promise<void> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/rsvp/${rsvpId}`, {
        method:  'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
}

// GET /api/v1/rsvp/:id/qr — PNG-beeld, word server-kant na 'n base64 data-URI omgeskakel
export async function getRsvpQrDataUri(rsvpId: string): Promise<string> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/rsvp/${rsvpId}/qr`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);

    const arrayBuffer = await res.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
}

// Soos die backend se RsvpResponseDto dit stuur (GET /rsvp/event/:id en die inteken-roetes). 'n
// Plus-een en 'n walk-in het geen gebruiker nie, net 'n guestName.
export interface EventRsvp {
    id:            string;
    event:         string;
    user:          { id: string; name: string; surname: string; email: string; role: string } | null;
    guestName:     string | null;
    guestEmail:    string | null;
    status:        RsvpStatus;
    checkedIn:     boolean;
    checkedInAt:   string | null;
    paid:          boolean;
    primaryRsvpId: string | null;
    createdAt:     string;
}

// GET /api/v1/rsvp/event/:eventId — almal wat vir 'n geleentheid RSVP het (net admin of die skepper)
export async function getEventRsvps(eventId: string): Promise<EventRsvp[]> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/rsvp/event/${eventId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<EventRsvp[]>;
}

// PATCH /api/v1/rsvp/:id/check-in — teken iemand by die deur in sonder om hul QR-kode te skandeer
export async function checkInRsvp(rsvpId: string): Promise<EventRsvp> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/rsvp/${rsvpId}/check-in`, {
        method:  'PATCH',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<EventRsvp>;
}

// POST /api/v1/rsvp/walk-in — iemand wat sonder 'n RSVP opdaag; word dadelik ingeteken
export async function registerWalkIn(eventId: string, guestName: string): Promise<EventRsvp> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/rsvp/walk-in`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:  JSON.stringify({ eventId, guestName }),
        cache: 'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<EventRsvp>;
}

import { apiClient } from "./client";

export type RsvpStatus = 'BEVESTIG' | 'HANGENDE' | 'GEKANSELLEER';

export interface PopulatedEvent {
    _id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    address: string;
    lat: number | null;
    lon: number | null;
    maxCapacity: number;
    confirmedAttendees: number;
    createdAt: string;
    updatedAt: string;
}

// Rou RSVP-dokument
export interface RsvpResponse {
    _id: string;
    event: string;
    user: string;
    status: RsvpStatus;
    qrPayload: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    plusOneName?: string;
    plusOneSurname?: string;
    plusOneEmail?: string;
    plusOneRsvpId?: string;
    createdAt: string;
    updatedAt: string;
}

// GET /rsvp/my gee elke RSVP met die volledige geleentheid ingesluit
export interface RsvpWithEvent extends Omit<RsvpResponse, 'event'> {
    event: PopulatedEvent;
}

// Skryf die aangemelde gebruiker in vir 'n geleentheid
// POST /rsvp -- 409 - alreeds ingeskryf, 409 - vol bespreek
export interface CreateRsvpPayload {
    eventId: string;
    plusOneName?: string;
    plusOneSurname?: string;
    plusOneEmail?: string;
}

export async function createRsvp(
    eventId: string,
    plusOne?: { name: string; surname: string; email: string },
): Promise<RsvpResponse> {
    return apiClient.post<RsvpResponse, CreateRsvpPayload>('/rsvp', {
        eventId,
        plusOneName: plusOne?.name,
        plusOneSurname: plusOne?.surname,
        plusOneEmail: plusOne?.email,
    });
}

// GET /rsvp/my - al die gebruiker se RSVP's, opsioneel gefiltreer op datumreeks
export async function getMyRsvps(dateFrom?: string, dateTo?: string): Promise<RsvpWithEvent[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<RsvpWithEvent[]>(`/rsvp/my${query}`);
}

// DELETE /rsvp/:id - status -> GEKANSELLEER -> 204
export async function cancelRsvp(rsvpId: string): Promise<void> {
    return apiClient.delete<void>(`/rsvp/${rsvpId}`);
}

// GET /rsvp/:id/qr
export async function getRsvpQrDataUri(rsvpId: string): Promise<string> {
    return apiClient.getImageDataUri(`/rsvp/${rsvpId}/qr`);
}

// POST /rsvp/scan -- personeel skandeer 'n gas se QR-kode om in te check
// 404 - ongeldige lading, 409 - gas reeds ingecheck, rol-beperk tot ADMIN/DOSENT
export interface ScanResult {
    guestName: string;
    eventTitle: string;
    eventDate: string;
}

export async function scanQr(qrPayload: string): Promise<ScanResult> {
    return apiClient.post<ScanResult, { qrPayload: string }>('/rsvp/scan', { qrPayload });
}

// GET /rsvp/event/:eventId -- ADMIN/DOSENT-only, elke RSVP vir 'n gegewe geleentheid.
// Let wel: hierdie roete loop deur RsvpResponseDto (velde: `id`), anders as
// /rsvp/my hierbo wat rou Mongoose-dokumente (velde: `_id`) teruggee.
export interface RsvpEventUser {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: string;
}

// `user` is null vir 'n walk-in (iemand sonder 'n rekening wat ter plekke geregistreer is) --
// gebruik dan `guestName` om die gas te wys.
export interface RsvpWithUser {
    id: string;
    event: string;
    user: RsvpEventUser | null;
    guestName: string | null;
    status: RsvpStatus;
    qrPayload: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    guestEmail: string | null;
    plusOneName: string | null;
    plusOneSurname: string | null;
    plusOneEmail: string | null;
    plusOneRsvpId: string | null;
    primaryRsvpId: string | null;
    createdAt: string;
}

export async function getEventRsvps(eventId: string): Promise<RsvpWithUser[]> {
    return apiClient.get<RsvpWithUser[]>(`/rsvp/event/${eventId}`);
}

// PATCH /rsvp/:id/check-in -- ADMIN/DOSENT-only, teken 'n gas direk in sonder QR-skandering
export async function checkInRsvp(rsvpId: string): Promise<RsvpWithUser> {
    return apiClient.patch<RsvpWithUser>(`/rsvp/${rsvpId}/check-in`);
}

// POST /rsvp/walk-in -- ADMIN/DOSENT-only, registreer + teken dadelik in iemand sonder RSVP
export async function registerWalkIn(eventId: string, guestName: string): Promise<RsvpWithUser> {
    return apiClient.post<RsvpWithUser, { eventId: string; guestName: string }>('/rsvp/walk-in', {
        eventId,
        guestName,
    });
}
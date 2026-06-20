import { apiClient } from "./client";

export type RsvpStatus = 'BEVESTIG' | 'HANGENDE' | 'GEKANSELLEER';

export interface PopulatedEvent {
    _id: string;
    title: string;
    description: string;
    date: string;
    location: string;
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
    createdAt: string;
    updatedAt: string;
}

// GET /rsvp/my gee elke RSVP met die volledige geleentheid ingesluit
export interface RsvpWithEvent extends Omit<RsvpResponse, 'event'> {
    event: PopulatedEvent;
}

// Skryf die aangemelde gebruiker in vir 'n geleentheid
// POST /rsvp -- 409 - alreeds ingeskryf, 409 - vol bespreek
export async function createRsvp(eventId: string): Promise<RsvpResponse> {
    return apiClient.post<RsvpResponse, { eventId: string }>('/rsvp', { eventId });
}

// GET /rsvp/my - al die gebruiker se RSVP's
export async function getMyRsvps(): Promise<RsvpWithEvent[]> {
    return apiClient.get<RsvpWithEvent[]>('/rsvp/my');
}

// DELETE /rsvp/:id - status -> GEKANSELLEER -> 204
export async function cancelRsvp(rsvpId: string): Promise<void> {
    return apiClient.delete<void>(`/rsvp/${rsvpId}`);
}

// GET /rsvp/:id/qr
export async function getRsvpQrDataUri(rsvpId: string): Promise<string> {
    return apiClient.getImageDataUri(`/rsvp/${rsvpId}/qr`);
}
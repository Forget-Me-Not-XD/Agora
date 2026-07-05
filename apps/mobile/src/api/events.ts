import { apiClient } from './client';

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  maxCapacity: number;
  confirmedAttendees: number;
  createdBy: string;      // skepper se gebruiker-ID
  photographerIds: string[];
  photographerBrief: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  date: string;
  location: string;
  maxCapacity: number;
  budget?: number;
}

/**
 * Haal alle geleenthede van die backend.
 * Opsioneel: stuur 'from' en 'to' as ISO-datumstrings om
 * slegs geleenthede binne 'n datumreeks te kry.
 *
 * GET /events
 * GET /events?from=2026-01-01&to=2026-12-31
 */
export async function listEvents(from?: string, to?: string): Promise<EventResponse[]> {
  let path = '/events';

  if (from && to) {
    path += `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }

  return apiClient.get<EventResponse[]>(path);
}

/**
 * Skep 'n nuwe geleentheid.
 * Slegs DOSENT- en ADMIN-gebruikers het toestemming —
 * die backend stuur outomaties 403 as die rol verkeerd is.
 *
 * POST /events
 */
export async function createEvent(payload: CreateEventPayload): Promise<EventResponse> {
  return apiClient.post<EventResponse, CreateEventPayload>('/events', payload);
}

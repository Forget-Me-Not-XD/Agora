import type { RsvpStatus } from '@/lib/api/rsvp';
import type { Tone } from '@/components/ui/Pill';

export const RSVP_STATUS_LABEL: Record<RsvpStatus, string> = {
    BEVESTIG:     'Bevestig',
    HANGENDE:     'Hangende',
    GEKANSELLEER: 'Gekanselleer',
};

export const RSVP_STATUS_TONE: Record<RsvpStatus, Tone> = {
    BEVESTIG:     'green',
    HANGENDE:     'yellow',
    GEKANSELLEER: 'red',
};

export function buildMapsUrl(lat: number | null | undefined, lon: number | null | undefined): string | null {
    if (lat == null || lon == null) return null;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

export function fullName(name?: string | null, surname?: string | null): string {
    return [name, surname].filter(Boolean).join(' ');
}

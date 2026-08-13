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

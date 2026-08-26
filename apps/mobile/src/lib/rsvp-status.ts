import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';
import type { RsvpStatus } from '../api/rsvp';

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
    BEVESTIG: 'Bevestig',
    HANGENDE: 'Hangende',
    GEKANSELLEER: 'Gekanselleer',
};

export const RSVP_STATUS_ICONS: Record<RsvpStatus, ComponentProps<typeof Feather>['name']> = {
    BEVESTIG: 'check-circle',
    HANGENDE: 'clock',
    GEKANSELLEER: 'x-circle',
};

const RSVP_STATUS_COLORS: Record<RsvpStatus, { bg: string; text: string }> = {
    BEVESTIG: { bg: '#D1FAE5', text: '#065F46' },
    HANGENDE: { bg: '#FEF3C7', text: '#92400E' },
    GEKANSELLEER: { bg: '#FEE2E2', text: '#991B1B' },
};

const RSVP_STATUS_COLORS_DARK: Record<RsvpStatus, { bg: string; text: string }> = {
    BEVESTIG: { bg: '#064E3B', text: '#6EE7B7' },
    HANGENDE: { bg: '#78350F', text: '#FCD34D' },
    GEKANSELLEER: { bg: '#450A0A', text: '#FCA5A5' },
};

export function getRsvpStatusColors(status: RsvpStatus, isDark: boolean): { bg: string; text: string } {
    return isDark ? RSVP_STATUS_COLORS_DARK[status] : RSVP_STATUS_COLORS[status];
}

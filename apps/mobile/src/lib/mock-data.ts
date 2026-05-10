export type UserRole = 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS';
export type EventType = 'public' | 'internal_student' | 'private' | 'department';
export type EventStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled';

export interface MockEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  type: EventType;
  status: EventStatus;
  createdBy: string;
  invitedUsers: string[];
  capacity: number;
  registered: number;
  noShows: number;
  forecast: number;
  forecastLow: number;
  forecastHigh: number;
  forecastConfidence: number;
  budget: number;
  studyCenter: string;
}

export interface MockRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: 'bevestig' | 'hangende' | 'gekanselleer';
  checkedIn: boolean;
  dietary: string | null;
  registeredAt: string;
}

export interface MockCheckIn {
  id: string;
  name: string;
  eventId: string;
  status: 'bevestig' | 'hangende';
  dietary: string | null;
  checkedInAt: string;
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: 'event-1',
    title: 'Glasieklink 2026',
    description: 'Die jaarlikse glasieklink geleentheid vier studente se prestasies met musiek, kuns en kultuur.',
    date: '2026-03-15',
    time: '18:00',
    endTime: '22:00',
    location: 'Hoofsaal',
    type: 'public',
    status: 'upcoming',
    createdBy: 'user-1',
    invitedUsers: [],
    capacity: 130,
    registered: 87,
    noShows: 14,
    forecast: 73,
    forecastLow: 65,
    forecastHigh: 81,
    forecastConfidence: 84,
    budget: 12500,
    studyCenter: 'Centurion - Leriba',
  },
  {
    id: 'event-2',
    title: 'Graadplegtigheid Q1',
    description: 'Kwartaallikse graadplegtigheid vir studente wat hul kwalifikasies voltooi het.',
    date: '2026-03-22',
    time: '10:00',
    endTime: '14:00',
    location: 'Groot Saal',
    type: 'public',
    status: 'upcoming',
    createdBy: 'user-2',
    invitedUsers: ['user-3', 'user-4'],
    capacity: 350,
    registered: 215,
    noShows: 17,
    forecast: 198,
    forecastLow: 185,
    forecastHigh: 211,
    forecastConfidence: 88,
    budget: 35000,
    studyCenter: 'Centurion - Leriba',
  },
  {
    id: 'event-3',
    title: 'Besigheids Middagete',
    description: 'Netwerk middag vir besigheidstudente en dosente.',
    date: '2026-03-18',
    time: '12:30',
    endTime: '14:30',
    location: 'Eetsaal',
    type: 'internal_student',
    status: 'upcoming',
    createdBy: 'user-2',
    invitedUsers: ['user-3'],
    capacity: 60,
    registered: 38,
    noShows: 4,
    forecast: 34,
    forecastLow: 29,
    forecastHigh: 39,
    forecastConfidence: 79,
    budget: 5500,
    studyCenter: 'Centurion - Leriba',
  },
  {
    id: 'event-4',
    title: 'Kultuur aand',
    description: 'Jaarlikse kultuurviering met verskeie optredes en kunswerke.',
    date: '2026-02-10',
    time: '19:00',
    endTime: '22:00',
    location: 'Amfiteater',
    type: 'public',
    status: 'past',
    createdBy: 'user-1',
    invitedUsers: [],
    capacity: 200,
    registered: 98,
    noShows: 7,
    forecast: 91,
    forecastLow: 82,
    forecastHigh: 100,
    forecastConfidence: 81,
    budget: 18000,
    studyCenter: 'Centurion - Leriba',
  },
  {
    id: 'event-5',
    title: 'Departementale Strategie-sessie',
    description: 'Kwartaallikse beplanning vir die dosente-span.',
    date: '2026-03-28',
    time: '09:00',
    endTime: '12:00',
    location: 'Vergadersaal B',
    type: 'department',
    status: 'upcoming',
    createdBy: 'user-1',
    invitedUsers: ['user-2'],
    capacity: 20,
    registered: 12,
    noShows: 0,
    forecast: 11,
    forecastLow: 9,
    forecastHigh: 13,
    forecastConfidence: 91,
    budget: 5000,
    studyCenter: 'Centurion - Leriba',
  },
  {
    id: 'event-6',
    title: 'GAS Verwelkomingsfunksie',
    description: 'Spesiale geleentheid vir GAS-lede om te netwerk en nuwe vriende te maak.',
    date: '2026-04-05',
    time: '14:00',
    endTime: '17:00',
    location: 'Geselligheidsarea',
    type: 'private',
    status: 'upcoming',
    createdBy: 'user-2',
    invitedUsers: ['user-4'],
    capacity: 50,
    registered: 34,
    noShows: 0,
    forecast: 32,
    forecastLow: 28,
    forecastHigh: 36,
    forecastConfidence: 76,
    budget: 8000,
    studyCenter: 'Paarl',
  },
];

export const MOCK_RSVPS: MockRsvp[] = [
  {
    id: 'rsvp-1',
    eventId: 'event-1',
    userId: 'user-3',
    status: 'bevestig',
    checkedIn: false,
    dietary: null,
    registeredAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'rsvp-2',
    eventId: 'event-2',
    userId: 'user-3',
    status: 'bevestig',
    checkedIn: false,
    dietary: 'Vegetaries',
    registeredAt: '2026-03-05T14:30:00Z',
  },
  {
    id: 'rsvp-3',
    eventId: 'event-4',
    userId: 'user-3',
    status: 'bevestig',
    checkedIn: true,
    dietary: null,
    registeredAt: '2026-02-01T09:00:00Z',
  },
];

export const MOCK_CHECK_INS: MockCheckIn[] = [
  { id: 'ci-1', name: 'Anri Botha', eventId: 'event-1', status: 'bevestig', dietary: null, checkedInAt: '2026-03-15T18:05:00Z' },
  { id: 'ci-2', name: 'Pieter van der Merwe', eventId: 'event-1', status: 'bevestig', dietary: 'Vegan', checkedInAt: '2026-03-15T18:08:00Z' },
  { id: 'ci-3', name: 'Zanele Dlamini', eventId: 'event-1', status: 'bevestig', dietary: null, checkedInAt: '2026-03-15T18:12:00Z' },
];

export const MONTHS_AF = [
  'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
  'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

export const MONTHS_SHORT_AF = [
  'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatEventDate(dateStr: string): { day: string; month: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { day: String(day), month: MONTHS_SHORT_AF[month - 1] };
}

export function formatFullDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTHS_AF[month - 1]} ${year}`;
}

export const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: 'Aankomend',
  ongoing: 'Aan die gang',
  past: 'Voltooi',
  cancelled: 'Gekanselleer',
};

export const TYPE_LABELS: Record<EventType, string> = {
  public: 'Publiek',
  internal_student: 'Intern - Student',
  private: 'Privaat',
  department: 'Departement',
};
export type UserRole = 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';
export type EventType = 'public' | 'internal_student' | 'private' | 'department';
export type EventStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled';

export interface MockUser {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: UserRole;
    studyCenter: string;
    isActive: boolean;
    title?: string;
}

export interface MockEvent {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    type: EventType;
    status: EventStatus;
    createdBy: string;
    invitedUsers: string[];
    capacity: number;
    registered: number;
    budget: number;
    studyCenter: string;
}

export interface BudgetItem {
    id: string;
    eventId: string;
    category: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
}

export interface Insight {
    eventId: string;
    totalRegistered: number;
    totalAttended: number;
    attendanceRate: number;
    feedback: string[];
    averageRating: number;
}

export const MOCK_CURRENT_USER: MockUser = {
    id: 'user-1',
    name: 'Admin',
    surname: 'Gebruiker',
    email: 'admin@span.ac.za',
    role: 'ADMIN',
    studyCenter: 'Centurion - Leriba',
    isActive: true,
};

export const MOCK_USERS: MockUser[] = [
    MOCK_CURRENT_USER,
    {
        id: 'user-2',
        name: 'Johan',
        surname: 'Visser',
        email: 'j.visser@span.ac.za',
        role: 'DOSENT',
        studyCenter: 'Centurion - Leriba',
        isActive: true,
    },
    {
        id: 'user-3',
        name: 'Sarah',
        surname: 'Botha',
        email: 's.botha@student.span.ac.za',
        role: 'STUDENT',
        studyCenter: 'Centurion - Leriba',
        isActive: true,
    },
    {
        id: 'user-4',
        name: 'Thabo',
        surname: 'Nkosi',
        email: 't.nkosi@span.ac.za',
        role: 'GAS',
        studyCenter: 'Paarl',
        isActive: true,
    },
    {
        id: 'user-5',
        name: 'Marie',
        surname: 'Du Plessis',
        email: 'm.duplessis@span.ac.za',
        role: 'DOSENT',
        studyCenter: 'George',
        isActive: false,
    },
];

export const MOCK_EVENTS: MockEvent[] = [
    {
        id: 'event-1',
        title: 'Jaarlikse Akademiese Fees',
        description: 'Die jaarlikse akademiese fees vier die prestasies van ons studente en personeel.',
        date: '2026-06-15',
        time: '10:00',
        location: 'Hoofterrein, Centurion',
        type: 'public',
        status: 'upcoming',
        createdBy: 'user-2',
        invitedUsers: ['user-3', 'user-4'],
        capacity: 300,
        registered: 187,
        budget: 45000,
        studyCenter: 'Centurion - Leriba',
    },
    {
        id: 'event-2',
        title: 'Student Orienteringsdag',
        description: 'Verwelkom nuwe studente en help hulle om die kampus te verken.',
        date: '2026-06-20',
        time: '08:00',
        location: 'Ontvangsgebou',
        type: 'internal_student',
        status: 'upcoming',
        createdBy: 'user-2',
        invitedUsers: ['user-3'],
        capacity: 150,
        registered: 142,
        budget: 12000,
        studyCenter: 'Centurion - Leriba',
    },
    {
        id: 'event-3',
        title: 'Departementale Strategie-sessie',
        description: 'Kwartaallikse beplanning vir die dosente-span.',
        date: '2026-06-25',
        time: '09:00',
        location: 'Vergadersaal B',
        type: 'department',
        status: 'upcoming',
        createdBy: 'user-1',
        invitedUsers: ['user-2', 'user-5'],
        capacity: 20,
        registered: 12,
        budget: 5000,
        studyCenter: 'Centurion - Leriba',
    },
    {
        id: 'event-4',
        title: 'GAS Verwelkomingsfunksie',
        description: 'Spesiale geleentheid vir GAS-lede om te netwerk.',
        date: '2026-07-02',
        time: '14:00',
        location: 'Geselligheidsarea',
        type: 'private',
        status: 'upcoming',
        createdBy: 'user-2',
        invitedUsers: ['user-4'],
        capacity: 50,
        registered: 34,
        budget: 8000,
        studyCenter: 'Paarl',
    },
    {
        id: 'event-5',
        title: 'Kultuurweek Openingsaand',
        description: 'Vier ons diverse kultuur met musiek, kos en dans.',
        date: '2026-07-10',
        time: '18:00',
        location: 'Buiteamfiteater',
        type: 'public',
        status: 'upcoming',
        createdBy: 'user-5',
        invitedUsers: [],
        capacity: 500,
        registered: 312,
        budget: 75000,
        studyCenter: 'George',
    },
    {
        id: 'event-6',
        title: 'IT Werkswinkels vir Studente',
        description: 'Praktiese vaardighede werkswinkels vir IT-studente.',
        date: '2026-05-05',
        time: '10:00',
        location: 'Rekenaarlab 3',
        type: 'internal_student',
        status: 'past',
        createdBy: 'user-2',
        invitedUsers: ['user-3'],
        capacity: 40,
        registered: 38,
        budget: 3500,
        studyCenter: 'Centurion - Leriba',
    },
];

export const MOCK_BUDGET_ITEMS: BudgetItem[] = [
    { id: 'b-1', eventId: 'event-1', category: 'Venue', description: 'Terrein huur', amount: 15000, type: 'expense' },
    { id: 'b-2', eventId: 'event-1', category: 'Catering', description: 'Spys en drank', amount: 20000, type: 'expense' },
    { id: 'b-3', eventId: 'event-1', category: 'Marketing', description: 'Pamflette en baniere', amount: 5000, type: 'expense' },
    { id: 'b-4', eventId: 'event-1', category: 'Borgskappe', description: 'Korporatiewe borgskappe', amount: 25000, type: 'income' },
    { id: 'b-5', eventId: 'event-1', category: 'Inskrywingsgeld', description: 'Deelnemer inskrywingsgeld', amount: 9400, type: 'income' },
    { id: 'b-6', eventId: 'event-2', category: 'Materiaal', description: 'Orientasie pakkette', amount: 7100, type: 'expense' },
    { id: 'b-7', eventId: 'event-2', category: 'Catering', description: 'Verwelkoming tee', amount: 4900, type: 'expense' },
    { id: 'b-8', eventId: 'event-2', category: 'Beurse', description: 'Departementale beurs', amount: 12000, type: 'income' },
    { id: 'b-9', eventId: 'event-5', category: 'Venue', description: 'Amfiteater opstelling', amount: 20000, type: 'expense' },
    { id: 'b-10', eventId: 'event-5', category: 'Vermaak', description: 'Kunstenaars en toerusting', amount: 35000, type: 'expense' },
    { id: 'b-11', eventId: 'event-5', category: 'Catering', description: 'Kosverskaffers', amount: 15000, type: 'expense' },
    { id: 'b-12', eventId: 'event-5', category: 'Kaartjies', description: 'Kaartjie verkope', amount: 62400, type: 'income' },
    { id: 'b-13', eventId: 'event-5', category: 'Borgskappe', description: 'Plaaslike borgskappe', amount: 15000, type: 'income' },
];

export const MOCK_INSIGHTS: Insight[] = [
    {
        eventId: 'event-6',
        totalRegistered: 38,
        totalAttended: 35,
        attendanceRate: 92,
        feedback: [
        'Uitstekende praktiese sessie',
        'Meer tyd benodig vir oefening',
        'Fasiliteerder was baie behulpsaam',
    ],
    averageRating: 4.3,
    },
    {
        eventId: 'event-1',
        totalRegistered: 187,
        totalAttended: 0,
        attendanceRate: 0,
        feedback: [],
        averageRating: 0,
    },
];

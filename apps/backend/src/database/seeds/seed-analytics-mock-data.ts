/**
 * seed-analytics-mock-data.ts
 *
 * Inserts ~120 synthetic historical university events with their RSVP
 * attendance records and reviews into MongoDB. The set is deliberately small
 * enough for the dashboards to stay readable and explainable, while keeping
 * the same patterns so the LSTM model still has credible training data.
 *
 * Patterns baked into the data:
 *   • South African academic calendar
 *       - February (orientation week): 85-95% fill rate
 *       - Exam months (May, Oct, Nov): 20-35% fill rate
 *       - Summer/winter vacation (Dec, Jan, Jun): very few events, low fill
 *   • Day-of-week effect
 *       - Fridays and Saturdays: highest attendance
 *       - Mondays and Sundays: lowest attendance
 *   • Venue capacity dampening
 *       - Small venues (<50 pax): fill 10% higher than average
 *       - Very large venues (>500 pax): fill 40% lower than average
 *   • Advance-notice effect
 *       - Events planned 45+ days ahead: fill 12% higher
 *       - Events created < 7 days before: fill 35% lower
 *   • No-show rates
 *       - Exam periods and vacations: up to 35-40% no-show
 *       - Orientation week and well-promoted events: 5-10% no-show
 *   • Gaussian noise (±8% fill, ±5% no-show) so patterns are learnable but
 *     not trivially deterministic
 *   • Event type follows venue size
 *       - Small venues lean PRIVATE / DEPARTMENT, large venues lean PUBLIC
 *   • Budget scales with capacity (rand per seat differs per event type)
 *   • Reviews
 *       - ~40% of checked-in attendees leave a review
 *       - Scores (0-5) per DEFAULT_REVIEW_CATEGORIES rise with the fill rate
 *       - ~20% of reviews carry a short Afrikaans comment
 *       - ratingAvg / ratingCount are stored on every event
 *
 * Volume: ~120 events × Oct 2023 → Sep 2026 (36 months, 40 events per year)
 *         1 000 student users + 5 dosents + 1 admin
 *         ~7 000–10 000 RSVP documents, ~2 000–3 500 reviews
 *         No event is ever scheduled after the moment the script runs.
 *
 * Run from apps/backend/:
 *   npx ts-node src/database/seeds/seed-analytics-mock-data.ts
 *   npx ts-node src/database/seeds/seed-analytics-mock-data.ts --reset
 *
 * Idempotent: without --reset, re-running is a no-op if the sentinel admin
 * (seed-analytics-admin@akademia.ac.za) already exists.
 * --reset removes ONLY this script's own data first (the sentinel admin,
 * the dosent.seed.* / student.seed.* users, and the events, RSVPs and
 * reviews that belong to them) and then seeds again. Data from
 * seed-demo-data.ts and real users is never touched.
 */

import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { EventType } from '../../common/enums/event-type.enum';
import { DEFAULT_REVIEW_CATEGORIES } from '../../common/constants/review-categories';

// ── Environment loading ────────────────────────────────────────────────────────
// We parse the root .env manually so this script has zero extra dependencies
// beyond what the backend already installs. dotenv is not in package.json.
const ENV_PATH = path.resolve(__dirname, '../../../../../.env');
if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, 'utf-8').split(/\r?\n/)) {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["']|["']$/g, ''); // strip optional quotes
            if (!process.env[key]) process.env[key] = val;
        }
    }
}

// ── MongoDB connection ─────────────────────────────────────────────────────────
let mongoUri = process.env.MONGO_URI ?? '';
if (!mongoUri) {
    console.error('MONGO_URI is not set. Ensure .env exists at the repo root.');
    process.exit(1);
}
// The .env uses the Docker Compose service hostname "mongodb". When this script
// runs on the host machine (outside a container), that hostname won't resolve —
// replace it with localhost so we hit the mapped port 27017.
if (mongoUri.includes('@mongodb:')) {
    mongoUri = mongoUri.replace('@mongodb:', '@localhost:');
    console.log('ℹ  Replaced Docker hostname "mongodb" → "localhost".\n');
}

// ── Academic calendar: how many events to generate per month ──────────────────
// Sums to 40 events per year × 3 years = 120 total.
const EVENTS_PER_MONTH: Record<number, number> = {
    1:  1,
    2:  7,
    3:  6,
    4:  5,
    5:  2,
    6:  1,
    7:  3,
    8:  6,
    9:  5,
    10: 2,
    11: 1,
    12: 1,
};

// ── Fill-rate pattern factors ──────────────────────────────────────────────────
// The final fill rate for an event is:
//   clamp( MONTH_FILL × DOW_FILL × capacityFactor × advanceFactor + noise, 0.03, 0.98 )
// Each factor is a multiplier; they compound.

const MONTH_FILL: Record<number, number> = {
    1: 0.25,  2: 0.90,  3: 0.75,  4: 0.68,
    5: 0.35,  6: 0.20,  7: 0.48,  8: 0.72,
    9: 0.65, 10: 0.32, 11: 0.22, 12: 0.15,
};

// 0 = Sunday … 6 = Saturday
const DOW_FILL: Record<number, number> = {
    0: 0.72,  // Sunday    – lowest attendance
    1: 0.82,  // Monday
    2: 0.88,  // Tuesday
    3: 0.92,  // Wednesday
    4: 0.95,  // Thursday
    5: 1.15,  // Friday    – peak: social energy, end of week
    6: 1.05,  // Saturday
};

// Larger venues fill proportionally less (harder to pack 600 seats than 60)
function capacityFillFactor(cap: number): number {
    if (cap <  50) return 1.10;
    if (cap < 100) return 1.00;
    if (cap < 200) return 0.90;
    if (cap < 400) return 0.78;
    return 0.60;
}

// More advance notice → more promotion time → higher fill
function advanceFillFactor(daysAhead: number): number {
    if (daysAhead >= 45) return 1.12;
    if (daysAhead >= 21) return 1.00;
    if (daysAhead >=  7) return 0.85;
    return 0.65;
}

// Bursary/stipend payment cycle: NSFAS and most SA university allowances pay
// out in the first week of the month. Disposable income - and willingness to
// attend optional/paid events - measurably tapers off toward month-end as
// students budget-stretch. A real, documented pattern, kept modest in scale
// so it doesn't dominate the existing month/day/capacity/advance-notice effects.
function domFillFactor(dayOfMonth: number): number {
    if (dayOfMonth <= 7)  return 1.12;   // early month - flush with cash
    if (dayOfMonth <= 21) return 1.00;   // mid-month - neutral
    return 0.88;                          // late month - budgets tightening
}

function domNoShowFactor(dayOfMonth: number): number {
    if (dayOfMonth <= 7)  return -0.02;  // early month - people follow through
    if (dayOfMonth <= 21) return  0.00;
    return  0.04;                         // late month - RSVP'd but can't always afford to show
}

// ── No-show rate pattern factors ───────────────────────────────────────────────
// No-show rate = fraction of RSVP'd attendees who don't actually show up.
// Final rate = clamp( MONTH_NOSHOW + capacityNoShowFactor + noise, 0.03, 0.45 )

const MONTH_NOSHOW: Record<number, number> = {
    1: 0.30,  2: 0.08,  3: 0.15,  4: 0.18,
    5: 0.30,  6: 0.35,  7: 0.22,  8: 0.16,
    9: 0.18, 10: 0.28, 11: 0.32, 12: 0.38,
};

// Bigger events: each individual feels less essential → slightly higher no-show
function capacityNoShowFactor(cap: number): number {
    if (cap <  50) return -0.05;
    if (cap < 150) return  0.00;
    if (cap < 400) return  0.05;
    return 0.10;
}

// ── Utility helpers ────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

// Box-Muller transform: returns one N(0, scale) sample
function noise(scale: number): number {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * scale;
}

// Random event datetime within a given calendar month, between 09:00 and 19:00
function randomEventDate(year: number, month: number): Date {
    const daysInMonth = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, randInt(1, daysInMonth), randInt(9, 19), 0, 0);
}

// Partial Fisher-Yates: pick `count` unique random indices from [0, total).
// O(count) — much faster than sorting the full array, critical for large events.
function pickUniqueIndices(total: number, count: number): number[] {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (total - i));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
}

function randomCapacity(): number {
    const r = Math.random();
    if (r < 0.40) return randInt(20,  80);   // 40% small
    if (r < 0.75) return randInt(80,  200);  // 35% medium
    if (r < 0.95) return randInt(200, 500);  // 20% large
    return randInt(500, 950);                 //  5% very large
}

// ── Static fixture data ────────────────────────────────────────────────────────

const EVENT_TITLES = [
    'Oriëntasieweek: Verwelkoming vir Eerstejaars',
    'Dosente Onthaal en Studenteverwelkoming',
    'Kampus Rondleiding vir Nuwe Studente',
    'Fakulteitsverwelkoming – Wetenskap en Tegnologie',
    'Eerstejaars Sosiaal: Leer Jou Kampus Ken',
    'Gaslesing: Toekomstige Tendense in Kunsmatige Intelligensie',
    'Dept. Informatika Navorsingsimposium',
    'Finale Jaar Projekpresentasies',
    'Postgraduaat Navorsingsdag',
    'Interdepartementele Wetenskapsfees',
    'Wiskunde Olimpiad Voorbereidingsessie',
    'Etiese Implikasies van Groot Data – Openbare Lesing',
    'Loopbaandag: Korporatiewe Ontmoetingsgeleentheid',
    'CV-Skryf en Onderhoudvaardighede Werkswinkel',
    'Ondernemer Netwerkaand',
    'Alumni Terugkoms en Netwerkaand',
    'Beurse en Finansiering Inligtingsessie',
    'Jaareinde Sportsgala',
    'Interuniversitêre Kultuuruitruiling',
    'Studenteraad Debatskompetisie',
    'Sang- en Dansvertoning: Talentekompetisie',
    'Internasionale Kos- en Kultuurfees',
    'Kwisaand met Studenteraad',
    'Kampusbraaifees en Sosiale Byeenkoms',
    'Studenteraad Verkiesings',
    'Jaarlikse Algemene Vergadering – Studenteraad',
    'Taalbeleid Inligtingsessie',
    'Kampusveiligheid Bewusmakingsforum',
    'Wellness Dag: Studente Geestesgesondheid',
    'Jaarlikse Atletiekdag',
    'Interafdeling Rugbytoernooi',
    'Universiteit Jaarlikse Hardloopkompetisie',
];

const LOCATIONS = [
    'Saal A – Hoofgebou',
    'Saal B – Hoofgebou',
    'Konferensiesaal – Administratiewe Blok',
    'Studentesentrum Hoofsal',
    'Amfiteater – Buitelug',
    'Biblioteek Multimediasaal',
    'Sportskompleks – Hoofveld',
    'Kuns- en Kultuursaal',
    'E-Leersaal 101',
    'Rektorate Vergadersaal',
];

const RESET = process.argv.includes('--reset');

const SEED_ADMIN_EMAIL = 'seed-analytics-admin@akademia.ac.za';

const LEGACY_SEED_ADMIN = {
    email: 'seed-admin@akademia.ac.za',
    name: 'Saad',
    surname: 'Administrateur',
};

const SEED_SENTINEL_FILTER = {
    $or: [{ email: SEED_ADMIN_EMAIL }, LEGACY_SEED_ADMIN],
};

const SEED_USER_FILTER = {
    $or: [
        { email: SEED_ADMIN_EMAIL },
        LEGACY_SEED_ADMIN,
        { email: /^dosent\.seed\.\d+@akademia\.ac\.za$/ },
        { email: /^student\.seed\.\d+@studs\.akademia\.ac\.za$/ },
    ],
};

const REVIEW_SHARE = 0.40;
const COMMENT_SHARE = 0.20;
const REVIEW_WINDOW_HOURS = 14 * 24;

function eventTypeWeights(cap: number): [EventType, number][] {
    if (cap < 80) {
        return [
            [EventType.PRIVATE, 0.25],
            [EventType.DEPARTMENT, 0.35],
            [EventType.INTERNAL_STUDENT, 0.30],
            [EventType.PUBLIC, 0.10],
        ];
    }
    if (cap < 200) {
        return [
            [EventType.PRIVATE, 0.10],
            [EventType.DEPARTMENT, 0.25],
            [EventType.INTERNAL_STUDENT, 0.40],
            [EventType.PUBLIC, 0.25],
        ];
    }
    return [
        [EventType.PRIVATE, 0.00],
        [EventType.DEPARTMENT, 0.10],
        [EventType.INTERNAL_STUDENT, 0.35],
        [EventType.PUBLIC, 0.55],
    ];
}

function pickEventType(cap: number): EventType {
    let roll = Math.random();
    for (const [type, weight] of eventTypeWeights(cap)) {
        if (roll < weight) return type;
        roll -= weight;
    }
    return EventType.PUBLIC;
}

const BUDGET_PER_SEAT: Record<EventType, [number, number]> = {
    [EventType.PUBLIC]:           [60, 120],
    [EventType.INTERNAL_STUDENT]: [40,  90],
    [EventType.DEPARTMENT]:       [30,  70],
    [EventType.PRIVATE]:          [80, 150],
};

function randomBudget(cap: number, type: EventType): number {
    const [low, high] = BUDGET_PER_SEAT[type];
    const raw = 1_500 + cap * randInt(low, high);
    return Math.round(raw / 500) * 500;
}

function reviewScore(base: number): number {
    return clamp(Math.round(base + noise(0.5)), 0, 5);
}

const POSITIVE_COMMENTS = [
    'Baie goed georganiseer, ek het dit geniet!',
    'Uitstekende sprekers en lekker atmosfeer.',
    'Een van die beste geleenthede hierdie jaar.',
    'Goeie inhoud en alles het betyds begin.',
    'Sal beslis weer bywoon.',
];

const NEUTRAL_COMMENTS = [
    'Redelik goed, maar die program was bietjie lank.',
    'Interessant, al was die lokaal te warm.',
    'Goeie idee, maar die kommunikasie vooraf kon beter wees.',
    'Gemiddeld - niks spesiaals nie, maar ook nie sleg nie.',
];

const NEGATIVE_COMMENTS = [
    'Min mense het opgedaag en dit het leeg gevoel.',
    'Swak beplanning, ons moes lank wag.',
    'Die klank was sleg en ek kon niks hoor nie.',
    'Het meer verwag van die inhoud.',
];

function pickComment(averageScore: number): string {
    if (averageScore >= 3.5) return POSITIVE_COMMENTS[randInt(0, POSITIVE_COMMENTS.length - 1)];
    if (averageScore >= 2.0) return NEUTRAL_COMMENTS[randInt(0, NEUTRAL_COMMENTS.length - 1)];
    return NEGATIVE_COMMENTS[randInt(0, NEGATIVE_COMMENTS.length - 1)];
}

function roundTwo(value: number): number {
    return Math.round(value * 100) / 100;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
    const redacted = mongoUri.replace(/:[^:@]+@/, ':****@');
    console.log(`Connecting to ${redacted} …\n`);
    await mongoose.connect(mongoUri);

    const usersCol   = mongoose.connection.collection('users');
    const eventsCol  = mongoose.connection.collection('events');
    const rsvpsCol   = mongoose.connection.collection('rsvps');
    const reviewsCol = mongoose.connection.collection('reviews');
    const now        = new Date();

    async function resetSeedData(): Promise<void> {
        const seedUsers  = await usersCol.find(SEED_USER_FILTER, { projection: { _id: 1 } }).toArray();
        const userIds    = seedUsers.map((user) => user._id);
        const seedEvents = await eventsCol.find({ createdBy: { $in: userIds } }, { projection: { _id: 1 } }).toArray();
        const eventIds   = seedEvents.map((event) => event._id);
        const ownedBySeed = { $or: [{ event: { $in: eventIds } }, { user: { $in: userIds } }] };

        const [reviews, rsvps, events, users] = await Promise.all([
            reviewsCol.deleteMany(ownedBySeed),
            rsvpsCol.deleteMany(ownedBySeed),
            eventsCol.deleteMany({ _id: { $in: eventIds } }),
            usersCol.deleteMany({ _id: { $in: userIds } }),
        ]);

        console.log('--reset: removed this seed\'s own data only:');
        console.log(`  ${users.deletedCount} users, ${events.deletedCount} events, ${rsvps.deletedCount} RSVPs, ${reviews.deletedCount} reviews.\n`);
    }

    if (RESET) {
        await resetSeedData();
    } else if (await usersCol.findOne(SEED_SENTINEL_FILTER)) {
        console.log('Seed data already present (sentinel user found). Skipping.');
        console.log('To re-seed, run the script again with --reset.');
        await mongoose.disconnect();
        return;
    }

    // ─── Users ────────────────────────────────────────────────────────────────
    // Hash is computed once and reused for every seed user — bcrypt is expensive
    // by design, so doing it 1 000 times would take ~100 s. One call takes ~100 ms.
    console.log('Hashing seed password (one bcrypt call)…');
    const passwordHash = await bcrypt.hash('Seed@1234!', 10);

    const adminDoc = {
        _id: new Types.ObjectId(),
        name: 'Saad', surname: 'Administrateur',
        email: SEED_ADMIN_EMAIL,
        passwordHash, role: 'ADMIN', studyCenter: 'Hoofkampus',
        isActive: true, failedLoginAttempts: 0, lockedUntil: null, title: 'NONE',
        createdAt: new Date('2021-01-01'), updatedAt: new Date('2021-01-01'),
    };

    const dosentDocs = Array.from({ length: 5 }, (_, i) => ({
        _id: new Types.ObjectId(),
        name: 'Prof', surname: `Dosent${i + 1}`,
        email: `dosent.seed.${i + 1}@akademia.ac.za`,
        passwordHash, role: 'DOSENT', studyCenter: 'Hoofkampus',
        isActive: true, failedLoginAttempts: 0, lockedUntil: null, title: 'Dr',
        createdAt: new Date('2021-01-01'), updatedAt: new Date('2021-01-01'),
    }));

    // 1 000 students: large enough that even the biggest events (950 cap × 0.98 fill
    // ≈ 931 confirmed) can be represented as unique RSVP–student pairs.
    const NUM_STUDENTS = 1_000;
    const studentDocs = Array.from({ length: NUM_STUDENTS }, (_, i) => ({
        _id: new Types.ObjectId(),
        name: 'Student', surname: `Saad${String(i).padStart(4, '0')}`,
        email: `student.seed.${i}@studs.akademia.ac.za`,
        passwordHash, role: 'STUDENT', studyCenter: 'Hoofkampus',
        isActive: true, failedLoginAttempts: 0, lockedUntil: null, title: 'NONE',
        createdAt: new Date('2021-01-01'), updatedAt: new Date('2021-01-01'),
    }));

    await usersCol.insertMany([adminDoc, ...dosentDocs, ...studentDocs]);
    console.log(`✓ Created 1 admin + ${dosentDocs.length} dosents + ${studentDocs.length} students.\n`);

    const creators   = [adminDoc, ...dosentDocs];
    const studentIds = studentDocs.map(s => s._id);

    // ─── Events ───────────────────────────────────────────────────────────────
    // We separate the MongoDB document from the transient helper fields used
    // to generate RSVPs (checkedInCount). Only the doc goes into the database.
    interface EventSeed {
        doc: {
            _id: Types.ObjectId;
            title: string;
            description: string;
            date: Date;
            location: string;
            maxCapacity: number;
            createdBy: Types.ObjectId;
            photographers: Types.ObjectId[];
            photographerInstructions: string;
            confirmedAttendees: number;
            checkedInCount: number;
            type: EventType;
            budget: number;
            reviewCategories: { id: string; name: string }[];
            ratingAvg: number | null;
            ratingCount: number;
            reviewRequestsSentAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
        checkedInCount: number;
        fillRate: number;
    }

    interface ReviewSeed {
        _id: Types.ObjectId;
        event: Types.ObjectId;
        user: Types.ObjectId;
        ratings: { categoryId: string; score: number }[];
        comment?: string;
        createdAt: Date;
        updatedAt: Date;
    }

    console.log('Generating events (Oct 2023 → Sep 2026)…');
    const eventSeeds: EventSeed[] = [];

    // October 2023 to September 2026 inclusive = 36 months ≈ 120 events
    for (let year = 2023; year <= 2026; year++) {
        const monthStart = year === 2023 ? 10 : 1;
        const monthEnd   = year === 2026 ? 9 : 12;

        for (let month = monthStart; month <= monthEnd; month++) {
            const count = EVENTS_PER_MONTH[month];

            for (let i = 0; i < count; i++) {
                const eventDate     = randomEventDate(year, month);
                if (eventDate.getTime() > now.getTime()) continue;

                const daysInAdvance = randInt(7, 60);
                const createdAt     = new Date(eventDate.getTime() - daysInAdvance * 86_400_000);
                const capacity      = randomCapacity();
                const dow           = eventDate.getDay();
                const dayOfMonth    = eventDate.getDate();

                // ── Fill rate ─────────────────────────────────────────────────
                const rawFill =
                    MONTH_FILL[month]            *
                    DOW_FILL[dow]                *
                    capacityFillFactor(capacity) *
                    advanceFillFactor(daysInAdvance) *
                    domFillFactor(dayOfMonth);

                const fillRate           = clamp(rawFill + noise(0.08), 0.03, 0.98);
                const confirmedAttendees = Math.min(
                    Math.round(fillRate * capacity),
                    NUM_STUDENTS,   // can't exceed our student pool
                );

                // ── No-show rate ──────────────────────────────────────────────
                const rawNoShow  = MONTH_NOSHOW[month] + capacityNoShowFactor(capacity) + domNoShowFactor(dayOfMonth);
                const noShowRate = clamp(rawNoShow + noise(0.05), 0.03, 0.45);
                const checkedInCount = Math.round(confirmedAttendees * (1 - noShowRate));

                const type = pickEventType(capacity);

                eventSeeds.push({
                    doc: {
                        _id: new Types.ObjectId(),
                        title: `${EVENT_TITLES[randInt(0, EVENT_TITLES.length - 1)]} ${year}`,
                        description: 'Gesaaide geleentheid vir LSTM analitiese opleiding.',
                        date: eventDate,
                        location: LOCATIONS[randInt(0, LOCATIONS.length - 1)],
                        maxCapacity: capacity,
                        createdBy: creators[randInt(0, creators.length - 1)]._id,
                        photographers: [],
                        photographerInstructions: '',
                        confirmedAttendees,
                        checkedInCount,
                        type,
                        budget: randomBudget(capacity, type),
                        reviewCategories: DEFAULT_REVIEW_CATEGORIES.map((name) => ({ id: uuidv4(), name })),
                        ratingAvg: null,
                        ratingCount: 0,
                        reviewRequestsSentAt: eventDate,
                        createdAt,
                        updatedAt: eventDate,
                    },
                    checkedInCount,
                    fillRate,
                });
            }
        }
    }

    // ─── RSVPs ────────────────────────────────────────────────────────────────
    // For each event we create one RSVP per confirmed attendee, assigning unique
    // students via partial Fisher-Yates. The first `checkedInCount` RSVPs in the
    // shuffled slice are marked checked-in; the rest are no-shows (checkedIn: false).
    // We batch-insert in groups of 500 to avoid large single insertMany payloads.
    console.log('Generating RSVPs…');
    let totalRsvps = 0;
    const BATCH = 500;
    let batch: object[] = [];

    async function flushBatch(): Promise<void> {
        if (batch.length === 0) return;
        await rsvpsCol.insertMany(batch);
        totalRsvps += batch.length;
        process.stdout.write(`\r  ${totalRsvps} RSVPs inserted…`);
        batch = [];
    }

    const reviewSeeds: ReviewSeed[] = [];

    for (const { doc: event, checkedInCount, fillRate } of eventSeeds) {
        if (event.confirmedAttendees === 0) continue;

        const selectedIndices = pickUniqueIndices(NUM_STUDENTS, event.confirmedAttendees);
        const eventScores: number[] = [];
        let eventReviewCount = 0;

        for (let pos = 0; pos < selectedIndices.length; pos++) {
            const didCheckIn = pos < checkedInCount;

            if (didCheckIn && Math.random() < REVIEW_SHARE) {
                const reviewerBase = 1.5 + fillRate * 3.5 + noise(0.6);
                const ratings = event.reviewCategories.map((category) => ({
                    categoryId: category.id,
                    score: reviewScore(reviewerBase),
                }));
                const averageScore = ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
                const hoursAfter = randInt(2, REVIEW_WINDOW_HOURS);
                const reviewedAt = new Date(Math.min(event.date.getTime() + hoursAfter * 3_600_000, now.getTime()));

                const review: ReviewSeed = {
                    _id: new Types.ObjectId(),
                    event: event._id,
                    user: studentIds[selectedIndices[pos]],
                    ratings,
                    createdAt: reviewedAt,
                    updatedAt: reviewedAt,
                };
                if (Math.random() < COMMENT_SHARE) {
                    review.comment = pickComment(averageScore);
                }

                reviewSeeds.push(review);
                eventScores.push(...ratings.map((rating) => rating.score));
                eventReviewCount++;
            }

            batch.push({
                _id: new Types.ObjectId(),
                event:      event._id,
                user:       studentIds[selectedIndices[pos]],
                status:     'BEVESTIG',
                qrPayload:  uuidv4(),
                checkedIn:  didCheckIn,
                checkedInAt: didCheckIn ? event.date : null,
                // RSVP created a random 0-7 days after the event was created
                createdAt: new Date(event.createdAt.getTime() + randInt(0, 7) * 86_400_000),
                updatedAt:  event.date,
            });

            if (batch.length >= BATCH) await flushBatch();
        }

        if (eventReviewCount > 0) {
            event.ratingCount = eventReviewCount;
            event.ratingAvg = roundTwo(eventScores.reduce((sum, score) => sum + score, 0) / eventScores.length);
        }
    }
    await flushBatch();
    console.log(`\n✓ Inserted ${totalRsvps} RSVPs.\n`);

    await eventsCol.insertMany(eventSeeds.map(e => e.doc));
    console.log(`✓ Inserted ${eventSeeds.length} events.\n`);

    if (reviewSeeds.length > 0) {
        await reviewsCol.insertMany(reviewSeeds);
    }
    console.log(`✓ Inserted ${reviewSeeds.length} reviews.\n`);

    // ─── Summary ──────────────────────────────────────────────────────────────
    const docs = eventSeeds.map(e => e.doc);

    const avgFill = docs.reduce(
        (sum, e) => sum + e.confirmedAttendees / e.maxCapacity, 0,
    ) / docs.length;

    const avgNoShow = eventSeeds.reduce(
        (sum, { doc, checkedInCount }) =>
            sum + (1 - checkedInCount / Math.max(doc.confirmedAttendees, 1)),
        0,
    ) / eventSeeds.length;

    const typeCounts = Object.values(EventType)
        .map((type) => `${type}: ${docs.filter((e) => e.type === type).length}`)
        .join(', ');

    console.log('──────────────────────────────────────────────────────────────');
    console.log('Seed complete.');
    console.log(`  Events inserted:     ${docs.length}`);
    console.log(`  RSVPs inserted:      ${totalRsvps}`);
    console.log(`  Reviews inserted:    ${reviewSeeds.length}`);
    console.log(`  Avg fill rate:       ${(avgFill   * 100).toFixed(1)} %`);
    console.log(`  Avg no-show rate:    ${(avgNoShow * 100).toFixed(1)} %`);
    console.log(`  Event types:         ${typeCounts}`);
    console.log('──────────────────────────────────────────────────────────────');

    // Print sample feature vectors so you can verify the patterns look sane
    // before moving on to train.py.
    // Format: [capacity, day_of_week, month, days_in_advance] → fill | noShow
    console.log('\nSample feature vectors (first 8 events):');
    console.log('  [cap,  dow, mo, adv] → fill   noShow  title');
    eventSeeds.slice(0, 8).forEach(({ doc: e, checkedInCount }) => {
        const fill  = (e.confirmedAttendees / e.maxCapacity).toFixed(3);
        const noSh  = (1 - checkedInCount / Math.max(e.confirmedAttendees, 1)).toFixed(3);
        const dow   = e.date.getDay();
        const month = e.date.getMonth() + 1;
        const adv   = Math.round((e.date.getTime() - e.createdAt.getTime()) / 86_400_000);
        const cap   = String(e.maxCapacity).padStart(4);
        console.log(`  [${cap}, ${dow}, ${String(month).padStart(2)}, ${String(adv).padStart(2)}] → ${fill}  ${noSh}  "${e.title.slice(0, 42)}"`);
    });

    await mongoose.disconnect();
    console.log('\nMongoDB disconnected. All done!');
}

seed().catch(err => {
    console.error('\nSeed script failed:', (err as Error).message ?? err);
    mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
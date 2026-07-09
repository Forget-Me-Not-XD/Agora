/**
 * seed-demo-data.ts
 *
 * Wipes users / events / rsvps / notifications / photographer_profiles and
 * repopulates them with a realistic demo dataset, including one named seed
 * account per role so every dashboard view can be logged into and inspected
 * with real, non-empty data:
 *
 *   seed-admin@akademia.ac.za      (ADMIN)
 *   seed-dosent@akademia.ac.za     (DOSENT)
 *   seed-student@akademia.ac.za    (STUDENT)
 *   seed-gas@gmail.com             (GAS)
 *   seed-fotograaf@gmail.com       (PHOTOGRAPHER)
 *
 * Password for every seeded account (including the extras): Seed@1234!
 *
 * Volume: 150 users total (1 admin, 10 dosents, 124 students, 10 gas, 5
 *         photographers) × 1000 events — exactly 850 in the past (spread over
 *         the last ~3 years) and exactly 150 upcoming (capped so none fall in
 *         2027 or later) × RSVPs generated per-event from the role-eligible
 *         attendee pool.
 *
 * Every schema field is populated with a plausible value — no field is left
 * at an empty/zero default unless that default is itself the realistic
 * value (e.g. lockedUntil: null for an account that was never locked out).
 *
 * Run from apps/backend/:
 *   npx ts-node src/database/seeds/seed-demo-data.ts
 *
 * NOT idempotent by design — every run fully wipes the collections below
 * and rebuilds them from scratch, since the goal is a clean, repeatable
 * "reset my dev database" workflow rather than incremental seeding.
 * (This is a separate script from seed-analytics-mock-data.ts, which seeds
 * a much larger, statistically-tuned dataset purely for LSTM training and
 * uses its own sentinel-based idempotency guard.)
 */

import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// ── Environment loading ─────────────────────────────────────────────────────
const ENV_PATH = path.resolve(__dirname, '../../../../../.env');
if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, 'utf-8').split(/\r?\n/)) {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    }
}

let mongoUri = process.env.MONGO_URI ?? '';
if (!mongoUri) {
    console.error('MONGO_URI is not set. Ensure .env exists at the repo root.');
    process.exit(1);
}
if (mongoUri.includes('@mongodb:')) {
    mongoUri = mongoUri.replace('@mongodb:', '@localhost:');
    console.log('ℹ  Replaced Docker hostname "mongodb" → "localhost".\n');
}

// ── Static fixture data ──────────────────────────────────────────────────────

const STUDY_CENTERS = [
    'Centurion - Leriba',
    'Centurion - Gerhard straat',
    'Paarl',
    'George',
    'Somerset Wes',
];

const DOSENT_TITLES = ['Dr.', 'Prof.', 'Lec.', 'Mnr.', 'Mev.'];

const FIRST_NAMES = [
    'Johan', 'Amanda', 'Pieter', 'Liesl', 'Hendrik', 'Marié', 'Stefan', 'Anél',
    'Willem', 'Karin', 'Francois', 'Elmarie', 'Jaco', 'Nadia', 'Riaan', 'Chanel',
    'Deon', 'Susan', 'Cobus', 'Petro', 'Thabo', 'Lindiwe', 'Sipho', 'Nomvula',
    'Liam', 'Emma', 'Noah', 'Chloé', 'Ethan', 'Zanele', 'Kagiso', 'Palesa',
];

const SURNAMES = [
    'Botha', 'van der Merwe', 'Nel', 'Pretorius', 'Fourie', 'Nkosi', 'Dlamini',
    'Venter', 'Kruger', 'Erasmus', 'Coetzee', 'Steyn', 'Naidoo', 'Govender',
    'Mokoena', 'Khumalo', 'Joubert', 'Malan', 'Le Roux', 'Viljoen', 'Human',
];

const EVENT_TITLES = [
    'Oriëntasieweek: Verwelkoming vir Eerstejaars',
    'Dosente Onthaal en Studenteverwelkoming',
    'Kampus Rondleiding vir Nuwe Studente',
    'Gaslesing: Toekomstige Tendense in Kunsmatige Intelligensie',
    'Dept. Informatika Navorsingsimposium',
    'Finale Jaar Projekpresentasies',
    'Postgraduaat Navorsingsdag',
    'Interdepartementele Wetenskapsfees',
    'Etiese Implikasies van Groot Data – Openbare Lesing',
    'Loopbaandag: Korporatiewe Ontmoetingsgeleentheid',
    'CV-Skryf en Onderhoudvaardighede Werkswinkel',
    'Ondernemer Netwerkaand',
    'Alumni Terugkoms en Netwerkaand',
    'Beurse en Finansiering Inligtingsessie',
    'Jaareinde Sportsgala',
    'Interuniversitêre Kultuuruitruiling',
    'Studenteraad Debatskompetisie',
    'Internasionale Kos- en Kultuurfees',
    'Kwisaand met Studenteraad',
    'Kampusbraaifees en Sosiale Byeenkoms',
    'Jaarlikse Algemene Vergadering – Studenteraad',
    'Wellness Dag: Studente Geestesgesondheid',
    'Jaarlikse Atletiekdag',
    'Fotografie Werkswinkel: Geleentheidsfotografie 101',
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

const PHOTO_INSTRUCTIONS = [
    'Fokus op kandidate se gesigsuitdrukkings tydens die hooftoespraak.',
    'Neem groepfoto\'s aan die begin en einde van die geleentheid.',
    'Vermy flitsfotografie tydens die musiekvertonings.',
    'Sorg vir minstens 3 foto\'s van elke spreker op die verhoog.',
    'Fokus op interaksie tussen studente by die netwerk-tafels.',
];

const PHOTOGRAPHER_BIOS = [
    'Geleentheidsfotograaf met 6 jaar ondervinding in kampuslewe en akademiese funksies.',
    'Spesialiseer in portret- en groepfotografie vir universiteitsgeleenthede.',
    'Freelance fotograaf, fokus op sport- en kultuurgeleenthede op kampus.',
];

const RSVP_STATUSES = ['BEVESTIG', 'HANGENDE', 'GEKANSELLEER'] as const;

// ── Utility helpers ───────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

function pickUniqueIndices(total: number, count: number): number[] {
    const n = Math.min(count, total);
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(Math.random() * (total - i));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
}

function weightedRsvpStatus(): (typeof RSVP_STATUSES)[number] {
    const r = Math.random();
    if (r < 0.70) return 'BEVESTIG';
    if (r < 0.90) return 'HANGENDE';
    return 'GEKANSELLEER';
}

// 'n Verlede geleentheid kan nie meer 'n "hangende" RSVP hê nie -- teen die tyd
// wat dit plaasgevind het, is elke inskrywing lankal bevestig of gekanselleer.
// Oorwegend BEVESTIG hou die werklike bywoning (BEVESTIG-telling / kapasiteit)
// naby die geteikende ~95%-gemiddeld.
function weightedPastRsvpStatus(): (typeof RSVP_STATUSES)[number] {
    return Math.random() < 0.99 ? 'BEVESTIG' : 'GEKANSELLEER';
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

// Triangular-ish distribution centred around ~45% fill, ranging 5%-95% —
// avoids the "every big event ties at the pool ceiling" problem you get from
// a flat/uniform random draw combined with a hard min(eligiblePool, ...) cap.
function randomFillRate(): number {
    const blended = (Math.random() + Math.random()) / 2;
    return clamp(0.05 + blended * 0.85, 0.05, 0.95);
}

// Vir verlede geleenthede: hoeveel van die berykbare (kapasiteit-beperkte) skare
// werklik ingeskryf het. Triangulêr tussen 90%-100%, gemiddeld 95% -- gekombineer
// met weightedPastRsvpStatus() (97% BEVESTIG) gee dit 'n werklike bygewoon-koers
// (BEVESTIG-telling / maxCapacity) van ±95% se gemiddeld oor baie geleenthede.
function randomPastFillRate(): number {
    const blended = (Math.random() + Math.random()) / 2;
    return clamp(0.92 + blended * 0.08, 0.92, 1.0);
}

function randomCapacity(): number {
    const r = Math.random();
    if (r < 0.40) return randInt(20, 80);
    if (r < 0.75) return randInt(80, 200);
    if (r < 0.95) return randInt(200, 500);
    return randInt(500, 800);
}

// Vir verlede geleenthede moet kapasiteit histories haalbaar wees: met net ~145
// gesimuleerde gebruikers in totaal kan 'n geleentheid met plek vir 500+ mense
// nooit werklik 95% gevul word nie (daar bestaan eenvoudig nie genoeg mense nie).
// Kies dus 'n kapasiteit as 'n aandeel van die werklik-kwalifiserende poel vir
// hierdie spesifieke geleentheid se sigbaarheidsvlak, sodat 'n hoë vulkoers
// wiskundig haalbaar bly.
function randomPastCapacity(eligiblePoolSize: number): number {
    // Let op: GEEN kunsmatige minimum-vloer hier nie (bv. 10) -- vir 'n rol-vlak met
    // net 1-11 werklike mense (DOSENT/ADMIN-beperkte geleenthede) sou 'n vloer die
    // kapasiteit groter as die poel self maak, wat 'n 95%-vulkoers weer onbereikbaar
    // maak. 'n Klein kapasiteit (bv. 1-11) is trouens realisties vir so 'n beperkte,
    // interne geleentheid.
    const usable = Math.max(eligiblePoolSize, 1);
    const blended = (Math.random() + Math.random()) / 2;
    const ratio = 0.55 + blended * 0.35; // 55%-90% van die poel, gemiddeld ~72%
    return Math.max(1, Math.round(usable * ratio));
}

// Harde grens: geen toekomstige geleentheid mag in 2027 (of later) val nie.
const FUTURE_CUTOFF = new Date('2026-12-31T23:59:59');
// Verlede geleenthede is versprei oor die afgelope ~3 jaar — 'n realistiese
// deurlopende geskiedenis vir 'n universiteit se funksiestelsel.
const PAST_WINDOW_DAYS = 1095;

// `isFuture` bepaal presies watter kant van vandag die datum val: die skrip
// wat hierdie funksie aanroep, ken elke geleentheid vooraf 'n vaste toekoms/
// verlede-vlag toe sodat die 850/150-verdeling presies (nie net waarskynlik)
// uitkom.
function randomEventDate(isFuture: boolean): Date {
    const now = new Date();
    let d: Date;
    if (isFuture) {
        const maxDaysAhead = Math.max(1, Math.floor((FUTURE_CUTOFF.getTime() - now.getTime()) / 86_400_000));
        const daysOffset = randInt(1, maxDaysAhead);
        d = new Date(now.getTime() + daysOffset * 86_400_000);
    } else {
        const daysOffset = randInt(1, PAST_WINDOW_DAYS);
        d = new Date(now.getTime() - daysOffset * 86_400_000);
    }
    d.setHours(randInt(9, 19), [0, 15, 30, 45][randInt(0, 3)], 0, 0);
    return d;
}


interface SeedUser {
    _id: Types.ObjectId;
    name: string;
    surname: string;
    email: string;
    passwordHash: string;
    role: string;
    studyCenter: string;
    isActive: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

function makeUser(opts: {
    name: string;
    surname: string;
    email: string;
    passwordHash: string;
    role: string;
    title?: string;
    createdDaysAgo?: number;
    isActive?: boolean;          // add this line
}): SeedUser {
    const createdAt = new Date(Date.now() - (opts.createdDaysAgo ?? randInt(30, 900)) * 86_400_000);
    return {
        _id: new Types.ObjectId(),
        name: opts.name,
        surname: opts.surname,
        email: opts.email,
        passwordHash: opts.passwordHash,
        role: opts.role,
        studyCenter: pick(STUDY_CENTERS),
        isActive: opts.isActive ?? Math.random() > 0.05,   
        failedLoginAttempts: Math.random() > 0.85 ? randInt(1, 3) : 0,
        lockedUntil: null,
        title: opts.title ?? '',
        createdAt,
        updatedAt: createdAt,
    };
}


// ── Main ────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
    const redacted = mongoUri.replace(/:[^:@]+@/, ':****@');
    console.log(`Connecting to ${redacted} …\n`);
    await mongoose.connect(mongoUri);

    const usersCol = mongoose.connection.collection('users');
    const eventsCol = mongoose.connection.collection('events');
    const rsvpsCol = mongoose.connection.collection('rsvps');
    const notificationsCol = mongoose.connection.collection('notifications');
    const photographerProfilesCol = mongoose.connection.collection('photographer_profiles');

    // ─── Wipe ─────────────────────────────────────────────────────────────────
    console.log('Wiping existing users / events / rsvps / notifications / photographer_profiles …');
    await Promise.all([
        usersCol.deleteMany({}),
        eventsCol.deleteMany({}),
        rsvpsCol.deleteMany({}),
        notificationsCol.deleteMany({}),
        photographerProfilesCol.deleteMany({}),
    ]);
    console.log('✓ Collections cleared.\n');

    // ─── Users ────────────────────────────────────────────────────────────────
    console.log('Hashing seed password (one bcrypt call, shared by every seeded account)…');
    const passwordHash = await bcrypt.hash('Seed@1234!', 10);

    // Admins/dosents/photographers can be attributed as an event's creator or
    // assigned photographer, and events now reach ~1260 days into the past —
    // so these accounts need to predate that comfortably to stay logically
    // consistent (an account can't have created an event before it existed).
    const admin = makeUser({
        name: 'Amanda', surname: 'Administrateur',
        email: 'seed-admin@akademia.ac.za',
        passwordHash, role: 'ADMIN', title: '', createdDaysAgo: 1900, isActive: true,
    });

    const namedDosent = makeUser({
        name: 'Johan', surname: 'Botha',
        email: 'seed-dosent@akademia.ac.za',
        passwordHash, role: 'DOSENT', title: 'Dr.', createdDaysAgo: 1500, isActive: true,
    });
    const extraDosents = Array.from({ length: 9 }, (_, i) =>
        makeUser({
            name: pick(FIRST_NAMES), surname: pick(SURNAMES),
            email: `dosent${i + 1}.seed@akademia.ac.za`,
            passwordHash, role: 'DOSENT', title: pick(DOSENT_TITLES),
            createdDaysAgo: randInt(1300, 1900),
        }),
    );
    const dosents = [namedDosent, ...extraDosents];

    const namedStudent = makeUser({
        name: 'Liam', surname: 'van der Merwe',
        email: 'seed-student@akademia.ac.za',
        passwordHash, role: 'STUDENT', createdDaysAgo: 300, isActive: true,
    });
    const NUM_EXTRA_STUDENTS = 123;
    const extraStudents = Array.from({ length: NUM_EXTRA_STUDENTS }, (_, i) =>
        makeUser({
            name: pick(FIRST_NAMES), surname: pick(SURNAMES),
            email: `student${i + 1}.seed@studs.akademia.ac.za`,
            passwordHash, role: 'STUDENT',
        }),
    );
    const students = [namedStudent, ...extraStudents];

    const namedGas = makeUser({
        name: 'Thabo', surname: 'Nkosi',
        email: 'seed-gas@gmail.com',
        passwordHash, role: 'GAS', createdDaysAgo: 150, isActive: true,
    });
    const extraGas = Array.from({ length: 9 }, (_, i) =>
        makeUser({
            name: pick(FIRST_NAMES), surname: pick(SURNAMES),
            email: `gas${i + 1}.seed@gmail.com`,
            passwordHash, role: 'GAS',
        }),
    );
    const gasUsers = [namedGas, ...extraGas];

    const namedPhotographer = makeUser({
        name: 'Chloé', surname: 'Fourie',
        email: 'seed-fotograaf@gmail.com',
        passwordHash, role: 'PHOTOGRAPHER', createdDaysAgo: 1500, isActive: true,
    });
    const extraPhotographers = Array.from({ length: 4 }, (_, i) =>
        makeUser({
            name: pick(FIRST_NAMES), surname: pick(SURNAMES),
            email: `fotograaf${i + 1}.seed@gmail.com`,
            createdDaysAgo: randInt(1300, 1900),
            passwordHash, role: 'PHOTOGRAPHER',
        }),
    );
    const photographers = [namedPhotographer, ...extraPhotographers];

    const allUsers = [admin, ...dosents, ...students, ...gasUsers, ...photographers];
    await usersCol.insertMany(allUsers);
    console.log(
        `✓ Created 1 admin + ${dosents.length} dosents + ${students.length} students + ` +
        `${gasUsers.length} gas + ${photographers.length} photographers = ${allUsers.length} users.\n`,
    );

    // ─── Photographer profiles ───────────────────────────────────────────────
    const photographerProfiles = photographers.map((p, i) => ({
        _id: new Types.ObjectId(),
        user: p._id,
        bio: PHOTOGRAPHER_BIOS[i % PHOTOGRAPHER_BIOS.length],
        portfolioUrl: `https://portfolio.example.com/${p.name.toLowerCase()}-${p.surname.toLowerCase().replace(/\s+/g, '-')}`,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
    }));
    await photographerProfilesCol.insertMany(photographerProfiles);
    console.log(`✓ Created ${photographerProfiles.length} photographer profiles.\n`);

    // ─── Events ───────────────────────────────────────────────────────────────
    const ATTENDANCE_ROLES = ['GAS', 'STUDENT', 'DOSENT', 'ADMIN'];
    const EVENT_TYPES = ['public', 'internal_student', 'private', 'department'];
    const creators = [admin, ...dosents];

    // Vervroeg vanaf die RSVP-afdeling hieronder -- kapasiteit vir verlede
    // geleenthede moet reeds tydens generering weet hoeveel mense werklik
    // kwalifiseer vir 'n gegewe sigbaarheidsvlak.
    const ROLE_LEVEL: Record<string, number> = { GAS: 1, STUDENT: 2, DOSENT: 3, ADMIN: 4 };
    const attendeePool = [...students, ...gasUsers, ...dosents, admin];

    console.log('Generating events…');
    const NUM_EVENTS = 1000;
    const NUM_FUTURE_EVENTS = 150;

    // Presiese 150/850-verdeling: bou 'n vlaggie per geleentheid-indeks en skommel
    // dit (Fisher–Yates), sodat dit nie net waarskynlik is nie, maar altyd presies uitkom.
    const isFutureFlags = Array.from({ length: NUM_EVENTS }, (_, i) => i < NUM_FUTURE_EVENTS);
    for (let i = isFutureFlags.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [isFutureFlags[i], isFutureFlags[j]] = [isFutureFlags[j], isFutureFlags[i]];
    }

    const eventDocs: Array<{
        _id: Types.ObjectId;
        title: string;
        description: string;
        date: Date;
        endDate?: Date;
        location: string;
        maxCapacity: number;
        budget: number;
        createdBy: Types.ObjectId;
        photographers: Types.ObjectId[];
        photographerInstructions: string;
        confirmedAttendees: number;
        intendedAttendance: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
    }> = [];

    // Guarantee the named dosent has authored a handful of events for their dashboard
    for (let i = 0; i < NUM_EVENTS; i++) {
        const isPast = !isFutureFlags[i];
        const date = randomEventDate(isFutureFlags[i]);
        const daysInAdvance = randInt(7, 60);
        const createdAt = new Date(date.getTime() - daysInAdvance * 86_400_000);
        const intendedAttendance = pick(ATTENDANCE_ROLES);
        const hasPhotographer = Math.random() < 0.4;
        const assignedPhotographer = hasPhotographer ? pick(photographers) : null;
        const creator = i < 20 ? namedDosent : pick(creators);

        // Vir verlede geleenthede: kapasiteit moet histories haalbaar wees gegewe
        // hoeveel mense werklik in hierdie sigbaarheidsvlak kwalifiseer, anders kan
        // die geteikende ~95%-bygewoning nooit wiskundig bereik word nie. Toekomstige
        // geleenthede het nog geen bygewoning-geskiedenis nie, so hulle behou die
        // vrye kapasiteitverspreiding.
        const eligiblePoolSize = attendeePool.filter(
            (u) => ROLE_LEVEL[u.role] >= ROLE_LEVEL[intendedAttendance],
        ).length;
        const capacity = isPast ? randomPastCapacity(eligiblePoolSize) : randomCapacity();

        eventDocs.push({
            _id: new Types.ObjectId(),
            title: `${pick(EVENT_TITLES)} ${date.getFullYear()}`,
            description: 'Universiteitsgeleentheid geskep vir demonstrasie- en toetsdoeleindes met volledige voorbeelddata.',
            date,
            endDate: Math.random() < 0.5 ? new Date(date.getTime() + randInt(1, 4) * 3_600_000) : undefined,
            location: pick(LOCATIONS),
            maxCapacity: capacity,
            budget: Math.round(capacity * randInt(80, 250)),
            createdBy: creator._id,
            photographers: assignedPhotographer ? [assignedPhotographer._id] : [],
            photographerInstructions: assignedPhotographer ? pick(PHOTO_INSTRUCTIONS) : '',
            confirmedAttendees: 0, // filled in after RSVPs are generated below
            intendedAttendance,
            type: pick(EVENT_TYPES),
            createdAt,
            updatedAt: date,
        });
    }

    // ─── RSVPs ────────────────────────────────────────────────────────────────
    console.log('Generating RSVPs…');
    const now = Date.now();

    const rsvpDocs: object[] = [];
    const confirmedCountByEvent = new Map<string, number>();

    for (let i = 0; i < eventDocs.length; i++) {
        const event = eventDocs[i];
        const isPastEvent = event.date.getTime() < now;
        const requiredLevel = ROLE_LEVEL[event.intendedAttendance];
        const eligible = attendeePool.filter((u) => ROLE_LEVEL[u.role] >= requiredLevel);
        if (eligible.length === 0) continue;

        const pool = Math.min(event.maxCapacity, eligible.length);
        const rsvpCount = Math.max(1, Math.round(pool * (isPastEvent ? randomPastFillRate() : randomFillRate())));
        const selected = pickUniqueIndices(eligible.length, rsvpCount).map((idx) => eligible[idx]);

        let confirmedForEvent = 0;

        for (const user of selected) {
            const status = isPastEvent ? weightedPastRsvpStatus() : weightedRsvpStatus();
            const confirmed = status === 'BEVESTIG';
            if (confirmed) confirmedForEvent++;

            const checkedIn = confirmed && isPastEvent && Math.random() < 0.85;

            rsvpDocs.push({
                _id: new Types.ObjectId(),
                event: event._id,
                user: user._id,
                status,
                qrPayload: uuidv4(),
                checkedIn,
                checkedInAt: checkedIn ? event.date : null,
                createdAt: new Date(event.createdAt.getTime() + randInt(0, 7) * 86_400_000),
                updatedAt: event.date,
            });
        }

        confirmedCountByEvent.set(event._id.toString(), confirmedForEvent);

        if ((i + 1) % 200 === 0) {
            process.stdout.write(`\r  ${i + 1}/${eventDocs.length} events processed, ${rsvpDocs.length} RSVPs so far…`);
        }
    }
    process.stdout.write(`\r  ${eventDocs.length}/${eventDocs.length} events processed, ${rsvpDocs.length} RSVPs so far…\n`);

    // Guarantee the named student and gas accounts each have a handful of bookings,
    // even if the random pass above skipped them, so their dashboards aren't empty.
    for (const namedUser of [namedStudent, namedGas]) {
        const alreadyBooked = new Set(
            rsvpDocs
                .filter((r: any) => r.user.toString() === namedUser._id.toString())
                .map((r: any) => r.event.toString()),
        );
        const candidateEvents = eventDocs.filter((e) => {
            const requiredLevel = ROLE_LEVEL[e.intendedAttendance];
            return ROLE_LEVEL[namedUser.role] >= requiredLevel && !alreadyBooked.has(e._id.toString());
        });
        const extras = pickUniqueIndices(candidateEvents.length, 5).map((idx) => candidateEvents[idx]);

        for (const event of extras) {
            const isPastEvent = event.date.getTime() < now;
            const status = isPastEvent ? weightedPastRsvpStatus() : weightedRsvpStatus();
            const confirmed = status === 'BEVESTIG';
            const checkedIn = confirmed && isPastEvent && Math.random() < 0.85;

            rsvpDocs.push({
                _id: new Types.ObjectId(),
                event: event._id,
                user: namedUser._id,
                status,
                qrPayload: uuidv4(),
                checkedIn,
                checkedInAt: checkedIn ? event.date : null,
                createdAt: new Date(event.createdAt.getTime() + randInt(0, 7) * 86_400_000),
                updatedAt: event.date,
            });

            if (confirmed) {
                const key = event._id.toString();
                confirmedCountByEvent.set(key, (confirmedCountByEvent.get(key) ?? 0) + 1);
            }
        }
    }

    console.log('Inserting RSVPs…');
    const INSERT_BATCH = 1000;
    for (let i = 0; i < rsvpDocs.length; i += INSERT_BATCH) {
        await rsvpsCol.insertMany(rsvpDocs.slice(i, i + INSERT_BATCH));
        process.stdout.write(`\r  ${Math.min(i + INSERT_BATCH, rsvpDocs.length)}/${rsvpDocs.length} RSVPs inserted…`);
    }
    console.log(`\n✓ Inserted ${rsvpDocs.length} RSVPs.\n`);

    // Back-fill confirmedAttendees now that we know the real RSVP counts per event
    for (const event of eventDocs) {
        event.confirmedAttendees = confirmedCountByEvent.get(event._id.toString()) ?? 0;
    }
    await eventsCol.insertMany(eventDocs);
    console.log(`✓ Inserted ${eventDocs.length} events.\n`);

    // ─── Notifications (photographer assignments) ────────────────────────────
    console.log('Generating notifications…');
    const notificationDocs = eventDocs
        .filter((e) => e.photographers.length > 0)
        .map((e) => {
            const dateStr = e.date.toISOString().split('T')[0];
            return {
                _id: new Types.ObjectId(),
                userId: e.photographers[0],
                event: e._id,
                message: `Vir ${e.title} op ${dateStr}: ${e.photographerInstructions}`,
                read: Math.random() < 0.5,
                createdAt: new Date(e.createdAt.getTime() + randInt(1, 3) * 3_600_000),
                updatedAt: e.createdAt,
            };
        });
    if (notificationDocs.length > 0) await notificationsCol.insertMany(notificationDocs);
    console.log(`✓ Inserted ${notificationDocs.length} notifications.\n`);

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('──────────────────────────────────────────────────────────────');
    console.log('Seed complete. Log in with any of the accounts below (all share the same password):\n');
    console.log('  Password for every account: Seed@1234!\n');
    console.log('  ADMIN        seed-admin@akademia.ac.za');
    console.log('  DOSENT       seed-dosent@akademia.ac.za');
    console.log('  STUDENT      seed-student@akademia.ac.za');
    console.log('  GAS          seed-gas@gmail.com');
    console.log('  PHOTOGRAPHER seed-fotograaf@gmail.com');
    console.log('──────────────────────────────────────────────────────────────');
    const futureCount = eventDocs.filter((e) => e.date.getTime() > Date.now()).length;
    console.log(`  Total users:         ${allUsers.length}`);
    console.log(`  Events inserted:     ${eventDocs.length} (${futureCount} future / ${eventDocs.length - futureCount} past)`);
    console.log(`  RSVPs inserted:      ${rsvpDocs.length}`);
    console.log(`  Notifications:       ${notificationDocs.length}`);
    console.log(`  Photographer profiles: ${photographerProfiles.length}`);
    console.log('──────────────────────────────────────────────────────────────');

    await mongoose.disconnect();
    console.log('\nMongoDB disconnected. All done!');
}

seed().catch((err) => {
    console.error('\nSeed script failed:', (err as Error).message ?? err);
    mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});

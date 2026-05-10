'use client';

import { useState } from 'react';
import { Search, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import EventCard from '@/components/EventCard';
import InfoModal from '@/components/InfoModal';
import { MOCK_EVENTS } from '@/lib/mock-data';
import { filterEventsForUser, canCreateEvents } from '@/lib/rbac';
import { useCurrentUser } from '@/components/UserContext';
import type { EventStatus, EventType } from '@/lib/mock-data';

const EVENT_TYPE_INFO: { type: string; label: string; color: string; description: string }[] = [
    {
        type: 'public',
        label: 'Publiek',
        color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        description: 'Oop vir alle gebruikers ongeag hul rol. Geen uitnodiging nodig nie. Sigbaar vir GAS, studente, dosente en admins.',
    },
    {
        type: 'internal_student',
        label: 'Intern - Student',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        description: 'Slegs vir geregistreerde studente. Dosente en admins kan ook sien. GAS-lede moet spesifiek uitgenooi word.',
    },
    {
        type: 'private',
        label: 'Privaat',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        description: 'Slegs vir spesifiek uitgenodigde gebruikers. Jy moet \'n direkte uitnodiging van die organiseerder ontvang het om dit te sien.',
    },
    {
        type: 'department',
        label: 'Departement',
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        description: 'Slegs vir dosente en administrateurs. Nie sigbaar vir studente of GAS-lede nie.',
    },
];

export default function EventsPage() {
    const user = useCurrentUser();
    const allVisible = filterEventsForUser(MOCK_EVENTS, user);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');

    const filtered = allVisible.filter((event) => {
        const matchesSearch =
            event.title.toLowerCase().includes(search.toLowerCase()) ||
            event.description.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        const matchesType = typeFilter === 'all' || event.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const selectClass =
        'bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] rounded-xl px-3 py-2 outline-none cursor-pointer';

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Geleenthede</h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                        {filtered.length} geleenthede sigbaar vir jou rol
                    </p>
                </div>
                {canCreateEvents(user.role) && (
                    <Link
                        href="/events/create"
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <PlusCircle size={16} />
                        Skep Geleentheid
                    </Link>
                )}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                    <Search size={16} className="text-[var(--color-text-subtle)] shrink-0" />
                    <input
                        type="text"
                        placeholder="Soek geleenthede..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none w-full"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
                    className={selectClass}
                >
                    <option value="all">Alle Status</option>
                    <option value="upcoming">Aanstaande</option>
                    <option value="ongoing">Aan die gang</option>
                    <option value="past">Verby</option>
                    <option value="cancelled">Gekanselleer</option>
                </select>

                <div className="flex items-center gap-1.5">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
                        className={selectClass}
                    >
                        <option value="all">Alle Tipes</option>
                        <option value="public">Publiek</option>
                        <option value="internal_student">Intern - Student</option>
                        <option value="private">Privaat</option>
                        <option value="department">Departement</option>
                    </select>

                    <InfoModal title="Geleentheid Tipes">
                        <p className="text-sm text-[var(--color-text-subtle)] leading-relaxed">
                            Elke geleentheid het 'n tipe wat bepaal wie dit kan sien.
                            Jou rol bepaal watter tipes vir jou sigbaar is.
                        </p>
                        <div className="space-y-2">
                            {EVENT_TYPE_INFO.map((item) => (
                                <div
                                    key={item.type}
                                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.color}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                            <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Jou rol: {user.role}</p>
                            <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">
                                {user.role === 'ADMIN' && 'Jy kan alle geleenthede sien, ongeag tipe.'}
                                {user.role === 'DOSENT' && 'Jy kan alle aanstaande geleenthede sien, plus geleenthede wat jy geskep het.'}
                                {user.role === 'STUDENT' && 'Jy kan publieke, intern-student geleenthede, en geleenthede waarvoor jy uitgenooi is sien.'}
                                {user.role === 'GAS' && 'Jy kan publieke geleenthede en geleenthede waarvoor jy spesifiek uitgenooi is sien.'}
                            </p>
                        </div>
                    </InfoModal>
                </div>
            </div>

            {/* ── Event grid ── */}
            {filtered.length === 0 ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
                    <p className="text-[var(--color-text-subtle)] text-sm">
                        Geen geleenthede gevind nie.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}

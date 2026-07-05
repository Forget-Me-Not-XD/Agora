import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Users, ChevronLeft } from 'lucide-react';
import { getEventById } from '@/lib/api/events';
import { getPhotographersByIds } from '@/lib/api/photographer';
import { getCurrentUser } from '@/lib/get-current-user';
import { formatDateLong as formatDate } from '@/lib/format-date';
import PhotographerSection from '@/components/PhotographerSection';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: { id: string } }) {
    const user = getCurrentUser();

    const event = await getEventById(params.id).catch(() => null);
    if (!event) notFound();

    // admin sien alle geleenthede, dosent sien net wat hy geskep het
    const canManagePhotographers = user.role === 'ADMIN' || (user.role === 'DOSENT' && event.createdBy === user.id);

    // los die reeds-toegewysde fotograwe op hul ID's op
    const assigned =
        canManagePhotographers && event.photographers.length
            ? await getPhotographersByIds(event.photographers)
            : [];

    return (
        <div className="space-y-6 max-w-3xl">
            <Link
                href="/events"
                className="inline-flex items-center gap-1 text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] transition-colors"
            >
                <ChevronLeft size={16} /> Terug na geleenthede
            </Link>

            {/* Geleentheid-besonderhede */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">{event.title}</h1>
                <p className="text-sm text-[var(--color-text-subtle)] leading-relaxed">{event.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)]">
                        <Calendar size={15} className="shrink-0" /> <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)]">
                        <MapPin size={15} className="shrink-0" /> <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)]">
                        <Users size={15} className="shrink-0" /> <span>{event.confirmedAttendees} / {event.maxCapacity}</span>
                    </div>
                </div>
            </div>

            {/* Fotograaf-afdeling — net vir admin, of die dosent wat die geleentheid geskep het */}
            {canManagePhotographers && (
                <PhotographerSection
                    eventId={event.id}
                    initialAssigned={assigned}
                    initialInstructions={event.photographerInstructions}
                />
            )}
        </div>
    );
}
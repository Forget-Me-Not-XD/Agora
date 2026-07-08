'use client';

import { useEffect, useState } from 'react';
import type { Event } from '@/lib/api/events';
import type { PredictionResult } from '@/lib/api/analytics';
import { listEventsAction } from '@/lib/actions/event.actions';
import { getAttendancePredictionAction } from '@/lib/actions/analytics.actions';
import { deriveStatus } from '@/lib/event-view';

export default function PredictedAttendanceCard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [unavailable, setUnavailable] = useState(false);

    // Die model voorspel net vooruit uit kapasiteit/datum -- dit ken die regte
    // uitkoms van 'n geleentheid wat reeds plaasgevind het glad nie, so dit gee
    // net dieselfde raaiskoot terug asof die geleentheid nog moes gebeur. Ons
    // laat dus nie eers toe dat 'n afgelope geleentheid hier gekies word nie.
    useEffect(() => {
        listEventsAction().then((result) =>
            setEvents((result.events ?? []).filter((e) => deriveStatus(e) !== 'past')),
        );
    }, []);

    useEffect(() => {
        if (!selectedEventId) {
            setPrediction(null);
            setUnavailable(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setUnavailable(false);

        getAttendancePredictionAction(selectedEventId)
            .then((result) => {
                if (cancelled) return;
                if (result.prediction) {
                    setPrediction(result.prediction);
                } else {
                    setPrediction(null);
                    setUnavailable(true);
                    if (result.error) {
                        console.error('Failed to load attendance prediction:', result.error);
                    }
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [selectedEventId]);

    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const fillPercent = prediction ? Math.round(prediction.predictedFillRate * 100) : 0;

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-[var(--color-text)]">
                    Voorspelde Bywoning
                </h2>
                <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="text-sm border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                    <option value="">Kies 'n geleentheid...</option>
                    {events.map((event) => (
                        <option key={event.id} value={event.id}>
                            {event.title}
                        </option>
                    ))}
                </select>
            </div>

            {!selectedEventId && (
                <p className="text-sm text-[var(--color-text-subtle)]">
                    Kies 'n geleentheid om 'n voorspelling te sien
                </p>
            )}

            {selectedEventId && loading && (
                <div className="space-y-2 animate-pulse">
                    <div className="h-2 w-full rounded-full bg-[var(--color-border)]" />
                    <div className="h-3 w-24 rounded bg-[var(--color-border)]" />
                </div>
            )}

            {selectedEventId && !loading && unavailable && (
                <p className="text-sm text-gray-400">
                    Voorspelling nie beskikbaar nie
                </p>
            )}

            {selectedEventId && !loading && !unavailable && prediction && selectedEvent && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-text-subtle)]">Vulkoers</span>
                        <span className="text-xs font-bold text-[var(--color-text)]">{fillPercent}%</span>
                    </div>
                    <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                            style={{ width: `${fillPercent}%` }}
                        />
                    </div>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        {prediction.estimatedAttendees} / {selectedEvent.maxCapacity}
                    </p>
                </div>
            )}
        </div>
    );
}
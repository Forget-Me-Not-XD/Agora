'use client';

// Imports
import { useState, useEffect, useRef, useMemo } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

const DAYS = ['So', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa'];

// Die paneel se breedte plus die spasie wat ons tussen die paneel en
// die venster se rand wil hou wanneer ons besluit na watter kant dit oopmaak.
const PANEL_WIDTH = 304;
const EDGE_GAP    = 16;

// Datums beweeg hier deur as 'yyyy-mm-dd'-sleutels, nooit as Date-objekte nie.
// So bly alles in die gebruiker se eie kalenderdag en kan ons twee dae met 'n
// gewone string-vergelyking rangskik -- geen tydsone-verskuiwing nie.
function dayKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDay(key: string, withYear: boolean): string {
    const [y, m, d] = key.split('-').map(Number);
    return withYear ? `${d} ${MONTHS_SHORT[m - 1]} ${y}` : `${d} ${MONTHS_SHORT[m - 1]}`;
}

function formatLong(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
}

export interface DateRangePickerProps {
    // Begin van die reeks as 'yyyy-mm-dd', of '' vir geen filter nie
    from: string;
    // Einde van die reeks as 'yyyy-mm-dd'. Leeg terwyl net een dag gekies is
    to: string;
    onChange: (from: string, to: string) => void;
}

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    // Die dag waaroor die muis tans sweef, sodat die reeks al voorskou terwyl
    // die gebruiker die tweede dag soek.
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    // Die kieser sit gewoonlik heel regs in die filterry, waar 'n paneel wat na
    // regs oopmaak by die bladsy se rand sou uitsteek (die dashboard se <main>
    // rol dan horisontaal). Steek dit uit, haak ons die paneel se regterkant aan
    // die knoppie s'n vas sodat dit na links oopmaak en binne die bladsy bly.
    const [alignRight, setAlignRight] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const today = useMemo(() => new Date(), []);
    const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());

    // Die kalender open op die maand van die gekose begin-datum, anders vandag s'n.
    const [viewYear, setViewYear]   = useState(() => Number(from?.slice(0, 4)) || today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => (from ? Number(from.slice(5, 7)) - 1 : today.getMonth()));

    useEffect(() => {
        if (!open || !containerRef.current) return;
        const { left, right } = containerRef.current.getBoundingClientRect();
        // Maak links oop as dit regs nie pas nie, maar net solank die paneel dan
        // nie aan die ander kant uitsteek nie.
        setAlignRight(
            left + PANEL_WIDTH + EDGE_GAP > window.innerWidth && right - PANEL_WIDTH >= EDGE_GAP,
        );
    }, [open]);

    // Maak toe met 'n klik buite of met Escape.
    useEffect(() => {
        if (!open) return;

        function onPointerDown(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    }

    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    }

    // 'n Enkel gekose dag word as begin EN einde gehou (from === to), sodat die
    // dag self dadelik 'n volwaardige filter is en nie eers op 'n tweede klik
    // wag nie. Daardie toestand bly oop vir uitbreiding.
    const singleDay = Boolean(from) && from === to;

    // Klik-gedrag:
    //   niks gekies    -> die dag word begin en einde
    //   een dag gekies -> 'n ander dag brei uit na 'n reeks (in enige volgorde
    //                     gekies, ons rangskik hulle), dieselfde dag haal af
    //   volle reeks    -> 'n punt weer druk haal daardie punt af en laat die
    //                     ander een as enkeldag oor, enige ander dag begin oor
    function selectDay(key: string) {
        if (singleDay) {
            if (key === from) onChange('', '');
            else if (key < from) onChange(key, from);
            else onChange(from, key);
            return;
        }

        if (from && to) {
            if (key === from) { onChange(to, to);     return; }
            if (key === to)   { onChange(from, from); return; }
        }

        onChange(key, key);
    }

    function clear(e: React.MouseEvent) {
        e.stopPropagation();
        onChange('', '');
        setHoverKey(null);
    }

    // Die reeks wat geteken moet word. Is net een dag gekies, wys ons die reeks
    // wat sou ontstaan as die gebruiker op die dag onder die muis klik.
    const previewKey = singleDay && hoverKey && hoverKey !== from ? hoverKey : null;
    const rangeStart = previewKey && previewKey < from ? previewKey : from;
    const rangeEnd   = previewKey ? (previewKey < from ? from : previewKey) : to;

    const hasRange = Boolean(from);

    const label = !from
        ? 'Filter datum'
        : !to || to === from
            ? formatDay(from, true)
            : `${formatDay(from, from.slice(0, 4) !== to.slice(0, 4))} – ${formatDay(to, true)}`;

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={[
                    'flex items-center gap-2 text-sm rounded-xl px-3 py-2 border transition-colors cursor-pointer',
                    hasRange
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
                ].join(' ')}
            >
                <CalendarRange size={16} className={hasRange ? '' : 'text-[var(--color-text-subtle)]'} />
                <span>{label}</span>
                {hasRange && (
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label="Vee datumfilter uit"
                        title="Vee datumfilter uit"
                        onClick={clear}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                onChange('', '');
                            }
                        }}
                        className="ml-0.5 -mr-1 p-0.5 rounded hover:bg-[var(--color-primary-soft-hover)] transition-colors"
                    >
                        <X size={14} />
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Kies 'n datumreeks"
                    className={[
                        'absolute z-30 mt-2 w-[19rem] max-w-[calc(100vw-2rem)]',
                        alignRight ? 'right-0' : 'left-0',
                        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg p-3',
                    ].join(' ')}
                >
                    {/* ── Maand-navigasie ── */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            onClick={prevMonth}
                            aria-label="Vorige maand"
                            className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold text-[var(--color-text)]">
                            {MONTHS[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            aria-label="Volgende maand"
                            className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map((d) => (
                            <div key={d} className="py-1 text-center text-[11px] font-semibold text-[var(--color-text-subtle)]">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* ── Dae ── */}
                    <div className="grid grid-cols-7" onMouseLeave={() => setHoverKey(null)}>
                        {Array.from({ length: totalCells }).map((_, cellIdx) => {
                            const day = cellIdx - firstWeekday + 1;
                            if (day < 1 || day > daysInMonth) {
                                return <div key={cellIdx} className="h-9" />;
                            }

                            const key      = dayKey(viewYear, viewMonth, day);
                            const isStart  = key === rangeStart;
                            const isEnd    = Boolean(rangeEnd) && key === rangeEnd;
                            // Die dae tussen die twee punte kry die ligter blou balk,
                            // die begin- en einddag self kry die donkerder blou blokkie.
                            const isBetween = Boolean(rangeStart && rangeEnd && key > rangeStart && key < rangeEnd);
                            const inRange   = isStart || isEnd || isBetween;

                            return (
                                <div
                                    key={cellIdx}
                                    onMouseEnter={() => setHoverKey(key)}
                                    className={[
                                        'h-9 flex items-center justify-center',
                                        inRange ? 'bg-[var(--color-primary-soft)]' : '',
                                        // Rond die balk se punte af sodat dit soos een streep lyk
                                        isStart || (inRange && day === 1) ? 'rounded-l-full' : '',
                                        isEnd || (inRange && day === daysInMonth) ? 'rounded-r-full' : '',
                                    ].join(' ')}
                                >
                                    <button
                                        type="button"
                                        onClick={() => selectDay(key)}
                                        aria-label={formatLong(key)}
                                        aria-pressed={inRange}
                                        className={[
                                            'w-9 h-9 flex items-center justify-center text-sm rounded-full transition-colors cursor-pointer',
                                            isStart || isEnd
                                                ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold'
                                                : isBetween
                                                    ? 'text-[var(--color-text)] hover:bg-[var(--color-primary-soft-hover)]'
                                                    : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                                            !inRange && key === todayKey
                                                ? 'ring-1 ring-inset ring-[var(--color-primary)] font-semibold'
                                                : '',
                                        ].join(' ')}
                                    >
                                        {day}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Voetstuk ── */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
                        <span className="text-xs text-[var(--color-text-subtle)]">
                            {!from
                                ? 'Kies ’n dag'
                                : singleDay
                                    ? 'Druk ’n tweede dag vir ’n reeks, of dieselfde dag om af te haal'
                                    : `${formatDay(from, false)} – ${formatDay(to, true)}`}
                        </span>
                        {hasRange && (
                            <button
                                type="button"
                                onClick={() => { onChange('', ''); setHoverKey(null); }}
                                className="text-xs text-[var(--color-primary)] hover:underline shrink-0 cursor-pointer"
                            >
                                Vee uit
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';

interface TimeRangeInputProps {
    startTime: string;
    endTime: string;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
    startError?: string;
    endError?: string;
}

const TIMES = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const DEFAULT_TIME = '08:00';

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabledTimes?: string[];
}

function TimePicker({
    value,
    onChange,
    error,
    disabledTimes = [],
}: TimePickerProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeItemRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Spring dadelik (sonder scroll-animasie) na die gekose tyd -- of na 08:00
    // as niks gekies is nie -- sodra die lys oopmaak, sodat die gebruiker nooit
    // eers af hoef te rol vanaf 00:00 nie.
    useEffect(() => {
        if (open && activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    }, [open]);

    const scrollTarget = value || DEFAULT_TIME;

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={[
                    'w-full flex items-center justify-between',
                    'bg-[var(--color-bg)]',
                    'border rounded-xl',
                    'px-4 py-2.5',
                    'text-sm text-[var(--color-text)]',
                    'transition-colors',
                    'outline-none',
                    'hover:border-[var(--color-primary)]',
                    'focus:border-[var(--color-primary)]',
                    error
                        ? 'border-[var(--color-red)]'
                        : 'border-[var(--color-border)]',
                ].join(' ')}
            >
                <div className="flex items-center gap-3">
                    <Clock
                        size={17}
                        className="text-[var(--color-text-subtle)]"
                    />
                    <span
                        className={
                            value
                                ? 'text-[var(--color-text)] font-medium'
                                : 'text-[var(--color-text-subtle)]'
                        }
                    >
                        {value || 'Kies tyd'}
                    </span>
                </div>

                <ChevronDown
                    size={16}
                    className={[
                        'text-[var(--color-text-subtle)]',
                        'transition-transform duration-150',
                        open ? 'rotate-180' : '',
                    ].join(' ')}
                />
            </button>

            {open && (
                <div
                    className={[
                        'absolute z-50 left-0 right-0 mt-2',
                        'overflow-hidden rounded-xl',
                        'border border-[var(--color-border)]',
                        'bg-[var(--color-surface)]',
                        'shadow-xl',
                    ].join(' ')}
                >
                    <div className="max-h-64 overflow-y-auto p-1.5">
                        {TIMES.map((time) => {
                            const selected = value === time;
                            const disabled = disabledTimes.includes(time);
                            const isScrollTarget = time === scrollTarget;

                            return (
                                <button
                                    key={time}
                                    ref={isScrollTarget ? activeItemRef : undefined}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                        onChange(time);
                                        setOpen(false);
                                    }}
                                    className={[
                                        'w-full flex items-center justify-between',
                                        'px-3 py-2.5 rounded-lg',
                                        'text-sm text-left',
                                        'transition-colors',
                                        disabled
                                            ? 'text-[var(--color-text-subtle)] opacity-40 cursor-not-allowed'
                                            : selected
                                                ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                                                : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                                    ].join(' ')}
                                >
                                    <span className="font-medium">
                                        {time}
                                    </span>

                                    {selected && !disabled && (
                                        <Check size={16} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TimeRangeInput({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    startError,
    endError,
}: TimeRangeInputProps) {
    const disabledEndTimes = startTime
        ? TIMES.filter((time) => time <= startTime)
        : [];

    useEffect(() => {
        if (startTime && endTime && endTime <= startTime) {
            onEndTimeChange('');
        }
    }, [startTime]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-medium text-[var(--color-text-subtle)] block mb-1.5">
                    Begin Tyd
                </label>
                <TimePicker
                    value={startTime}
                    onChange={onStartTimeChange}
                    error={startError}
                />
                {startError && (
                    <p className="text-xs text-[var(--color-red)] mt-1">
                        {startError}
                    </p>
                )}
            </div>

            <div>
                <label className="text-xs font-medium text-[var(--color-text-subtle)] block mb-1.5">
                    Eind Tyd
                </label>
                <TimePicker
                    value={endTime}
                    onChange={onEndTimeChange}
                    error={endError}
                    disabledTimes={disabledEndTimes}
                />
                {endError && (
                    <p className="text-xs text-[var(--color-red)] mt-1">
                        {endError}
                    </p>
                )}
            </div>
        </div>
    );
}
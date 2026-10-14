// ========== Imports: ==========
import {
    ArrowRight, Armchair, CalendarCheck, CalendarDays, CalendarX, Lightbulb,
    MessageSquareWarning, Star, Tag, UserX, Wallet, type LucideIcon,
} from 'lucide-react';
import type { KeyFinding } from '@/lib/api/analytics';
import { IconChip } from '@/components/ui/IconChip';
import type { Tone } from '@/components/ui/Pill';

// Groen wys wat goed werk, rooi wat swak vaar (die swakste dag en resensie-kategorie) en oranje
// waar sitplekke of mense verlore gaan. Koste en gradering is net inligting en kry blou en pers.
const FINDING_META: Record<string, { icon: LucideIcon; tone: Tone }> = {
    'best-weekday':            { icon: CalendarCheck,        tone: 'green' },
    'worst-weekday':           { icon: CalendarX,            tone: 'red' },
    'best-month':              { icon: CalendarDays,         tone: 'green' },
    'best-type':               { icon: Tag,                  tone: 'green' },
    'no-show-rate':            { icon: UserX,                tone: 'orange' },
    'unused-seats':            { icon: Armchair,             tone: 'orange' },
    'cost-per-attendee':       { icon: Wallet,               tone: 'blue' },
    'weakest-review-category': { icon: MessageSquareWarning, tone: 'red' },
    'rating-vs-attendance':    { icon: Star,                 tone: 'purple' },
};

const FALLBACK_META = { icon: Lightbulb, tone: 'neutral' as Tone };

const ACTION_TINT = 'color-mix(in srgb, var(--color-primary) 10%, transparent)';

export default function KeyFindings({ findings }: { findings: KeyFinding[] | null }) {
    // Die backend kan 'n bevinding sonder waarde stuur: as genoeg geleenthede se tipe via die API op
    // null gestel is, kom "Beste tipe" terug met "undefined" in die sin. Wys so een eerder glad nie.
    const usable = findings?.filter((finding) => finding.value !== null && finding.value !== undefined) ?? null;

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
                <IconChip tone="primary" size="sm"><Lightbulb size={16} /></IconChip>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Sleutelbevindinge</h2>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        Patrone uit afgelope geleenthede, en wat jy daarmee kan doen
                    </p>
                </div>
            </div>

            {usable === null && (
                <p className="text-sm text-[var(--color-text-subtle)]">
                    Kon nie die sleutelbevindinge laai nie. Probeer later weer.
                </p>
            )}

            {usable?.length === 0 && (
                <p className="text-sm text-[var(--color-text-subtle)]">
                    Daar is nog nie genoeg afgelope geleenthede om betroubare patrone te vind nie.
                    Bevindinge verskyn sodra daar genoeg data is.
                </p>
            )}

            {usable && usable.length > 0 && (
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {usable.map((finding) => (
                        <FindingTile key={finding.key} finding={finding} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function FindingTile({ finding }: { finding: KeyFinding }) {
    const { icon: Icon, tone } = FINDING_META[finding.key] ?? FALLBACK_META;
    const { value, unit } = formatValue(finding);

    return (
        <li className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2">
                <IconChip tone={tone} size="sm"><Icon size={14} /></IconChip>
                <p className="text-xs font-medium text-[var(--color-text-subtle)]">{finding.title}</p>
            </div>

            <p className="text-2xl font-bold text-[var(--color-text)] leading-tight break-words">
                {value}
                {unit && <span className="text-sm font-medium text-[var(--color-text-subtle)] ml-1.5">{unit}</span>}
            </p>

            <p className="text-xs text-[var(--color-text)] leading-relaxed break-words">{finding.sentence}</p>

            <p
                className="mt-auto flex items-start gap-2 rounded-lg p-2.5 text-xs font-medium text-[var(--color-text)]"
                style={{ backgroundColor: ACTION_TINT }}
            >
                <ArrowRight size={14} className="text-[var(--color-primary)] shrink-0 mt-px" />
                <span className="min-w-0 break-words">{finding.action}</span>
            </p>
        </li>
    );
}

// 'n Onbekende key, soos 'n bevinding wat later in die backend bykom, wys die waarde
// net soos dit is.
function formatValue(finding: KeyFinding): { value: string; unit?: string } {
    const { key, value } = finding;
    if (typeof value !== 'number') return { value: String(value) };

    switch (key) {
        case 'no-show-rate':
            return { value: `${value}%` };
        case 'unused-seats':
            return { value: String(value), unit: value === 1 ? 'sitplek' : 'sitplekke' };
        case 'cost-per-attendee':
            return { value: `R ${value.toLocaleString('af-ZA')}` };
        case 'rating-vs-attendance':
            return { value: `${value > 0 ? '+' : ''}${value}`, unit: 'persentasiepunte' };
        default:
            return { value: String(value) };
    }
}

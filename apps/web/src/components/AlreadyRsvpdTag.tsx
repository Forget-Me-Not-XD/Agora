import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

interface AlreadyRsvpdTagProps {
    eventId: string;
}

export default function AlreadyRsvpdTag({ eventId }: AlreadyRsvpdTagProps) {
    return (
        <Link
            href={`/rsvp?highlight=${eventId}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-sm font-medium hover:border-[var(--color-primary)] transition-colors"
        >
            <CheckCircle2 size={15} className="text-emerald-500" />
            Reeds in My RSVP&apos;s
        </Link>
    );
}

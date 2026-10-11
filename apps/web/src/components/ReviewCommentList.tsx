'use client';

import { useState } from 'react';

const VISIBLE_COUNT = 5;

// Die nuutste vyf wys altyd, die res eers as daarvoor gevra word. Daar is doelbewus geen datum by
// nie, sodat dit moeiliker is om 'n kommentaar aan 'n spesifieke bywoner te koppel.
export default function ReviewCommentList({ comments }: { comments: string[] }) {
    const [showAll, setShowAll] = useState(false);

    if (comments.length === 0) {
        return <p className="text-sm text-[var(--color-text-subtle)]">Nog geen kommentaar nie.</p>;
    }

    const shown = showAll ? comments : comments.slice(0, VISIBLE_COUNT);

    return (
        <div className="space-y-3">
            <ul className="space-y-2">
                {shown.map((comment, i) => (
                    <li
                        key={i}
                        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)] whitespace-pre-line break-words"
                    >
                        {comment}
                    </li>
                ))}
            </ul>

            {comments.length > VISIBLE_COUNT && (
                <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    aria-expanded={showAll}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                    {showAll ? 'Wys minder' : `Wys alles (${comments.length})`}
                </button>
            )}
        </div>
    );
}

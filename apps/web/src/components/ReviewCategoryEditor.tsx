'use client';

// ========== Imports: ==========
import { Lock, Plus, Trash2 } from 'lucide-react';
import {
    REVIEW_CATEGORY_LIMITS,
    createDraft,
    type ReviewCategoryDraft,
    type ReviewCategoryErrors,
} from '@/lib/review-categories';

interface ReviewCategoryEditorProps {
    categories:   ReviewCategoryDraft[];
    onChange:     (categories: ReviewCategoryDraft[]) => void;
    errors:       ReviewCategoryErrors;
    ratingCount?: number;
}

export default function ReviewCategoryEditor({ categories, onChange, errors, ratingCount = 0 }: ReviewCategoryEditorProps) {
    // As daar al resensies is, sou 'n verandering ou tellings aan die verkeerde kategorie koppel.
    // Die backend weier dit in elk geval, so ons sluit die redigeerder sommer hier ook.
    const locked = ratingCount > 0;
    const canAdd = categories.length < REVIEW_CATEGORY_LIMITS.maxCount;
    const canRemove = categories.length > REVIEW_CATEGORY_LIMITS.minCount;

    // Ons verander net die naam. Die id bly op die ry, so die backend weet dis steeds dieselfde kategorie.
    function handleRename(key: string, name: string) {
        onChange(categories.map((category) => (category.key === key ? { ...category, name } : category)));
    }

    function handleRemove(key: string) {
        onChange(categories.filter((category) => category.key !== key));
    }

    function handleAdd() {
        onChange([...categories, createDraft()]);
    }

    const inputClass = (key: string) =>
        [
            'w-full bg-[var(--color-bg)] border rounded-xl px-4 py-2.5 text-sm text-[var(--color-text)]',
            'placeholder:text-[var(--color-text-subtle)] outline-none transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            errors.rows[key]
                ? 'border-[var(--color-red)]'
                : 'border-[var(--color-border)] focus:border-[var(--color-primary)]',
        ].join(' ');

    return (
        <div className="space-y-2">
            <div>
                <label className="text-xs font-medium text-[var(--color-text-subtle)] block">
                    Resensie-kategorieë
                </label>
                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                    Bywoners beoordeel die geleentheid ná afloop op elkeen van hierdie kategorieë.
                </p>
            </div>

            {locked && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text-subtle)]">
                    <Lock size={14} className="shrink-0 mt-0.5" />
                    <span>
                        Hierdie geleentheid het reeds {ratingCount} {ratingCount === 1 ? 'resensie' : 'resensies'} ontvang.
                        Die kategorieë kan nie meer verander word nie, sodat die bestaande tellings geldig bly.
                    </span>
                </div>
            )}

            {categories.map((category, index) => (
                <div key={category.key}>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Kategorienaam..."
                            aria-label={`Kategorie ${index + 1}`}
                            value={category.name}
                            onChange={(e) => handleRename(category.key, e.target.value)}
                            maxLength={REVIEW_CATEGORY_LIMITS.maxNameLength}
                            disabled={locked}
                            className={inputClass(category.key)}
                        />
                        {!locked && (
                            <button
                                type="button"
                                onClick={() => handleRemove(category.key)}
                                disabled={!canRemove}
                                aria-label={`Verwyder ${category.name.trim() || `kategorie ${index + 1}`}`}
                                title={canRemove ? 'Verwyder kategorie' : 'Daar moet ten minste een kategorie wees'}
                                className="shrink-0 p-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-subtle)] hover:text-[var(--color-red)] hover:border-[var(--color-red)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-subtle)] disabled:hover:border-[var(--color-border)]"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    {errors.rows[category.key] && (
                        <p className="text-xs text-[var(--color-red)] mt-1">{errors.rows[category.key]}</p>
                    )}
                </div>
            ))}

            {!locked && (
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!canAdd}
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                >
                    <Plus size={14} />
                    Voeg kategorie by ({categories.length}/{REVIEW_CATEGORY_LIMITS.maxCount})
                </button>
            )}

            {errors.list && (
                <p className="text-xs text-[var(--color-red)] mt-1">{errors.list}</p>
            )}
        </div>
    );
}

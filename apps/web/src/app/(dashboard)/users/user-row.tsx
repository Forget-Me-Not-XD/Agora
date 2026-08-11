'use client';

// ========== Imports: ==========
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { getRoleLabel, getRoleBadgeColor, ALL_USER_TAGS, getTagLabel, getTagBadgeColor } from '@/lib/rbac';
import { updateUserTagsAction } from '@/lib/actions/user.actions';
import type { UserResponseDto, UserTag } from '@/lib/api/users';
import type { UserRole } from '@/lib/mock-data';

interface UserRowProps {
    user: UserResponseDto;
}

export default function UserRow({ user }: UserRowProps) {
    const [open, setOpen]             = useState(false);
    const [tags, setTags]             = useState<UserTag[]>(user.tags);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState<string | null>(null);

    const availableTags = ALL_USER_TAGS.filter((t) => !tags.includes(t.value));

    async function persistTags(next: UserTag[], previous: UserTag[]) {
        setTags(next);
        setError(null);
        setSaving(true);
        const res = await updateUserTagsAction(user.id, next);
        setSaving(false);
        if (res.error) {
            setError(res.error);
            setTags(previous);
        }
    }

    function addTag(tag: UserTag) {
        setPickerOpen(false);
        void persistTags([...tags, tag], tags);
    }

    function removeTag(tag: UserTag) {
        void persistTags(tags.filter((t) => t !== tag), tags);
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="w-full grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-5 py-4 items-center hover:bg-[var(--color-bg)] transition-colors text-left"
            >
                <p className="text-sm font-medium text-[var(--color-text)]">
                    {user.name} {user.surname}
                </p>
                <p className="text-sm text-[var(--color-text-subtle)] truncate">
                    {user.email}
                </p>
                <div>
                    <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user.role as UserRole)}`}
                    >
                        {getRoleLabel(user.role as UserRole)}
                    </span>
                </div>
                <p className="text-sm text-[var(--color-text-subtle)]">
                    {user.studyCenter}
                </p>
                <div>
                    <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                    >
                        {user.isActive ? 'Aktief' : 'Onaktief'}
                    </span>
                </div>
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                            <h3 className="text-sm font-bold text-[var(--color-text)]">
                                {user.name} {user.surname}
                            </h3>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Tags -- direk onder die naam */}
                            <div>
                                <p className="text-xs font-medium text-[var(--color-text-subtle)] mb-2">Tags</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${getTagBadgeColor(tag)}`}
                                        >
                                            {getTagLabel(tag)}
                                            <button
                                                onClick={() => removeTag(tag)}
                                                className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                aria-label={`Verwyder ${getTagLabel(tag)}`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}

                                    <div className="relative">
                                        <button
                                            onClick={() => setPickerOpen((v) => !v)}
                                            disabled={availableTags.length === 0 || saving}
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            aria-label="Voeg tag by"
                                        >
                                            <Plus size={14} />
                                        </button>

                                        {pickerOpen && availableTags.length > 0 && (
                                            <div className="absolute left-0 top-8 z-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                                                {availableTags.map((t) => (
                                                    <button
                                                        key={t.value}
                                                        onClick={() => addTag(t.value)}
                                                        className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {error && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>}
                            </div>

                            {/* Gebruiker-inligting */}
                            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--color-text-subtle)]">E-pos</span>
                                    <span className="text-[var(--color-text)]">{user.email}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-[var(--color-text-subtle)]">Rol</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user.role as UserRole)}`}>
                                        {getRoleLabel(user.role as UserRole)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--color-text-subtle)]">Studiesentrum</span>
                                    <span className="text-[var(--color-text)]">{user.studyCenter || 'Onbekend'}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-[var(--color-text-subtle)]">Status</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            user.isActive
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                        }`}
                                    >
                                        {user.isActive ? 'Aktief' : 'Onaktief'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

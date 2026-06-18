// ========== Imports: ==========
import { getCurrentUser } from '@/lib/get-current-user';
import ProfileForm        from './profile-form';

export default function ProfilePage() {
    const user = getCurrentUser();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">My Profiel</h1>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    Bestuur jou profielinligting
                </p>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg">
                <ProfileForm user={user} />
            </div>
        </div>
    );
}
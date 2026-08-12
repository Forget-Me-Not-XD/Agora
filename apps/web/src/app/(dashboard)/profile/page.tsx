// ========== Imports: ==========
import { getCurrentUser } from '@/lib/get-current-user';
import { getCalendarStatusAction } from '@/lib/actions/calendar.actions';
import ProfileForm          from './profile-form';
import CalendarConnections  from './calendar-connections';
import DeleteAccountSection from './delete-account-section';

export default async function ProfilePage() {
    const user = getCurrentUser();
    const calendarStatus = (await getCalendarStatusAction()) ?? {
        google: false,
        microsoft: false,
        googleAccountEmail: null,
        microsoftAccountEmail: null,
    };

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

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg">
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Kalender-koppelinge</h2>
                <CalendarConnections initialStatus={calendarStatus} />
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg">
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Gevaarsone</h2>
                <p className="text-xs text-[var(--color-text-subtle)] mb-4">
                    Hierdie aksie is permanent en kan nie ongedaan gemaak word nie.
                </p>
                <DeleteAccountSection />
            </div>
        </div>
    );
}
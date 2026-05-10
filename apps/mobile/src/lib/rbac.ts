import type { MockEvent, EventStatus } from './mock-data';
import type { UserRole } from './mock-data';

export function canCreateEvents(role: UserRole): boolean {
  return role === 'DOSENT' || role === 'ADMIN';
}

export function canViewBudget(role: UserRole): boolean {
  return role === 'DOSENT' || role === 'ADMIN';
}

export function canViewInsights(role: UserRole): boolean {
  return role === 'DOSENT' || role === 'ADMIN';
}

export function canManageCheckIns(role: UserRole): boolean {
  return role === 'DOSENT' || role === 'ADMIN';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canRsvpToEvent(role: UserRole): boolean {
  return role === 'STUDENT' || role === 'GAS';
}

function isActiveStatus(status: EventStatus): boolean {
  return status === 'upcoming' || status === 'ongoing';
}

export function filterEventsForUser(
  events: MockEvent[],
  userId: string,
  role: UserRole,
): MockEvent[] {
  switch (role) {
    case 'ADMIN':
      return events;

    case 'DOSENT':
      return events.filter(
        (e) => isActiveStatus(e.status) || e.createdBy === userId,
      );

    case 'STUDENT':
      return events.filter((e) => {
        const active = isActiveStatus(e.status);
        const visible =
          e.type === 'public' ||
          e.type === 'internal_student' ||
          e.invitedUsers.includes(userId);
        return active && visible;
      });

    case 'GAS':
      return events.filter((e) => {
        const active = isActiveStatus(e.status);
        const visible = e.type === 'public' || e.invitedUsers.includes(userId);
        return active && visible;
      });

    default:
      return [];
  }
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMIN: 'Administrateur',
    DOSENT: 'Dosent',
    STUDENT: 'Student',
    GAS: 'GAS Lid',
  };
  return labels[role] ?? role;
}
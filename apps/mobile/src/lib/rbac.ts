export type UserRole = 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';

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

export function canViewNotifications(role: UserRole): boolean {
  return role === 'PHOTOGRAPHER';
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMIN: 'Administrateur',
    DOSENT: 'Dosent',
    STUDENT: 'Student',
    GAS: 'GAS Lid',
    PHOTOGRAPHER: 'Fotograaf'
  };
  return labels[role] ?? role;
}
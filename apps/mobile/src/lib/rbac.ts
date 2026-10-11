export type UserRole = 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';

export function canCreateEvents(role: UserRole): boolean {
  return role === 'DOSENT' || role === 'ADMIN';
}

export function canViewInsights(role: UserRole): boolean {
  return role === 'DOSENT' || role === 'ADMIN';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN';
}

// Dieselfde reël as die backend se assertOwnership en die web se canManageEvent: 'n admin bestuur
// alle geleenthede, 'n dosent net dié wat die dosent self geskep het. Dit bepaal die resensies,
// RSVP-bestuur en die QR-skandeerder.
export function canManageEvent(role: UserRole, userId: string | undefined, createdBy: string): boolean {
  return role === 'ADMIN' || (role === 'DOSENT' && userId !== undefined && createdBy === userId);
}

// Soos op die web: die begroting is vir wie die geleentheid bestuur, en vir die gebruiker met die
// Finansies-tag wat spesifiek daaraan toegeken is
export function canViewBudget(
  role: UserRole,
  userId: string | undefined,
  event: { createdBy: string; assignedTo: string | null },
): boolean {
  return canManageEvent(role, userId, event.createdBy) || (userId !== undefined && event.assignedTo === userId);
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
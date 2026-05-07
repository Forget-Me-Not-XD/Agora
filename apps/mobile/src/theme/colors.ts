/**
 * Legacy static palette.
 *
 * Prefer `useThemeColors()` from `src/theme/theme.ts` for any new work.
 */
export const colors = {
    // Primary
    navy:      '#1E3A5F',
    blue:      '#1E40AF',
    lightBlue: '#3B82F6',
  
    // Accents
    green:  '#16A34A',
    red:    '#DC2626',
    amber:  '#D97706',
  
    // Greys
    text:        '#111827',
    textSubtle:  '#6B7280',
    border:      '#E5E7EB',
    background:  '#F9FAFB',
    surface:     '#FFFFFF',
  
    // Role colours (matching sitemap)
    roleAdmin:  '#5C77A5',
    roleDosent: '#8AB4F8',
    roleGas:    '#F28B82',
  } as const;
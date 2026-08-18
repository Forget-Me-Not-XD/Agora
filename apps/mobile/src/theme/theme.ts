import { useMemo } from 'react';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, Theme as NavTheme } from '@react-navigation/native';
import { useThemeStore } from '../stores/theme.store';

export type ThemeColors = {
  // Brand
  primary: string;
  primaryText: string;
  navy: string;

  // UI
  background: string;
  surface: string;
  border: string;
  text: string;
  textSubtle: string;

  // Status
  red: string;
  blue: string;

  // Role colors
  roleAdmin: string;
  roleDosent: string;
  roleGas: string;
};

const light: ThemeColors = {
  primary: '#0E7A88',      // darkened from mock teal for AA contrast on light backgrounds
  primaryText: '#FFFFFF',
  navy: '#1E3A5F',

  background: '#F5F9FC',
  surface: '#FFFFFF',
  border: '#D8E1EA',
  text: '#0F172A',
  textSubtle: '#475569',

  red: '#DC2626',
  blue: '#1E40AF',

  roleAdmin: '#5C77A5',
  roleDosent: '#8AB4F8',
  roleGas: '#F28B82',
};

const dark: ThemeColors = {
  primary: '#14B8C7',
  primaryText: '#07131A',
  navy: '#9FB7D9',

  background: '#0B1A24',
  surface: '#0F2533',
  border: '#1D3B4C',
  text: '#E6EEF6',
  textSubtle: '#8AA4B8',

  red: '#F87171',
  blue: '#60A5FA',

  roleAdmin: '#5C77A5',
  roleDosent: '#8AB4F8',
  roleGas: '#F28B82',
};

export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useThemeStore((s) => s.systemScheme);
  return useMemo(() => {
    const scheme = mode === 'system' ? systemScheme : mode;
    return scheme === 'dark' ? dark : light;
  }, [mode, systemScheme]);
}

export function useNavTheme(): NavTheme {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useThemeStore((s) => s.systemScheme);
  const colors = useThemeColors();

  return useMemo(() => {
    const scheme = mode === 'system' ? systemScheme : mode;
    const base = scheme === 'dark' ? NavDarkTheme : NavLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        border: colors.border,
        text: colors.text,
        primary: colors.primary,
      },
    };
  }, [mode, systemScheme, colors]);
}

export function useStatusBarStyle(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useThemeStore((s) => s.systemScheme);
  const scheme = mode === 'system' ? systemScheme : mode;
  return scheme === 'dark' ? 'light' : 'dark';
}


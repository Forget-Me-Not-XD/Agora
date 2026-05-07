import { Appearance, ColorSchemeName } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme.mode';

interface ThemeState {
  mode: ThemeMode;
  systemScheme: Exclude<ColorSchemeName, null>;
  isHydrated: boolean;

  initialize: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  setSystemScheme: (scheme: Exclude<ColorSchemeName, null>) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  systemScheme: (Appearance.getColorScheme() ?? 'light') as Exclude<ColorSchemeName, null>,
  isHydrated: false,

  initialize: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      const mode = (stored as ThemeMode | null) ?? 'system';
      if (mode === 'system' || mode === 'light' || mode === 'dark') {
        set({ mode, isHydrated: true });
      } else {
        set({ mode: 'system', isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
    } catch {
      // ignore persistence failures
    }
  },

  setSystemScheme: (scheme) => set({ systemScheme: scheme }),
}));


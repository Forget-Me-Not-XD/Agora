import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import ResponseProvider from './src/providers/ResponseProvider';
import { useAuthStore } from './src/stores/auth.store';
import { useThemeStore } from './src/stores/theme.store';
import { useNavTheme, useStatusBarStyle, useThemeColors } from './src/theme/theme';

export default function App() {
  const { initialize, isLoading } = useAuthStore();
  const themeInit = useThemeStore((s) => s.initialize);
  const setSystemScheme = useThemeStore((s) => s.setSystemScheme);
  const themeHydrated = useThemeStore((s) => s.isHydrated);
  const colors = useThemeColors();
  const navTheme = useNavTheme();
  const statusBarStyle = useStatusBarStyle();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    themeInit();
  }, [themeInit]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme ?? 'light') as 'light' | 'dark');
    });
    return () => sub.remove();
  }, [setSystemScheme]);

  if (isLoading || !themeHydrated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ResponseProvider>
        <NavigationContainer theme={navTheme}>
          <AppNavigator />
          <StatusBar style={statusBarStyle} />
        </NavigationContainer>
      </ResponseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // background set inline now (dynamic theme)
  },
});
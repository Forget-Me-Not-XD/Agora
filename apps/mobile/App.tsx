import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator, View, StyleSheet, Appearance, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import ResponseProvider from './src/providers/ResponseProvider';
import { useAuthStore } from './src/stores/auth.store';
import { useThemeStore } from './src/stores/theme.store';
import { useNavTheme, useStatusBarStyle, useThemeColors, useIsDark } from './src/theme/theme';

export default function App() {
  const { initialize, isLoading } = useAuthStore();
  const themeInit = useThemeStore((s) => s.initialize);
  const setSystemScheme = useThemeStore((s) => s.setSystemScheme);
  const themeHydrated = useThemeStore((s) => s.isHydrated);
  const colors = useThemeColors();
  const navTheme = useNavTheme();
  const statusBarStyle = useStatusBarStyle();
  const isDark = useIsDark();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Android SDK 54+ dwing edge-to-edge af -- die navigasiestaaf se agtergrond kan
  // nie meer self gekleur word nie (dis deurskynend en wys ons eie inhoud daaronder;
  // sien androidNavigationBar.enforceContrast:false in app.json wat Android se eie
  // verduisterings-oorlegsel agter die staaf afskakel). Ons stel steeds die ikoon-
  // kleur (lig/donker) sodat dit leesbaar bly oor ons agtergrond.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setStyle(isDark ? 'light' : 'dark');
  }, [isDark]);

  // Enige gebied wat nie deur 'n RN-view geverf word nie (bv. agter die
  // deurskynende stelsel-navigasiestaaf onder edge-to-edge) val terug op die
  // native VENSTER se eie agtergrond -- wat verstek swart is tensy ons dit self
  // stel. expo-system-ui is die amptelike manier om dit te doen; dit is nie
  // dieselfde as expo-navigation-bar hierbo nie (daardie een stel net die
  // ikoonkleur, nie meer die agtergrond onder edge-to-edge nie).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

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
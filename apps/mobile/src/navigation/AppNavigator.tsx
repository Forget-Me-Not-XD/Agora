import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationsStore } from '../stores/notifications.store';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { canViewNotifications } from '../lib/rbac';
import { startAppPrefetch } from '../lib/prefetch';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { QrScannerScreen } from '../screens/QrScannerScreen';
import { RsvpManagementScreen } from '../screens/RsvpManagementScreen';
import { AdminCreateUserScreen } from '../screens/AdminCreateScreen';
import { AdminUsersScreen } from '../screens/AdminUsersScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PopiaScreen } from '../screens/PopiaScreen';
import { MainTabs } from './MainTabs';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ChangePassword: undefined;
  AppLoading: undefined;
  Onboarding: undefined;
  Main: undefined;
  Settings: undefined;
  Profile: undefined;
  EventDetail: { eventId: string };
  QrScanner: { eventId: string };
  RsvpManagement: { eventId: string };
  AdminCreateUser: undefined;
  AdminUsers: undefined;
  Insights: undefined;
  Popia: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_KEY_PREFIX = 'agora.onboardingSeen.';

export function AppNavigator() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();

  // null = "nog nie bevestig nie" (SecureStore-opsoek loop steeds),
  // true/false = die werklike gestoorde waarde vir hierdie gebruiker.
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboardingSeen(null);
      return;
    }
    let active = true;
    SecureStore.getItemAsync(`${ONBOARDING_KEY_PREFIX}${user.id}`).then((value) => {
      if (active) setOnboardingSeen(value === 'true');
    });
    return () => { active = false; };
  }, [user?.id]);

  function completeOnboarding() {
    if (user) {
      SecureStore.setItemAsync(`${ONBOARDING_KEY_PREFIX}${user.id}`, 'true');
    }
    setOnboardingSeen(true);
  }

  // Die oomblik 'n gebruiker aanmeld/registreer (of stilweg outo-aanmeld op
  // app-oopmaak via 'n gestoorde token) moet die res van die app se data reeds
  // agtergrond toe begin laai -- die laai-hek hieronder wys die Lottie-
  // spinner totdat dit klaar is (of 'n redelike tydgrens verstryk het, sodat
  // 'n stadige/gebroke netwerk die gebruiker nooit vir altyd vasvang nie).
  // `prefetchReadyId` hou watter gebruiker se sessie reeds klaar voorgelaai
  // is -- 'n nuwe aanmelding (selfs dieselfde gebruiker, ná afmeld) kry altyd
  // 'n vars voorlaai, nooit die vorige sessie se resultaat nie.
  const [prefetchReadyId, setPrefetchReadyId] = useState<string | null>(null);
  const prefetchStartedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      prefetchStartedFor.current = null;
      setPrefetchReadyId(null);
      return;
    }
    if (user.mustChangePassword) return; // eers ná wagwoordverandering die moeite werd
    if (prefetchStartedFor.current === user.id) return;
    prefetchStartedFor.current = user.id;

    let active = true;
    const isStaff = user.role === 'ADMIN' || user.role === 'DOSENT';
    const notifPromise = canViewNotifications(user.role)
      ? useNotificationsStore.getState().load()
      : Promise.resolve();

    const MAX_WAIT_MS = 6000;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));

    Promise.race([
      Promise.all([startAppPrefetch(isStaff), notifPromise]).then(() => {}),
      timeout,
    ]).finally(() => {
      if (active) setPrefetchReadyId(user.id);
    });

    return () => { active = false; };
  }, [user?.id, user?.mustChangePassword]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        user.mustChangePassword ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : prefetchReadyId !== user.id ? (
          <Stack.Screen name="AppLoading">
            {() => <AppLoadingGate />}
          </Stack.Screen>
        ) : onboardingSeen === null ? (
          <Stack.Screen name="Onboarding">
            {() => (
              <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.navy} />
              </View>
            )}
          </Stack.Screen>
        ) : onboardingSeen === false ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onDone={completeOnboarding} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="QrScanner" component={QrScannerScreen} />
            <Stack.Screen name="RsvpManagement" component={RsvpManagementScreen} />
            <Stack.Screen name="AdminCreateUser" component={AdminCreateUserScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="Insights" component={InsightsScreen} />
            <Stack.Screen name="Popia" component={PopiaScreen} />
          </>
        )
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Popia" component={PopiaScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Vol-skerm Lottie-laaihek, tussen aanmeld/registrasie en die res van die
// app -- volg die tema (lig/donker) presies soos elke ander skerm, sodat
// daar nooit 'n wit/swart flits van die verkeerde modus is nie.
function AppLoadingGate() {
  const colors = useThemeColors();
  const gateStyles = gateStylesFor(colors);
  return (
    <View style={gateStyles.wrap}>
      <LoadingSpinner size={140} />
      <Text style={gateStyles.caption}>Besig om alles gereed te kry…</Text>
    </View>
  );
}

function gateStylesFor(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 16,
    },
    caption: { ...typography.body, color: colors.textSubtle },
  });
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

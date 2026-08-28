import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationsStore } from '../stores/notifications.store';
import { useThemeColors } from '../theme/theme';
import { canViewNotifications } from '../lib/rbac';
import { startOnboardingPrefetch } from '../lib/prefetch';
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

  // Terwyl 'n nuwe gebruiker die onboarding-teks lees, is dit dooie tyd wat ons
  // kan gebruik om reeds die eerste data agtergrond toe te laai -- teen die tyd
  // hulle by die Tuisblad uitkom, wag hulle nie vir 'n netwerkoproep wat klaar
  // klaar is nie. Vuur net een keer af sodra die onboarding-skerm wys.
  useEffect(() => {
    if (!user || onboardingSeen !== false) return;
    const isStaff = user.role === 'ADMIN' || user.role === 'DOSENT';
    startOnboardingPrefetch(isStaff);
    if (canViewNotifications(user.role)) {
      useNotificationsStore.getState().load();
    }
  }, [user?.id, onboardingSeen]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        user.mustChangePassword ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
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

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

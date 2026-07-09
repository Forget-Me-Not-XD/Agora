import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { QrScannerScreen } from '../screens/QrScannerScreen';
import { RsvpManagementScreen } from '../screens/RsvpManagementScreen';
import { AdminCreateUserScreen } from '../screens/AdminCreateScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MainTabs } from './MainTabs';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Settings: undefined;
  Profile: undefined;
  EventDetail: { eventId: string };
  QrScanner: { eventId: string };
  RsvpManagement: { eventId: string };
  AdminCreateUser: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const user = useAuthStore((s) => s.user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="QrScanner" component={QrScannerScreen} />
          <Stack.Screen name="RsvpManagement" component={RsvpManagementScreen} />
          <Stack.Screen name="AdminCreateUser" component={AdminCreateUserScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
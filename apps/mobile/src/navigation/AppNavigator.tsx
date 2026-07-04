import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { QrScannerScreen } from '../screens/QrScannerScreen';
import { AdminCreateUserScreen } from '../screens/AdminCreateScreen';
import { MainTabs } from './MainTabs';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Settings: undefined;
  EventDetail: { eventId: string };
  QrScanner: { eventId: string };
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
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="QrScanner" component={QrScannerScreen} />
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
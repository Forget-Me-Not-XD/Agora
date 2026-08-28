import { useEffect } from 'react';
import type { ComponentProps, ComponentType } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { useAuthStore } from '../stores/auth.store';
import { canViewNotifications } from '../lib/rbac';
import type { UserRole } from '../lib/rbac';
import { useNotificationsStore } from '../stores/notifications.store';
import { DashboardScreen } from '../screens/DashboardScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { RsvpScreen } from '../screens/RsvpScreen';
import { AiScreen } from '../screens/AiScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

export type MainTabParamList = {
  Home: undefined;
  Events: undefined;
  Calendar: undefined;
  Rsvp: undefined;
  Ai: undefined;
  Notifications: undefined;
};

type TabName = keyof MainTabParamList;

interface TabConfig {
  name: TabName;
  component: ComponentType;
  title: string;
  icon: ComponentProps<typeof Feather>['name'];
  visible: (role: UserRole) => boolean;
}

const ALWAYS = () => true;

// Een plek om te sien watter oortjies bestaan, en presies wie elkeen mag sien --
// 'n nuwe rol-spesifieke oortjie beteken net 'n nuwe ry hier, nie 'n nuwe
// handgemaakte {condition && <Tab.Screen .../>} blok nie.
const TAB_CONFIG: TabConfig[] = [
  { name: 'Home', component: DashboardScreen, title: 'Tuis', icon: 'grid', visible: ALWAYS },
  { name: 'Events', component: EventsScreen, title: 'Funksies', icon: 'copy', visible: ALWAYS },
  { name: 'Calendar', component: CalendarScreen, title: 'Kalender', icon: 'calendar', visible: ALWAYS },
  { name: 'Rsvp', component: RsvpScreen, title: 'RSVP', icon: 'check-square', visible: ALWAYS },
  {
    name: 'Ai',
    component: AiScreen,
    title: 'KI',
    icon: 'cpu',
    visible: (role) => role === 'ADMIN' || role === 'DOSENT',
  },
  {
    name: 'Notifications',
    component: NotificationsScreen,
    title: 'Kennisgewings',
    icon: 'bell',
    visible: canViewNotifications,
  },
];

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'STUDENT';

  const canSeeNotifications = canViewNotifications(role);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const loadNotifications = useNotificationsStore((s) => s.load);

  // Laai kennisgewings sodra 'n fotograaf aan meldd, sodat die kenteken reg is
  useEffect(() => {
    if (canSeeNotifications) {
      loadNotifications();
    }
  }, [canSeeNotifications, loadNotifications]);

  const visibleTabs = TAB_CONFIG.filter((tab) => tab.visible(role));

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Feather name={tab.icon} color={color} size={size ?? 20} />,
            tabBarBadge: tab.name === 'Notifications' && unreadCount > 0 ? unreadCount : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

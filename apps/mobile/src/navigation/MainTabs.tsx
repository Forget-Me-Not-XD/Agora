import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { useAuthStore } from '../stores/auth.store';
import { DashboardScreen } from '../screens/DashboardScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { RsvpScreen } from '../screens/RsvpScreen';
import { AiScreen } from '../screens/AiScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { useEffect } from 'react';
import { canViewNotifications } from '../lib/rbac';
import { useNotificationsStore } from '../stores/notifications.store';

export type MainTabParamList = {
  Home: undefined;
  Events: undefined;
  Calendar: undefined;
  Rsvp: undefined;
  Ai: undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const canViewAi = user?.role === 'ADMIN' || user?.role === 'DOSENT';

  const canSeeNotifications = !!user && canViewNotifications(user.role);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const loadNotifications = useNotificationsStore((s) => s.load);

  // Laai kennisgewings sodra 'n fotograaf aan meldd, sodat die kenteken reg is
  useEffect(() => {
    if (canSeeNotifications) {
      loadNotifications();
    }
  }, [canSeeNotifications,loadNotifications]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Tuis',
          tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size ?? 20} />,
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          title: 'Funksies',
          tabBarIcon: ({ color, size }) => <Feather name="copy" color={color} size={size ?? 20} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Kalender',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size ?? 20} />,
        }}
      />
      <Tab.Screen
        name="Rsvp"
        component={RsvpScreen}
        options={{
          title: 'RSVP',
          tabBarIcon: ({ color, size }) => <Feather name="check-square" color={color} size={size ?? 20} />,
        }}
      />
      {canViewAi && (
        <Tab.Screen
          name="Ai"
          component={AiScreen}
          options={{
            title: 'KI',
            tabBarIcon: ({ color, size }) => <Feather name="cpu" color={color} size={size ?? 20} />,
          }}
        />
      )}
      {canSeeNotifications && (
        <Tab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: 'Kennisgewings',
            tabBarIcon: ({ color, size }) => <Feather name="bell" color={color} size={size ?? 20} />,
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
      )}
    </Tab.Navigator>
  );
}


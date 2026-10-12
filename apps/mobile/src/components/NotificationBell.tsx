import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useNotificationsStore } from '../stores/notifications.store';
import { useThemeColors, type ThemeColors } from '../theme/theme';

// Die klokkie bo-aan elke oortjie, soos die web s'n in die header. Dit lees net die store se
// ongelees-telling. Daar is geen poll nie; die lys word gelaai as die app oopmaak, as Tuis fokus
// kry, as die Kennisgewings-skerm oopmaak en ná 'n resensie.
export function NotificationBell() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => navigation.navigate('Notifications')}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Kennisgewings, ${unreadCount} ongelees` : 'Kennisgewings'}
    >
      <Feather name="bell" size={18} color={colors.text} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    btn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: colors.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  });
}

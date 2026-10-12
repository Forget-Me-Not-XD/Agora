import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { NotificationItem } from '../api/notifications';
import { useThemeColors } from "../theme/theme";
import { useNotificationsStore } from "../stores/notifications.store";
import { safeGoBack } from '../lib/navigation';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { typography } from '../theme/typography';

const AF_MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${AF_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Die resensievel is deursigtig en lê bo-oor hierdie skerm, so TalkBack moet dit dan nie lees nie
  const isFocused = useIsFocused();

  const items     = useNotificationsStore((s) => s.items);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const error     = useNotificationsStore((s) => s.error);
  const load      = useNotificationsStore((s) => s.load);
  const markRead  = useNotificationsStore((s) => s.markRead);

  // laai elke keer wat die skerm oop gemaak word
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 'n Resensieversoek maak die resensievel oop. Ander kennisgewings word net as gelees gemerk,
  // soos voorheen. Ons wag nie vir markRead nie: as dit misluk, hanteer die store dit self.
  function openNotification(item: NotificationItem) {
    if (!item.read) markRead(item._id);
    if (item.type === 'RESENSIE_VERSOEK' && item.event) {
      navigation.navigate('Review', { eventId: item.event._id });
    }
  }

  return (
    <SafeAreaView style={styles.safe} importantForAccessibility={isFocused ? 'auto' : 'no-hide-descendants'}>
      {/* Header */}
      <ScreenHeader title="Kennisgewings" onBack={() => safeGoBack(navigation)} />

      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <LoadingSpinner size={72} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={32} color={colors.red} />
          <Text style={styles.emptyTitle}>Kon nie laai nie</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="bell" size={32} color={colors.textSubtle} />
          <Text style={styles.emptyTitle}>Geen kennisgewings nie</Text>
          <Text style={styles.emptySubtitle}>Jy het tans geen kennisgewings nie</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const isReviewRequest = item.type === 'RESENSIE_VERSOEK';
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => openNotification(item)}
                accessibilityLabel={item.message}
                accessibilityHint={isReviewRequest && item.event ? 'Maak die resensie oop' : undefined}
              >
                <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : colors.red }]} />
                <View style={styles.cardContent}>
                  <Text style={[styles.message, !item.read && styles.messageUnread]}>
                    {item.message}
                  </Text>
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
                {isReviewRequest && (
                  <Feather name="star" size={18} color={item.read ? colors.textSubtle : colors.primary} style={styles.icon} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background},

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    emptySubtitle: {
      fontSize: 16,
      color: colors.textSubtle,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 24,
    },

    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
    cardContent: { flex: 1 },
    icon: { marginTop: 1 },
    message: { ...typography.bodyRegular, color: colors.textSubtle, lineHeight: 20 },
    messageUnread: { color: colors.text, fontWeight: '800' },
    date: { ...typography.caption, color: colors.textSubtle, marginTop: 6 },
  });
}
import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";
import { useThemeColors } from "../theme/theme";
import { useNotificationsStore } from "../stores/notifications.store";

const AF_MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${AF_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Kennisgewings</Text>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
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
          {items.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => { if (!item.read) markRead(item._id); }}
              accessibilityLabel={item.message}
            >
              <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : colors.red }]} />
              <View style={styles.cardContent}>
                <Text style={[styles.message, !item.read && styles.messageUnread]}>
                  {item.message}
                </Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background},

    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
    pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text },

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
    message: { fontSize: 16, color: colors.textSubtle, lineHeight: 20, fontWeight: '600' },
    messageUnread: { color: colors.text, fontWeight: '800' },
    date: { fontSize: 16, color: colors.textSubtle, fontWeight: '700', marginTop: 6 },
  });
}
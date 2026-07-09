import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useThemeColors } from '../theme/theme';
import { getEvent, type EventResponse } from '../api/events';
import { getEventRsvps, cancelRsvp, checkInRsvp, type RsvpWithUser, type RsvpStatus } from '../api/rsvp';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RsvpManagement'>;
type Route = RouteProp<RootStackParamList, 'RsvpManagement'>;

const STATUS_LABELS: Record<RsvpStatus, string> = {
  BEVESTIG: 'Bevestig',
  HANGENDE: 'Hangende',
  GEKANSELLEER: 'Gekanselleer',
};

const BADGE_COLORS_LIGHT: Record<RsvpStatus, { bg: string; text: string }> = {
  BEVESTIG: { bg: '#D1FAE5', text: '#065F46' },
  HANGENDE: { bg: '#FEF3C7', text: '#92400E' },
  GEKANSELLEER: { bg: '#F3F4F6', text: '#4B5563' },
};

const BADGE_COLORS_DARK: Record<RsvpStatus, { bg: string; text: string }> = {
  BEVESTIG: { bg: '#064E3B', text: '#6EE7B7' },
  HANGENDE: { bg: '#78350F', text: '#FCD34D' },
  GEKANSELLEER: { bg: '#1F2937', text: '#9CA3AF' },
};

function attendeeName(rsvp: RsvpWithUser): string {
  if (rsvp.user) return `${rsvp.user.name} ${rsvp.user.surname}`;
  return rsvp.guestName ?? 'Onbekende gas';
}

export function RsvpManagementScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const colors = useThemeColors();
  const isDark = colors.background === '#0B1A24';
  const badgeColors = isDark ? BADGE_COLORS_DARK : BADGE_COLORS_LIGHT;
  const styles = makeStyles(colors);

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [rsvps, setRsvps] = useState<RsvpWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [eventRes, rsvpRes] = await Promise.all([
        getEvent(route.params.eventId),
        getEventRsvps(route.params.eventId),
      ]);
      setEvent(eventRes);
      setRsvps(rsvpRes);
    } catch {
      setLoadError('Kon nie RSVPs laai nie.');
    } finally {
      setLoading(false);
    }
  }, [route.params.eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCheckIn(rsvp: RsvpWithUser) {
    setBusyId(rsvp.id);
    try {
      const updated = await checkInRsvp(rsvp.id);
      setRsvps((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      Alert.alert(
        'Kon nie inteken nie',
        status === 409 ? 'Hierdie gas het reeds ingeteken.' : 'Probeer asseblief weer.',
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleCancel(rsvp: RsvpWithUser) {
    Alert.alert(
      'Kanselleer RSVP',
      `Kanselleer die RSVP van ${attendeeName(rsvp)}?`,
      [
        { text: 'Nee', style: 'cancel' },
        {
          text: 'Kanselleer',
          style: 'destructive',
          onPress: async () => {
            setBusyId(rsvp.id);
            try {
              await cancelRsvp(rsvp.id);
              setRsvps((prev) =>
                prev.map((r) => (r.id === rsvp.id ? { ...r, status: 'GEKANSELLEER' as RsvpStatus } : r)),
              );
            } catch {
              Alert.alert('Kon nie kanselleer nie', 'Probeer asseblief weer.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  const activeRsvps = rsvps.filter((r) => r.status !== 'GEKANSELLEER');
  const checkedInCount = activeRsvps.filter((r) => r.checkedIn).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Terug">
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {event ? event.title : 'Bestuur RSVPs'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.centerWrap}>
          <Feather name="alert-circle" size={32} color={colors.textSubtle} />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{checkedInCount}</Text>
              <Text style={styles.statLabel}>Ingemeld</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeRsvps.length}</Text>
              <Text style={styles.statLabel}>Aktief</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{rsvps.length}</Text>
              <Text style={styles.statLabel}>Totaal</Text>
            </View>
          </View>

          {rsvps.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen RSVPs vir hierdie funksie nie.</Text>
          ) : (
            rsvps.map((rsvp) => (
              <View key={rsvp.id} style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{attendeeName(rsvp)}</Text>
                  <Text style={styles.rowMeta}>{rsvp.user ? rsvp.user.email : 'Walk-in (geen rekening nie)'}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: badgeColors[rsvp.status].bg }]}>
                      <Text style={[styles.badgeText, { color: badgeColors[rsvp.status].text }]}>
                        {STATUS_LABELS[rsvp.status]}
                      </Text>
                    </View>
                    {rsvp.checkedIn && (
                      <View style={[styles.badge, { backgroundColor: badgeColors.BEVESTIG.bg }]}>
                        <Feather name="check" size={11} color={badgeColors.BEVESTIG.text} />
                        <Text style={[styles.badgeText, { color: badgeColors.BEVESTIG.text }]}>Ingemeld</Text>
                      </View>
                    )}
                  </View>
                </View>

                {rsvp.status !== 'GEKANSELLEER' && (
                  <View style={styles.rowActions}>
                    {!rsvp.checkedIn && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleCheckIn(rsvp)}
                        disabled={busyId === rsvp.id}
                        accessibilityLabel={`Teken ${attendeeName(rsvp)} in`}
                      >
                        {busyId === rsvp.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Feather name="check-circle" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionBtnDanger}
                      onPress={() => handleCancel(rsvp)}
                      disabled={busyId === rsvp.id}
                      accessibilityLabel={`Kanselleer RSVP van ${attendeeName(rsvp)}`}
                    >
                      <Feather name="x-circle" size={16} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: colors.text },

    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    errorText: { fontSize: 14, fontWeight: '700', color: colors.textSubtle, textAlign: 'center' },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900', color: colors.text },
    statLabel: { fontSize: 11, fontWeight: '700', color: colors.textSubtle, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

    emptyText: { fontSize: 13, fontWeight: '600', color: colors.textSubtle, textAlign: 'center', marginTop: 24 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    rowInfo: { flex: 1 },
    rowName: { fontSize: 14, fontWeight: '800', color: colors.text },
    rowMeta: { fontSize: 12, fontWeight: '600', color: colors.textSubtle, marginTop: 2 },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: { fontSize: 10, fontWeight: '800' },

    rowActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnDanger: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

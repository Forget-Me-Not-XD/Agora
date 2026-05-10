import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import {
  MOCK_EVENTS,
  MOCK_RSVPS,
  STATUS_LABELS,
  MONTHS_SHORT_AF,
  type MockRsvp,
  type EventStatus,
} from '../lib/mock-data';
import { canManageCheckIns } from '../lib/rbac';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RSVP_STATUS_CONFIG: Record<MockRsvp['status'], { label: string; bg: string; text: string; icon: string }> = {
  bevestig:    { label: 'Bevestig',    bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
  hangende:    { label: 'Hangende',    bg: '#FEF3C7', text: '#92400E', icon: 'clock' },
  gekanselleer:{ label: 'Gekanselleer', bg: '#FEE2E2', text: '#991B1B', icon: 'x-circle' },
};

const EVENT_STATUS_BADGE: Record<EventStatus, { bg: string; text: string }> = {
  upcoming:  { bg: '#E0F2FE', text: '#0369A1' },
  ongoing:   { bg: '#D1FAE5', text: '#065F46' },
  past:      { bg: '#F3F4F6', text: '#4B5563' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

export function RsvpScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const role = user?.role ?? 'STUDENT';
  const userId = user?.id ?? 'user-3';

  const [filter, setFilter] = useState<MockRsvp['status'] | 'alles'>('alles');

  // For admin/dosent: show all events with RSVP stats
  // For student/GAS: show personal RSVPs
  const isManager = canManageCheckIns(role);

  const myRsvps = useMemo(
    () => MOCK_RSVPS.filter((r) => r.userId === userId),
    [userId],
  );

  const filteredRsvps = useMemo(
    () => filter === 'alles' ? myRsvps : myRsvps.filter((r) => r.status === filter),
    [myRsvps, filter],
  );

  // Build enriched list
  const enriched = useMemo(() =>
    filteredRsvps.map((rsvp) => ({
      rsvp,
      event: MOCK_EVENTS.find((e) => e.id === rsvp.eventId),
    })).filter((item) => !!item.event),
  [filteredRsvps]);

  function handleCancelRsvp(rsvpId: string, eventTitle: string) {
    Alert.alert(
      'Kanselleer RSVP',
      `Is jy seker jy wil jou RSVP vir "${eventTitle}" kanselleer?`,
      [
        { text: 'Nee', style: 'cancel' },
        {
          text: 'Ja, kanselleer',
          style: 'destructive',
          onPress: () => Alert.alert('RSVP Gekanselleer', 'RSVP-bestuur koms binnekort.'),
        },
      ],
    );
  }

  function formatDate(dateStr: string): string {
    const [, m, d] = dateStr.split('-').map(Number);
    return `${d} ${MONTHS_SHORT_AF[m - 1]}`;
  }

  // Manager view: show event overview with RSVP stats
  if (isManager) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>RSVP Oorsig</Text>
          <Text style={styles.pageSubtitle}>Bestuur alle inskrywings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {MOCK_EVENTS.map((event) => {
            const fillPct = Math.round((event.registered / event.capacity) * 100);
            const badge = EVENT_STATUS_BADGE[event.status];
            const [, m, d] = event.date.split('-').map(Number);
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.managerCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.75}
                accessibilityLabel={`${event.title} RSVP besonderhede`}
              >
                <View style={styles.managerCardTop}>
                  <View style={styles.managerDateBadge}>
                    <Text style={styles.managerDay}>{d}</Text>
                    <Text style={styles.managerMonth}>{MONTHS_SHORT_AF[m - 1]}</Text>
                  </View>
                  <View style={styles.managerInfo}>
                    <Text style={styles.managerTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.managerMeta}>{event.time} · {event.location}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusPillText, { color: badge.text }]}>
                      {STATUS_LABELS[event.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.managerStats}>
                  <View style={styles.managerStat}>
                    <Text style={[styles.managerStatVal, { color: colors.primary }]}>
                      {event.registered}
                    </Text>
                    <Text style={styles.managerStatLbl}>RSVPs</Text>
                  </View>
                  <View style={styles.managerStat}>
                    <Text style={[styles.managerStatVal, { color: colors.textSubtle }]}>
                      ~{event.forecast}
                    </Text>
                    <Text style={styles.managerStatLbl}>Voorspel</Text>
                  </View>
                  <View style={styles.managerStat}>
                    <Text style={[styles.managerStatVal, { color: '#F59E0B' }]}>
                      {event.noShows}
                    </Text>
                    <Text style={styles.managerStatLbl}>No-shows</Text>
                  </View>
                  <View style={styles.managerStat}>
                    <Text style={styles.managerStatVal}>{fillPct}%</Text>
                    <Text style={styles.managerStatLbl}>Vol</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${fillPct}%` as any,
                        backgroundColor:
                          fillPct >= 90 ? '#EF4444' : fillPct >= 70 ? '#F59E0B' : colors.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.managerActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                    accessibilityLabel={`Bestuur RSVPs vir ${event.title}`}
                  >
                    <Feather name="users" size={13} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Bestuur RSVPs</Text>
                  </TouchableOpacity>
                  {event.status === 'upcoming' || event.status === 'ongoing' ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('QrScanner', { eventId: event.id })}
                      accessibilityLabel={`QR skandeerder vir ${event.title}`}
                    >
                      <Feather name="maximize" size={13} color={colors.primary} />
                      <Text style={styles.actionBtnText}>QR Skandeer</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Student/GAS view: personal RSVPs
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>My RSVPs</Text>
        <Text style={styles.pageSubtitle}>{myRsvps.length} inskrywing{myRsvps.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['alles', 'bevestig', 'hangende', 'gekanselleer'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.chip,
              filter === s && styles.chipActive,
            ]}
            onPress={() => setFilter(s)}
            accessibilityLabel={s === 'alles' ? 'Alle RSVPs' : RSVP_STATUS_CONFIG[s].label}
            accessibilityState={{ selected: filter === s }}
          >
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
              {s === 'alles' ? 'Alles' : RSVP_STATUS_CONFIG[s].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {enriched.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-square" size={32} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>
              {filter === 'alles' ? 'Geen RSVPs nie' : `Geen ${RSVP_STATUS_CONFIG[filter as MockRsvp['status']].label.toLowerCase()} RSVPs nie`}
            </Text>
            <Text style={styles.emptySubtitle}>
              Gaan na Funksies om te RSVP vir aankomende geleenthede.
            </Text>
          </View>
        ) : (
          enriched.map(({ rsvp, event }) => {
            if (!event) return null;
            const cfg = RSVP_STATUS_CONFIG[rsvp.status];
            return (
              <TouchableOpacity
                key={rsvp.id}
                style={styles.rsvpCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.75}
                accessibilityLabel={`${event.title} RSVP - ${cfg.label}`}
              >
                <View style={styles.rsvpCardTop}>
                  <View style={styles.rsvpDateBadge}>
                    <Text style={styles.rsvpDay}>{formatDate(event.date).split(' ')[0]}</Text>
                    <Text style={styles.rsvpMonth}>{formatDate(event.date).split(' ')[1]}</Text>
                  </View>
                  <View style={styles.rsvpInfo}>
                    <Text style={styles.rsvpTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.rsvpMeta}>{event.time} · {event.location}</Text>
                  </View>
                  <View style={[styles.rsvpBadge, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon as any} size={12} color={cfg.text} />
                  </View>
                </View>

                <View style={styles.rsvpDetails}>
                  <View style={styles.rsvpDetailRow}>
                    <Text style={styles.rsvpDetailLabel}>Status</Text>
                    <Text style={[styles.rsvpDetailValue, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                  {rsvp.dietary && (
                    <View style={styles.rsvpDetailRow}>
                      <Text style={styles.rsvpDetailLabel}>Dieet</Text>
                      <Text style={styles.rsvpDetailValue}>{rsvp.dietary}</Text>
                    </View>
                  )}
                  <View style={styles.rsvpDetailRow}>
                    <Text style={styles.rsvpDetailLabel}>Ingemeld</Text>
                    <Text style={styles.rsvpDetailValue}>
                      {rsvp.checkedIn ? 'Ja' : 'Nee'}
                    </Text>
                  </View>
                </View>

                {rsvp.status !== 'gekanselleer' && event.status === 'upcoming' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelRsvp(rsvp.id, event.title)}
                    accessibilityLabel={`Kanselleer RSVP vir ${event.title}`}
                  >
                    <Text style={styles.cancelBtnText}>Kanselleer RSVP</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    pageHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    pageSubtitle: { fontSize: 12, color: colors.textSubtle, fontWeight: '700', marginTop: 2 },

    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexWrap: 'wrap',
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textSubtle },
    chipTextActive: { color: colors.surface },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    emptySubtitle: { fontSize: 13, color: colors.textSubtle, textAlign: 'center', lineHeight: 18 },

    // Student RSVP card
    rsvpCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
    },
    rsvpCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rsvpDateBadge: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: '#E0F7FA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rsvpDay: { fontSize: 17, fontWeight: '900', color: '#0369A1', lineHeight: 20 },
    rsvpMonth: { fontSize: 10, fontWeight: '800', color: '#0369A1' },
    rsvpInfo: { flex: 1 },
    rsvpTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 2 },
    rsvpMeta: { fontSize: 11, fontWeight: '600', color: colors.textSubtle },
    rsvpBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rsvpDetails: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 10,
      gap: 6,
    },
    rsvpDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    rsvpDetailLabel: { fontSize: 12, fontWeight: '700', color: colors.textSubtle },
    rsvpDetailValue: { fontSize: 12, fontWeight: '800', color: colors.text },
    cancelBtn: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    cancelBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSubtle },

    // Manager card
    managerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
    },
    managerCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    managerDateBadge: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: '#E0F7FA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    managerDay: { fontSize: 17, fontWeight: '900', color: '#0369A1', lineHeight: 20 },
    managerMonth: { fontSize: 10, fontWeight: '800', color: '#0369A1' },
    managerInfo: { flex: 1 },
    managerTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 2 },
    managerMeta: { fontSize: 11, fontWeight: '600', color: colors.textSubtle },
    statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    statusPillText: { fontSize: 10, fontWeight: '800' },

    managerStats: { flexDirection: 'row', gap: 4 },
    managerStat: { flex: 1, alignItems: 'center' },
    managerStatVal: { fontSize: 16, fontWeight: '900', color: colors.text },
    managerStatLbl: { fontSize: 10, fontWeight: '700', color: colors.textSubtle, marginTop: 1 },

    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: { height: 6, borderRadius: 999 },

    managerActions: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
    },
    actionBtnText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  });
}

import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { listEvents, type EventResponse } from '../api/events';
import { getEventStatus, STATUS_LABELS, MONTHS_SHORT_AF, type EventStatus } from '../lib/event-status';
import { canManageCheckIns } from '../lib/rbac';
import {
  getMyRsvps,
  cancelRsvp,
  getRsvpQrDataUri,
  type RsvpWithEvent,
  type RsvpStatus,
} from '../api/rsvp';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RSVP_STATUS_CONFIG: Record<RsvpStatus, { label: string; bg: string; text: string; icon: string }> = {
  BEVESTIG:     { label: 'Bevestig',     bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
  HANGENDE:     { label: 'Hangende',     bg: '#FEF3C7', text: '#92400E', icon: 'clock' },
  GEKANSELLEER: { label: 'Gekanselleer', bg: '#FEE2E2', text: '#991B1B', icon: 'x-circle' },
};

const EVENT_STATUS_BADGE: Record<EventStatus, { bg: string; text: string }> = {
  upcoming: { bg: '#E0F2FE', text: '#0369A1' },
  ongoing:  { bg: '#D1FAE5', text: '#065F46' },
  past:     { bg: '#F3F4F6', text: '#4B5563' },
};

export function RsvpScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const role = user?.role ?? 'STUDENT';
  const isManager = canManageCheckIns(role);

  const [filter, setFilter] = useState<RsvpStatus | 'alles'>('alles');

  // my rsvps (student/gas)
  const [rsvps, setRsvps] = useState<RsvpWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // manager oorsig (dosent/admin)
  const [events, setEvents] = useState<EventResponse[]>([]);

  // QR per inskrywing
  const [openQrId, setOpenQrId] = useState<string | null>(null);
  const [qrUriById, setQrUriById] = useState<Record<string, string>>({});
  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null);

  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (isManager) {
          const data = await listEvents();
          if (active) setEvents(data);
        } else {
          const data = await getMyRsvps();
          if (active) setRsvps(data);
        }
      } catch {
        if (active) setLoadError(isManager ? 'Kon nie funksies laai nie.' : 'Kon nie jou RSVPs laai nie.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isManager]);

  const filteredRsvps = useMemo(
    () => (filter === 'alles' ? rsvps : rsvps.filter((r) => r.status === filter)),
    [rsvps, filter],
  );

  async function toggleQr(rsvpId: string) {
    if (openQrId === rsvpId) {
      setOpenQrId(null);
      return;
    }
    setOpenQrId(rsvpId);
    if (qrUriById[rsvpId]) return; // klaar gelaai;
    setQrLoadingId(rsvpId);
    try {
      const uri = await getRsvpQrDataUri(rsvpId);
      setQrUriById((prev) => ({ ...prev, [rsvpId]: uri }));
    } catch {
      Alert.alert('QR-kode', 'Kon nie die QR-kode laai nie. Probeer asseblief weer.');
      setOpenQrId(null);
    } finally {
      setQrLoadingId(null);
    }
  }

  function handleCancelRsvp(rsvpId: string, eventTitle: string) {
    Alert.alert(
      'Kanselleer RSVP',
      `Is jy seker jy wil jou RSVP vir "${eventTitle}" kanselleer?`,
      [
        { text: 'Nee', style: 'cancel' },
        {
          text: 'Ja', style: 'destructive',
          onPress: async () => {
            setCancelingId(rsvpId);
            try {
              await cancelRsvp(rsvpId);
              setRsvps((prev) =>
                prev.map((r) =>
                  r._id === rsvpId ? { ...r, status: 'GEKANSELLEER' as RsvpStatus } : r,
                ),
              );
            } catch {
              Alert.alert('Kanselleer', 'Kon nie die RSVP kanselleer nie. Probeer asseblief weer.');
            } finally {
              setCancelingId(null);
            }
          }
        }
      ]
    )
  }

  function formatDate(dateStr: string): { day: number; month: string } {
    const d = new Date(dateStr);
    return { day: d.getDate(), month: MONTHS_SHORT_AF[d.getMonth()] };
  }

  // Manager view: show event overview with RSVP stats
  if (isManager) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>RSVP Oorsig</Text>
          <Text style={styles.pageSubtitle}>Bestuur alle inskrywings</Text>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={32} color={colors.red} />
            <Text style={styles.emptyTitle}>{loadError}</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={32} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>Geen funksies nie</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {events.map((event) => {
              const fillPct = event.maxCapacity > 0
                ? Math.round((event.confirmedAttendees / event.maxCapacity) * 100)
                : 0;
              const status = getEventStatus(event);
              const badge = EVENT_STATUS_BADGE[status];
              const { day, month } = formatDate(event.date);
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
                      <Text style={styles.managerDay}>{day}</Text>
                      <Text style={styles.managerMonth}>{month}</Text>
                    </View>
                    <View style={styles.managerInfo}>
                      <Text style={styles.managerTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.managerMeta}>{event.location}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusPillText, { color: badge.text }]}>
                        {STATUS_LABELS[status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.managerStats}>
                    <View style={styles.managerStat}>
                      <Text style={[styles.managerStatVal, { color: colors.primary }]}>
                        {event.confirmedAttendees}
                      </Text>
                      <Text style={styles.managerStatLbl}>Bygewoon</Text>
                    </View>
                    <View style={styles.managerStat}>
                      <Text style={styles.managerStatVal}>
                        {event.maxCapacity}
                      </Text>
                      <Text style={styles.managerStatLbl}>Kapasiteit</Text>
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
                          width: `${Math.min(fillPct, 100)}%` as any,
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
                    {status === 'upcoming' || status === 'ongoing' ? (
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
        )}
      </SafeAreaView>
    );
  }

  // Student/GAS view: personal RSVPs
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>My RSVPs</Text>
        <Text style={styles.pageSubtitle}>
          {rsvps.length} inskrywing{rsvps.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['alles', 'BEVESTIG', 'HANGENDE', 'GEKANSELLEER'] as const).map((s) => (
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
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={32} color={colors.red} />
            <Text style={styles.emptyTitle}>{loadError}</Text>
          </View>
        ) : filteredRsvps.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-square" size={32} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>
              {filter === 'alles' ? 'Geen RSVPs nie' : `Geen ${RSVP_STATUS_CONFIG[filter].label.toLowerCase()} RSVPs nie`}
            </Text>
            <Text style={styles.emptySubtitle}>
              Gaan na Funksies om vir aankomende geleenthede te RSVP.
            </Text>
          </View>
        ) : (
          filteredRsvps.map(({ _id, status, event }) => {
            const cfg = RSVP_STATUS_CONFIG[status];
            const { day, month } = formatDate(event.date);
            const showQr = openQrId === _id;
            return (
              <View key={_id} style={styles.rsvpCard}>
                <View style={styles.rsvpCardTop}>
                  <View style={styles.rsvpDateBadge}>
                    <Text style={styles.rsvpDay}>{day}</Text>
                    <Text style={styles.rsvpMonth}>{month}</Text>
                  </View>
                  <View style={styles.rsvpInfo}>
                    <Text style={styles.rsvpTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.rsvpMeta} numberOfLines={1}> {event.location}</Text>
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
                </View>

                {showQr && (
                  <View style={styles.qrBox}>
                    {qrLoadingId === _id ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : qrUriById[_id] ? (
                      <Image
                        source={{ uri: qrUriById[_id] }}
                        style={styles.qrImage}
                        resizeMode="contain"
                        accessibilityLabel="Jou QR-kode"
                      />
                    ) : null}
                  </View>
                )}

                <View style={styles.rsvpActions}>
                  <TouchableOpacity
                    style={styles.qrBtn}
                    onPress={() => toggleQr(_id)}
                    accessibilityLabel={showQr ? 'Versteek Qr-Kode' : 'Wys QR-kode'}
                  >
                    <Feather name="maximize" size={13} color={colors.primary} />
                    <Text style={styles.qrBtnText}>{showQr ? 'Versteek QR' : 'Wys QR'}</Text>
                  </TouchableOpacity>

                  {status !== 'GEKANSELLEER' && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancelRsvp(_id, event.title)}
                      disabled={cancelingId === _id}
                      accessibilityLabel={`Kanselleer RSVP vir ${event.title}`}
                    >
                      {cancelingId === _id ? (
                        <ActivityIndicator size="small" color={colors.textSubtle} />
                      ) : (
                        <Text style={styles.cancelBtnText}>Kanselleer RSVP</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
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

    rsvpActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    qrBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    qrBtnText: { fontSize: 12, fontWeight: '800', color: colors.primary },
    qrBox: {
      alignSelf: 'center',
      width: 200,
      height: 200,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    qrImage: { width: '100%', height: '100%' },

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

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { MainTabParamList } from '../navigation/MainTabs';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { listEvents, type EventResponse } from '../api/events';
import { getMyRsvps, type RsvpWithEvent } from '../api/rsvp';
import { getPrediction, type PredictionResult } from '../api/analytics';
import { getEventStatus, formatFullDate, formatEventTime, formatEventDate } from '../lib/event-status';
import { useCallback } from 'react';

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [aiInfoOpen, setAiInfoOpen] = useState(false);

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [myRsvps, setMyRsvps] = useState<RsvpWithEvent[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'DOSENT';

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;

      (async () => {
        setLoading(true);
        setLoadError(null);
        try {
          const eventList = await listEvents();
          if (!active) return;
          setEvents(eventList);

          if (!isStaff) {
            const rsvpList = await getMyRsvps();
            if (active) setMyRsvps(rsvpList);
          }

          const upcoming = eventList.filter((e) => getEventStatus(e) !== 'past');
          if (isStaff && upcoming.length > 0) {
            try {
              const pred = await getPrediction(upcoming[0].id);
              if (active) setPrediction(pred);
            } catch {
              if (active) setPrediction(null);
            }
          }
        } catch {
          if (active) setLoadError('Kon nie paneelbord-data laai nie.');
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => { active = false; };
    }, [user?.id, isStaff]),
  );
  
  if (!user) return null;

  const upcomingEvents = events.filter((e) => getEventStatus(e) !== 'past');
  const nextEvent = upcomingEvents[0] ?? null;
  const otherUpcoming = upcomingEvents.slice(1, 4);

  const activeRsvps = myRsvps.filter((r) => r.status !== 'GEKANSELLEER');
  const upcomingRsvpsCount = activeRsvps.filter((r) => getEventStatus(r.event) !== 'past').length;

  const totalConfirmedAttendees = events.reduce((sum, e) => sum + e.confirmedAttendees, 0);
  const totalBudget = events.reduce((sum, e) => sum + (e.budget ?? 0), 0);
  const fillRates = events.filter((e) => e.maxCapacity > 0).map((e) => e.confirmedAttendees / e.maxCapacity);
  const averageAttendancePct = fillRates.length
    ? Math.round((fillRates.reduce((a, b) => a + b, 0) / fillRates.length) * 100)
    : 0;

  const roleLabel = {
    ADMIN:  'Administrateur',
    DOSENT: 'Dosent',
    STUDENT: 'Student',
    GAS:    'Gas',
    PHOTOGRAPHER: 'Fotograaf',
  }[user.role];

  const handleLogout = () => {
    Alert.alert(
      'Meld af',
      'Is jy seker jy wil afmeld?',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Meld af', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Goeie dag, {user.name}</Text>
            <Text style={styles.subGreeting}>{roleLabel}{user.studyCenter ? ` • ${user.studyCenter}` : ''}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
              <Feather name="settings" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.card}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!loading && loadError && (
          <View style={styles.card}>
            <Text style={styles.highlightMeta}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && (
          <>
            <Text style={styles.sectionTitle}>Oorsig</Text>
            <View style={styles.statsGrid}>
              {user.role === 'ADMIN' && (
                <StatCard styles={styles} label="Totale RSVPs" value={String(totalConfirmedAttendees)} />
              )}
              {(user.role === 'ADMIN' || user.role === 'DOSENT') && (
                <StatCard styles={styles} label="Aankomende funksies" value={String(upcomingEvents.length)} />
              )}
              {(user.role === 'ADMIN' || user.role === 'DOSENT') && (
                <StatCard styles={styles} label="Gem. bywoning" value={`${averageAttendancePct}%`} />
              )}
              {user.role === 'ADMIN' && (
                <StatCard styles={styles} label="Begroting" value={`R${totalBudget.toLocaleString('af-ZA')}`} />
              )}
              {(user.role === 'STUDENT' || user.role === 'GAS') && (
                <StatCard styles={styles} label="Jou RSVPs" value={String(activeRsvps.length)} />
              )}
              {(user.role === 'STUDENT' || user.role === 'GAS') && (
                <StatCard styles={styles} label="Aankomend" value={String(upcomingRsvpsCount)} />
              )}
            </View>

            <Text style={styles.sectionTitle}>Volgende</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Volgende funksie</Text>
                <TouchableOpacity
                  style={styles.linkBtn}
                  disabled={!nextEvent}
                  onPress={() => nextEvent && navigation.navigate('EventDetail', { eventId: nextEvent.id })}
                >
                  <Text style={styles.linkText}>Besigtig</Text>
                  <Feather name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {nextEvent ? (
                <View style={styles.highlight}>
                  <Text style={styles.highlightTitle}>{nextEvent.title}</Text>
                  <Text style={styles.highlightMeta}>
                    {formatFullDate(nextEvent.date)} • {formatEventTime(nextEvent.date)} • {nextEvent.location}
                  </Text>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>{nextEvent.confirmedAttendees} RSVPs</Text>
                    <Text style={styles.progressSub}>van {nextEvent.maxCapacity}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${nextEvent.maxCapacity > 0 ? Math.min(100, (nextEvent.confirmedAttendees / nextEvent.maxCapacity) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressFoot}>
                    {nextEvent.maxCapacity > 0 ? Math.round((nextEvent.confirmedAttendees / nextEvent.maxCapacity) * 100) : 0}% van kapasiteit gevul
                  </Text>
                </View>
              ) : (
                <Text style={styles.highlightMeta}>Geen aankomende funksies nie.</Text>
              )}
            </View>

            {isStaff && (
              <>
                <Text style={styles.sectionTitle}>KI</Text>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Voorspelling: volgende funksie</Text>
                    <TouchableOpacity style={styles.iconBtnSm} onPress={() => setAiInfoOpen(true)}>
                      <Feather name="info" size={16} color={colors.textSubtle} />
                    </TouchableOpacity>
                  </View>

                  {prediction ? (
                    <>
                      <View style={styles.kpiGrid}>
                        <Kpi styles={styles} label="Voorspelde vulkoers" value={`${Math.round(prediction.predictedFillRate * 100)}%`} />
                        <Kpi styles={styles} label="Verwagte RSVPs" value={String(prediction.estimatedRsvps)} />
                        <Kpi styles={styles} label="Verwagte bywoners" value={String(prediction.estimatedAttendees)} />
                        <Kpi styles={styles} label="Beraamde begroting" value={`R${Math.round(prediction.estimatedBudgetZAR).toLocaleString('af-ZA')}`} />
                      </View>
                      <View style={styles.modelPill}>
                        <View style={styles.dot} />
                        <Text style={styles.modelText}>Model aktief</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.highlightMeta}>
                      {nextEvent ? 'Voorspelling nie tans beskikbaar nie.' : 'Geen aankomende funksie om te voorspel nie.'}
                    </Text>
                  )}
                </View>
              </>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Aankomende funksies</Text>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Events')}
                >
                  <Text style={styles.linkText}>Sien almal</Text>
                  <Feather name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {otherUpcoming.length > 0 ? (
                otherUpcoming.map((e) => {
                  const { day, month } = formatEventDate(e.date);
                  return (
                    <UpcomingRow
                      key={e.id}
                      styles={styles}
                      title={e.title}
                      date={`${day} ${month}`}
                      time={formatEventTime(e.date)}
                      rsvps={String(e.confirmedAttendees)}
                      capacity={String(e.maxCapacity)}
                    />
                  );
                })
              ) : (
                <Text style={styles.highlightMeta}>Geen verdere aankomende funksies nie.</Text>
              )}
            </View>
          </>
        )}

        <Text style={styles.versionText}>Pre-Alfa v0.1.0</Text>

      </ScrollView>

      <Modal
        visible={aiInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAiInfoOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAiInfoOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { /* stop propagation */ }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>KI / LSTM statistiek</Text>
              <TouchableOpacity style={styles.iconBtnSm} onPress={() => setAiInfoOpen(false)}>
                <Feather name="x" size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <InfoRow styles={styles} title="Voorspelde vulkoers" body="Persentasie van kapasiteit wat die model verwag om gevul te word." />
            <InfoRow styles={styles} title="Verwagte RSVPs" body="Aantal RSVPs wat die model verwag teen die funksie se datum." />
            <InfoRow styles={styles} title="Verwagte bywoners" body="Beraamde aantal mense wat werklik gaan opdaag (na no-shows)." />
            <InfoRow styles={styles} title="Beraamde begroting" body="Model se beraming van benodigde begroting gebaseer op verwagte bywoning." />

            <Text style={styles.modalFoot}>Hierdie waardes kom van die regte voorspellingsmodel vir die eersvolgende funksie.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ──
type DashboardStyles = ReturnType<typeof makeStyles>;

function StatCard({
  styles,
  label,
  value,
  delta,
}: {
  styles: DashboardStyles;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {delta ? <Text style={styles.statDelta}>{delta}</Text> : <View style={{ height: 14 }} />}
    </View>
  );
}

function Kpi({ styles, label, value }: { styles: DashboardStyles; label: string; value: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValueLarge}>{value}</Text>
    </View>
  );
}

function InfoRow({ styles, title, body }: { styles: DashboardStyles; title: string; body: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  );
}

function UpcomingRow({
  styles,
  title,
  date,
  time,
  rsvps,
  capacity,
}: {
  styles: DashboardStyles;
  title: string;
  date: string;
  time: string;
  rsvps: string;
  capacity: string;
}) {
  return (
    <View style={styles.upcomingRow}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingTitle}>{title}</Text>
        <Text style={styles.upcomingMeta}>{date} • {time}</Text>
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingNum}>{rsvps}</Text>
        <Text style={styles.upcomingSub}>RSVP</Text>
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingNumMuted}>{capacity}</Text>
        <Text style={styles.upcomingSub}>Kapasiteit</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 24 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
      marginTop: 8,
    },
    headerLeft: { flex: 1, paddingRight: 10 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    greeting: { fontSize: 20, fontWeight: '900', color: colors.text },
    subGreeting: { fontSize: 16, color: colors.textSubtle, marginTop: 6, fontWeight: '600' },

    sectionTitle: {
      color: colors.textSubtle,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 6,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkText: { color: colors.primary, fontWeight: '800', fontSize: 16 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    statCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
    },
    statLabel: { color: colors.textSubtle, fontSize: 16, fontWeight: '700' },
    statValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
    statDelta: { color: colors.textSubtle, fontSize: 16, fontWeight: '700', marginTop: 4 },

    iconBtnSm: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    highlight: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    highlightTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    highlightMeta: { color: colors.textSubtle, fontSize: 16, marginTop: 4, fontWeight: '600' },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    progressLabel: { color: colors.text, fontSize: 16, fontWeight: '900' },
    progressSub: { color: colors.textSubtle, fontSize: 16, fontWeight: '700' },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.primary },
    progressFoot: { color: colors.textSubtle, fontSize: 16, marginTop: 8, fontWeight: '600' },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
    kpiBox: {
      width: '48%',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    kpiLabel: { color: colors.textSubtle, fontSize: 16, fontWeight: '800' },
    kpiValueLarge: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
    modelPill: {
      marginTop: 12,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#22C55E' },
    modelText: { color: colors.text, fontSize: 16, fontWeight: '800' },

    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    upcomingLeft: { flex: 1 },
    upcomingTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    upcomingMeta: { color: colors.textSubtle, fontSize: 16, marginTop: 4, fontWeight: '600' },
    upcomingRight: { width: 62, alignItems: 'flex-end' },
    upcomingNum: { color: colors.primary, fontSize: 16, fontWeight: '900' },
    upcomingNumMuted: { color: colors.textSubtle, fontSize: 16, fontWeight: '900' },
    upcomingSub: { color: colors.textSubtle, fontSize: 16, marginTop: 2, fontWeight: '700' },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 18,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    infoRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    infoTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    infoBody: { color: colors.textSubtle, fontSize: 16, marginTop: 6, lineHeight: 18, fontWeight: '600' },
    modalFoot: { color: colors.textSubtle, fontSize: 16, marginTop: 12, fontWeight: '600' },

    versionText: {
      textAlign: 'center',
      fontSize: 16,
      color: colors.textSubtle,
      marginTop: 16,
      marginBottom: 8,
    },
  });
}
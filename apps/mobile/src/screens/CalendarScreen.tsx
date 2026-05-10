import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
  MONTHS_AF,
  MONTHS_SHORT_AF,
  STATUS_LABELS,
  type MockEvent,
  type EventStatus,
} from '../lib/mock-data';
import { filterEventsForUser } from '../lib/rbac';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa', 'So'];

type ViewMode = 'maand' | 'agenda';

const EVENT_DOT_COLORS: Record<string, string> = {
  public:           '#14B8C7',
  internal_student: '#8B5CF6',
  private:          '#F59E0B',
  department:       '#6366F1',
};

const STATUS_BADGE: Record<EventStatus, { bg: string; text: string }> = {
  upcoming:  { bg: '#E0F2FE', text: '#0369A1' },
  ongoing:   { bg: '#D1FAE5', text: '#065F46' },
  past:      { bg: '#F3F4F6', text: '#4B5563' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('maand');

  const role = user?.role ?? 'STUDENT';
  const userId = user?.id ?? '';

  const visibleEvents = useMemo(
    () => filterEventsForUser(MOCK_EVENTS, userId, role),
    [userId, role],
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, MockEvent[]> = {};
    for (const e of visibleEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [visibleEvents]);

  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  function toDateKey(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Build calendar grid (Monday-first)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  // Convert Sunday=0 to Monday-first offset: Mon=0..Sun=6
  const offset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  function handleDayPress(day: number) {
    const key = toDateKey(viewYear, viewMonth + 1, day);
    setSelectedDate((prev) => (prev === key ? null : key));
  }

  // Upcoming events sorted for agenda view
  const upcomingEvents = useMemo(
    () => [...visibleEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [visibleEvents],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Page header ── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Kalender</Text>
      </View>

      {/* ── View mode toggle ── */}
      <View style={styles.toggleRow}>
        {(['maand', 'agenda'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleBtn,
              viewMode === mode && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode(mode)}
            accessibilityLabel={mode === 'maand' ? 'Maandaansig' : 'Agenda aansig'}
            accessibilityState={{ selected: viewMode === mode }}
          >
            <Text style={[
              styles.toggleBtnText,
              viewMode === mode && styles.toggleBtnTextActive,
            ]}>
              {mode === 'maand' ? 'Maand' : 'Agenda'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {viewMode === 'maand' ? (
          <>
            {/* ── Month navigation ── */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={prevMonth}
                accessibilityLabel="Vorige maand"
              >
                <Feather name="chevron-left" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTHS_AF[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={nextMonth}
                accessibilityLabel="Volgende maand"
              >
                <Feather name="chevron-right" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* ── Calendar grid ── */}
            <View style={styles.calendarCard}>
              {/* Day-of-week headers */}
              <View style={styles.weekRow}>
                {DAYS_SHORT.map((d) => (
                  <View key={d} style={styles.weekCell}>
                    <Text style={styles.weekDayLabel}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Day cells */}
              <View style={styles.gridWrap}>
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const day = idx - offset + 1;
                  const inMonth = day >= 1 && day <= daysInMonth;
                  const dateKey = inMonth
                    ? toDateKey(viewYear, viewMonth + 1, day)
                    : '';
                  const dayEvents = inMonth ? (eventsByDate[dateKey] ?? []) : [];
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDate;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.dayCell}
                      onPress={() => inMonth && handleDayPress(day)}
                      activeOpacity={inMonth ? 0.7 : 1}
                      accessibilityLabel={inMonth ? `${day} ${MONTHS_SHORT_AF[viewMonth]}` : undefined}
                      accessibilityState={isSelected ? { selected: true } : undefined}
                    >
                      {inMonth && (
                        <>
                          <View style={[
                            styles.dayNumber,
                            isToday && styles.dayNumberToday,
                            isSelected && !isToday && styles.dayNumberSelected,
                          ]}>
                            <Text style={[
                              styles.dayNumberText,
                              isToday && styles.dayNumberTextToday,
                              isSelected && !isToday && styles.dayNumberTextSelected,
                            ]}>
                              {day}
                            </Text>
                          </View>
                          {/* Event dots */}
                          <View style={styles.dotsRow}>
                            {dayEvents.slice(0, 3).map((e) => (
                              <View
                                key={e.id}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: EVENT_DOT_COLORS[e.type] ?? colors.primary },
                                ]}
                              />
                            ))}
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Selected day events ── */}
            {selectedDate && (
              <View style={styles.selectedSection}>
                {selectedEvents.length === 0 ? (
                  <View style={styles.noDayEvents}>
                    <Text style={styles.noDayEventsText}>Geen funksies op hierdie dag nie.</Text>
                  </View>
                ) : (
                  selectedEvents.map((event) => (
                    <DayEventCard
                      key={event.id}
                      event={event}
                      colors={colors}
                      styles={styles}
                      onOpen={() => navigation.navigate('EventDetail', { eventId: event.id })}
                    />
                  ))
                )}
              </View>
            )}

            {/* ── Legend ── */}
            <View style={styles.legend}>
              {Object.entries(EVENT_DOT_COLORS).map(([type, color]) => (
                <View key={type} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>
                    {type === 'public' ? 'Publiek'
                      : type === 'internal_student' ? 'Intern'
                      : type === 'private' ? 'Privaat'
                      : 'Departement'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* ── Agenda view ── */
          <>
            <Text style={styles.agendaCount}>
              {upcomingEvents.length} aankomende funksie{upcomingEvents.length !== 1 ? 's' : ''}
            </Text>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyAgenda}>
                <Feather name="calendar" size={28} color={colors.textSubtle} />
                <Text style={styles.emptyAgendaText}>Geen aankomende funksies nie</Text>
              </View>
            ) : (
              upcomingEvents.map((event) => (
                <AgendaEventCard
                  key={event.id}
                  event={event}
                  colors={colors}
                  styles={styles}
                  onOpen={() => navigation.navigate('EventDetail', { eventId: event.id })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── DayEventCard ─────────────────────────────────────────────────────────────
function DayEventCard({
  event,
  colors,
  styles,
  onOpen,
}: {
  event: MockEvent;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof makeStyles>;
  onOpen: () => void;
}) {
  return (
    <View style={styles.dayEventCard}>
      <View style={[styles.dayEventAccent, { backgroundColor: EVENT_DOT_COLORS[event.type] ?? colors.primary }]} />
      <View style={styles.dayEventContent}>
        <Text style={styles.dayEventTitle}>{event.title}</Text>
        <Text style={styles.dayEventMeta}>
          {event.time} · {event.location} · {event.registered} RSVPs · ~{event.forecast} voorspel
        </Text>
        <TouchableOpacity style={styles.openBtn} onPress={onOpen} accessibilityLabel={`Maak ${event.title} oop`}>
          <Text style={styles.openBtnText}>Maak oop</Text>
          <Feather name="arrow-right" size={14} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── AgendaEventCard ───────────────────────────────────────────────────────────
function AgendaEventCard({
  event,
  colors,
  styles,
  onOpen,
}: {
  event: MockEvent;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof makeStyles>;
  onOpen: () => void;
}) {
  const [, m, d] = event.date.split('-').map(Number);
  const badge = STATUS_BADGE[event.status];
  return (
    <TouchableOpacity
      style={styles.agendaCard}
      onPress={onOpen}
      activeOpacity={0.75}
      accessibilityLabel={`${event.title}, ${d} ${MONTHS_SHORT_AF[m - 1]}`}
    >
      <View style={styles.agendaDateCol}>
        <Text style={styles.agendaDay}>{d}</Text>
        <Text style={styles.agendaMonth}>{MONTHS_SHORT_AF[m - 1]}</Text>
      </View>
      <View style={[styles.agendaAccent, { backgroundColor: EVENT_DOT_COLORS[event.type] ?? colors.primary }]} />
      <View style={styles.agendaInfo}>
        <Text style={styles.agendaTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.agendaMeta}>{event.time} · {event.location}</Text>
        <View style={styles.agendaStatsRow}>
          <Text style={styles.agendaRsvp}>{event.registered} RSVPs</Text>
          <Text style={styles.agendaForecast}>  ~{event.forecast} voorspel</Text>
        </View>
      </View>
      <View style={[styles.agendaBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.agendaBadgeText, { color: badge.text }]}>
          {STATUS_LABELS[event.status]}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    pageHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text },

    toggleRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 3,
    },
    toggleBtn: {
      flex: 1,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleBtnText: { fontSize: 13, fontWeight: '800', color: colors.textSubtle },
    toggleBtnTextActive: { color: colors.surface },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthLabel: { fontSize: 17, fontWeight: '900', color: colors.text },

    calendarCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      overflow: 'hidden',
    },
    weekRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    weekCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    weekDayLabel: { fontSize: 11, fontWeight: '800', color: colors.textSubtle },

    gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 0.85,
      alignItems: 'center',
      paddingTop: 6,
      paddingBottom: 4,
    },
    dayNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumberToday: { backgroundColor: colors.primary },
    dayNumberSelected: { backgroundColor: colors.navy },
    dayNumberText: { fontSize: 13, fontWeight: '700', color: colors.textSubtle },
    dayNumberTextToday: { color: '#FFFFFF', fontWeight: '900' },
    dayNumberTextSelected: { color: '#FFFFFF', fontWeight: '900' },

    dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    eventDot: { width: 5, height: 5, borderRadius: 999 },

    selectedSection: { gap: 10 },
    noDayEvents: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
    },
    noDayEventsText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },

    dayEventCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      overflow: 'hidden',
    },
    dayEventAccent: { width: 5 },
    dayEventContent: { flex: 1, padding: 14 },
    dayEventTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 4 },
    dayEventMeta: { fontSize: 12, color: colors.textSubtle, fontWeight: '600', marginBottom: 10 },
    openBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    openBtnText: { fontSize: 13, fontWeight: '900', color: colors.surface },

    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: '700', color: colors.textSubtle },

    // Agenda
    agendaCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSubtle,
    },
    emptyAgenda: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      gap: 10,
    },
    emptyAgendaText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },

    agendaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    agendaDateCol: { width: 36, alignItems: 'center' },
    agendaDay: { fontSize: 20, fontWeight: '900', color: colors.text, lineHeight: 24 },
    agendaMonth: { fontSize: 10, fontWeight: '800', color: colors.textSubtle },
    agendaAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    agendaInfo: { flex: 1 },
    agendaTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 2 },
    agendaMeta: { fontSize: 11, fontWeight: '600', color: colors.textSubtle, marginBottom: 4 },
    agendaStatsRow: { flexDirection: 'row' },
    agendaRsvp: { fontSize: 11, fontWeight: '900', color: colors.primary },
    agendaForecast: { fontSize: 11, fontWeight: '700', color: colors.textSubtle },
    agendaBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    agendaBadgeText: { fontSize: 10, fontWeight: '800' },
  });
}

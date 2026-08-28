import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors, useIsDark } from '../theme/theme';
import { listEvents, type EventResponse } from '../api/events';
import {
  getEventStatus,
  getStatusPillColors,
  STATUS_LABELS,
  MONTHS_AF,
  MONTHS_SHORT_AF,
  formatEventTime,
} from '../lib/event-status';
import { ScreenHeader } from '../components/ScreenHeader';
import { typography } from '../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa', 'So'];

type ViewMode = 'maand' | 'agenda';

const EVENT_TYPES = ['public', 'internal_student', 'private', 'department'] as const;

function getEventTypeColor(type: string, colors: ReturnType<typeof useThemeColors>): string {
  switch (type) {
    case 'public': return colors.eventTypePublic;
    case 'internal_student': return colors.eventTypeInternal;
    case 'private': return colors.eventTypePrivate;
    case 'department': return colors.eventTypeDepartment;
    default: return colors.primary;
  }
}

// Plaaslike (nie-UTC) datumsleutel, om tydsone-skuiwe te vermy
function dateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDark = useIsDark();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('maand');

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Rol-gebaseerde sigbaarheid word reeds backend-kant afgedwing.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await listEvents();
        if (active) setEvents(result);
      } catch {
        if (active) setLoadError('Kon nie funksies laai nie.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventResponse[]> = {};
    for (const e of events) {
      const key = dateKeyFromIso(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

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
    () => events
      .filter((e) => getEventStatus(e) === 'upcoming' || getEventStatus(e) === 'ongoing')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Page header ── */}
      <ScreenHeader title="Kalender" />

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

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.centerFill}>
          <Feather name="alert-circle" size={28} color={colors.textSubtle} />
          <Text style={styles.emptyAgendaText}>{loadError}</Text>
        </View>
      ) : (
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
                                  { backgroundColor: getEventTypeColor(e.type, colors) },
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
              {EVENT_TYPES.map((type) => (
                <View key={type} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getEventTypeColor(type, colors) }]} />
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
                  isDark={isDark}
                  onOpen={() => navigation.navigate('EventDetail', { eventId: event.id })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
      )}
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
  event: EventResponse;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof makeStyles>;
  onOpen: () => void;
}) {
  return (
    <View style={styles.dayEventCard}>
      <View style={[styles.dayEventAccent, { backgroundColor: getEventTypeColor(event.type, colors) }]} />
      <View style={styles.dayEventContent}>
        <Text style={styles.dayEventTitle}>{event.title}</Text>
        <Text style={styles.dayEventMeta}>
          {formatEventTime(event.date)} · {event.location} · {event.confirmedAttendees} / {event.maxCapacity}
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
  isDark,
  onOpen,
}: {
  event: EventResponse;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof makeStyles>;
  isDark: boolean;
  onOpen: () => void;
}) {
  const d = new Date(event.date);
  const status = getEventStatus(event);
  const badge = getStatusPillColors(status, isDark);
  return (
    <TouchableOpacity
      style={styles.agendaCard}
      onPress={onOpen}
      activeOpacity={0.75}
      accessibilityLabel={`${event.title}, ${d.getDate()} ${MONTHS_SHORT_AF[d.getMonth()]}`}
    >
      <View style={styles.agendaDateCol}>
        <Text style={styles.agendaDay}>{d.getDate()}</Text>
        <Text style={styles.agendaMonth}>{MONTHS_SHORT_AF[d.getMonth()]}</Text>
      </View>
      <View style={[styles.agendaAccent, { backgroundColor: getEventTypeColor(event.type, colors) }]} />
      <View style={styles.agendaInfo}>
        <Text style={styles.agendaTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.agendaMeta}>{formatEventTime(event.date)} · {event.location}</Text>
        <View style={styles.agendaStatsRow}>
          <Text style={styles.agendaRsvp}>{event.confirmedAttendees} / {event.maxCapacity}</Text>
        </View>
      </View>
      <View style={[styles.agendaBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.agendaBadgeText, { color: badge.text }]}>
          {STATUS_LABELS[status]}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

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
    toggleBtnText: { fontSize: 16, fontWeight: '800', color: colors.textSubtle },
    toggleBtnTextActive: { color: colors.surface },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },

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
    weekDayLabel: { fontSize: 16, fontWeight: '800', color: colors.textSubtle },

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
    dayNumberText: { fontSize: 16, fontWeight: '700', color: colors.textSubtle },
    dayNumberTextToday: { color: colors.primaryText, fontWeight: '900' },
    dayNumberTextSelected: { color: colors.primaryText, fontWeight: '900' },

    dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    eventDot: { width: 5, height: 5, borderRadius: 999 },

    selectedSection: { gap: 10 },
    noDayEvents: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    noDayEventsText: { color: colors.textSubtle, fontSize: 16, fontWeight: '600' },

    dayEventCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      overflow: 'hidden',
    },
    dayEventAccent: { width: 5 },
    dayEventContent: { flex: 1, padding: 14 },
    dayEventTitle: { ...typography.body, color: colors.text, marginBottom: 4 },
    dayEventMeta: { ...typography.caption, color: colors.textSubtle, marginBottom: 10 },
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
    openBtnText: { fontSize: 16, fontWeight: '900', color: colors.surface },

    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 16, fontWeight: '700', color: colors.textSubtle },

    // Agenda
    agendaCount: {
      fontSize: 16,
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
    emptyAgendaText: { color: colors.textSubtle, fontSize: 16, fontWeight: '600' },

    agendaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
    },
    agendaDateCol: { width: 36, alignItems: 'center' },
    agendaDay: { ...typography.title, color: colors.text, lineHeight: 24 },
    agendaMonth: { ...typography.caption, color: colors.textSubtle },
    agendaAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    agendaInfo: { flex: 1 },
    agendaTitle: { ...typography.body, color: colors.text, marginBottom: 2 },
    agendaMeta: { ...typography.caption, color: colors.textSubtle, marginBottom: 4 },
    agendaStatsRow: { flexDirection: 'row' },
    agendaRsvp: { ...typography.subtitle, color: colors.primary },
    agendaForecast: { fontSize: 16, fontWeight: '700', color: colors.textSubtle },
    agendaBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    agendaBadgeText: { fontSize: 16, fontWeight: '800' },
  });
}

import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { listEvents, type EventResponse, type EventType } from '../api/events';
import {
  getEventStatus,
  STATUS_LABELS,
  TYPE_LABELS,
  formatEventDate,
  formatEventTime,
  type EventStatus,
} from '../lib/event-status';
import { canCreateEvents } from '../lib/rbac';
import { useCallback } from 'react';


const STATUS_PILL_COLORS: Record<EventStatus, { bg: string; text: string }> = {
  upcoming: { bg: '#E0F2FE', text: '#0369A1' },
  ongoing:  { bg: '#D1FAE5', text: '#065F46' },
  past:     { bg: '#F3F4F6', text: '#4B5563' },
};

const STATUS_PILL_COLORS_DARK: Record<EventStatus, { bg: string; text: string }> = {
  upcoming: { bg: '#0C4A6E', text: '#7DD3FC' },
  ongoing:  { bg: '#064E3B', text: '#6EE7B7' },
  past:     { bg: '#1F2937', text: '#9CA3AF' },
};

type MenuState = { eventId: string; x: number; y: number } | null;

export function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const isDark = colors.background === '#0B1A24';

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [menuState, setMenuState] = useState<MenuState>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const role = user?.role ?? 'STUDENT';

  // Rol-gebaseerde sigbaarheid word reeds backend-kant afgedwing (events.service.ts),
  // so ons wys eenvoudig net wat die API teruggee.
  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || getEventStatus(e) === statusFilter;
      const matchType = typeFilter === 'all' || e.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [events, search, statusFilter, typeFilter]);

  function openMenu(event: EventResponse) {
    setMenuState({ eventId: event.id, x: 0, y: 0 });
  }

  function closeMenu() {
    setMenuState(null);
  }

  function handleDetails() {
    if (!menuState) return;
    closeMenu();
    navigation.navigate('EventDetail', { eventId: menuState.eventId });
  }

  function handleRsvp() {
    if (!menuState) return;
    closeMenu();
    navigation.navigate('EventDetail', { eventId: menuState.eventId });
  }

  const menuEvent = menuState
    ? events.find((e) => e.id === menuState.eventId)
    : null;

  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Funksies</Text>
        <View style={styles.headerRight}>
          {canCreateEvents(role) && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('EventDetail', { eventId: 'new' })}
              accessibilityLabel="Skep nuwe funksie"
            >
              <Feather name="plus" size={16} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={colors.textSubtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Soek funksies..."
            placeholderTextColor={colors.textSubtle}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Maak soektog skoon">
              <Feather name="x" size={14} color={colors.textSubtle} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
          onPress={() => setFilterOpen(true)}
          accessibilityLabel={`Filter funksies. ${activeFilters} aktief`}
        >
          <Feather name="sliders" size={16} color={activeFilters > 0 ? colors.surface : colors.text} />
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Result count ── */}
      <Text style={styles.resultCount}>
        {loading ? 'Laai...' : `${filtered.length} funksie${filtered.length !== 1 ? 's' : ''} sigbaar`}
      </Text>

      {/* ── Event list ── */}
      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.centerFill}>
          <Feather name="alert-circle" size={28} color={colors.red} />
          <Text style={styles.emptySubtitle}>{loadError}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={32} color={colors.textSubtle} />
              <Text style={styles.emptyTitle}>Geen funksies gevind nie</Text>
              <Text style={styles.emptySubtitle}>
                {search ? "Probeer 'n ander soektog of verwyder filters." : "Geen funksies beskikbaar vir jou rol nie."}
              </Text>
            </View>
          ) : (
            filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isDark={isDark}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                onMenuPress={() => openMenu(event)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Filter bottom sheet ── */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Filter funksies</Text>
              {activeFilters > 0 && (
                <TouchableOpacity
                  onPress={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                  accessibilityLabel="Maak alle filters skoon"
                >
                  <Text style={[styles.clearFilters, { color: colors.primary }]}>Maak skoon</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSubtle }]}>STATUS</Text>
            <View style={styles.filterChips}>
              {(['all', 'upcoming', 'ongoing', 'past'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    statusFilter === s && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setStatusFilter(s)}
                  accessibilityLabel={s === 'all' ? 'Alle statuse' : STATUS_LABELS[s]}
                  accessibilityState={{ selected: statusFilter === s }}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.textSubtle },
                    statusFilter === s && { color: colors.surface },
                  ]}>
                    {s === 'all' ? 'Alles' : STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSubtle }]}>TIPE</Text>
            <View style={styles.filterChips}>
              {(['all', 'public', 'internal_student', 'private', 'department'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    typeFilter === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setTypeFilter(t)}
                  accessibilityLabel={t === 'all' ? 'Alle tipes' : TYPE_LABELS[t]}
                  accessibilityState={{ selected: typeFilter === t }}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.textSubtle },
                    typeFilter === t && { color: colors.surface },
                  ]}>
                    {t === 'all' ? 'Alles' : TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setFilterOpen(false)}
            >
              <Text style={[styles.applyBtnText, { color: colors.surface }]}>Toepas</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Context menu ── */}
      <Modal
        visible={!!menuState}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {menuEvent && (
              <Text style={[styles.menuEventTitle, { color: colors.textSubtle }]} numberOfLines={1}>
                {menuEvent.title}
              </Text>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={handleDetails} accessibilityLabel="Sien besonderhede">
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Details</Text>
            </TouchableOpacity>
            {canRsvpVisible(role) && (
              <TouchableOpacity style={styles.menuItem} onPress={handleRsvp} accessibilityLabel="RSVP vir hierdie funksie">
                <Feather name="check-circle" size={16} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>RSVP vir hierdie funksie</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function canRsvpVisible(role: string): boolean {
  return role === 'STUDENT' || role === 'GAS';
}

// ── EventCard ─────────────────────────────────────────────────────────────────
function EventCard({
  event,
  isDark,
  onPress,
  onMenuPress,
}: {
  event: EventResponse;
  isDark: boolean;
  onPress: () => void;
  onMenuPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const status = getEventStatus(event);
  const pillColors = isDark ? STATUS_PILL_COLORS_DARK[status] : STATUS_PILL_COLORS[status];
  const { day, month } = formatEventDate(event.date);

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`${event.title}, ${day} ${month}, ${event.location}`}
      accessibilityRole="button"
    >
      {/* Date badge */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      {/* Main content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {formatEventTime(event.date)} · {event.location}
        </Text>
        <View style={styles.cardStats}>
          <Text style={styles.rsvpCount}>
            {event.confirmedAttendees} / {event.maxCapacity}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.statusPill, { backgroundColor: pillColors.bg }]}>
            <Text style={[styles.statusPillText, { color: pillColors.text }]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        </View>
      </View>

      {/* 3-dot menu */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={onMenuPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Meer opsies"
        accessibilityRole="button"
      >
        <Feather name="more-vertical" size={18} color={colors.textSubtle} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    headerRight: { flexDirection: 'row', gap: 8 },
    createBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    searchRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
      paddingVertical: 0,
    },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: { fontSize: 16, fontWeight: '900', color: colors.primary },

    resultCount: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSubtle,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },

    scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    emptySubtitle: { fontSize: 16, color: colors.textSubtle, textAlign: 'center', lineHeight: 18 },

    // Event card
    eventCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
    },
    dateBadge: {
      width: 48,
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: '#E0F7FA',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    dateDay: { fontSize: 20, fontWeight: '900', color: '#0369A1', lineHeight: 24 },
    dateMonth: { fontSize: 16, fontWeight: '800', color: '#0369A1', marginTop: 1 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 2 },
    cardMeta: { fontSize: 16, color: colors.textSubtle, fontWeight: '600', marginBottom: 6 },
    cardStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rsvpCount: { fontSize: 16, fontWeight: '900', color: colors.primary },
    forecastCount: { fontSize: 16, fontWeight: '700', color: colors.textSubtle },
    cardFooter: { flexDirection: 'row', alignItems: 'center' },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statusPillText: { fontSize: 16, fontWeight: '700' },
    menuBtn: {
      paddingTop: 2,
      paddingLeft: 4,
    },

    // Filter sheet
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 17, fontWeight: '900' },
    clearFilters: { fontSize: 16, fontWeight: '700' },
    filterLabel: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.6,
      marginBottom: 8,
      marginTop: 14,
    },
    filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: { fontSize: 16, fontWeight: '700' },
    applyBtn: {
      marginTop: 24,
      borderRadius: 14,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyBtnText: { fontSize: 16, fontWeight: '900' },

    // Context menu
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    menuCard: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    menuEventTitle: {
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      letterSpacing: 0.3,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: { fontSize: 16, fontWeight: '700' },
  });
}

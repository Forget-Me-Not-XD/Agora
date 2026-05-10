import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import {
  MOCK_EVENTS,
  STATUS_LABELS,
  TYPE_LABELS,
  formatFullDate,
  type EventStatus,
} from '../lib/mock-data';
import { canViewBudget, canManageCheckIns } from '../lib/rbac';

const STATUS_PILL: Record<EventStatus, { bg: string; text: string }> = {
  upcoming:  { bg: '#E0F2FE', text: '#0369A1' },
  ongoing:   { bg: '#D1FAE5', text: '#065F46' },
  past:      { bg: '#F3F4F6', text: '#4B5563' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;
type Route = RouteProp<RootStackParamList, 'EventDetail'>;

export function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const event = MOCK_EVENTS.find((e) => e.id === route.params.eventId);
  const role = user?.role ?? 'STUDENT';

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Feather name="alert-circle" size={32} color={colors.textSubtle} />
          <Text style={styles.errorText}>Funksie nie gevind nie</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Terug</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fillPct = Math.min(Math.round((event.registered / event.capacity) * 100), 100);
  const forecastPct = Math.min(Math.round((event.forecast / event.capacity) * 100), 100);
  const pillColor = STATUS_PILL[event.status];

  function handleManageRsvps() {
    Alert.alert(
      'Bestuur RSVPs',
      `${event!.registered} RSVPs vir ${event!.title}. Volle RSVP-bestuur koms binnekort.`,
      [{ text: 'OK' }],
    );
  }

  function handleQrScanner() {
    navigation.navigate('QrScanner', { eventId: event!.id });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Back + header ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Terug"
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>Funksie Detail</Text>
        <View style={[styles.statusPill, { backgroundColor: pillColor.bg }]}>
          <Text style={[styles.statusPillText, { color: pillColor.text }]}>
            {STATUS_LABELS[event.status]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Title block ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventSubtitle}>
            {formatFullDate(event.date)} · {event.time}{event.endTime ? ` – ${event.endTime}` : ''} · {event.location}
          </Text>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{event.registered}</Text>
            <Text style={styles.statLabel}>RSVPs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textSubtle }]}>{event.forecast}</Text>
            <Text style={styles.statLabel}>Voorspel</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{event.noShows}</Text>
            <Text style={styles.statLabel}>No-shows</Text>
          </View>
        </View>

        {/* ── AI prediction card ── */}
        <View style={styles.aiCard}>
          <View style={styles.aiTop}>
            <View>
              <View style={styles.aiNumRow}>
                <Text style={styles.aiNum}>{event.forecast}</Text>
                <Text style={styles.aiLabel}> gaste verwag</Text>
              </View>
              <Text style={styles.aiSubtitle}>
                Reeks: {event.forecastLow} – {event.forecastHigh} · {event.forecastConfidence}% vertroue
              </Text>
            </View>
            <View style={styles.aiBadge}>
              <Feather name="cpu" size={12} color={colors.primary} />
              <Text style={styles.aiBadgeText}>KI</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${forecastPct}%` }]} />
          </View>
        </View>

        {/* ── Details table ── */}
        <View style={styles.detailsCard}>
          <DetailRow label="Datum" value={formatFullDate(event.date)} colors={colors} />
          <DetailRow
            label="Tyd"
            value={`${event.time}${event.endTime ? ` – ${event.endTime}` : ''}`}
            colors={colors}
          />
          <DetailRow label="Lokaal" value={event.location} colors={colors} />
          <DetailRow label="Tipe" value={TYPE_LABELS[event.type]} colors={colors} />
          <DetailRow label="Kapasiteit" value={`${event.registered} / ${event.capacity} (${fillPct}%)`} colors={colors} />
          {canViewBudget(role) && (
            <DetailRow
              label="Begroting"
              value={`R ${event.budget.toLocaleString('af-ZA')}`}
              colors={colors}
              isLast
            />
          )}
          {!canViewBudget(role) && (
            <DetailRow label="Begroting" value="—" colors={colors} isLast />
          )}
        </View>

        {/* ── Description ── */}
        {event.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>Beskrywing</Text>
            <Text style={styles.descText}>{event.description}</Text>
          </View>
        ) : null}

        {/* ── Action buttons ── */}
        {canManageCheckIns(role) && (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleManageRsvps}
              accessibilityLabel="Bestuur RSVPs"
            >
              <Feather name="users" size={16} color={colors.surface} />
              <Text style={styles.primaryBtnText}>Bestuur RSVPs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleQrScanner}
              accessibilityLabel="QR Skandeerder"
            >
              <Feather name="maximize" size={16} color={colors.text} />
              <Text style={styles.secondaryBtnText}>QR Skandeerder</Text>
            </TouchableOpacity>
          </>
        )}

        {!canManageCheckIns(role) && event.status === 'upcoming' && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Alert.alert('RSVP', 'RSVP-funksionaliteit koms binnekort.')}
            accessibilityLabel="RSVP vir hierdie funksie"
          >
            <Feather name="check-circle" size={16} color={colors.surface} />
            <Text style={styles.primaryBtnText}>RSVP vir hierdie funksie</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  colors,
  isLast,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSubtle }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, maxWidth: '60%', textAlign: 'right' }}>
        {value}
      </Text>
    </View>
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
    backIconBtn: {
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
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusPillText: { fontSize: 11, fontWeight: '800' },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },

    titleBlock: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    eventTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 6 },
    eventSubtitle: { fontSize: 13, color: colors.textSubtle, fontWeight: '600', lineHeight: 18 },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 11, fontWeight: '700', color: colors.textSubtle, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

    aiCard: {
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.surface,
    },
    aiTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    aiNumRow: { flexDirection: 'row', alignItems: 'baseline' },
    aiNum: { fontSize: 36, fontWeight: '900', color: colors.primary },
    aiLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
    aiSubtitle: { fontSize: 12, color: colors.textSubtle, fontWeight: '600', marginTop: 2 },
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    aiBadgeText: { fontSize: 11, fontWeight: '800', color: colors.primary },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },

    detailsCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
    },

    descCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    descLabel: { fontSize: 11, fontWeight: '900', color: colors.textSubtle, marginBottom: 8, letterSpacing: 0.5 },
    descText: { fontSize: 13, color: colors.text, lineHeight: 20, fontWeight: '600' },

    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
    },
    primaryBtnText: { fontSize: 16, fontWeight: '900', color: colors.surface },

    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      height: 52,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '900', color: colors.text },

    errorWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 32,
    },
    errorText: { fontSize: 16, fontWeight: '700', color: colors.textSubtle },
    backBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 10,
    },
    backBtnText: { fontSize: 14, fontWeight: '800', color: colors.surface },
  });
}
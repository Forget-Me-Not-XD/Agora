import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { getEventsSummary, type EventsSummary } from '../api/analytics';

const MONTHS_AF = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

const ACCENTS = {
  blue:   { bgLight: '#DBEAFE', fgLight: '#1D4ED8', bgDark: '#1E3A5F', fgDark: '#93C5FD' },
  green:  { bgLight: '#D1FAE5', fgLight: '#047857', bgDark: '#064E3B', fgDark: '#6EE7B7' },
  orange: { bgLight: '#FFEDD5', fgLight: '#C2410C', bgDark: '#7C2D12', fgDark: '#FDBA74' },
} as const;
type AccentKey = keyof typeof ACCENTS;

export function BudgetScreen() {
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const isDark = colors.background === '#0B1A24';
  const styles = makeStyles(colors, isDark);

  const [data, setData] = useState<EventsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getEventsSummary();
        if (active) setData(result);
      } catch (err: unknown) {
        if (!active) return;
        const axiosErr = err as { response?: { status?: number } };
        setError(
          axiosErr?.response?.status === 403
            ? 'Jy het nie toegang tot begrotingsdata nie.'
            : 'Kon nie begrotingsdata laai nie.',
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const totalEvents = data?.eventsPerMonth.reduce((sum, m) => sum + m.count, 0) ?? 0;
  const topEvent = data?.top5Events[0] ?? null;
  const maxCount = Math.max(...(data?.eventsPerMonth.map((m) => m.count) ?? [1]), 1);
  const maxRsvps = Math.max(...(data?.top5Events.map((e) => e.totalRsvps) ?? [1]), 1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Begroting</Text>
        <Text style={styles.subtitle}>
          {user?.role === 'ADMIN' ? 'Finansiele oorsig vir alle geleenthede' : 'Finansiele oorsig'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={28} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <StatCard
              styles={styles}
              icon="calendar"
              accent="blue"
              label="Totale Geleenthede"
              value={String(totalEvents)}
              sub={`oor ${data?.eventsPerMonth.length ?? 0} maand(e)`}
            />
            <StatCard
              styles={styles}
              icon="trending-up"
              accent="green"
              label="Top Geleentheid RSVP's"
              value={topEvent ? String(topEvent.totalRsvps) : 'N/B'}
              sub={topEvent ? topEvent.eventTitle : 'Geen data beskikbaar'}
            />
            <StatCard
              styles={styles}
              icon="bar-chart-2"
              accent="orange"
              label="Aktiewe Maande"
              value={String(data?.eventsPerMonth.length ?? 0)}
              sub="met geleentheidsaktiwiteit"
            />
          </View>

          <Text style={styles.sectionTitle}>Geleenthede per Maand</Text>
          <View style={styles.card}>
            {(data?.eventsPerMonth.length ?? 0) === 0 ? (
              <Text style={styles.emptyText}>Geen maandelikse data beskikbaar nie.</Text>
            ) : (
              data!.eventsPerMonth.map((item, i) => (
                <View key={`${item.year}-${item.month}`} style={[styles.row, i === 0 && styles.rowFirst]}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowLabel}>{MONTHS_AF[item.month - 1]} {item.year}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {item.count} geleentheid{item.count !== 1 ? 'e' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round((item.count / maxCount) * 100)}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Top 5 Geleenthede (RSVP&apos;s)</Text>
          <View style={styles.card}>
            {(data?.top5Events.length ?? 0) === 0 ? (
              <Text style={styles.emptyText}>Geen RSVP-data beskikbaar nie.</Text>
            ) : (
              data!.top5Events.map((item, i) => (
                <View key={item.eventTitle} style={[styles.row, i === 0 && styles.rowFirst]}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowTitleWrap}>
                      <Text style={styles.rankText}>#{i + 1}</Text>
                      <Text style={styles.rowLabel} numberOfLines={1}>{item.eventTitle}</Text>
                    </View>
                    <View style={[styles.countBadge, styles.countBadgeGreen]}>
                      <Text style={[styles.countBadgeText, styles.countBadgeTextGreen]}>
                        {item.totalRsvps} RSVP&apos;s
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFillGreen, { width: `${Math.round((item.totalRsvps / maxRsvps) * 100)}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type BudgetStyles = ReturnType<typeof makeStyles>;

function StatCard({
  styles,
  icon,
  accent,
  label,
  value,
  sub,
}: {
  styles: BudgetStyles;
  icon: keyof typeof Feather.glyphMap;
  accent: AccentKey;
  label: string;
  value: string;
  sub: string;
}) {
  const a = ACCENTS[accent];
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: styles.isDark ? a.bgDark : a.bgLight }]}>
        <Feather name={icon} size={16} color={styles.isDark ? a.fgDark : a.fgLight} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>, isDark: boolean) {
  const shadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.35 : 0.06,
    shadowRadius: 8,
    elevation: 3,
  };

  return {
    isDark,
    ...StyleSheet.create({
      safe: { flex: 1, backgroundColor: colors.background },
      header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
      title: { fontSize: 22, fontWeight: '900', color: colors.text },
      subtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 4, fontWeight: '600' },

      centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
      errorCard: {
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 24,
      },
      errorText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600', textAlign: 'center' },

      scroll: { padding: 16, paddingBottom: 32 },

      statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
      statCard: {
        width: '48%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 14,
        ...shadow,
      },
      statIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
      },
      statLabel: { color: colors.textSubtle, fontSize: 11, fontWeight: '700' },
      statValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
      statSub: { color: colors.textSubtle, fontSize: 11, marginTop: 4, fontWeight: '600' },

      sectionTitle: {
        color: colors.textSubtle,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginTop: 18,
        marginBottom: 10,
      },

      card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...shadow,
      },
      emptyText: {
        color: colors.textSubtle,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: 24,
      },

      row: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      rowFirst: { borderTopWidth: 0 },
      rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
      rowTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
      rankText: { color: colors.textSubtle, fontSize: 12, fontWeight: '900' },
      rowLabel: { color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },

      countBadge: {
        backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      },
      countBadgeText: { color: isDark ? '#93C5FD' : '#1D4ED8', fontSize: 11, fontWeight: '800' },
      countBadgeGreen: { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
      countBadgeTextGreen: { color: isDark ? '#6EE7B7' : '#047857' },

      progressTrack: { height: 6, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
      progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
      progressFillGreen: { height: '100%', borderRadius: 999, backgroundColor: '#22C55E' },
    }),
  } as const;
}

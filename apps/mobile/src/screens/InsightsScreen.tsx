// ========== Imports: ==========
import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { ScreenHeader } from '../components/ScreenHeader';
import { listEvents, type EventResponse, type EventType } from '../api/events';
import { TYPE_LABELS, formatFullDate } from '../lib/event-status';
import { canViewInsights } from '../lib/rbac';

function isEventPast(event: EventResponse): boolean {
  const now = Date.now();
  const start = new Date(event.date).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : start;
  return now > end;
}

// Bygewoon = werklik ingeteken (QR geskandeer), nie net ingeskryf nie -- die
// hele Insigte-skerm se "Bywoning"-syfers (rangorde, tipe-opsplitsing, ens.)
// moet almal hierdie definisie deel, nie RSVP-vulkoers nie.
function attendanceRateOf(event: EventResponse): number {
  return event.maxCapacity > 0 ? event.checkedInCount / event.maxCapacity : 0;
}

function attendanceTone(rate: number, colors: ReturnType<typeof useThemeColors>): { fg: string; bg: string } {
  if (rate >= 80) return { fg: colors.success, bg: colors.successBg };
  if (rate >= 50) return { fg: colors.warning, bg: colors.warningBg };
  return { fg: colors.red, bg: colors.redBg };
}

export function InsightsScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const role = user?.role ?? 'STUDENT';
  const allowed = canViewInsights(role);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const all = await listEvents();
        if (active) setEvents(all);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [allowed]);

  if (!allowed) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="KI Insigte" />
        <View style={styles.centerFill}>
          <Feather name="lock" size={28} color={colors.textSubtle} />
          <Text style={styles.emptyText}>
            KI Insigte is beskikbaar vir dosente en administrateurs.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const relevant = (role === 'ADMIN' ? events : events.filter((e) => e.createdBy === user?.id))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const completed = relevant.filter(isEventPast);
  // Bygewoon = werklik ingeteken (QR geskandeer), nie net ingeskryf nie -- sien
  // checkedInCount op die backend (event.schema.ts).
  const totalAttended = completed.reduce((sum, e) => sum + e.checkedInCount, 0);
  const totalCapacity = completed.reduce((sum, e) => sum + e.maxCapacity, 0);
  const overallRate = totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 100) : 0;

  const ranked = completed
    .filter((e) => e.maxCapacity > 0)
    .slice()
    .sort((a, b) => attendanceRateOf(b) - attendanceRateOf(a));
  const topPerformers = ranked.slice(0, 3);
  const bottomPerformers = ranked.length > 3 ? ranked.slice(-3).reverse() : [];

  const typeBreakdown = (Object.keys(TYPE_LABELS) as EventType[])
    .map((type) => {
      const typeEvents = completed.filter((e) => e.type === type && e.maxCapacity > 0);
      const avgRate = typeEvents.length > 0
        ? Math.round((typeEvents.reduce((sum, e) => sum + attendanceRateOf(e), 0) / typeEvents.length) * 100)
        : null;
      return { type, count: typeEvents.length, avgRate };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => (b.avgRate ?? 0) - (a.avgRate ?? 0));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="KI Insigte"
        subtitle={role === 'ADMIN' ? 'Prestasie oorsig vir alle voltooide geleenthede' : 'Prestasie oorsig vir jou voltooide geleenthede'}
      />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : completed.length === 0 ? (
        <View style={styles.centerFill}>
          <Feather name="bar-chart-2" size={28} color={colors.textSubtle} />
          <Text style={styles.emptyText}>Geen voltooide geleenthede om insigte oor te wys nie.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.kpiGrid}>
            <InsightStat
              icon="users"
              tone="info"
              label="Totaal Bygewoon"
              value={String(totalAttended)}
              sub={`oor ${completed.length} geleentheid${completed.length !== 1 ? 'e' : ''}`}
              styles={styles}
              colors={colors}
            />
            <InsightStat
              icon="trending-up"
              tone="success"
              label="Gem. Bywoning"
              value={`${overallRate}%`}
              sub="teenoor kapasiteit"
              styles={styles}
              colors={colors}
            />
            <InsightStat
              icon="check-circle"
              tone="warning"
              label="Voltooi"
              value={String(completed.length)}
              sub={`van ${relevant.length} totaal`}
              styles={styles}
              colors={colors}
            />
          </View>

          {topPerformers.length > 0 && (
            <PerformerCard
              title="Beste presterende geleenthede"
              icon="award"
              tone="success"
              events={topPerformers}
              styles={styles}
              colors={colors}
            />
          )}
          {bottomPerformers.length > 0 && (
            <PerformerCard
              title="Swakste presterende geleenthede"
              icon="trending-down"
              tone="red"
              events={bottomPerformers}
              styles={styles}
              colors={colors}
            />
          )}

          {typeBreakdown.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bywoning per Tipe Geleentheid</Text>
              {typeBreakdown.map(({ type, count, avgRate }) => {
                const tone = attendanceTone(avgRate ?? 0, colors);
                return (
                  <View key={type} style={styles.typeRow}>
                    <View style={styles.typeRowHead}>
                      <Text style={styles.typeLabel}>{TYPE_LABELS[type]}</Text>
                      <Text style={styles.typeCount}>{count} geleentheid{count !== 1 ? 'e' : ''}</Text>
                      <Text style={styles.typeRate}>{avgRate}%</Text>
                    </View>
                    <View style={styles.typeTrack}>
                      <View style={[styles.typeFill, { width: `${avgRate ?? 0}%`, backgroundColor: tone.fg }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type InsightsStyles = ReturnType<typeof makeStyles>;

function InsightStat({
  icon,
  tone,
  label,
  value,
  sub,
  styles,
  colors,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  tone: 'info' | 'success' | 'warning';
  label: string;
  value: string;
  sub: string;
  styles: InsightsStyles;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const bg = tone === 'success' ? colors.successBg : tone === 'warning' ? colors.warningBg : colors.infoBg;
  const fg = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.info;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color={fg} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function PerformerCard({
  title,
  icon,
  tone,
  events,
  styles,
  colors,
}: {
  title: string;
  icon: ComponentProps<typeof Feather>['name'];
  tone: 'success' | 'red';
  events: EventResponse[];
  styles: InsightsStyles;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const toneColor = tone === 'success' ? colors.success : colors.red;
  const toneBg = tone === 'success' ? colors.successBg : colors.redBg;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeadRow}>
        <View style={[styles.iconChip, { backgroundColor: toneBg }]}>
          <Feather name={icon} size={14} color={toneColor} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {events.map((event) => {
        const rate = Math.round(attendanceRateOf(event) * 100);
        const tone2 = attendanceTone(rate, colors);
        return (
          <View key={event.id} style={styles.performerRow}>
            <View style={styles.performerInfo}>
              <Text style={styles.performerTitle} numberOfLines={1}>{event.title}</Text>
              <Text style={styles.performerMeta}>
                {formatFullDate(event.date)} · {event.checkedInCount} / {event.maxCapacity}
              </Text>
            </View>
            <View style={[styles.ratePill, { backgroundColor: tone2.bg }]}>
              <Text style={[styles.rateText, { color: tone2.fg }]}>{rate}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
    emptyText: { ...typography.bodyRegular, color: colors.textSubtle, textAlign: 'center' },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
      width: '31%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    statIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statLabel: { ...typography.micro, color: colors.textSubtle },
    statValue: { ...typography.title, color: colors.text, marginTop: 2 },
    statSub: { ...typography.micro, color: colors.textSubtle, marginTop: 2 },

    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    iconChip: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { ...typography.subtitle, color: colors.text },

    performerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    performerInfo: { flex: 1 },
    performerTitle: { ...typography.body, color: colors.text },
    performerMeta: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
    ratePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    rateText: { ...typography.caption, fontWeight: '900' },

    typeRow: { marginTop: 12 },
    typeRowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    typeLabel: { ...typography.body, color: colors.text, flex: 1 },
    typeCount: { ...typography.micro, color: colors.textSubtle },
    typeRate: { ...typography.subtitle, color: colors.text },
    typeTrack: { height: 6, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
    typeFill: { height: 6, borderRadius: 999 },
  });
}

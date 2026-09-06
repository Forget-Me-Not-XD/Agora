// ========== Imports: ==========
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { formatFullDate } from '../lib/event-status';
import type { ModelStatus, ModelHealth } from '../api/analytics';

const HEALTH_META: Record<ModelHealth, { label: string; icon: ComponentProps<typeof Feather>['name'] }> = {
  good: { label: 'Gesond', icon: 'check-circle' },
  fair: { label: 'Redelik', icon: 'alert-triangle' },
  poor: { label: 'Swak', icon: 'alert-octagon' },
  unknown: { label: 'Onbekend', icon: 'help-circle' },
};

export function ModelStatusCard({ status }: { status: ModelStatus | null }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!status || !status.available) {
    return (
      <View style={styles.card}>
        <View style={[styles.iconChip, { backgroundColor: colors.infoBg }]}>
          <Feather name="help-circle" size={16} color={colors.info} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>KI-model tans onbeskikbaar</Text>
          <Text style={styles.sub}>Geen opgeleide model gevind nie.</Text>
        </View>
      </View>
    );
  }

  const meta = HEALTH_META[status.health];
  const tone = status.health === 'good' ? { fg: colors.success, bg: colors.successBg }
    : status.health === 'fair' ? { fg: colors.warning, bg: colors.warningBg }
    : status.health === 'poor' ? { fg: colors.red, bg: colors.redBg }
    : { fg: colors.info, bg: colors.infoBg };
  const accuracyPct = status.fillRateMae !== null ? Math.round((1 - status.fillRateMae) * 100) : null;

  return (
    <View style={styles.card}>
      <View style={[styles.iconChip, { backgroundColor: tone.bg }]}>
        <Feather name={meta.icon} size={16} color={tone.fg} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.headRow}>
          <Text style={styles.title}>KI-model status</Text>
          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.pillText, { color: tone.fg }]}>{meta.label}</Text>
          </View>
        </View>
        {status.trainedAt && (
          <Text style={styles.sub}>
            Laas opgelei op {formatFullDate(status.trainedAt)} · {status.eventsUsed ?? 0} geleenthede
          </Text>
        )}
        {accuracyPct !== null && (
          <Text style={styles.sub}>Gem. akkuraatheid {accuracyPct}%</Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
    },
    iconChip: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: { flex: 1, gap: 2 },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    title: { ...typography.body, color: colors.text },
    sub: { ...typography.caption, color: colors.textSubtle, fontWeight: '500' },
    pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    pillText: { ...typography.micro, fontWeight: '800' },
  });
}

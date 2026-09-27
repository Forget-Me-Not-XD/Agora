// ========== Imports: ==========
import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import type { AlternativeKind, AlternativePrediction, PredictionResult, RecommendationSeverity } from '../api/analytics';

type ThemeColors = ReturnType<typeof useThemeColors>;

const SEVERITY_LABELS: Record<RecommendationSeverity, string> = {
  high: 'Belangrik',
  medium: 'Oorweeg',
  low: 'Inligting',
};

const KIND_LABELS: Record<AlternativeKind, string> = {
  sameWeek: 'Dieselfde week',
  laterWeek: 'Later',
  recommendedCapacity: 'Ander kapasiteit',
};

const AFRIKAANS_DAYS = ['Sondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag'];
const AFRIKAANS_MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

interface PredictionAdviceProps {
  prediction: PredictionResult;
  onChooseAlternative?: (alternative: AlternativePrediction) => void;
  disabled?: boolean;
}

export function PredictionAdvice({ prediction, onChooseAlternative, disabled = false }: PredictionAdviceProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [best, ...others] = prediction.alternatives.filter((alternative) =>
    Number.isFinite(alternative.estimatedAttendees) && alternative.estimatedAttendees > prediction.estimatedAttendees,
  );

  return (
    <View>
      {prediction.recommendations.length > 0 && (
        <>
          <Text style={styles.heading}>Aanbevelings</Text>
          {prediction.recommendations.map((recommendation) => {
            const tone = severityTone(recommendation.severity, colors);
            return (
              <View key={recommendation.type} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.pillText, { color: tone.fg }]}>
                      {SEVERITY_LABELS[recommendation.severity]}
                    </Text>
                  </View>
                  <Text style={styles.impact}>{recommendation.expectedImpact}</Text>
                </View>
                <Text style={styles.message}>{recommendation.message}</Text>
              </View>
            );
          })}
        </>
      )}

      <Text style={styles.heading}>Beter opsies volgens die model</Text>

      {best ? (
        <>
          <View style={styles.bestCard}>
            <View style={styles.bestTop}>
              <View style={styles.bestText}>
                <View style={styles.bestLabelRow}>
                  <Feather name="trending-up" size={14} color={colors.success} />
                  <Text style={styles.bestLabel}>Beste opsie</Text>
                </View>
                <Text style={styles.bestDay}>{formatAlternativeDay(best)}</Text>
                <Text style={styles.sub}>
                  {KIND_LABELS[best.kind]} · {best.capacity} sitplekke
                </Text>
              </View>
              <View style={styles.gainCol}>
                <Text style={styles.bestGain}>+{attendeeGain(best, prediction)}</Text>
                <Text style={styles.sub}>bywoners</Text>
              </View>
            </View>

            <Text style={styles.message}>
              Die model verwag {best.estimatedAttendees} bywoners in plaas van {prediction.estimatedAttendees} ({Math.round(best.predictedFillRate * 100)}% vol).
            </Text>

            {onChooseAlternative && (
              <TouchableOpacity
                style={[styles.chooseBtn, disabled && styles.disabled]}
                onPress={() => onChooseAlternative(best)}
                disabled={disabled}
              >
                <Text style={styles.chooseText}>Kies hierdie opsie</Text>
              </TouchableOpacity>
            )}
          </View>

          {others.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileRow}>
              {others.map((alternative) => (
                <TouchableOpacity
                  key={`${alternative.kind}-${alternative.date}-${alternative.capacity}`}
                  style={[styles.tile, disabled && styles.disabled]}
                  onPress={() => onChooseAlternative?.(alternative)}
                  disabled={disabled || !onChooseAlternative}
                >
                  <Text style={styles.tileDay}>{formatAlternativeDay(alternative)}</Text>
                  <Text style={styles.tileGain}>+{attendeeGain(alternative, prediction)} bywoners</Text>
                  <Text style={styles.sub}>
                    {KIND_LABELS[alternative.kind]} · {alternative.capacity} sitplekke
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      ) : (
        <View style={styles.bestTip}>
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text style={[styles.message, styles.flexText]}>
            Die model het geen ander dag in die komende drie weke gevind waarop meer mense sal opdaag nie. Jou huidige keuse is reeds die beste opsie.
          </Text>
        </View>
      )}
    </View>
  );
}

function attendeeGain(alternative: AlternativePrediction, prediction: PredictionResult): number {
  return alternative.estimatedAttendees - prediction.estimatedAttendees;
}

function formatAlternativeDay(alternative: AlternativePrediction): string {
  return `${AFRIKAANS_DAYS[alternative.dayOfWeek]} ${alternative.dayOfMonth} ${AFRIKAANS_MONTHS[alternative.month - 1]}`;
}

function severityTone(severity: RecommendationSeverity, colors: ThemeColors): { fg: string; bg: string } {
  if (severity === 'high') return { fg: colors.red, bg: colors.redBg };
  if (severity === 'medium') return { fg: colors.warning, bg: colors.warningBg };
  return { fg: colors.info, bg: colors.infoBg };
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    heading: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textSubtle,
      marginTop: 14,
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    card: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 6,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    pill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: { ...typography.caption },
    impact: { ...typography.caption, color: colors.textSubtle, flexShrink: 1, textAlign: 'right' },
    message: { ...typography.body, color: colors.text },
    sub: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
    bestCard: {
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.success,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    bestTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    bestText: { flex: 1 },
    bestLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bestLabel: { ...typography.caption, color: colors.success },
    bestDay: { ...typography.subtitle, color: colors.text, marginTop: 4 },
    gainCol: { alignItems: 'flex-end' },
    bestGain: { ...typography.heroStat, color: colors.success },
    chooseBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    chooseText: { ...typography.body, color: colors.surface },
    disabled: { opacity: 0.5 },
    tileRow: { gap: 8, paddingTop: 8 },
    tile: {
      width: 160,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    tileDay: { ...typography.body, color: colors.text },
    tileGain: { ...typography.body, color: colors.success, marginTop: 2 },
    bestTip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.success,
      borderRadius: 12,
      padding: 12,
    },
    flexText: { flex: 1 },
  });
}

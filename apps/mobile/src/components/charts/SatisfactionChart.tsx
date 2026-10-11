// ========== Imports: ==========
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { StarRating } from '../StarRating';
import { useThemeColors, type ThemeColors } from '../../theme/theme';
import { typography } from '../../theme/typography';
import { formatScore, roundScore } from '../../lib/review-view';

// The mobile version of the web's SatisfactionChart. Keep the two looking and behaving the same.

export interface SatisfactionItem {
  label: string;
  // Raw 0–5 average; rounding to a tenth happens here, for display only
  rating: number;
}

interface SatisfactionChartProps {
  data: SatisfactionItem[];
  // Passed in rather than worked out from the rows, so the big number is the backend's own average
  average: number;
  reviewCount: number;
}

const GAUGE_SIZE = 80;
const GAUGE_RADIUS = 32;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

// Screen readers get each score once, from StarRating's label, so the visible copies of the same
// name and number are hidden from them (accessibilityElementsHidden for iOS, the other for Android)
const hiddenFromScreenReaders = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

// Both the arc and the bars use the rounded score, so they match the number next to them
function percentOfMax(score: number): number {
  return (roundScore(score) / 5) * 100;
}

export function SatisfactionChart({ data, average, reviewCount }: SatisfactionChartProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const arcLength = (percentOfMax(average) / 100) * GAUGE_CIRCUMFERENCE;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.gauge} {...hiddenFromScreenReaders}>
          <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}>
            <Circle cx={40} cy={40} r={GAUGE_RADIUS} fill="none" stroke={colors.border} strokeWidth={7} />
            {/* A round cap draws a dot even when the arc has no length, so 0,0 gets no arc at all */}
            {roundScore(average) > 0 && (
              <Circle
                cx={40}
                cy={40}
                r={GAUGE_RADIUS}
                fill="none"
                stroke={colors.warning}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${GAUGE_CIRCUMFERENCE}`}
                // Start the arc at the top instead of on the right
                rotation={-90}
                origin="40, 40"
              />
            )}
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={styles.gaugeValue}>{formatScore(average)}</Text>
            <Text style={styles.gaugeCaption}>uit 5</Text>
          </View>
        </View>

        <View style={styles.headerText}>
          <StarRating value={average} size={24} label="Algehele gemiddeld" />
          <Text style={styles.headerLabel} {...hiddenFromScreenReaders}>Algehele gemiddeld</Text>
          <Text style={styles.headerCount}>
            {reviewCount} {reviewCount === 1 ? 'resensie' : 'resensies'}
          </Text>
        </View>
      </View>

      {data.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={styles.rowTop}>
            {/* No tooltip on a phone, so a long name wraps instead of being cut off */}
            <Text style={styles.rowLabel} {...hiddenFromScreenReaders}>{item.label}</Text>
            <StarRating value={item.rating} size={18} label={item.label} />
            <Text style={styles.rowValue} {...hiddenFromScreenReaders}>{formatScore(item.rating)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percentOfMax(item.rating)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    gauge: { width: GAUGE_SIZE, height: GAUGE_SIZE },
    gaugeCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    gaugeValue: { fontSize: 18, fontWeight: '900', color: colors.text, lineHeight: 20 },
    gaugeCaption: { ...typography.micro, color: colors.textSubtle },
    headerText: { flex: 1, gap: 4 },
    headerLabel: { ...typography.caption, color: colors.text },
    headerCount: { ...typography.caption, fontWeight: '500', color: colors.textSubtle },
    row: { gap: 6 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowLabel: { ...typography.caption, fontWeight: '600', color: colors.text, flex: 1 },
    rowValue: { ...typography.caption, fontWeight: '900', color: colors.text, minWidth: 26, textAlign: 'right' },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: colors.warning },
  });
}

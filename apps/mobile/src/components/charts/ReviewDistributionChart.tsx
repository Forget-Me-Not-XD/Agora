// ========== Imports: ==========
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, type ThemeColors } from '../../theme/theme';
import { typography } from '../../theme/typography';
import { countByWholeStar } from '../../lib/review-view';

// The mobile version of the web's ReviewDistributionChart: one bar per whole star, 5,0 at the top.
// How a score lands in a bar is explained at countByWholeStar.
const STARS = [5, 4, 3, 2, 1, 0];

function rangeLabel(star: number): string {
  return star === 5 ? '5,0' : `${star},0–${star},9`;
}

// What a screen reader says for the range, since "4,0–4,9" would be read with a dash in it
function spokenRange(star: number): string {
  return star === 5 ? '5,0' : `${star},0 tot ${star},9`;
}

// `scores` holds each review's raw overall score (the average of its categories)
export function ReviewDistributionChart({ scores }: { scores: number[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const counts = countByWholeStar(scores);

  return (
    <View style={styles.wrap}>
      {STARS.map((star) => {
        const count = counts[star];
        const pct = scores.length > 0 ? (count / scores.length) * 100 : 0;

        return (
          <View
            key={star}
            style={styles.row}
            accessible
            accessibilityLabel={`${spokenRange(star)}: ${count} ${count === 1 ? 'resensie' : 'resensies'}`}
          >
            <Text style={styles.label}>{rangeLabel(star)}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.count}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    label: { ...typography.caption, fontWeight: '500', color: colors.textSubtle, width: 64, fontVariant: ['tabular-nums'] },
    track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.warning },
    count: { ...typography.caption, fontWeight: '800', color: colors.text, width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
  });
}

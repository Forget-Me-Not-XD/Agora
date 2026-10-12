import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getPendingReviews, type PendingReview } from '../api/reviews';
import { daysLeftLabel } from '../lib/review-view';
import { formatFullDate } from '../lib/event-status';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';

// Herinner bywoners aan geleenthede wat hulle nog kan beoordeel. Is daar niks hangend nie, of kon
// dit nie laai nie, wys die kaart glad nie. Hou dit gelyk aan die web se PendingReviewsCard; die
// verskil is dat dit sy eie data laai.
export function PendingReviewsCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [reviews, setReviews] = useState<PendingReview[]>([]);

  // Net die jongste versoek mag die lys verander, soos in EventReviewSummary
  const latestRequest = useRef(0);

  // Herlaai elke keer as Tuis fokus kry, so ná die resensievel toemaak is die geleentheid weg.
  // Misluk 'n herlaai, bly die ou lys staan.
  useFocusEffect(
    useCallback(() => {
      const request = ++latestRequest.current;
      getPendingReviews()
        .then((data) => {
          if (request === latestRequest.current) setReviews(data);
        })
        .catch(() => {});
      return () => { latestRequest.current += 1; };
    }, []),
  );

  if (reviews.length === 0) return null;

  const now = Date.now();

  return (
    <View style={[styles.card, style]}>
      <View style={styles.titleRow}>
        <Feather name="star" size={16} color={colors.primary} />
        <Text style={styles.title}>Hangende Resensies ({reviews.length})</Text>
      </View>
      <Text style={styles.subtle}>Hoe was dit? Jou terugvoer is anoniem.</Text>

      {reviews.map((review) => {
        const daysLeft = daysLeftLabel(review.closesAt, now);
        return (
          <TouchableOpacity
            key={review.eventId}
            style={styles.row}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Review', { eventId: review.eventId })}
            accessibilityRole="button"
            accessibilityLabel={`Beoordeel ${review.title}, ${daysLeft}`}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>{review.title}</Text>
              <Text style={styles.rowMeta}>{formatFullDate(review.date)}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{daysLeft}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textSubtle} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { ...typography.body, fontWeight: '800', color: colors.text },
    subtle: { ...typography.bodyRegular, color: colors.textSubtle },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rowText: { flex: 1 },
    rowTitle: { ...typography.body, color: colors.text },
    rowMeta: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
    pill: {
      backgroundColor: `${colors.primary}22`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  });
}

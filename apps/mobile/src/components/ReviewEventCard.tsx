import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ReviewEligibilityStatus } from '../api/reviews';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';

interface ReviewEventCardProps {
  status: ReviewEligibilityStatus | null;
  onReview: () => void;
}

// Net vir bywoners: 'n knoppie terwyl die venster oop is, anders sê dit waar hulle staan.
// Hou dit gelyk aan die web se ReviewEventCard.
export function ReviewEventCard({ status, onReview }: ReviewEventCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (status !== 'OPEN' && status !== 'ALREADY_REVIEWED' && status !== 'CLOSED' && status !== 'NOT_ENDED') return null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Feather name="star" size={16} color={colors.primary} />
        <Text style={styles.title}>Resensie</Text>
      </View>

      {status === 'OPEN' ? (
        <>
          <Text style={styles.subtle}>Hoe was die geleentheid? Jou terugvoer is anoniem.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onReview} accessibilityRole="button">
            <Feather name="star" size={16} color={colors.primaryText} />
            <Text style={styles.primaryBtnText}>Gee resensie</Text>
          </TouchableOpacity>
        </>
      ) : status === 'ALREADY_REVIEWED' ? (
        <View style={styles.doneTag}>
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text style={styles.doneText}>Reeds beoordeel</Text>
        </View>
      ) : (
        <View style={styles.infoRow}>
          <Feather name="clock" size={15} color={colors.textSubtle} />
          <Text style={[styles.subtle, styles.infoText]}>
            {status === 'CLOSED'
              ? 'Die resensie-periode vir hierdie geleentheid is verby.'
              : 'Die resensie-periode begin sodra die geleentheid klaar is.'}
          </Text>
        </View>
      )}
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
      gap: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { ...typography.body, fontWeight: '800', color: colors.text },
    subtle: { ...typography.bodyRegular, color: colors.textSubtle },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
    },
    primaryBtnText: { fontSize: 16, fontWeight: '900', color: colors.primaryText },
    doneTag: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      height: 52,
    },
    doneText: { fontSize: 16, fontWeight: '800', color: colors.text },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { flex: 1 },
  });
}

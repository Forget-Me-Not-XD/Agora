import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getReviewSummary, type ReviewSummary } from '../api/reviews';
import { REVIEW_BLOCKED_MESSAGE } from '../lib/review-view';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { LoadingSpinner } from './LoadingSpinner';
import { SatisfactionChart } from './charts/SatisfactionChart';
import { ReviewDistributionChart } from './charts/ReviewDistributionChart';
import { ReviewCommentList } from './ReviewCommentList';

// Wat bywoners van die geleentheid gedink het, net vir die skepper of 'n admin. Alles hier is
// anoniem. Hou dit gelyk aan die web se EventReviewSummary; die verskil is dat dit sy eie data laai.
export function EventReviewSummary({ eventId }: { eventId: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Net die jongste versoek mag die toestand verander. Herlaai by fokus, "Probeer weer" en
  // weggaan van die skerm kan oorvleuel, en 'n ou antwoord mag nie 'n nuwer een oorskryf nie.
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    const request = ++latestRequest.current;
    getReviewSummary(eventId)
      .then((data) => {
        if (request === latestRequest.current) setSummary(data);
      })
      // Misluk 'n herlaai terwyl daar reeds data is, bly die ou data staan. Sonder data wys die
      // kaart die fout met "Probeer weer", so hier is niks meer om te doen nie.
      .catch(() => {})
      .finally(() => {
        if (request === latestRequest.current) setLoading(false);
      });
  }, [eventId]);

  // Herlaai elke keer as die skerm fokus kry. Die ou data bly solank staan, sodat niks flikker nie.
  useFocusEffect(
    useCallback(() => {
      load();
      return () => { latestRequest.current += 1; };
    }, [load]),
  );

  function retry() {
    setLoading(true);
    load();
  }

  function renderBody() {
    if (loading && !summary) {
      return <LoadingSpinner size={40} />;
    }

    if (!summary) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.error}>Kon nie die resensies laai nie.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} accessibilityRole="button" accessibilityLabel="Probeer weer">
            <Feather name="refresh-cw" size={15} color={colors.text} />
            <Text style={styles.retryText}>Probeer weer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (summary.count === 0 || summary.overallAvg === null) {
      return (
        <Text style={styles.subtle}>
          {summary.categories.length === 0
            ? REVIEW_BLOCKED_MESSAGE.NO_CATEGORIES
            : 'Nog geen resensies nie. Bywoners wat ingeskandeer is, kan die geleentheid beoordeel sodra dit klaar is.'}
        </Text>
      );
    }

    // 'n Kategorie se avg is net null as niemand dit beoordeel het nie. Sodra daar resensies is, kan
    // dit nie meer gebeur nie: die eerste resensie sluit die kategorieë, en elke resensie beoordeel almal.
    const categories = summary.categories.flatMap((category) =>
      category.avg === null ? [] : [{ label: category.name, rating: category.avg }],
    );

    return (
      <>
        <SatisfactionChart data={categories} average={summary.overallAvg} reviewCount={summary.count} />

        <View style={styles.section}>
          <View>
            <Text style={styles.sectionTitle} accessibilityRole="header">Verspreiding</Text>
            <Text style={styles.sectionHint}>Elke resensie se algehele telling</Text>
          </View>
          <ReviewDistributionChart scores={summary.reviewScores} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Kommentaar</Text>
          <ReviewCommentList comments={summary.comments.map((item) => item.comment)} />
        </View>
      </>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Feather name="star" size={16} color={colors.primary} />
        <Text style={styles.title} accessibilityRole="header">Resensies</Text>
      </View>

      {renderBody()}
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
      gap: 16,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { ...typography.body, fontWeight: '800', color: colors.text },
    subtle: { ...typography.bodyRegular, color: colors.textSubtle },
    errorWrap: { gap: 12 },
    error: { ...typography.body, color: colors.red },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      height: 48,
    },
    retryText: { ...typography.body, fontWeight: '800', color: colors.text },
    section: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
    sectionTitle: { ...typography.body, fontWeight: '800', color: colors.text },
    sectionHint: { ...typography.caption, fontWeight: '500', color: colors.textSubtle, marginTop: 2 },
  });
}

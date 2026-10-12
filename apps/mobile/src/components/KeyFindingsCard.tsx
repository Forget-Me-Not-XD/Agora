import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getKeyFindings, type KeyFinding } from '../api/analytics';
import { formatFindingValue, usableFindings } from '../lib/key-findings';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { LoadingSpinner } from './LoadingSpinner';

const VISIBLE_COUNT = 3;

type FeatherName = ComponentProps<typeof Feather>['name'];
type Tone = 'success' | 'red' | 'warning' | 'info' | 'primary';

// Dieselfde indeling as die web se KeyFindings: groen wys wat goed werk, rooi wat swak vaar (die
// swakste dag en resensie-kategorie) en oranje waar sitplekke of mense verlore gaan. Koste en
// gradering is net inligting. Die mobiele tema het nie pers nie, so gradering kry die hoofkleur.
const FINDING_META: Record<string, { icon: FeatherName; tone: Tone }> = {
  'best-weekday': { icon: 'calendar', tone: 'success' },
  'worst-weekday': { icon: 'calendar', tone: 'red' },
  'best-month': { icon: 'calendar', tone: 'success' },
  'best-type': { icon: 'tag', tone: 'success' },
  'no-show-rate': { icon: 'user-x', tone: 'warning' },
  'unused-seats': { icon: 'grid', tone: 'warning' },
  'cost-per-attendee': { icon: 'credit-card', tone: 'info' },
  'weakest-review-category': { icon: 'message-square', tone: 'red' },
  'rating-vs-attendance': { icon: 'star', tone: 'primary' },
};

const FALLBACK_META: { icon: FeatherName; tone: Tone } = { icon: 'info', tone: 'info' };

// Laai die bevindinge sodra die skerm oopmaak, langs die model-status, en nie eers wanneer die
// kaart self verskyn nie. null beteken dat dit nog laai of misluk het; loading wys watter een.
export function useKeyFindings(enabled: boolean) {
  const [findings, setFindings] = useState<KeyFinding[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Net die jongste versoek mag die toestand verander, en nadat die skerm toegemaak is, word 'n
  // antwoord wat nog onderweg was, nie meer gebruik nie.
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    const request = ++latestRequest.current;
    setLoading(true);
    getKeyFindings()
      .then((data) => {
        if (request === latestRequest.current) setFindings(usableFindings(data));
      })
      .catch(() => {
        if (request === latestRequest.current) setFindings(null);
      })
      .finally(() => {
        if (request === latestRequest.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    return () => { latestRequest.current += 1; };
  }, [enabled, load]);

  return { findings, loading, retry: load };
}

interface KeyFindingsCardProps {
  findings: KeyFinding[] | null;
  loading: boolean;
  onRetry: () => void;
}

// Wat die afgelope geleenthede vir beplanning beteken: die syfer, 'n sin en 'n aksie per patroon.
// Die eerste drie wys altyd, die res eers as daarvoor gevra word.
export function KeyFindingsCard({ findings, loading, onRetry }: KeyFindingsCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);

  function renderBody() {
    if (findings === null && loading) {
      return <LoadingSpinner size={40} />;
    }

    if (findings === null) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.error}>Kon nie die sleutelbevindinge laai nie.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Probeer weer">
            <Feather name="refresh-cw" size={15} color={colors.text} />
            <Text style={styles.retryText}>Probeer weer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (findings.length === 0) {
      return (
        <Text style={styles.subtle}>
          Daar is nog nie genoeg afgelope geleenthede om betroubare patrone te vind nie. Bevindinge
          verskyn sodra daar genoeg data is.
        </Text>
      );
    }

    const shown = showAll ? findings : findings.slice(0, VISIBLE_COUNT);

    return (
      <View style={styles.list}>
        {shown.map((finding) => (
          <FindingItem key={finding.key} finding={finding} styles={styles} colors={colors} />
        ))}

        {findings.length > VISIBLE_COUNT && (
          <TouchableOpacity
            onPress={() => setShowAll((current) => !current)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={styles.toggle}>{showAll ? 'Wys minder' : `Wys alles (${findings.length})`}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.chip, { backgroundColor: `${colors.primary}22` }]}>
          <Feather name="zap" size={14} color={colors.primary} />
        </View>
        <View style={styles.titleText}>
          <Text style={styles.title} accessibilityRole="header">Sleutelbevindinge</Text>
          <Text style={styles.subtitle}>Patrone uit afgelope geleenthede, en wat jy daarmee kan doen</Text>
        </View>
      </View>

      {renderBody()}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function FindingItem({ finding, styles, colors }: { finding: KeyFinding; styles: Styles; colors: ThemeColors }) {
  const { icon, tone } = FINDING_META[finding.key] ?? FALLBACK_META;
  const { fg, bg } = toneColors(tone, colors);
  const { value, unit } = formatFindingValue(finding);

  return (
    <View style={styles.item}>
      <View style={styles.itemHead}>
        <View style={[styles.chip, { backgroundColor: bg }]}>
          <Feather name={icon} size={14} color={fg} />
        </View>
        <Text style={styles.itemTitle}>{finding.title}</Text>
      </View>

      <Text style={styles.value}>
        {value}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>

      <Text style={styles.sentence}>{finding.sentence}</Text>

      <View style={styles.action}>
        <Feather name="arrow-right" size={14} color={colors.primary} style={styles.actionIcon} />
        <Text style={styles.actionText}>{finding.action}</Text>
      </View>
    </View>
  );
}

function toneColors(tone: Tone, colors: ThemeColors): { fg: string; bg: string } {
  switch (tone) {
    case 'success': return { fg: colors.success, bg: colors.successBg };
    case 'red': return { fg: colors.red, bg: colors.redBg };
    case 'warning': return { fg: colors.warning, bg: colors.warningBg };
    case 'info': return { fg: colors.info, bg: colors.infoBg };
    case 'primary': return { fg: colors.primary, bg: `${colors.primary}22` };
  }
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleText: { flex: 1 },
    title: { ...typography.subtitle, color: colors.text },
    subtitle: { ...typography.caption, fontWeight: '500', color: colors.textSubtle, marginTop: 2 },
    chip: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

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

    list: { gap: 10 },
    item: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemTitle: { ...typography.caption, color: colors.textSubtle, flex: 1 },
    value: { ...typography.title, color: colors.text },
    unit: { ...typography.caption, color: colors.textSubtle },
    sentence: { ...typography.bodyRegular, fontSize: 14, color: colors.text },
    action: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: `${colors.primary}22`,
      borderRadius: 10,
      padding: 10,
    },
    actionIcon: { marginTop: 2 },
    actionText: { ...typography.caption, color: colors.text, flex: 1 },
    toggle: { ...typography.body, color: colors.primary, paddingVertical: 4 },
  });
}

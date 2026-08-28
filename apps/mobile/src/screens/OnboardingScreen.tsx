// ========== Imports: ==========
import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import type { UserRole } from '../lib/rbac';

interface OnboardingStep {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  body: string;
  roles?: UserRole[];
}

// Elke moontlike stap, een keer gedefinieer, met wie dit geld. 'n Nuwe
// rol-spesifieke stap beteken net 'n nuwe ry hier -- presies dieselfde
// patroon as TAB_CONFIG in MainTabs.tsx.
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: 'compass',
    title: 'Welkom by Agora',
    body: 'Jou toegangspunt vir universiteitsgeleenthede — blaai, skryf in, en hou by wat volgende gebeur.',
  },
  {
    icon: 'calendar',
    title: 'Blaai en skryf in',
    body: 'Kyk na aankomende funksies onder Funksies en Kalender, en skryf jouself in met een tik.',
    roles: ['STUDENT', 'GAS'],
  },
  {
    icon: 'map-pin',
    title: 'Jou studiesentrum',
    body: 'Ons wys geleenthede en inligting relevant tot jou eie studiesentrum.',
    roles: ['STUDENT'],
  },
  {
    icon: 'check-square',
    title: 'Jou QR-kode',
    body: 'Sodra jy ingeskryf het, wys jou QR-kode (onder RSVP) by die deur om in te teken.',
    roles: ['STUDENT', 'GAS'],
  },
  {
    icon: 'plus-circle',
    title: 'Skep en bestuur funksies',
    body: 'Skep nuwe funksies, volg RSVPs, en bestuur inskrywings — alles onder Funksies.',
    roles: ['DOSENT', 'ADMIN'],
  },
  {
    icon: 'cpu',
    title: 'KI-voorspellings',
    body: 'Kry KI-gedrewe voorspellings vir verwagte bywoning en begroting voordat jy \'n funksie skep.',
    roles: ['DOSENT', 'ADMIN'],
  },
  {
    icon: 'users',
    title: 'Bestuur gebruikers',
    body: 'Skep rekeninge en bestuur geregistreerde gebruikers onder Instellings.',
    roles: ['ADMIN'],
  },
  {
    icon: 'maximize',
    title: 'Teken gaste in',
    body: 'Gebruik die QR-skandeerder by \'n funksie se deur om gaste vinnig in te teken.',
    roles: ['DOSENT', 'ADMIN'],
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const role = user?.role ?? 'STUDENT';
  const steps = useMemo(
    () => ONBOARDING_STEPS.filter((s) => !s.roles || s.roles.includes(role)),
    [role],
  );

  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  function next() {
    if (isLast) {
      onDone();
    } else {
      setIndex((i) => i + 1);
    }
  }

  function back() {
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={onDone} accessibilityLabel="Slaan oor">
          <Text style={styles.skipText}>Slaan oor</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name={step.icon} size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
      </View>

      <View style={styles.dotsRow}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actionsRow}>
        {index > 0 ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={back} accessibilityLabel="Vorige">
            <Text style={styles.secondaryBtnText}>Vorige</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.secondaryBtn} />
        )}
        <TouchableOpacity style={styles.primaryBtn} onPress={next} accessibilityLabel={isLast ? 'Begin' : 'Volgende'}>
          <Text style={styles.primaryBtnText}>{isLast ? 'Begin' : 'Volgende'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    skipRow: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
    skipText: { ...typography.caption, color: colors.textSubtle },

    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: { ...typography.display, color: colors.text, textAlign: 'center' },
    body: {
      ...typography.bodyRegular,
      color: colors.textSubtle,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 22,
    },

    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary, width: 18 },

    actionsRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: { ...typography.body, color: colors.primaryText, fontWeight: '800' },
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryBtnText: { ...typography.body, color: colors.text, fontWeight: '800' },
  });
}

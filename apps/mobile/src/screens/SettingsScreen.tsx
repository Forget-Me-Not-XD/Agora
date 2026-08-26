import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useThemeStore, ThemeMode } from '../stores/theme.store';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { typography } from '../theme/typography';
import { useEffect, useMemo, useState } from 'react'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const OPTIONS: Array<{ mode: ThemeMode; label: string; subtitle: string }> = [
  { mode: 'system', label: 'Stelsel', subtitle: 'Volg jou foon se tema' },
  { mode: 'light', label: 'Lig', subtitle: 'Helder agtergrond' },
  { mode: 'dark', label: 'Donker', subtitle: 'Donker agtergrond' },
];

export function SettingsScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const user = useAuthStore((s) => s.user);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const biometricsAvailable = useAuthStore((s) => s.biometricsAvailable);
  const biometricsEnabled = useAuthStore((s) => s.biometricsEnabled);
  const checkBiometricsAvailability = useAuthStore((s) => s.checkBiometricsAvailability);
  const enableBiometrics = useAuthStore((s) => s.enableBiometrics);
  const disableBiometrics = useAuthStore((s) => s.disableBiometrics);
  const [togglingBiometrics, setTogglingBiometrics] = useState(false);

  useEffect(() => {
    checkBiometricsAvailability();
  }, [checkBiometricsAvailability]);

  const handleBiometricsToggle = async (value: boolean) => {
    setTogglingBiometrics(true);
    try {
      if (value) {
        const ok = await enableBiometrics();
        if (!ok) {
          Alert.alert('Biometrie', 'Kon nie biometrie aktiveer nie. Probeer weer.');
        }
      } else {
        await disableBiometrics();
      }
    } finally {
      setTogglingBiometrics(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Instellings" onBack={() => navigation.goBack()} />

      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>Profiel</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{user?.name} {user?.surname}</Text>
            <Text style={styles.rowSubtitle}>{user?.email} · Wysig profiel</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tema</Text>
        {OPTIONS.map((opt) => {
          const active = mode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => setMode(opt.mode)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{opt.label}</Text>
                <Text style={styles.rowSubtitle}>{opt.subtitle}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                <View style={[styles.radioDot, active && styles.radioDotActive]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

          {biometricsAvailable && (
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Biometrie</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Vingerafdruk / Face ID</Text>
            <Text style={styles.rowSubtitle}>Meld vinnig aan sonder om jou wagwoord te tik</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleBiometricsToggle}
            disabled={togglingBiometrics}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </View>
    )}


      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Wetlik</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Popia')}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>POPIA / Privaatheid</Text>
            <Text style={styles.rowSubtitle}>Hoe ons jou data versamel en gebruik</Text>
          </View>
        </TouchableOpacity>
      </View>

      {user?.role === 'ADMIN' && (
        <View style={[styles.card, styles.adminCard]}>
          <Text style={styles.cardTitle}>Administrasie</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('AdminCreateUser')}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Skep gebruiker</Text>
              <Text style={styles.rowSubtitle}>DOSENT, ADMIN of FOTOGRAAF rekening skep</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    adminCard: { marginTop: 16 },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowActive: {
      backgroundColor: colors.background,
    },
    rowText: { flex: 1, paddingRight: 12 },
    rowLabel: { ...typography.body, color: colors.text },
    rowSubtitle: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: 'transparent' },
    radioDotActive: { backgroundColor: colors.primary },
  });
}

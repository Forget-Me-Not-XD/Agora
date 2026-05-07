import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/theme';
import { useAuthStore } from '../stores/auth.store';

export function AiScreen() {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>KI Insigte</Text>
        <Text style={styles.subtitle}>
          {user?.role === 'ADMIN' || user?.role === 'DOSENT'
            ? "Model status, voorspelde bywoning en begrotingsinsigte (binnekort)."
            : 'KI-insigte sal hier beskikbaar wees wanneer dit geaktiveer word.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '900' },
    subtitle: { color: colors.textSubtle, fontSize: 13, marginTop: 8, lineHeight: 18 },
  });
}


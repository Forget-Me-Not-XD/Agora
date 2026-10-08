// ========== Imports: ==========
import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useThemeColors } from '../theme/theme';
import { requestPasswordReset } from '../api/auth';
import { getApiErrorMessage, getErrorStatus } from '../lib/errors';
import { safeGoBack } from '../lib/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      await requestPasswordReset(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      setError(
        getErrorStatus(err) === 429
          ? 'Te veel versoeke. Wag asseblief \'n rukkie en probeer weer.'
          : getApiErrorMessage(err, 'Kon nie die versoek stuur nie. Probeer later weer.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Wagwoord Vergeet</Text>
            <Text style={styles.subtitle}>
              Vul jou e-posadres in, dan stuur ons vir jou &apos;n skakel om &apos;n nuwe wagwoord te stel.
            </Text>
          </View>

          <View style={styles.card}>
            {sentTo ? (
              <View style={styles.successWrap}>
                <Feather name="mail" size={32} color={colors.primary} />
                <Text style={styles.successTitle}>
                  As daar &apos;n rekening vir {sentTo} bestaan, het ons &apos;n e-pos gestuur.
                </Text>
                <Text style={styles.successText}>
                  Maak die skakel in die e-pos in &apos;n webblaaier oop om &apos;n nuwe wagwoord te stel.
                  Die skakel werk op die Agora-webwerf, nie in die app nie, en verval oor 30 minute.
                </Text>
                <Text style={styles.successText}>
                  Daarna kan jy hier in die app met jou nuwe wagwoord aanmeld.
                </Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => safeGoBack(navigation)}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>Terug na aanmelding</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Text style={styles.label}>E-pos</Text>
                <TextInput
                  style={styles.input}
                  placeholder="naam@akademia.ac.za"
                  placeholderTextColor={colors.textSubtle}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                  editable={!isLoading}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, (isLoading || !email.trim()) && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading || !email.trim()}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <Text style={styles.primaryText}>Stuur Herstelskakel</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {!sentTo && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => safeGoBack(navigation)}
              disabled={isLoading}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Terug na aanmelding</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },

    header: { alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: colors.textSubtle, marginTop: 6, textAlign: 'center' },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },

    errorBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.red,
      marginBottom: 12,
    },
    errorText: { color: colors.red, fontSize: 16, fontWeight: '600' },

    label: { fontSize: 16, color: colors.textSubtle, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },

    primaryBtn: {
      alignSelf: 'stretch',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    primaryText: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
    buttonDisabled: { opacity: 0.6 },

    successWrap: { alignItems: 'center', gap: 10 },
    successTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    successText: { color: colors.textSubtle, fontSize: 16, textAlign: 'center' },

    linkButton: { marginTop: 20, alignItems: 'center' },
    linkText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  });
}

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login, isLoading, error, clearError } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    clearError();
    if (!email || !password) return;
    try {
      await login(email.trim(), password);
    } catch {
      // Error already in store
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>A</Text>
            </View>
            <Text style={styles.brandTitle}>Akademia</Text>
            <Text style={styles.brandSubtitle}>Funksiebestuurstelsel</Text>
          </View>

          <View style={styles.form}>
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
              keyboardType="email-address"
              editable={!isLoading}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Wagwoord</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="••••••••"
                placeholderTextColor={colors.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setPasswordVisible((v) => !v)}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
              >
                <Feather
                  name={passwordVisible ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textSubtle}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.primaryText}>Meld Aan</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Alert.alert('Binnekort', 'Biometriese aanmelding kom in ' + "'n" + ' volgende weergawe.')}
            >
              <Text style={styles.secondaryText}>Biometriese Aanmelding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => Alert.alert('Wagwoord', 'Kontak jou administrateur om jou wagwoord te herstel.')}
            >
              <Text style={styles.forgotText}>Wagwoord vergeet?</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>POPIA-beskermde aanmeld • SSL</Text>

            <Text style={styles.registerHelper}>
              Geen rekening? Kontak jou administrateur
            </Text>

            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.buttonDisabled]}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={styles.registerBtnText}>Registreer</Text>
            </TouchableOpacity>
          </View>
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

    brand: { alignItems: 'center', marginBottom: 26, marginTop: 10 },
    logoCircle: {
      width: 64,
      height: 64,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    logoLetter: { color: colors.primaryText, fontWeight: '900', fontSize: 26 },
    brandTitle: { fontSize: 28, fontWeight: '900', color: colors.text, marginTop: 2 },
    brandSubtitle: { fontSize: 13, color: colors.textSubtle, marginTop: 6 },

    form: {
      backgroundColor: colors.background,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    errorBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.red,
      marginBottom: 12,
    },
    errorText: { color: colors.red, fontSize: 13, fontWeight: '600' },

    label: { fontSize: 12, color: colors.textSubtle, marginBottom: 6 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    inputWrap: { position: 'relative' },
    inputWithIcon: { paddingRight: 44 },
    eyeBtn: {
      position: 'absolute',
      right: 10,
      top: 0,
      bottom: 0,
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    primaryText: { color: colors.primaryText, fontSize: 15, fontWeight: '800' },
    buttonDisabled: { opacity: 0.7 },

    secondaryBtn: {
      marginTop: 12,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: { color: colors.text, fontSize: 14, fontWeight: '700' },

    forgotBtn: { marginTop: 12, alignItems: 'center' },
    forgotText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

    footer: { marginTop: 14, textAlign: 'center', color: colors.textSubtle, fontSize: 11 },

    registerHelper: {
      marginTop: 20,
      textAlign: 'center',
      color: colors.textSubtle,
      fontSize: 13,
    },
    registerBtn: {
      marginTop: 10,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    registerBtnText: { color: colors.textSubtle, fontSize: 14, fontWeight: '700' },
  });
}
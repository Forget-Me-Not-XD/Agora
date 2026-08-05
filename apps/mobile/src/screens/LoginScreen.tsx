import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { useThemeStore } from '../stores/theme.store';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const agoraIconLight = require('../../assets/agora-icon.png');
const agoraIconDark = require('../../assets/agora-icon-dark.png');

export function LoginScreen({ navigation }: Props) {
  const { login, isLoading, error, clearError } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useThemeStore((s) => s.systemScheme);
  const isDark = (mode === 'system' ? systemScheme : mode) === 'dark';
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
            <Image
              source={isDark ? agoraIconDark : agoraIconLight}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.wordmarkRow}>
              <Text style={styles.wordmark}>agora</Text>
              <View style={styles.wordmarkDot} />
            </View>
            <Text style={styles.tagline}>vergader · beplan · verbind</Text>
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
              style={styles.forgotBtn}
              onPress={() => Alert.alert('Wagwoord', 'Kontak die Agora stelseladministrateur om jou wagwoord te herstel.')}
            >
              <Text style={styles.forgotText}>Wagwoord vergeet?</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>POPIA-beskermde aanmeld • SSL</Text>

            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.buttonDisabled]}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={styles.registerBtnText}>Registreer</Text>
            </TouchableOpacity>

            <Text style={styles.registerHelper}>
              Is jy &apos;n Dosent?{'\n\n'} 
              Kontak die Agora stelseladministrateur vir &apos;n rekening.
            </Text>
            
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
    logo: { width: 92, height: 105 },
    wordmarkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
    wordmark: { fontSize: 40, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    wordmarkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    tagline: { fontSize: 13, color: colors.textSubtle, marginTop: 6, letterSpacing: 0.3 },

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

    forgotBtn: { marginTop: 20, alignItems: 'center' },
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
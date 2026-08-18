import { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen(_props: Props) {
  const { changePassword, isLoading, error, clearError } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentVisible, setCurrentVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [newFocused, setNewFocused] = useState(false);

  const passwordRules = useMemo(() => ({
    minLength: newPassword.length >= 8,
    hasUpper:  /[A-Z]/.test(newPassword),
    hasLower:  /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSymbol: /[^a-zA-Z0-9\s]/.test(newPassword),
  }), [newPassword]);

  const allPasswordRulesPass = Object.values(passwordRules).every(Boolean);
  const passwordsMatch       = newPassword === confirmPassword;
  const showValidation       = newFocused || newPassword.length > 0;
  const formComplete         = currentPassword !== '' && allPasswordRulesPass && passwordsMatch;

  const validationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(validationAnim, {
      toValue: showValidation ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [showValidation]);

  const handleSubmit = async () => {
    clearError();
    if (!formComplete) return;
    try {
      await changePassword(currentPassword, newPassword);
    } catch {
      // Error is stored in the Zustand store and displayed below
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
          <View style={styles.formWrap}>
            <Text style={styles.heading}>Stel Nuwe Wagwoord</Text>
            <Text style={styles.helper}>
              Jou wagwoord is deur &apos;n administrateur geskep. Stel &apos;n nuwe wagwoord voordat jy voortgaan.
            </Text>

            {error && (
              <View style={styles.errorBox}>
                {error.split(', ').map((msg, i) => (
                  <View key={i} style={styles.errorRow}>
                    <Feather name="alert-circle" size={13} color={colors.red} />
                    <Text style={styles.errorText}>{msg}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Tydelike wagwoord"
                placeholderTextColor={colors.textSubtle}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!currentVisible}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setCurrentVisible((v) => !v)}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={currentVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
              >
                <Feather name={currentVisible ? 'eye-off' : 'eye'} size={18} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Nuwe wagwoord (min. 8 karakters)"
                placeholderTextColor={colors.textSubtle}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!newVisible}
                editable={!isLoading}
                onFocus={() => setNewFocused(true)}
                onBlur={() => setNewFocused(false)}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setNewVisible((v) => !v)}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={newVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
              >
                <Feather name={newVisible ? 'eye-off' : 'eye'} size={18} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <Animated.View style={[
              styles.validationBox,
              {
                opacity: validationAnim,
                maxHeight: validationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 220],
                }),
                overflow: 'hidden',
              },
            ]}>
              {([
                { ok: passwordRules.minLength, label: 'Minstens 8 karakters'   },
                { ok: passwordRules.hasUpper,  label: 'Minstens 1 hoofletter'  },
                { ok: passwordRules.hasLower,  label: 'Minstens 1 kleinletter' },
                { ok: passwordRules.hasNumber, label: 'Minstens 1 syfer'       },
                { ok: passwordRules.hasSymbol, label: 'Minstens 1 simbool'     },
              ] as const).map((rule) => (
                <View key={rule.label} style={styles.ruleRow}>
                  <Feather
                    name={rule.ok ? 'check-circle' : 'circle'}
                    size={14}
                    color={rule.ok ? '#16A34A' : colors.textSubtle}
                  />
                  <Text style={[styles.ruleText, rule.ok && styles.ruleTextOk]}>
                    {rule.label}
                  </Text>
                </View>
              ))}
            </Animated.View>

            <View style={styles.inputWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithIcon,
                  confirmPassword.length > 0 && !passwordsMatch && styles.inputError,
                ]}
                placeholder="Herhaal nuwe wagwoord"
                placeholderTextColor={colors.textSubtle}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!confirmVisible}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setConfirmVisible((v) => !v)}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={confirmVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
              >
                <Feather name={confirmVisible ? 'eye-off' : 'eye'} size={18} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <View style={styles.matchErrorRow}>
                <Feather name="alert-circle" size={12} color={colors.red} />
                <Text style={styles.matchErrorText}>Wagwoorde stem nie ooreen nie.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, (isLoading || !formComplete) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || !formComplete}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Stel Wagwoord</Text>
              )}
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
    formWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    heading: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 16 },
    helper: { fontSize: 16, color: colors.textSubtle, marginTop: 4, marginBottom: 24 },

    errorBox: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.red,
      marginBottom: 16,
    },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    errorText: { color: colors.red, fontSize: 16, fontWeight: '600' },

    inputWrap: { position: 'relative' },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    inputWithIcon: { paddingRight: 44 },
    inputError: { borderColor: colors.red },
    eyeBtn: {
      position: 'absolute',
      right: 10,
      top: 0,
      bottom: 12,
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },

    validationBox: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: -4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    ruleText: { fontSize: 16, color: colors.textSubtle, fontWeight: '500' },
    ruleTextOk: { color: '#16A34A', fontWeight: '700' },

    matchErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 12 },
    matchErrorText: { color: colors.red, fontSize: 16, fontWeight: '600' },

    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
  });
}

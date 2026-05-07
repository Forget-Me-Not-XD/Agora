import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore, RegisterPayload } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type UiRole = 'GAS' | 'STUDENT' | 'DOSENT' | 'ADMIN';

const ROLE_OPTIONS: Array<{ value: UiRole; label: string; subtitle?: string }> = [
  { value: 'GAS', label: 'GAS', subtitle: 'Gas' },
  { value: 'STUDENT', label: 'STUDENT', subtitle: 'Student' },
  { value: 'DOSENT', label: 'DOSENT', subtitle: 'Dosent' },
  { value: 'ADMIN', label: 'ADMIN', subtitle: 'Administrateur' },
];

const STUDY_CENTERS = [
  'Centurion - Leriba',
  'Centurion - Gerhard straat',
  'Paarl',
  'George',
  'Somerset Wes',
] as const;

export function RegisterScreen({ navigation }: Props) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [uiRole, setUiRole] = useState<UiRole>('STUDENT');
  const [centerOpen, setCenterOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [form, setForm] = useState<RegisterPayload>({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: 'GAS',
    studyCenter: '',
  });

  const update = <K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const payloadRole: RegisterPayload['role'] = useMemo(() => {
    if (uiRole === 'STUDENT') return 'GAS';
    return uiRole;
  }, [uiRole]);

  // Only GAS hides study center; STUDENT shares GAS privileges but still provides a study center.
  const showStudyCenter = uiRole !== 'GAS';

  const handleSubmit = async () => {
    clearError();
    try {
      await register({
        ...form,
        role: payloadRole,
        studyCenter: showStudyCenter ? form.studyCenter : '',
      });
    } catch {
      // Error stored in zustand
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
            <Text style={styles.heading}>Skep 'n rekening</Text>
            <Text style={styles.helper}>Voltooi al die velde om voort te gaan</Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Naam"
                placeholderTextColor={colors.textSubtle}
                value={form.name}
                onChangeText={(v) => update('name', v)}
                editable={!isLoading}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Van"
                placeholderTextColor={colors.textSubtle}
                value={form.surname}
                onChangeText={(v) => update('surname', v)}
                editable={!isLoading}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="E-pos"
              placeholderTextColor={colors.textSubtle}
              value={form.email}
              onChangeText={(v) => update('email', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Wagwoord (min. 8 karakters)"
                placeholderTextColor={colors.textSubtle}
                value={form.password}
                onChangeText={(v) => update('password', v)}
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

            {showStudyCenter && (
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setCenterOpen(true)}
                disabled={isLoading}
              >
                <Text style={[styles.dropdownText, !form.studyCenter && styles.dropdownPlaceholder]}>
                  {form.studyCenter || 'Studiesentrum'}
                </Text>
                <Text style={styles.dropdownChevron}>▾</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Rol</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map((r) => {
                const active = uiRole === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleCard, active && styles.roleCardActive]}
                    onPress={() => {
                      setUiRole(r.value);
                      // If GAS, clear study center & close dropdown
                      if (r.value === 'GAS') {
                        update('studyCenter', '');
                        setCenterOpen(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    <Text style={[styles.roleCardTitle, active && styles.roleCardTitleActive]}>
                      {r.label}
                    </Text>
                    {!!r.subtitle && (
                      <Text style={[styles.roleCardSub, active && styles.roleCardSubActive]}>
                        {r.subtitle}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Registreer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.linkText}>
                Het reeds 'n rekening? <Text style={styles.linkBold}>Meld aan</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={centerOpen} transparent animationType="fade" onRequestClose={() => setCenterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCenterOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { /* stop propagation */ }}>
            <Text style={styles.modalTitle}>Kies studiesentrum</Text>
            {STUDY_CENTERS.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.modalRow}
                onPress={() => {
                  update('studyCenter', c);
                  setCenterOpen(false);
                }}
              >
                <Text style={styles.modalRowText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
    helper: { fontSize: 14, color: colors.textSubtle, marginTop: 4, marginBottom: 24 },
    errorBox: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.red,
      marginBottom: 16,
    },
    errorText: { color: colors.red, fontSize: 13, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 8 },
    halfInput: { flex: 1 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      marginBottom: 12,
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
      bottom: 12, // account for input marginBottom
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownText: { color: colors.text, fontSize: 15, fontWeight: '600' },
    dropdownPlaceholder: { color: colors.textSubtle, fontWeight: '500' },
    dropdownChevron: { color: colors.textSubtle, fontSize: 16, marginLeft: 10 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 8 },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    roleCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    roleCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    roleCardTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    roleCardTitleActive: { color: colors.primaryText },
    roleCardSub: { color: colors.textSubtle, fontSize: 12, fontWeight: '700', marginTop: 4 },
    roleCardSubActive: { color: colors.primaryText },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.primaryText, fontSize: 15, fontWeight: '800' },
    linkButton: { marginTop: 20, alignItems: 'center' },
    linkText: { color: colors.textSubtle, fontSize: 14 },
    linkBold: { color: colors.primary, fontWeight: '800' },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 18,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
    modalRow: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    modalRowText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  });
}
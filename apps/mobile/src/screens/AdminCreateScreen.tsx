import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
    Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { RootStackParamList } from '../navigation/AppNavigator';
import { adminCreateUser, CreateUserPayload } from '../api/auth';
import { useThemeColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminCreateUser'>;

const ROLE_OPTIONS: Array<{ value: CreateUserPayload['role']; label: string; subtitle: string }> = [
    { value: 'GAS', label: 'GAS', subtitle: 'Gas' },
    { value: 'STUDENT', label: 'STUDENT', subtitle: 'Student' },
    { value: 'DOSENT', label: 'DOSENT', subtitle: 'Dosent' },
    { value: 'ADMIN', label: 'ADMIN', subtitle: 'Administrateur' },
    { value: 'PHOTOGRAPHER', label: 'FOTOGRAAF', subtitle: 'Fotograaf' },
];

const STUDY_CENTERS = [
    'Centurion - Leriba',
    'Centurion - Gerhard straat',
    'Paarl',
    'George',
    'Somerset Wes',
] as const;

const EMPTY_FORM: CreateUserPayload = {
    name: '', surname: '', email: '', password: '', role: 'DOSENT', studyCenter: '',
};

export function AdminCreateUserScreen({ navigation }: Props) {
    const colors = useThemeColors();
    const styles = makeStyles(colors);

    const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
    const [centerOpen, setCenterOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const update = <K extends keyof CreateUserPayload>(key: K, value: CreateUserPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

    const showStudyCenter = form.role !== 'GAS';

    const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
        await adminCreateUser({
        ...form,
        studyCenter: showStudyCenter ? form.studyCenter : '',
        });
        setSuccess(true);
        setForm(EMPTY_FORM);
    } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string | string[] }>;
        const msg = axiosErr.response?.data?.message ?? 'Kon nie die gebruiker skep nie.';
        setError(typeof msg === 'string' ? msg : msg.join(', '));
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
            <View style={styles.formWrap}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backText}>Terug</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>Skep gebruiker</Text>
            <Text style={styles.helper}>Skep DOSENT-, ADMIN- of FOTOGRAAF-rekeninge</Text>

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

            {success && (
                <View style={styles.successBox}>
                <Text style={styles.successText}>Gebruiker suksesvol geskep.</Text>
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

            <TextInput
                style={styles.input}
                placeholder="Tydelike wagwoord (min. 8 karakters)"
                placeholderTextColor={colors.textSubtle}
                value={form.password}
                onChangeText={(v) => update('password', v)}
                secureTextEntry
                editable={!isLoading}
            />

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
                const active = form.role === r.value;
                return (
                    <TouchableOpacity
                    key={r.value}
                    style={[styles.roleCard, active && styles.roleCardActive]}
                    onPress={() => {
                        update('role', r.value);
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
                    <Text style={[styles.roleCardSub, active && styles.roleCardSubActive]}>
                        {r.subtitle}
                    </Text>
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
                <Text style={styles.buttonText}>Skep gebruiker</Text>
                )}
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
    scroll: { flexGrow: 1, padding: 24 },
    formWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    backBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
    },
    backText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    heading: { fontSize: 24, fontWeight: '700', color: colors.text },
    helper: { fontSize: 14, color: colors.textSubtle, marginTop: 4, marginBottom: 24 },

    errorBox: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.red,
        marginBottom: 16,
    },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    errorText: { color: colors.red, fontSize: 13, fontWeight: '600' },

    successBox: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#16A34A',
        marginBottom: 16,
    },
    successText: { color: '#16A34A', fontSize: 13, fontWeight: '600' },

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
    roleCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
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

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
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

// ========== Imports: ==========
import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { getRoleLabel } from '../lib/rbac';
import { updateUser, UserTitle } from '../api/users';
import { ScreenHeader } from '../components/ScreenHeader';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const TITLE_OPTIONS: Array<{ value: UserTitle, label: string }> = [
    { value: UserTitle.NONE, label: '(Geen titel)' },
    { value: UserTitle.DR,   label: 'Dr.' },
    { value: UserTitle.PROF, label: 'Prof.' },
    { value: UserTitle.LEC,  label: 'Lec.' },
    { value: UserTitle.MNR,  label: 'Mnr.' },
    { value: UserTitle.MEV,  label: 'Mev.' },
    { value: UserTitle.MX,   label: 'Mx.' },
];

export function ProfileScreen({ navigation }: Props) {
    const colors = useThemeColors();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const user = useAuthStore((s) => s.user);

    const [title, setTitle] = useState<UserTitle>((user?.title as UserTitle) ?? UserTitle.NONE);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!user) return null;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const updated = await updateUser(user.id, { title });
            useAuthStore.setState({ user: updated });
            setSuccess(true);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Kon nie stoor nie');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScreenHeader title="My Profiel" onBack={() => navigation.goBack()} />

            <View style={styles.card}>
                <View style={styles.readRow}>
                    <Text style={styles.readLabel}>Naam</Text>
                    <Text style={styles.readValue}>{user.name} {user.surname}</Text>
                </View>
                <View style={styles.readRow}>
                    <Text style={styles.readLabel}>E-pos</Text>
                    <Text style={styles.readValue}>{user.email}</Text>
                </View>
                <View style={styles.readRow}>
                    <Text style={styles.readLabel}>Rol</Text>
                    <Text style={styles.readValue}>{getRoleLabel(user.role)}</Text>
                </View>
            </View>

            <View style={[styles.card, { marginTop: 16 }]}>
                <Text style={styles.cardTitle}>Akademiese Titel</Text>
                {TITLE_OPTIONS.map((opt) => {
                    const active = title === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value || 'none'}
                            style={[styles.row, active && styles.rowActive]}
                            onPress={() => { setTitle(opt.value); setSuccess(false); }}
                        >
                            <Text style={styles.rowLabel}>{opt.label}</Text>
                            <View style={[styles.radio, active && styles.radioActive]}>
                                <View style={[styles.radioDot, active && styles.radioDotActive]} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
            {success && <Text style={styles.successText}>Profiel suksesvol gestoor.</Text>}

            <TouchableOpacity
                style={[styles.saveBtn, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color={colors.primaryText} />
                ) : (
                    <Text style={styles.saveText}>Stoor</Text>
                )}
            </TouchableOpacity>
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
        cardTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '800',
            paddingHorizontal: 14,
            paddingTop: 14,
            paddingBottom: 8,
        },

        readRow: {
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        readLabel: { ...typography.caption, color: colors.textSubtle, marginBottom: 2 },
        readValue: { ...typography.body, color: colors.text },

        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        rowActive: { backgroundColor: colors.background },
        rowLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },

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

        errorText: { color: colors.red, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
        successText: { color: colors.success, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },

        saveBtn: {
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 16,
        },
        saveText: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
        buttonDisabled: { opacity: 0.7 },
    });
}
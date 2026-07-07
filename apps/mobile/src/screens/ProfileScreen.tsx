// ========== Imports: ==========
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { getRoleLabel } from '../lib/rbac';
import { updateUser, UserTitle } from '../api/users';

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

export function ProfileScreen({ navigtion }: Props) {
    const colors = useThemeColors();
    const styles = makeStyles(colors);
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
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Terug</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Profiel</Text>
        <View style={{ width: 60 }} />
        </View>

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
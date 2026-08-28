// ========== Imports: ==========
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { getRoleLabel } from '../lib/rbac';
import { safeGoBack } from '../lib/navigation';
import { updateUser, deleteAccount, UserTitle } from '../api/users';
import {
    getCalendarStatus,
    getGoogleConnectUrl,
    getMicrosoftConnectUrl,
    disconnectGoogleCalendar,
    disconnectMicrosoftCalendar,
    type CalendarStatus,
} from '../api/calendar';
import { apiClient } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import { typography } from '../theme/typography';

type CalendarProvider = 'google' | 'microsoft';

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
    const [deleting, setDeleting] = useState(false);

    const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
    const [calendarBusy, setCalendarBusy] = useState<CalendarProvider | null>(null);
    const [calendarError, setCalendarError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        getCalendarStatus()
            .then((result) => { if (active) setCalendarStatus(result); })
            .catch(() => { /* Laat die kaart eenvoudig weg as die status nie laai nie */ });
        return () => { active = false; };
    }, []);

    if (!user) return null;

    async function connectCalendar(provider: CalendarProvider) {
        setCalendarBusy(provider);
        setCalendarError(null);
        try {
            const authUrl = provider === 'google'
                ? await getGoogleConnectUrl()
                : await getMicrosoftConnectUrl();

            const redirectUri = Linking.createURL('calendar-callback');
            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            if (result.type === 'success') {
                const refreshed = await getCalendarStatus();
                setCalendarStatus(refreshed);
            }
        } catch {
            setCalendarError(
                provider === 'google'
                    ? 'Kon nie met Google Kalender koppel nie.'
                    : 'Kon nie met Outlook Kalender koppel nie.',
            );
        } finally {
            setCalendarBusy(null);
        }
    }

    async function disconnectCalendar(provider: CalendarProvider) {
        setCalendarBusy(provider);
        setCalendarError(null);
        try {
            if (provider === 'google') {
                await disconnectGoogleCalendar();
                setCalendarStatus((prev) => prev && { ...prev, google: false, googleAccountEmail: null });
            } else {
                await disconnectMicrosoftCalendar();
                setCalendarStatus((prev) => prev && { ...prev, microsoft: false, microsoftAccountEmail: null });
            }
        } catch {
            setCalendarError('Kon nie ontkoppel nie. Probeer asseblief weer.');
        } finally {
            setCalendarBusy(null);
        }
    }

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

    const handleDeleteAccount = () => {
        Alert.alert(
            'Verwyder rekening',
            'Jou rekening en persoonlike data word permanent verwyder. Enige aktiewe RSVP\'s word gekanselleer. Hierdie aksie kan nie ongedaan gemaak word nie.',
            [
                { text: 'Kanselleer', style: 'cancel' },
                {
                    text: 'Verwyder rekening',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteAccount();
                            await apiClient.clearTokens();
                            useAuthStore.setState({ user: null });
                        } catch (err: any) {
                            setDeleting(false);
                            Alert.alert('Kon nie verwyder nie', err?.response?.data?.message ?? 'Probeer asseblief weer.');
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScreenHeader title="My Profiel" onBack={() => safeGoBack(navigation)} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

                {calendarStatus && (
                    <View style={[styles.card, { marginTop: 16 }]}>
                        <Text style={styles.cardTitle}>Kalendersinchronisasie</Text>

                        <View style={styles.calendarRow}>
                            <View style={styles.calendarInfo}>
                                <Text style={styles.rowLabel}>Google Kalender</Text>
                                <Text style={styles.calendarSub} numberOfLines={1}>
                                    {calendarStatus.google ? calendarStatus.googleAccountEmail : 'Nie gekoppel nie'}
                                </Text>
                            </View>
                            {calendarBusy === 'google' ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.calendarBtn, calendarStatus.google && styles.calendarBtnConnected]}
                                    onPress={() => (calendarStatus.google ? disconnectCalendar('google') : connectCalendar('google'))}
                                    accessibilityLabel={calendarStatus.google ? 'Ontkoppel Google Kalender' : 'Koppel Google Kalender'}
                                >
                                    <Text style={[styles.calendarBtnText, calendarStatus.google && styles.calendarBtnTextConnected]}>
                                        {calendarStatus.google ? 'Ontkoppel' : 'Koppel'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.calendarRow}>
                            <View style={styles.calendarInfo}>
                                <Text style={styles.rowLabel}>Outlook Kalender</Text>
                                <Text style={styles.calendarSub} numberOfLines={1}>
                                    {calendarStatus.microsoft ? calendarStatus.microsoftAccountEmail : 'Nie gekoppel nie'}
                                </Text>
                            </View>
                            {calendarBusy === 'microsoft' ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.calendarBtn, calendarStatus.microsoft && styles.calendarBtnConnected]}
                                    onPress={() => (calendarStatus.microsoft ? disconnectCalendar('microsoft') : connectCalendar('microsoft'))}
                                    accessibilityLabel={calendarStatus.microsoft ? 'Ontkoppel Outlook Kalender' : 'Koppel Outlook Kalender'}
                                >
                                    <Text style={[styles.calendarBtnText, calendarStatus.microsoft && styles.calendarBtnTextConnected]}>
                                        {calendarStatus.microsoft ? 'Ontkoppel' : 'Koppel'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {calendarError && <Text style={styles.calendarError}>{calendarError}</Text>}
                    </View>
                )}

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

                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                    accessibilityLabel="Verwyder my rekening"
                >
                    {deleting ? (
                        <ActivityIndicator color={colors.red} size="small" />
                    ) : (
                        <Text style={styles.deleteBtnText}>Verwyder my rekening</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
    return StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        scroll: { padding: 16, paddingBottom: 32 },
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

        deleteBtn: { marginTop: 24, alignItems: 'center' },
        deleteBtnText: { ...typography.caption, color: colors.red },

        calendarRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        calendarInfo: { flex: 1 },
        calendarSub: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
        calendarBtn: {
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
        },
        calendarBtnConnected: { borderColor: colors.border },
        calendarBtnText: { ...typography.caption, color: colors.primary, fontWeight: '800' },
        calendarBtnTextConnected: { color: colors.textSubtle },
        calendarError: {
            ...typography.caption,
            color: colors.red,
            paddingHorizontal: 14,
            paddingBottom: 12,
        },
    });
}
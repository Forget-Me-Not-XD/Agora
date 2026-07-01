import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [aiInfoOpen, setAiInfoOpen] = useState(false);

  if (!user) return null;

  const roleLabel = {
    ADMIN:  'Administrateur',
    DOSENT: 'Dosent',
    STUDENT: 'Student',
    GAS:    'Gas',
    PHOTOGRAPHER: 'Fotograaf',
  }[user.role];

  const handleLogout = () => {
    Alert.alert(
      'Meld af',
      'Is jy seker jy wil afmeld?',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Meld af', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Goeie dag, {user.name}</Text>
            <Text style={styles.subGreeting}>{roleLabel}{user.studyCenter ? ` • ${user.studyCenter}` : ''}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
              <Feather name="settings" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Oorsig</Text>
        <View style={styles.statsGrid}>
          {user.role === 'ADMIN' && (
            <StatCard styles={styles} label="Totale RSVPs" value="1 847" delta="+8.2%" />
          )}
          {(user.role === 'ADMIN' || user.role === 'DOSENT') && (
            <StatCard styles={styles} label="Funksies OT" value="24" delta="+12%" />
          )}
          {(user.role === 'ADMIN' || user.role === 'DOSENT') && (
            <StatCard styles={styles} label="Bywoning" value="82%" delta="+6.8%" />
          )}
          {user.role === 'ADMIN' && (
            <StatCard styles={styles} label="Begroting" value="R187k" delta="-3.1%" />
          )}
          {(user.role === 'STUDENT' || user.role === 'GAS') && (
            <StatCard styles={styles} label="Jou RSVPs" value="3" />
          )}
          {(user.role === 'STUDENT' || user.role === 'GAS') && (
            <StatCard styles={styles} label="Aankomend" value="5" />
          )}
        </View>

        <Text style={styles.sectionTitle}>Volgende</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Volgende funksie</Text>
            <TouchableOpacity style={styles.linkBtn} disabled>
              <Text style={styles.linkText}>Besigtig</Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.highlight}>
            <Text style={styles.highlightTitle}>Glasieklink 2026</Text>
            <Text style={styles.highlightMeta}>15 Mrt 2026 • 18:00 • Hoofsaal</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>87 RSVPs</Text>
              <Text style={styles.progressSub}>-73 verwag</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '64%' }]} />
            </View>
            <Text style={styles.progressFoot}>64% van RSVP vs verwag</Text>
          </View>
        </View>

        {(user.role === 'ADMIN' || user.role === 'DOSENT') && (
          <>
            <Text style={styles.sectionTitle}>KI</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>KI / LSTM status</Text>
                <TouchableOpacity style={styles.iconBtnSm} onPress={() => setAiInfoOpen(true)}>
                  <Feather name="info" size={16} color={colors.textSubtle} />
                </TouchableOpacity>
              </View>

              <View style={styles.kpiGrid}>
                <Kpi styles={styles} label="R²-telling" value="0.9119" />
                <Kpi styles={styles} label="MAE" value="±10.3" />
                <Kpi styles={styles} label="Inferensie" value="8ms" />
                <Kpi styles={styles} label="Parameters" value="3 649" />
              </View>

              <View style={styles.modelPill}>
                <View style={styles.dot} />
                <Text style={styles.modelText}>Model aktief</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Upcoming functions list ──────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Aankomende funksies</Text>
            <TouchableOpacity style={styles.linkBtn} disabled>
              <Text style={styles.linkText}>Sien almal</Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <UpcomingRow styles={styles} title="Glasieklink 2026" date="15 Mrt" time="18:00" rsvps="87" forecast="73" />
          <UpcomingRow styles={styles} title="Graadplegtigheid Q1" date="22 Mrt" time="10:00" rsvps="215" forecast="198" />
          <UpcomingRow styles={styles} title="Gaslesing – Dr Venter" date="28 Mrt" time="14:00" rsvps="44" forecast="38" />
        </View>

        <Text style={styles.versionText}>Pre-Alfa v0.1.0</Text>

      </ScrollView>

      <Modal
        visible={aiInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAiInfoOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAiInfoOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { /* stop propagation */ }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>KI / LSTM statistiek</Text>
              <TouchableOpacity style={styles.iconBtnSm} onPress={() => setAiInfoOpen(false)}>
                <Feather name="x" size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <InfoRow styles={styles} title="R²-telling" body="Hoe goed die model variasie verklaar. Nader aan 1 is beter." />
            <InfoRow styles={styles} title="MAE" body="Gemiddelde absolute fout. Laer beteken meer akkurate voorspellings." />
            <InfoRow styles={styles} title="Inferensie" body="Hoe lank dit neem om ’n voorspelling te maak. Laer is vinniger." />
            <InfoRow styles={styles} title="Parameters" body="Model-kompleksiteit. Meer parameters kan meer leer, maar is swaarder om te bereken." />

            <Text style={styles.modalFoot}>Hierdie waardes is ’n opsomming en kan per funksie verskil.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ──
type DashboardStyles = ReturnType<typeof makeStyles>;

function StatCard({
  styles,
  label,
  value,
  delta,
}: {
  styles: DashboardStyles;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {delta ? <Text style={styles.statDelta}>{delta}</Text> : <View style={{ height: 14 }} />}
    </View>
  );
}

function Kpi({ styles, label, value }: { styles: DashboardStyles; label: string; value: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValueLarge}>{value}</Text>
    </View>
  );
}

function InfoRow({ styles, title, body }: { styles: DashboardStyles; title: string; body: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  );
}

function UpcomingRow({
  styles,
  title,
  date,
  time,
  rsvps,
  forecast,
}: {
  styles: DashboardStyles;
  title: string;
  date: string;
  time: string;
  rsvps: string;
  forecast: string;
}) {
  return (
    <View style={styles.upcomingRow}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingTitle}>{title}</Text>
        <Text style={styles.upcomingMeta}>{date} • {time}</Text>
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingNum}>{rsvps}</Text>
        <Text style={styles.upcomingSub}>RSVP</Text>
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingNumMuted}>{forecast}</Text>
        <Text style={styles.upcomingSub}>Voorspel</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 24 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
      marginTop: 8,
    },
    headerLeft: { flex: 1, paddingRight: 10 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    greeting: { fontSize: 20, fontWeight: '900', color: colors.text },
    subGreeting: { fontSize: 12, color: colors.textSubtle, marginTop: 6, fontWeight: '600' },

    sectionTitle: {
      color: colors.textSubtle,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 6,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkText: { color: colors.primary, fontWeight: '800', fontSize: 12 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    statCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
    },
    statLabel: { color: colors.textSubtle, fontSize: 11, fontWeight: '700' },
    statValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
    statDelta: { color: colors.textSubtle, fontSize: 11, fontWeight: '700', marginTop: 4 },

    iconBtnSm: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    highlight: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    highlightTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
    highlightMeta: { color: colors.textSubtle, fontSize: 11, marginTop: 4, fontWeight: '600' },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    progressLabel: { color: colors.text, fontSize: 12, fontWeight: '900' },
    progressSub: { color: colors.textSubtle, fontSize: 12, fontWeight: '700' },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.primary },
    progressFoot: { color: colors.textSubtle, fontSize: 11, marginTop: 8, fontWeight: '600' },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
    kpiBox: {
      width: '48%',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    kpiLabel: { color: colors.textSubtle, fontSize: 11, fontWeight: '800' },
    kpiValueLarge: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
    modelPill: {
      marginTop: 12,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#22C55E' },
    modelText: { color: colors.text, fontSize: 11, fontWeight: '800' },

    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    upcomingLeft: { flex: 1 },
    upcomingTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
    upcomingMeta: { color: colors.textSubtle, fontSize: 11, marginTop: 4, fontWeight: '600' },
    upcomingRight: { width: 62, alignItems: 'flex-end' },
    upcomingNum: { color: colors.primary, fontSize: 13, fontWeight: '900' },
    upcomingNumMuted: { color: colors.textSubtle, fontSize: 13, fontWeight: '900' },
    upcomingSub: { color: colors.textSubtle, fontSize: 10, marginTop: 2, fontWeight: '700' },

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
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    infoRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    infoTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
    infoBody: { color: colors.textSubtle, fontSize: 12, marginTop: 6, lineHeight: 18, fontWeight: '600' },
    modalFoot: { color: colors.textSubtle, fontSize: 11, marginTop: 12, fontWeight: '600' },

    versionText: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textSubtle,
      marginTop: 16,
      marginBottom: 8,
    },
  });
}
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { MOCK_EVENTS } from '../lib/mock-data';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MetricInfo {
  key: string;
  label: string;
  value: string;
  description: string;
}

const LSTM_METRICS: MetricInfo[] = [
  {
    key: 'r2',
    label: 'R²-telling',
    value: '0.9119',
    description: 'Hoe goed die model variasie verklaar. Nader aan 1.0 is beter — 0.91 dui op uitstekende passing.',
  },
  {
    key: 'mae',
    label: 'MAE',
    value: '±10.3',
    description: 'Gemiddelde absolute fout. Die model voorspel bywoningsgetalle binne ~10 persone van die werklikheid.',
  },
  {
    key: 'inference',
    label: 'Inferensie',
    value: '8ms',
    description: 'Tyd om een voorspelling te maak. 8ms beteken voorspellings word in reële tyd bereken.',
  },
  {
    key: 'params',
    label: 'Parameters',
    value: '3 649',
    description: 'Aantal leerbare parameters in die model. Geoptimeer vir lae geheueverbruik op mobile toestelle.',
  },
  {
    key: 'epochs',
    label: 'Opleidingsepogte',
    value: '250',
    description: 'Die model is oor 250 iterasies opgelei op historiese bywoningsdata.',
  },
  {
    key: 'window',
    label: 'Venstergrootte',
    value: '12 weke',
    description: 'Die model gebruik die afgelope 12 weke se data om toekomstige bywoning te voorspel.',
  },
];

export function AiScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [selectedMetric, setSelectedMetric] = useState<MetricInfo | null>(null);

  const role = user?.role ?? 'STUDENT';
  const canViewAi = role === 'ADMIN' || role === 'DOSENT';

  if (!canViewAi) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>KI Insigte</Text>
        </View>
        <View style={styles.noAccessCard}>
          <Feather name="lock" size={28} color={colors.textSubtle} />
          <Text style={styles.noAccessTitle}>Toegang beperk</Text>
          <Text style={styles.noAccessSubtitle}>
            KI-insigte is beskikbaar vir dosente en administrateurs.
            Kontak jou dosent vir meer inligting oor aankomende funksies.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const upcomingWithForecast = MOCK_EVENTS.filter(
    (e) => e.status === 'upcoming' || e.status === 'ongoing',
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>KI Insigte</Text>
        <Text style={styles.pageSubtitle}>LSTM voorspellingsmodel</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Model status card ── */}
        <View style={styles.modelCard}>
          <View style={styles.modelCardTop}>
            <View>
              <Text style={styles.modelCardTitle}>KI / LSTM Model</Text>
              <Text style={styles.modelCardSub}>Aktief en bereken voorspellings</Text>
            </View>
            <View style={styles.modelActivePill}>
              <View style={styles.activeDot} />
              <Text style={styles.modelActiveText}>Aktief</Text>
            </View>
          </View>

          {/* Model metrics grid */}
          <View style={styles.metricsGrid}>
            {LSTM_METRICS.slice(0, 4).map((m) => (
              <TouchableOpacity
                key={m.key}
                style={styles.metricBox}
                onPress={() => setSelectedMetric(m)}
                accessibilityLabel={`${m.label}: ${m.value}. Tik vir meer inligting.`}
              >
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Feather name="info" size={10} color={colors.textSubtle} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.metricRow}>
            {LSTM_METRICS.slice(4).map((m) => (
              <TouchableOpacity
                key={m.key}
                style={styles.metricBoxWide}
                onPress={() => setSelectedMetric(m)}
                accessibilityLabel={`${m.label}: ${m.value}. Tik vir meer inligting.`}
              >
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue}>{m.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Forecast per event ── */}
        <Text style={styles.sectionTitle}>VOORSPELLINGS PER FUNKSIE</Text>
        {upcomingWithForecast.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Geen aankomende funksies met voorspellings nie.</Text>
          </View>
        ) : (
          upcomingWithForecast.map((event) => {
            const fillPct = Math.min(
              Math.round((event.forecast / event.capacity) * 100),
              100,
            );
            const confidence = event.forecastConfidence;
            const confidenceColor =
              confidence >= 85 ? '#10B981' : confidence >= 70 ? '#F59E0B' : '#EF4444';

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.forecastCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.75}
                accessibilityLabel={`${event.title} voorspelling: ${event.forecast} gaste`}
              >
                <View style={styles.forecastTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.forecastTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.forecastMeta}>{event.location} · {event.time}</Text>
                  </View>
                  <View style={[styles.confidencePill, { backgroundColor: `${confidenceColor}22` }]}>
                    <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                      {confidence}% vertroue
                    </Text>
                  </View>
                </View>

                <View style={styles.forecastNumbers}>
                  <View style={styles.forecastNum}>
                    <Text style={[styles.forecastNumVal, { color: colors.primary }]}>{event.forecast}</Text>
                    <Text style={styles.forecastNumLbl}>Verwag</Text>
                  </View>
                  <View style={styles.forecastRange}>
                    <Text style={styles.forecastRangeVal}>
                      {event.forecastLow} – {event.forecastHigh}
                    </Text>
                    <Text style={styles.forecastRangeLbl}>Reeks (95% CI)</Text>
                  </View>
                  <View style={styles.forecastNum}>
                    <Text style={[styles.forecastNumVal, { color: colors.textSubtle }]}>
                      {event.registered}
                    </Text>
                    <Text style={styles.forecastNumLbl}>RSVPs</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${fillPct}%` as any }]} />
                  {/* Registered marker */}
                  <View style={[
                    styles.registeredMarker,
                    {
                      left: `${Math.min(Math.round((event.registered / event.capacity) * 100), 100)}%` as any,
                    },
                  ]} />
                </View>
                <Text style={styles.progressCaption}>
                  {event.forecastLow}–{event.forecastHigh} verwag van {event.capacity} kapasiteit
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── How it works ── */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>Hoe werk die KI?</Text>
          <HowRow
            icon="trending-up"
            title="Historiese data"
            body="Die model leer uit vorige funksie-bywoning om patrone te identifiseer."
            colors={colors}
          />
          <HowRow
            icon="calendar"
            title="Tyd en konteks"
            body="Dag van die week, seisoen, en tipe funksie word in ag geneem."
            colors={colors}
          />
          <HowRow
            icon="bar-chart-2"
            title="RSVP momentum"
            body="Die tempo waarteen RSVPs ingaan word gebruik om finale bywoning te voorspel."
            colors={colors}
          />
          <HowRow
            icon="shield"
            title="Betroubaarheidsbande"
            body="Elke voorspelling sluit 'n 95% betroubaarheidsgaping in vir beter beplanning."
            colors={colors}
          />
        </View>

      </ScrollView>

      {/* ── Metric detail modal ── */}
      <Modal
        visible={!!selectedMetric}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMetric(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedMetric(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMetric?.label}</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedMetric(null)}
                accessibilityLabel="Maak toe"
              >
                <Feather name="x" size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalValue}>{selectedMetric?.value}</Text>
            <Text style={styles.modalBody}>{selectedMetric?.description}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function HowRow({
  icon,
  title,
  body,
  colors,
}: {
  icon: string;
  title: string;
  body: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12 }}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: `${colors.primary}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Feather name={icon as any} size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSubtle, lineHeight: 17 }}>{body}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    pageHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    pageSubtitle: { fontSize: 12, color: colors.textSubtle, fontWeight: '700', marginTop: 2 },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },

    noAccessCard: {
      margin: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      gap: 10,
    },
    noAccessTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    noAccessSubtitle: { fontSize: 13, color: colors.textSubtle, textAlign: 'center', lineHeight: 18, fontWeight: '600' },

    modelCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    modelCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    modelCardTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
    modelCardSub: { fontSize: 11, fontWeight: '600', color: colors.textSubtle, marginTop: 2 },
    modelActivePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    activeDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#10B981' },
    modelActiveText: { fontSize: 11, fontWeight: '800', color: colors.text },

    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    metricBox: {
      width: '48%',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    metricRow: { flexDirection: 'row', gap: 8 },
    metricBoxWide: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    metricLabel: { fontSize: 10, fontWeight: '800', color: colors.textSubtle },
    metricValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 },

    sectionTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSubtle,
      letterSpacing: 0.6,
    },

    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, fontWeight: '600', color: colors.textSubtle },

    forecastCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    forecastTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    forecastTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
    forecastMeta: { fontSize: 11, fontWeight: '600', color: colors.textSubtle, marginTop: 2 },
    confidencePill: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    confidenceText: { fontSize: 10, fontWeight: '800' },

    forecastNumbers: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    forecastNum: { flex: 1, alignItems: 'center' },
    forecastNumVal: { fontSize: 20, fontWeight: '900' },
    forecastNumLbl: { fontSize: 10, fontWeight: '700', color: colors.textSubtle, marginTop: 2 },
    forecastRange: { flex: 1.5, alignItems: 'center' },
    forecastRangeVal: { fontSize: 13, fontWeight: '900', color: colors.text },
    forecastRangeLbl: { fontSize: 9, fontWeight: '700', color: colors.textSubtle, marginTop: 2 },

    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: 'hidden',
      position: 'relative',
    },
    progressFill: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
      opacity: 0.5,
    },
    registeredMarker: {
      position: 'absolute',
      top: 0,
      width: 3,
      height: 8,
      borderRadius: 1,
      backgroundColor: colors.primary,
    },
    progressCaption: { fontSize: 10, fontWeight: '600', color: colors.textSubtle },

    howCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    howTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 4 },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    modalClose: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalValue: { fontSize: 28, fontWeight: '900', color: colors.primary, marginBottom: 10 },
    modalBody: { fontSize: 13, fontWeight: '600', color: colors.textSubtle, lineHeight: 19 },
  });
}

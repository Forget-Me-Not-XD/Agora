import { useState, useEffect, useMemo } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { listEvents, type EventResponse } from '../api/events';
import { getPrediction, type PredictionResult } from '../api/analytics';
import { formatEventTime } from '../lib/event-status';
import { ScreenHeader } from '../components/ScreenHeader';
import { typography } from '../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Hoeveel aankomende funksies se voorspellings ons op skerm-oop haal --
// elkeen is 'n aparte model-inferensie, so ons beperk dit tot 'n redelike getal.
const MAX_FORECASTS = 10;

interface Forecast {
  event: EventResponse;
  prediction: PredictionResult | null;
}

export function AiScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  const role = user?.role ?? 'STUDENT';
  const canViewAi = role === 'ADMIN' || role === 'DOSENT';

  useEffect(() => {
    if (!canViewAi) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const allUpcoming = await listEvents(new Date().toISOString());
        const ownUpcoming = role === 'DOSENT'
          ? allUpcoming.filter((e) => e.createdBy === user?.id)
          : allUpcoming;
        const upcoming = ownUpcoming.slice(0, MAX_FORECASTS);
        const results = await Promise.allSettled(upcoming.map((e) => getPrediction(e.id)));
        if (!active) return;
        setForecasts(
          upcoming.map((event, i) => ({
            event,
            prediction: results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<PredictionResult>).value : null,
          })),
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [canViewAi, role, user?.id]);

  if (!canViewAi) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="KI Insigte" />
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

  // Geen enkele "model-status" eindpunt bestaan nie -- ons lei dit eerlik af uit
  // hoeveel van die regte per-funksie voorspellings hieronder werklik geslaag het.
  const modelAvailable = forecasts.length === 0 || forecasts.some((f) => f.prediction !== null);
  const availableCount = forecasts.filter((f) => f.prediction !== null).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="KI Insigte" subtitle="LSTM voorspellingsmodel" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Model status card ── */}
        <View style={styles.modelCard}>
          <View style={styles.modelCardTop}>
            <View>
              <Text style={styles.modelCardTitle}>KI / LSTM Model</Text>
              <Text style={styles.modelCardSub}>
                {loading
                  ? 'Kontroleer status...'
                  : forecasts.length === 0
                  ? 'Geen aankomende funksies om te voorspel nie'
                  : `${availableCount} van ${forecasts.length} funksies het 'n beskikbare voorspelling`}
              </Text>
            </View>
            <View style={[styles.modelActivePill, !modelAvailable && styles.modelInactivePill]}>
              <View style={[styles.activeDot, !modelAvailable && styles.inactiveDot]} />
              <Text style={styles.modelActiveText}>{modelAvailable ? 'Aktief' : 'Onbeskikbaar'}</Text>
            </View>
          </View>
        </View>

        {/* ── Forecast per event ── */}
        <Text style={styles.sectionTitle}>VOORSPELLINGS PER FUNKSIE</Text>
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : forecasts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Geen aankomende funksies met voorspellings nie.</Text>
          </View>
        ) : (
          forecasts.map(({ event, prediction }) => {
            const fillPct = event.maxCapacity > 0
              ? Math.min(Math.round((event.confirmedAttendees / event.maxCapacity) * 100), 100)
              : 0;
            const predictedPct = prediction ? Math.round(prediction.predictedFillRate * 100) : 0;

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.forecastCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.75}
                accessibilityLabel={`${event.title} voorspelling`}
              >
                <View style={styles.forecastTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.forecastTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.forecastMeta}>{event.location} · {formatEventTime(event.date)}</Text>
                  </View>
                </View>

                {prediction ? (
                  <>
                    <View style={styles.forecastNumbers}>
                      <View style={styles.forecastNum}>
                        <Text style={[styles.forecastNumVal, { color: colors.primary }]}>
                          {prediction.estimatedAttendees}
                        </Text>
                        <Text style={styles.forecastNumLbl}>Verwag</Text>
                      </View>
                      <View style={styles.forecastNum}>
                        <Text style={styles.forecastNumVal}>{predictedPct}%</Text>
                        <Text style={styles.forecastNumLbl}>Vulkoers</Text>
                      </View>
                      <View style={styles.forecastNum}>
                        <Text style={[styles.forecastNumVal, { color: colors.textSubtle }]}>
                          {Math.round(prediction.predictedNoShowRate * 100)}%
                        </Text>
                        <Text style={styles.forecastNumLbl}>No-show</Text>
                      </View>
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${predictedPct}%` as `${number}%` }]} />
                      {/* Werklike bygewoon-merker */}
                      <View style={[styles.registeredMarker, { left: `${fillPct}%` as `${number}%` }]} />
                    </View>
                    <Text style={styles.progressCaption}>
                      {prediction.estimatedAttendees} verwag van {event.maxCapacity} kapasiteit
                    </Text>
                  </>
                ) : (
                  <Text style={styles.emptyText}>Voorspelling nie beskikbaar vir hierdie funksie nie.</Text>
                )}
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
    </SafeAreaView>
  );
}

function HowRow({
  icon,
  title,
  body,
  colors,
}: {
  icon: ComponentProps<typeof Feather>['name'];
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
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.subtitle, color: colors.text, marginBottom: 2 }}>{title}</Text>
        <Text style={{ ...typography.bodyRegular, color: colors.textSubtle, lineHeight: 17 }}>{body}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

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
    noAccessTitle: { ...typography.subtitle, color: colors.text },
    noAccessSubtitle: { ...typography.bodyRegular, color: colors.textSubtle, textAlign: 'center', lineHeight: 18 },

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
    modelCardTitle: { ...typography.subtitle, color: colors.text },
    modelCardSub: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
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
    activeDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.success },
    modelActiveText: { ...typography.micro, color: colors.text },
    modelInactivePill: { borderColor: colors.textSubtle },
    inactiveDot: { backgroundColor: colors.textSubtle },

    sectionTitle: {
      fontSize: 16,
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
    emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSubtle },

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
    forecastTitle: { ...typography.body, color: colors.text },
    forecastMeta: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },

    forecastNumbers: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    forecastNum: { flex: 1, alignItems: 'center' },
    forecastNumVal: { ...typography.title, color: colors.text },
    forecastNumLbl: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },

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
    progressCaption: { ...typography.caption, color: colors.textSubtle },

    howCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    howTitle: { ...typography.subtitle, color: colors.text, marginBottom: 4 },
  });
}

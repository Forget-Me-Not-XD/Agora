import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useThemeColors } from '../theme/theme';
import { CameraView, useCameraPermissions } from 'expo-camera/next';
import { useResponse } from '../providers/ResponseProvider';
import { scanQr } from '../api/rsvp';
import { MOCK_EVENTS, MOCK_CHECK_INS, type MockCheckIn } from '../lib/mock-data';

type Nav = NativeStackNavigationProp<RootStackParamList, 'QrScanner'>;
type Route = RouteProp<RootStackParamList, 'QrScanner'>;

export function QrScannerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const event = MOCK_EVENTS.find((e) => e.id === route.params.eventId);

  const [flashOn, setFlashOn] = useState(false);
  const [checkIns, setCheckIns] = useState<MockCheckIn[]>(MOCK_CHECK_INS);
  const [lastScanned, setLastScanned] = useState<MockCheckIn | null>(
    MOCK_CHECK_INS[0] ?? null,
  );
  const [walkInName, setWalkInName] = useState('');

  const { showLoading, showSuccess, showError, showWarning } = useResponse();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLock = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  function resetScanner() {
    scanLock.current = false;
    setScanned(false);
  }

  async function handleBarCodeScanned({ data }: { type: string; data: string }) {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanned(true);
    showLoading(true);
    try {
      const res = await scanQr(data);
      showLoading(false);
      showSuccess(res, resetScanner);
    } catch (err) {
      showLoading(false);
      const status = (err as any)?.response?.status;
      if (status === 409) {
        showWarning('Gas het reeds ingecheck', resetScanner);
      } else if (status === 404) {
        showError('Ongeldige QR-kode', resetScanner);
      } else {
        showError('Kon nie die QR-kode verwerk nie. Probeer asseblief weer.', resetScanner);
      }
    }
  }

  const total = event?.registered ?? 87;
  const checkedInCount = checkIns.length;
  const outstanding = total - checkedInCount;

  function handleAccept() {
    if (!lastScanned) return;
    Alert.alert('Ingemeld', `${lastScanned.name} is suksesvol ingemeld.`);
  }

  function handleWalkIn() {
    const name = walkInName.trim();
    if (!name) {
      Alert.alert('Naam vereiste', 'Voer asseblief die persoon se naam in.');
      return;
    }
    const entry: MockCheckIn = {
      id: `ci-walkin-${Date.now()}`,
      name,
      eventId: route.params.eventId,
      status: 'bevestig',
      dietary: null,
      checkedInAt: new Date().toISOString(),
    };
    setLastScanned(entry);
    setCheckIns((prev) => [entry, ...prev]);
    setWalkInName('');
    Alert.alert('Geregistreer', `${name} is geregistreer sonder RSVP.`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Terug"
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>QR Skandeerder</Text>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>
            Aktief: {event?.time ?? '18:00'}–{event?.endTime ?? '22:00'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Camera viewfinder ── */}
        <View style={styles.camera}>
          {permission?.granted && (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
          )}

          <View style={styles.overlay} pointerEvents="none">
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scan line */}
            <View style={styles.scanLine} />
          </View>

          {permission?.granted && (
            <Text style={styles.scanHint}>Plaas QR-kode binne die raamwerk</Text>
          )}
          {(!permission || (!permission.granted && permission.canAskAgain)) && (
            <Text style={styles.scanHint}>Versoek kamera-toegang…</Text>
          )}
          {permission && !permission.granted && !permission.canAskAgain && (
            <Text style={styles.scanHint}>Geen kamera-toegang nie</Text>
          )}
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{checkedInCount}</Text>
            <Text style={styles.statLabel}>Ingemeld</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Totaal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{Math.max(outstanding, 0)}</Text>
            <Text style={styles.statLabel}>Uitstaande</Text>
          </View>
        </View>

        {/* ── Last scanned card ── */}
        {lastScanned && (
          <View style={styles.scannedCard}>
            <View style={styles.checkCircle}>
              <Feather name="check" size={18} color="#10B981" />
            </View>
            <View style={styles.scannedInfo}>
              <Text style={styles.scannedName}>{lastScanned.name}</Text>
              <Text style={styles.scannedMeta}>
                {event?.title ?? 'Funksie'} · {lastScanned.status === 'bevestig' ? 'Bevestig' : 'Hangende'}
                {lastScanned.dietary ? ` · ${lastScanned.dietary}` : ' · Geen dieët'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAccept}
              accessibilityLabel="Aanvaar inmelding"
            >
              <Text style={styles.acceptBtnText}>Aanvaar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Flash / Gallery ── */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, flashOn && styles.controlBtnActive]}
            onPress={() => setFlashOn((v) => !v)}
            accessibilityLabel={flashOn ? 'Skakel flits af' : 'Skakel flits aan'}
          >
            <Feather
              name={flashOn ? 'zap' : 'zap-off'}
              size={16}
              color={flashOn ? colors.surface : colors.text}
            />
            <Text style={[styles.controlBtnText, flashOn && { color: colors.surface }]}>
              Flits
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => Alert.alert('Galery', 'QR-kode galery koms binnekort.')}
            accessibilityLabel="Kies QR-kode uit galery"
          >
            <Feather name="image" size={16} color={colors.text} />
            <Text style={styles.controlBtnText}>Galery</Text>
          </TouchableOpacity>
        </View>

        {/* ── Walk-in registration ── */}
        <View style={styles.walkInCard}>
          <Text style={styles.walkInTitle}>Registreer persoon sonder RSVP</Text>
          <Text style={styles.walkInSubtitle}>
            Vir persone wat nie vooraf geregistreer het nie.
          </Text>
          <View style={styles.walkInRow}>
            <TextInput
              style={styles.walkInInput}
              placeholder="Volle naam..."
              placeholderTextColor={colors.textSubtle}
              value={walkInName}
              onChangeText={setWalkInName}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleWalkIn}
              accessibilityLabel="Persoon se naam vir walk-in registrasie"
            />
            <TouchableOpacity
              style={styles.walkInBtn}
              onPress={handleWalkIn}
              accessibilityLabel="Registreer sonder RSVP"
            >
              <Feather name="user-plus" size={16} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent check-ins ── */}
        {checkIns.length > 0 && (
          <View style={styles.recentCard}>
            <Text style={styles.recentTitle}>Onlangse inmeldings</Text>
            {checkIns.slice(0, 5).map((ci) => (
              <View key={ci.id} style={styles.recentRow}>
                <View style={styles.recentDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{ci.name}</Text>
                  {ci.dietary && (
                    <Text style={styles.recentMeta}>{ci.dietary}</Text>
                  )}
                </View>
                <Feather name="check-circle" size={14} color="#10B981" />
              </View>
            ))}
            {checkIns.length > 5 && (
              <Text style={styles.moreText}>+{checkIns.length - 5} meer</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: colors.text },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    activeDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#10B981' },
    activeText: { fontSize: 10, fontWeight: '700', color: colors.text },

    scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },

    // Camera
    camera: {
      height: 220,
      borderRadius: 16,
      backgroundColor: '#0A0A0A',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      width: 160,
      height: 160,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderColor: colors.primary,
    },
    cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
    cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
    scanLine: {
      position: 'absolute',
      width: 120,
      height: 2,
      backgroundColor: colors.primary,
      opacity: 0.8,
    },
    scanHint: {
      position: 'absolute',
      bottom: 12,
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '600',
    },

    // Stats
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '900', color: colors.text },
    statLabel: { fontSize: 11, fontWeight: '700', color: colors.textSubtle, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

    // Last scanned
    scannedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: '#10B981',
      borderRadius: 16,
      padding: 14,
      gap: 12,
    },
    checkCircle: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scannedInfo: { flex: 1 },
    scannedName: { fontSize: 15, fontWeight: '900', color: colors.text },
    scannedMeta: { fontSize: 11, fontWeight: '600', color: colors.textSubtle, marginTop: 2 },
    acceptBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    acceptBtnText: { fontSize: 13, fontWeight: '900', color: colors.surface },

    // Controls
    controlRow: { flexDirection: 'row', gap: 12 },
    controlBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      height: 48,
    },
    controlBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    controlBtnText: { fontSize: 14, fontWeight: '800', color: colors.text },

    // Walk-in
    walkInCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    walkInTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 4 },
    walkInSubtitle: { fontSize: 12, color: colors.textSubtle, fontWeight: '600', marginBottom: 12 },
    walkInRow: { flexDirection: 'row', gap: 10 },
    walkInInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    walkInBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Recent check-ins
    recentCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
    },
    recentTitle: { fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 10 },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    recentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    recentName: { fontSize: 13, fontWeight: '800', color: colors.text },
    recentMeta: { fontSize: 11, fontWeight: '600', color: colors.textSubtle, marginTop: 1 },
    moreText: { fontSize: 11, fontWeight: '700', color: colors.textSubtle, marginTop: 8 },
  });
}
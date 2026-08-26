import React, { createContext, memo, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useThemeColors } from '../theme/theme';

// ── Tipes ──
type ScanInfo = { guestName: string; eventTitle: string; eventDate: string };
type ResultKind = 'success' | 'error' | 'warning';

type ResultState = {
  kind: ResultKind;
  info?: ScanInfo;
  message?: string;
  onNext: () => void;
} | null;

type ResponseContextProps = {
  showLoading: (value: boolean) => void;
  showSuccess: (info: ScanInfo, onNext: () => void) => void;
  showError: (message: string, onNext: () => void) => void;
  showWarning: (message: string, onNext: () => void) => void;
};

const ResponseContext = createContext<ResponseContextProps | null>(null);

// ── Animasies (uit /assets) ──
const ANIMATIONS = {
  loading: require('../../assets/loading.json'),
  success: require('../../assets/success.json'),
  error: require('../../assets/error_red.json'),
  warning: require('../../assets/error_yellow.json'),
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ResponseProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  const showLoading = (value: boolean) => setLoading(value);
  const showSuccess = (info: ScanInfo, onNext: () => void) =>
    setResult({ kind: 'success', info, onNext });
  const showError = (message: string, onNext: () => void) =>
    setResult({ kind: 'error', message, onNext });
  const showWarning = (message: string, onNext: () => void) =>
    setResult({ kind: 'warning', message, onNext });

  const handleNext = () => {
    result?.onNext();
    setResult(null);
  };

  return (
    <ResponseContext.Provider value={{ showLoading, showSuccess, showError, showWarning }}>
      {children}
      {loading && <LoadingOverlay />}
      {result && <ResultOverlay result={result} onNext={handleNext} />}
    </ResponseContext.Provider>
  );
}

// ── Loading-oorleg ──
const LoadingOverlay = memo(() => {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={styles.block}>
        <LottieView source={ANIMATIONS.loading} autoPlay loop style={styles.anim} />
        <Text style={styles.message}>Besig om te skandeer…</Text>
      </View>
    </View>
  );
});

// ── Resultaat-oorleg (sukses / fout / waarskuwing) ──
const ResultOverlay = memo(
  ({ result, onNext }: { result: NonNullable<ResultState>; onNext: () => void }) => {
    const colors = useThemeColors();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    return (
      <View style={styles.backdrop} pointerEvents="auto">
        <View style={styles.block}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onNext}
            accessibilityLabel="Maak toe"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={20} color={colors.textSubtle} />
          </TouchableOpacity>

          <LottieView
            source={ANIMATIONS[result.kind]}
            autoPlay
            loop={false}
            style={styles.anim}
          />

          {result.kind === 'success' && result.info ? (
            <>
              <Text style={styles.name}>{result.info.guestName}</Text>
              <Text style={styles.detail}>{result.info.eventTitle}</Text>
              <Text style={styles.detail}>{formatDate(result.info.eventDate)}</Text>
            </>
          ) : (
            <Text style={styles.message}>{result.message}</Text>
          )}

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={onNext}
            accessibilityLabel="Skandeer volgende"
          >
            <Text style={styles.nextBtnText}>Skandeer Volgende</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

export function useResponse() {
  const ctx = useContext(ResponseContext);
  if (!ctx) throw new Error("useResponse moet binne 'n ResponseProvider gebruik word");
  return ctx;
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 1000,
      elevation: 1000,
    },
    block: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface, // wit in light mode, donker surface in dark mode
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    anim: { width: 120, height: 120, marginBottom: 8 },
    closeBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    name: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 4 },
    detail: { fontSize: 16, fontWeight: '600', color: colors.textSubtle, textAlign: 'center', marginTop: 2 },
    message: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
    nextBtn: {
      marginTop: 22,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 28,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    nextBtnText: { fontSize: 16, fontWeight: '900', color: colors.primaryText },
  });
}
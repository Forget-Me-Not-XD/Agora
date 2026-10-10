import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { createReview, getReviewEligibility, type ReviewEligibility, type ReviewableEvent } from '../api/reviews';
import { REVIEW_BLOCKED_MESSAGE } from '../lib/review-view';
import { REVIEW_MAX_COMMENT_LENGTH } from '../lib/review-categories';
import { formatEventTime, formatFullDate } from '../lib/event-status';
import { getApiErrorMessage, getErrorMessage, getErrorStatus } from '../lib/errors';
import { safeGoBack } from '../lib/navigation';
import { StarRating } from '../components/StarRating';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Review'>;
type Route = RouteProp<RootStackParamList, 'Review'>;

const ANIMATIONS = {
  success: require('../../assets/success.json'),
  warning: require('../../assets/error_yellow.json'),
  error: require('../../assets/error_red.json'),
};

const OPEN_MS = 280;
const CLOSE_MS = 220;
const SUBMIT_FAILED = 'Kon nie jou resensie stuur nie. Probeer weer.';

// ========== Vel ==========
// Die skerm is 'n transparentModal, so die geleentheid bly agter die vel sigbaar. Die navigasie
// animeer nie; die vel en die donker agtergrond doen dit self. Die vorm en die boodskappe is
// dieselfde as in die web se ReviewModal en ReviewForm.

export function ReviewScreen() {
  const navigation = useNavigation<Nav>();
  const { eventId } = useRoute<Route>().params;
  const { colors, styles } = useReviewStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Die ref is vir die beforeRemove-luisteraar, sodat 'n terug-druk reg ná "Dien in" dadelik
  // geblokkeer word. Die state is net vir die X-knoppie se voorkoms.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmittingChange = useCallback((value: boolean) => {
    submittingRef.current = value;
    setSubmitting(value);
  }, []);

  useEffect(() => {
    let active = true;
    getReviewEligibility(eventId)
      .then((data) => { if (active) setEligibility(data); })
      .catch((err: unknown) => { if (active) setLoadError(getErrorMessage(err, 'Kon nie die resensie laai nie.')); });
    return () => { active = false; };
  }, [eventId]);

  // 0 is toe (die vel is onder die skerm), 1 is oop
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(windowHeight);

  useEffect(() => {
    progress.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  // Elke manier van toemaak (X, Kanselleer, "Terug na geleentheid", die agtergrond en Android se
  // terug-knoppie) kom hier verby. Ons hou die navigasie eers terug, laat die vel afgly en stuur
  // dit dan weer. Terwyl die resensie gestuur word, bly die vel oop, anders weet die gebruiker nie
  // of dit gestoor is nie. 'n Tweede druk terwyl die vel nog afgly, word geïgnoreer, anders spring
  // die skerm sonder animasie weg.
  const closing = useRef(false);
  const replaying = useRef(false);
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (replaying.current) return;
    e.preventDefault();
    if (closing.current || submittingRef.current) return;
    closing.current = true;
    Keyboard.dismiss();

    const action = e.data.action;
    const finish = () => {
      replaying.current = true;
      navigation.dispatch(action);
    };
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }, () => {
      scheduleOnRN(finish);
    });
  }), [navigation, progress]);

  const close = useCallback(() => safeGoBack(navigation), [navigation]);

  // Die kommentaarveld is die enigste invoer, en dit staan reg bo die knoppies. As die
  // sleutelbord oopgaan, rol ons dus tot onder sodat die veld en "Dien in" sigbaar bly.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const sub = KeyboardEvents.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
  }));

  function handleSheetLayout(e: LayoutChangeEvent) {
    sheetHeight.value = e.nativeEvent.layout.height;
  }

  const title = eligibility?.event?.title ?? 'Beoordeel geleentheid';

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        {/* Die X doen dieselfde, so skermlesers hoef nie op die agtergrond te land nie */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          disabled={submitting}
          accessible={false}
          importantForAccessibility="no"
        />
      </Animated.View>

      {/* Lig die hele vel bo die sleutelbord uit, eerder as om net binne-in te rol. Anders
          bly daar by 'n kort vel amper niks sigbaar bo die sleutelbord nie. */}
      <KeyboardAvoidingView behavior="padding" style={[styles.avoider, { paddingTop: insets.top + 24 }]}>
        <Animated.View
          onLayout={handleSheetLayout}
          accessibilityViewIsModal
          style={[styles.sheet, { maxHeight: windowHeight * 0.85, paddingBottom: insets.bottom + 16 }, sheetStyle]}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Feather name="star" size={14} color={colors.primaryText} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">{title}</Text>
            <TouchableOpacity
              style={[styles.closeBtn, submitting && styles.btnDisabled]}
              onPress={close}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Maak toe"
              accessibilityState={{ disabled: submitting }}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          >
            {loadError ? (
              <Outcome tone="error" message={loadError} onClose={close} />
            ) : !eligibility ? (
              <LoadingSpinner size={72} style={styles.loading} />
            ) : (
              <ReviewContent eligibility={eligibility} onClose={close} onSubmittingChange={handleSubmittingChange} />
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ========== Inhoud ==========

interface ReviewContentProps {
  eligibility: ReviewEligibility;
  onClose: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

function ReviewContent({ eligibility, onClose, onSubmittingChange }: ReviewContentProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ message: string; expected: boolean } | null>(null);

  if (done) {
    return <Outcome tone="success" message="Dankie vir jou terugvoer!" onClose={onClose} />;
  }

  const blocked = eligibility.status === 'OPEN' ? null : REVIEW_BLOCKED_MESSAGE[eligibility.status];
  const message = error?.message ?? blocked;

  if (message || !eligibility.event) {
    const expected = !error || error.expected;
    return (
      <Outcome
        tone={expected ? 'warning' : 'error'}
        message={message ?? 'Kon nie die resensie laai nie.'}
        onClose={onClose}
      />
    );
  }

  return (
    <RatingForm
      event={eligibility.event}
      onCancel={onClose}
      onSubmitted={() => setDone(true)}
      onError={(msg, expected) => setError({ message: msg, expected })}
      onSubmittingChange={onSubmittingChange}
    />
  );
}

// ========== Vorm ==========

interface RatingFormProps {
  event: ReviewableEvent;
  onCancel: () => void;
  onSubmitted: () => void;
  onError: (message: string, expected: boolean) => void;
  onSubmittingChange: (submitting: boolean) => void;
}

function RatingForm({ event, onCancel, onSubmitted, onError, onSubmittingChange }: RatingFormProps) {
  const { colors, styles } = useReviewStyles();

  // null is "nog nie gekies nie", want 0 is 'n geldige telling
  const [scores, setScores] = useState<Record<string, number | null>>(
    () => Object.fromEntries(event.reviewCategories.map((category) => [category.id, null])),
  );
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const allRated = event.reviewCategories.every((category) => scores[category.id] !== null);
  const submitDisabled = !allRated || loading;

  function setScore(categoryId: string, score: number) {
    setScores((current) => ({ ...current, [categoryId]: score }));
  }

  async function handleSubmit() {
    if (submitDisabled) return;

    Keyboard.dismiss();
    setLoading(true);
    // Sê dit vir die vel voor die versoek begin, sodat dit nie intussen kan toegaan nie
    onSubmittingChange(true);
    try {
      await createReview({
        eventId: event.id,
        ratings: event.reviewCategories.map((category) => ({ categoryId: category.id, score: scores[category.id] ?? 0 })),
        comment: comment.trim() || undefined,
      });
      onSubmitted();
    } catch (err) {
      // 403, 409 en 400 is dinge wat kan gebeur (geel), nie stelselfoute nie (rooi)
      const status = getErrorStatus(err);
      if (status === 403) onError(REVIEW_BLOCKED_MESSAGE.NOT_ATTENDED, true);
      else if (status === 409) onError(REVIEW_BLOCKED_MESSAGE.ALREADY_REVIEWED, true);
      // Die backend se 400 sê presies wat fout is (venster gesluit, nog nie geëindig nie, ...)
      else if (status === 400) onError(getApiErrorMessage(err, SUBMIT_FAILED), true);
      else onError(getErrorMessage(err, SUBMIT_FAILED), false);
    } finally {
      setLoading(false);
      onSubmittingChange(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.closesRow}>
        <Feather name="clock" size={13} color={colors.textSubtle} />
        <Text style={styles.closesText}>
          Sluit op {formatFullDate(event.closesAt)}, {formatEventTime(event.closesAt)}
        </Text>
      </View>

      {event.reviewCategories.map((category) => (
        <CategoryRating
          key={category.id}
          name={category.name}
          score={scores[category.id]}
          onChange={(score) => setScore(category.id, score)}
        />
      ))}

      <View>
        <Text style={styles.fieldLabel}>
          Kommentaar <Text style={styles.optional}>(opsioneel)</Text>
        </Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          maxLength={REVIEW_MAX_COMMENT_LENGTH}
          multiline
          textAlignVertical="top"
          editable={!loading}
          placeholder="Wat het goed gewerk, en wat kan beter?"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Kommentaar (opsioneel)"
        />
        <Text style={styles.counter}>{comment.length}/{REVIEW_MAX_COMMENT_LENGTH}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.secondaryBtn, styles.actionBtn, loading && styles.btnDisabled]}
          onPress={onCancel}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.secondaryBtnText}>Kanselleer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.actionBtn, submitDisabled && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitDisabled}
          accessibilityRole="button"
          accessibilityLabel="Dien in"
          accessibilityState={{ disabled: submitDisabled, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryBtnText}>Dien in</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ========== Een kategorie ==========
// Die sirkel voor die sterre is die 0. StarRating self gebruik 0 vir "skoongemaak", so sonder
// die sirkel sou niemand weet dat hulle 'n 0 kan gee nie.

interface CategoryRatingProps {
  name: string;
  score: number | null;
  onChange: (score: number) => void;
}

function CategoryRating({ name, score, onChange }: CategoryRatingProps) {
  const { styles } = useReviewStyles();
  const isZero = score === 0;

  return (
    <View style={styles.category}>
      <Text style={styles.categoryName}>{name}</Text>
      <View style={styles.categoryRow}>
        <Pressable
          style={styles.zeroBtn}
          onPress={() => onChange(0)}
          accessibilityRole="button"
          accessibilityLabel={`${name}: 0 sterre`}
          accessibilityState={{ selected: isZero }}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <View style={[styles.zeroCircle, isZero && styles.zeroCircleActive]} />
        </Pressable>
        <StarRating
          value={score ?? 0}
          onChange={onChange}
          size={26}
          label={name}
          zeroLabel={isZero ? '0 uit 5 sterre' : 'Nog nie gegradeer nie'}
        />
      </View>
      <Text style={styles.scoreLine}>{score === null ? 'Nog nie gegradeer nie' : `${score} / 5`}</Text>
    </View>
  );
}

// ========== Sukses of fout ==========

type Tone = 'success' | 'warning' | 'error';

function Outcome({ tone, message, onClose }: { tone: Tone; message: string; onClose: () => void }) {
  const { colors, styles } = useReviewStyles();
  const textColor = tone === 'success' ? colors.text : tone === 'warning' ? colors.warning : colors.red;

  // Die uitslag vervang die vorm of die laai-animasie, so skermlesers hoor anders niks daarvan nie
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View style={styles.outcome}>
      <LottieView source={ANIMATIONS[tone]} autoPlay loop={false} style={styles.outcomeAnim} />
      <Text style={[styles.outcomeText, { color: textColor }]}>{message}</Text>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.outcomeBtn]}
        onPress={onClose}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryBtnText}>Terug na geleentheid</Text>
      </TouchableOpacity>
    </View>
  );
}

// ========== Style ==========

function useReviewStyles() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return { colors, styles };
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    avoider: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },

    sheet: {
      flexShrink: 1,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: colors.text },
    closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // flexShrink laat die inhoud rol as die vel kleiner word, bv. as die sleutelbord oop is
    scroll: { flexGrow: 0, flexShrink: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    loading: { paddingVertical: 32 },

    form: { gap: 18 },
    closesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    closesText: { ...typography.caption, color: colors.textSubtle },

    category: { gap: 4 },
    categoryName: { ...typography.body, color: colors.text },
    categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    zeroBtn: { padding: 6 },
    zeroCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.textSubtle,
    },
    zeroCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    scoreLine: { ...typography.caption, color: colors.textSubtle },

    fieldLabel: { ...typography.body, color: colors.text, marginBottom: 6 },
    optional: { fontWeight: '500', color: colors.textSubtle },
    commentInput: {
      ...typography.bodyRegular,
      minHeight: 110,
      maxHeight: 200,
      color: colors.text,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    counter: { ...typography.caption, color: colors.textSubtle, textAlign: 'right', marginTop: 4 },

    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1 },
    primaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 48,
    },
    primaryBtnText: { fontSize: 16, fontWeight: '900', color: colors.primaryText },
    secondaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      height: 48,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '900', color: colors.text },
    btnDisabled: { opacity: 0.6 },

    outcome: { alignItems: 'center', gap: 12, paddingTop: 4 },
    outcomeAnim: { width: 110, height: 110 },
    outcomeText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    outcomeBtn: { alignSelf: 'stretch', marginTop: 8 },
  });
}

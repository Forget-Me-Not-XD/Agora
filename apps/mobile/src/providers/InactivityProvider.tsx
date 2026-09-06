// ========== Imports: ==========
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';

// Hoe lank 'n aangemelde gebruiker STIL (geen aanraking op die skerm) mag wees
// voordat die "Is jy nog daar?" waarskuwing wys:
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minute

// Hoe lank die waarskuwing self wys, met 'n aftelling, voordat outomatiese
// afmelding gebeur as niemand "Ja, ek is nog hier" druk nie:
const WARNING_COUNTDOWN_SECONDS = 60;

export default function InactivityProvider({ children }: PropsWithChildren) {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const colors = useThemeColors();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(WARNING_COUNTDOWN_SECONDS);

    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const backgroundedAtRef = useRef<number | null>(null);

    function clearIdleTimer() {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }

    function clearCountdown() {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }

    function startIdleTimer() {
        clearIdleTimer();
        idleTimerRef.current = setTimeout(() => {
            setSecondsLeft(WARNING_COUNTDOWN_SECONDS);
            setShowWarning(true);
        }, INACTIVITY_TIMEOUT_MS);
    }

    // Sodra die waarskuwing wys, tel elke sekonde af.
    useEffect(() => {
        if (!showWarning) return;

        countdownRef.current = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearCountdown();
    }, [showWarning]);

    // Sodra die aftelling 0 bereik, meld dadelik af -- as 'n eie effect (nie
    // binne die aftel-interval self nie) sodat die modaal onmiddellik toemaak
    // in plaas daarvan om te wag vir die (asinchroniese) `user`-status update.
    useEffect(() => {
        if (!showWarning || secondsLeft > 0) return;
        clearCountdown();
        setShowWarning(false);
        logout();
    }, [showWarning, secondsLeft, logout]);

    // Enige aanraking iewers in die app, terwyl iemand aangemeld is en die
    // waarskuwing nog nie wys nie, herbegin die stilte-tydhouer. Sodra die
    // waarskuwing wel wys, is die res van die skerm agter 'n modaal geblokkeer --
    // slegs die "Ja, ek is nog hier"-knoppie (handleStillHere) tel dan as
    // aktiwiteit, nie los aanrakings nie.
    function handleActivity() {
        if (!user || showWarning) return;
        startIdleTimer();
    }

    function handleStillHere() {
        clearCountdown();
        setShowWarning(false);
        startIdleTimer();
    }

    // Begin/stop die hele stelsel net wanneer iemand aan- of afmeld.
    useEffect(() => {
        if (!user) {
            clearIdleTimer();
            clearCountdown();
            setShowWarning(false);
            return;
        }
        startIdleTimer();
        return () => clearIdleTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // 'n Geleentheid wat na die agtergrond geskuif is (bv. huis-knoppie, ander
    // app) vir langer as die stilte-tydperk tel ook as onaktief -- meld dadelik
    // af sodra die app weer oopgemaak word, sonder om eers die waarskuwing te
    // wys, aangesien niemand daar was om dit raak te sien nie.
    useEffect(() => {
        function handleAppStateChange(next: AppStateStatus) {
            if (!user) return;

            if (next === 'background' || next === 'inactive') {
                backgroundedAtRef.current = Date.now();
                return;
            }

            if (next === 'active' && backgroundedAtRef.current !== null) {
                const elapsed = Date.now() - backgroundedAtRef.current;
                backgroundedAtRef.current = null;

                if (elapsed >= INACTIVITY_TIMEOUT_MS) {
                    clearCountdown();
                    setShowWarning(false);
                    logout();
                } else {
                    startIdleTimer();
                }
            }
        }

        const sub = AppState.addEventListener('change', handleAppStateChange);
        return () => sub.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, logout]);

    return (
        <View style={styles.flexFill} onTouchStart={handleActivity}>
            {children}

            <Modal visible={showWarning} transparent animationType="fade" onRequestClose={handleStillHere}>
                <View style={styles.backdrop}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Is jy nog daar?</Text>
                        <Text style={styles.body}>
                            Jy was 'n rukkie onaktief. Om jou rekening veilig te hou, word jy outomaties afgemeld as jy nie binnekort reageer nie.
                        </Text>
                        <Text style={styles.countdown}>{secondsLeft}s</Text>
                        <Text style={styles.countdownLabel}>tot outomatiese afmelding</Text>
                        <TouchableOpacity style={styles.stayBtn} onPress={handleStillHere}>
                            <Text style={styles.stayBtnText}>Ja, ek is nog hier</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
    return StyleSheet.create({
        flexFill: { flex: 1 },
        backdrop: {
            flex: 1,
            backgroundColor: colors.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        },
        card: {
            width: '100%',
            maxWidth: 340,
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
            alignItems: 'center',
            gap: 8,
        },
        title: { ...typography.title, color: colors.text, textAlign: 'center' },
        body: { ...typography.bodyRegular, color: colors.textSubtle, textAlign: 'center', lineHeight: 20 },
        countdown: { ...typography.display, color: colors.primary, marginTop: 6 },
        countdownLabel: { ...typography.micro, color: colors.textSubtle },
        stayBtn: {
            alignSelf: 'stretch',
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 8,
        },
        stayBtnText: { ...typography.body, color: colors.primaryText, fontWeight: '800' },
    });
}

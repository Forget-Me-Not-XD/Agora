// ========== Imports: ==========
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { initiatePayment, notifyPayment, getPaymentStatus, type InitiatePaymentResponse } from '../api/payments';
import { API_URL } from '../api/client';
import type { EventResponse } from '../api/events';

type Step = 'closed' | 'processing' | 'gateway' | 'redirecting' | 'confirming' | 'success' | 'pending' | 'error';

// PayFast se eie ITN skep die kaartjie server-tot-server, heeltemal onafhanklik
// van wanneer ons blaaier na /payments/return herlei (sien die kommentaar
// daaroor in payments.controller.ts) -- die twee gebeure is NIE gewaarborg in
// enige volgorde nie. 'n Suksesvolle herleiding beteken dus net "PayFast is
// klaar met die gebruiker", nie "die kaartjie bestaan reeds" nie. Sonder hierdie
// peiling sou ons soms 'n kaartjie as bevestig wys (of erger, die RSVP-lys
// verfris) voordat dit werklik geskep is, en die nuwe RSVP sou eenvoudig
// ontbreek totdat iets anders toevallig 'n herlaai veroorsaak.
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 12; // ~18s -- ruim bo wat 'n ITN normaalweg neem

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type PaymentModalProps = {
  event: EventResponse;
  onPurchased?: () => void;
};

export function PaymentModal({ event, onPurchased }: PaymentModalProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [step, setStep] = useState<Step>('closed');
  const [payment, setPayment] = useState<InitiatePaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const soldOut = event.ticketsAvailable !== null && event.ticketsAvailable <= 0;

  function close() {
    setStep('closed');
    setPayment(null);
    setError(null);
  }

  async function startCheckout() {
    setStep('processing');
    setError(null);
    try {
      const result = await initiatePayment(event.id);
      setPayment(result);
      if (result.simulation) {
        setStep('gateway');
      } else {
        setStep('redirecting');
        await openPayFastCheckout(result);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const raw = axiosErr?.response?.data?.message;
      setError(typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join(', ') : 'Kon nie betaling begin nie.');
      setStep('error');
    }
  }

  // React Native het geen DOM om, soos die webweergawe, 'n POST-form na PayFast te
  // bou en in te dien nie -- ons stuur die reeds-onderteken checkout-velde eerder
  // as query-parameters na 'n klein bladsy wat die backend bedien (sien
  // payments.controller.ts se /payments/checkout-redirect), wat op sy beurt daardie
  // selfde POST namens ons doen binne 'n regte blaaierkonteks. Sodra PayFast klaar
  // is, herlei dit terug na ons backend se /payments/return of /cancel, wat op sy
  // beurt na agora://payment-callback herlei -- presies dieselfde patroon as die
  // Google/Microsoft-aanmeldvloei hierbo elders in die app.
  async function openPayFastCheckout(paymentResult: InitiatePaymentResponse): Promise<void> {
    const params = new URLSearchParams(
      paymentResult.checkout as unknown as Record<string, string>,
    ).toString();
    const checkoutRedirectUrl = `${API_URL}/payments/checkout-redirect?${params}`;
    const redirectUri = Linking.createURL('payment-callback');

    const result = await WebBrowser.openAuthSessionAsync(checkoutRedirectUrl, redirectUri);

    if (result.type !== 'success') {
      close();
      return;
    }

    const { queryParams } = Linking.parse(result.url);
    if (queryParams?.payment === 'success') {
      // Herleiding was suksesvol -- dit sê niks oor of die ITN al klaar gehardloop
      // het nie, dus bevestig eers werklik voordat ons "voltooi" wys.
      await confirmPayment(paymentResult.reference);
    } else {
      setError('Die betaling is gekanselleer of het misluk.');
      setStep('error');
    }
  }

  async function finishCheckout(outcome: 'success' | 'failed') {
    if (!payment?.simulation) return;
    setStep('processing');
    try {
      const result = await notifyPayment(payment.simulation[outcome]);
      if (result.status === 'VOLTOOI') {
        setStep('success');
        onPurchased?.();
      } else {
        setError('Die betaling is gekanselleer of het misluk.');
        setStep('error');
      }
    } catch {
      setError('Betaling kon nie bevestig word nie.');
      setStep('error');
    }
  }

  // Peil /payments/:reference/status totdat dit werklik VOLTOOI (of MISLUK) is,
  // i.p.v. om aan te neem dat 'n suksesvolle blaaier-herleiding self genoeg is.
  async function confirmPayment(reference: string): Promise<void> {
    setStep('confirming');
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await getPaymentStatus(reference);
        if (result.status === 'VOLTOOI') {
          setStep('success');
          onPurchased?.();
          return;
        }
        if (result.status === 'MISLUK') {
          setError('Die betaling is gekanselleer of het misluk.');
          setStep('error');
          return;
        }
      } catch {
        // 'n Enkele mislukte peiling (bv. 'n kortstondige netwerkwipe) is nie
        // genoeg rede om op te gee nie -- probeer eenvoudig weer.
      }
      await wait(POLL_INTERVAL_MS);
    }
    // Nog steeds HANGENDE ná al ons pogings -- PayFast se ITN kan om watter rede
    // ook al stadiger as gewoonlik wees. Die geld is heel moontlik reeds gehef,
    // so dit as 'n fout wys sou misleidend wees; wys eerder 'n sagter boodskap.
    setStep('pending');
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.buyBtn, soldOut && styles.buyBtnDisabled]}
        onPress={startCheckout}
        disabled={soldOut}
        accessibilityLabel={soldOut ? 'Kaartjies uitverkoop' : `Koop kaartjie vir R${event.ticketPrice ?? 0}`}
      >
        <Feather name="credit-card" size={16} color={colors.primaryText} />
        <Text style={styles.buyBtnText}>
          {soldOut ? 'Uitverkoop' : `Koop Kaartjie — R${event.ticketPrice ?? 0}`}
        </Text>
      </TouchableOpacity>

      <Modal visible={step !== 'closed'} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          style={styles.backdrop}
          onPress={step === 'success' || step === 'error' || step === 'pending' ? close : undefined}
        >
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.mark}>
                  <Feather name="shield" size={13} color={colors.primary} />
                </View>
                <Text style={styles.headerTitle}>Koop Kaartjie</Text>
              </View>
              <TouchableOpacity onPress={close} accessibilityLabel="Maak toe">
                <Feather name="x" size={18} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            {(step === 'processing' || step === 'redirecting' || step === 'confirming') && (
              <View style={styles.centerBlock}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.centerText}>
                  {step === 'redirecting'
                    ? 'Word na PayFast herlei…'
                    : step === 'confirming'
                    ? 'Bevestig jou betaling…'
                    : 'Besig…'}
                </Text>
              </View>
            )}

            {step === 'gateway' && payment && (
              <View style={styles.gap}>
                <View style={styles.sandboxRow}>
                  <Feather name="shield" size={13} color={colors.textSubtle} />
                  <Text style={styles.sandboxText}>Gesimuleerde PayFast-omgewing (sandbox)</Text>
                </View>
                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Item</Text>
                    <Text style={styles.detailValue}>{payment.itemName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verwysing</Text>
                    <Text style={styles.detailValueMono} numberOfLines={1}>{payment.reference}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bedrag</Text>
                    <Text style={styles.detailAmount}>R{payment.amount.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, styles.rowBtn]}
                    onPress={() => finishCheckout('failed')}
                  >
                    <Text style={styles.secondaryBtnText}>Kanselleer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.rowBtn]}
                    onPress={() => finishCheckout('success')}
                  >
                    <Text style={styles.primaryBtnText}>Voltooi Betaling</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centerBlock}>
                <View style={styles.successCircle}>
                  <Feather name="check" size={22} color={colors.success} />
                </View>
                <Text style={styles.centerTitle}>Jou kaartjie is bevestig</Text>
                <Text style={styles.centerText}>
                  Verwerk deur PayFast se sandbox-omgewing — toetsmodus, geen regte geld nie
                </Text>
                <Text style={styles.centerHint}>Kyk by &quot;My RSVPs&quot; vir jou QR-kode.</Text>
                <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
                  <Text style={styles.secondaryBtnText}>Maak toe</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'pending' && (
              <View style={styles.centerBlock}>
                <Feather name="clock" size={32} color={colors.textSubtle} />
                <Text style={styles.centerTitle}>Jou betaling word steeds verwerk</Text>
                <Text style={styles.centerText}>
                  Dit neem soms 'n bietjie langer as gewoonlik. Jou kaartjie sal binnekort by
                  &quot;My RSVPs&quot; verskyn sodra dit bevestig is.
                </Text>
                <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
                  <Text style={styles.secondaryBtnText}>Maak toe</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centerBlock}>
                <Feather name="alert-circle" size={32} color={colors.red} />
                <Text style={[styles.centerText, { color: colors.red }]}>
                  {error ?? 'Iets het verkeerd geloop.'}
                </Text>
                <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
                  <Text style={styles.secondaryBtnText}>Maak toe</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    buyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
    },
    buyBtnDisabled: { opacity: 0.5 },
    buyBtnText: { ...typography.body, color: colors.primaryText, fontWeight: '900' },

    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mark: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { ...typography.subtitle, color: colors.text },

    gap: { gap: 14 },

    sandboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sandboxText: { ...typography.caption, color: colors.textSubtle },

    detailBox: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    detailLabel: { ...typography.caption, color: colors.textSubtle },
    detailValue: { ...typography.body, color: colors.text, flexShrink: 1, textAlign: 'right' },
    detailValueMono: { ...typography.caption, color: colors.text, flexShrink: 1, textAlign: 'right' },
    detailAmount: { ...typography.title, color: colors.text },

    actionsRow: { flexDirection: 'row', gap: 10 },
    rowBtn: { flex: 1, alignSelf: 'auto' },
    primaryBtn: {
      alignSelf: 'stretch',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryBtnText: { ...typography.body, color: colors.primaryText, fontWeight: '800' },
    secondaryBtn: {
      alignSelf: 'stretch',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    secondaryBtnText: { ...typography.body, color: colors.text, fontWeight: '800' },

    centerBlock: { alignItems: 'center', gap: 10, paddingVertical: 12 },
    centerTitle: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
    centerText: { ...typography.bodyRegular, color: colors.textSubtle, textAlign: 'center' },
    centerHint: { ...typography.caption, color: colors.textSubtle, textAlign: 'center' },
    successCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.successBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

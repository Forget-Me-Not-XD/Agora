// ========== Imports: ==========
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useThemeColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Popia'>;

const DATA_ITEMS = [
  'Naam en van',
  'E-posadres',
  'Wagwoord — bcrypt-verhaas met 12 rondtes, nooit in gewone teks gestoor nie',
  'Rol (GAS, STUDENT, DOSENT of ADMIN)',
  'Studiesentrum — opsioneel, slegs vir STUDENT-rekeninge',
];

const PURPOSE_ITEMS = [
  'Stelseltoegangsbeheer (aanmelding en rol-gebaseerde toestemmings)',
  "Om jou aan geleenthede, RSVP's en bywoningsrekords te koppel",
  'Sekuriteit en aanspreeklikheid via die oudit-rekord',
];

const ACCESS_ITEMS = [
  'Jy kan altyd net jou eie profiel wysig, tensy jy ADMIN is',
  'Gebruikerslyste is beperk tot ADMIN- en DOSENT-rolle',
  'CSV-uitvoer van data is streng ADMIN-only',
];

const THIRD_PARTY_ITEMS = [
  'Cloudflare — dra net versleutelde verkeer deur, ontvang geen kopie van ons databasis nie',
  'GitHub Container Registry (GHCR) — stoor slegs houerbeelde (kode), geen persoonlike data nie',
];

const RIGHTS_ITEMS = [
  'Toegang tot jou eie data — sigbaar in jou profiel',
  'Regstelling — jy (of \'n admin) kan jou profiel wysig',
  'Beswaar teen verwerking — kontak ons (sien punt 9)',
];

const GAPS = [
  'Geen self-diens "verwyder my rekening"-funksie nie (reg op uitwissing) — die backend het tans slegs GET/PATCH op gebruikers, geen DELETE nie.',
  'Geen outomatiese bewaartermyn of vervalbeleid vir oudit-logs of onaktiewe rekeninge nie.',
  "Geen geregistreerde Inligtingsbeampte by die Inligting-Regulator nie — akademiese prototipe, nie 'n geregistreerde regspersoon nie.",
  'Die "welkoms-e-pos" ná registrasie bestaan tans net as \'n bediener-loglêer — daar word nog geen werklike e-pos gestuur nie.',
];

export function PopiaScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Terug</Text>
        </TouchableOpacity>
        <Text style={styles.title}>POPIA</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Laas opgedateer: 4 Augustus 2026</Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Belangrike konteks</Text>
          <Text style={styles.noticeText}>
            AGORA is 'n universiteits-kapstoneprojek, nie 'n geregistreerde maatskappy nie.
            Ons pas POPIA se beginsels toe waar tegnies moontlik. Gapings word eerlik
            onderaan gelys.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Watter inligting ons versamel</Text>
          {DATA_ITEMS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          <Text style={[styles.p, { marginTop: 8 }]}>
            By elke aanmelding, registrasie en wysiging aan beskermde data hou ons ook
            outomaties 'n oudit-rekord: gebruiker-ID, aksie, IP-adres, toestel-inligting
            en tydstempel.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Waarvoor ons dit gebruik</Text>
          {PURPOSE_ITEMS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          <Text style={[styles.p, { marginTop: 8 }]}>
            Nooit vir bemarking nie, nooit verkoop aan derde partye nie.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Waar dit gestoor word</Text>
          <View style={styles.iconRow}>
            <Feather name="server" size={16} color={colors.text} style={{ marginTop: 1 }} />
            <Text style={styles.iconRowText}>
              Op ons eie self-gehoste k3s-Kubernetes-cluster (3 Raspberry Pi's) — nie op
              'n derdeparty-wolkdiens nie. Kubernetes NetworkPolicy-reëls beperk watter
              interne dienste met die databasis mag praat.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Data in oordrag &amp; sertifikaat</Text>
          <View style={styles.iconRow}>
            <Feather name="lock" size={16} color={colors.text} style={{ marginTop: 1 }} />
            <Text style={styles.iconRowText}>
              Ons gebruik 'n Cloudflare Tunnel vir publieke HTTPS-toegang (die cluster is
              agter CGNAT). Geen binnekomende poort of sertifikaatlêer is op ons kant nodig
              nie — die sertifikaat wat jou toestel sien, word deur Cloudflare se Universal
              SSL-diens uitgereik en outomaties hernu.
            </Text>
          </View>
          <View style={[styles.iconRow, { marginTop: 8 }]}>
            <Feather name="shield" size={16} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={styles.iconRowText}>Self geverifieer teen die publieke domein (4 Augustus 2026):</Text>
          </View>
          <View style={styles.techBox}>
            <Text style={styles.techLine}>Uitreiker: Google Trust Services (WE1)</Text>
            <Text style={styles.techLine}>Onderwerp: use-agora.com</Text>
            <Text style={styles.techLine}>SAN: use-agora.com, *.use-agora.com</Text>
            <Text style={styles.techLine}>Geldig vanaf: 12 Julie 2026</Text>
            <Text style={styles.techLine}>Geldig tot: 10 Oktober 2026</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>5. Wie het toegang</Text>
          {ACCESS_ITEMS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>6. Derde partye</Text>
          {THIRD_PARTY_ITEMS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          <Text style={[styles.p, { marginTop: 8 }]}>
            Geen bemarkings- of snuffel-derdepartye (analytics/trackers) word tans geïntegreer nie.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>7. Jou regte ingevolge POPIA</Text>
          {RIGHTS_ITEMS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>8. Bekende gapings — opvolgpunte</Text>
          {GAPS.map((gap) => (
            <View key={gap} style={styles.gapRow}>
              <Feather name="alert-triangle" size={14} color={colors.red} style={{ marginTop: 2 }} />
              <Text style={styles.gapText}>{gap}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>9. Kontak</Text>
          <Text style={styles.p}>
            Vir vrae oor hierdie beleid of jou data, kontak die AGORA-span via die
            universiteitsmodule-kanaal. (Opvolgpunt: 'n vaste kontak-e-posadres moet
            hier bygevoeg word sodra die span dit formaliseer.)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 16,
    },
    backBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      width: 60,
      alignItems: 'center',
    },
    backText: { color: colors.text, fontWeight: '600', fontSize: 16 },
    title: { color: colors.text, fontSize: 18, fontWeight: '800' },
    scroll: { paddingBottom: 32 },
    updated: { color: colors.textSubtle, fontSize: 16, marginBottom: 12 },

    noticeBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: 14,
      marginBottom: 12,
    },
    noticeTitle: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 4 },
    noticeText: { color: colors.textSubtle, fontSize: 16, lineHeight: 18 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardTitle: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 8 },
    p: { color: colors.textSubtle, fontSize: 16, lineHeight: 19 },

    bulletRow: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
    bulletDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textSubtle,
      marginTop: 7,
    },
    bulletText: { flex: 1, color: colors.textSubtle, fontSize: 16, lineHeight: 19 },

    iconRow: { flexDirection: 'row', gap: 8 },
    iconRowText: { flex: 1, color: colors.textSubtle, fontSize: 16, lineHeight: 19 },

    techBox: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      marginTop: 8,
    },
    techLine: {
      color: colors.textSubtle,
      fontSize: 16,
      lineHeight: 17,
      fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    },

    gapRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    gapText: { flex: 1, color: colors.textSubtle, fontSize: 16, lineHeight: 17 },
  });
}

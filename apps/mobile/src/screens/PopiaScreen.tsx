// ========== Imports: ==========
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useThemeColors } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Popia'>;

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
            <Text style={styles.p}>
            Naam, van, e-pos, wagwoord (bcrypt-verhaas met 12 rondtes — nooit in gewone
            teks gestoor nie), rol, en opsioneel jou studiesentrum. By elke aanmelding
            hou ons ook 'n oudit-rekord: gebruiker-ID, aksie, IP-adres, toestel-inligting
            en tydstempel.
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Waarvoor ons dit gebruik</Text>
            <Text style={styles.p}>
            Stelseltoegangsbeheer, om jou aan geleenthede/RSVP's te koppel, en sekuriteit/
            aanspreeklikheid via die oudit-rekord. Nooit vir bemarking nie, nooit verkoop
            aan derde partye nie.
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Waar dit gestoor word</Text>
            <Text style={styles.p}>
            Op ons eie self-gehoste k3s-Kubernetes-cluster (3 Raspberry Pi's) — nie op
            'n derdeparty-wolkdiens nie.
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Data in oordrag &amp; sertifikaat</Text>
            <Text style={styles.p}>
            Ons gebruik 'n Cloudflare Tunnel vir publieke HTTPS-toegang (die cluster is
            agter CGNAT). Die sertifikaat wat jou toestel sien, word deur Cloudflare se
            Universal SSL-diens bestuur. Self geverifieer op 4 Augustus 2026: uitgereik
            deur Google Trust Services (WE1) via Cloudflare, geldig vir *.use-agora.com
            tot 10 Oktober 2026.
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>5. Derde partye</Text>
            <Text style={styles.p}>
            Cloudflare (net netwerk-deurvoer) en GHCR (net houerbeelde). Geen bemarkings-
            of snuffel-derdepartye nie.
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>6. Bekende gapings — opvolgpunte</Text>
            {GAPS.map((gap) => (
            <View key={gap} style={styles.gapRow}>
                <Feather name="alert-triangle" size={14} color={colors.red} style={{ marginTop: 2 }} />
                <Text style={styles.gapText}>{gap}</Text>
            </View>
            ))}
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
    backText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    title: { color: colors.text, fontSize: 18, fontWeight: '800' },
    scroll: { paddingBottom: 32 },
    updated: { color: colors.textSubtle, fontSize: 12, marginBottom: 12 },

    noticeBox: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        padding: 14,
        marginBottom: 12,
    },
    noticeTitle: { color: colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 4 },
    noticeText: { color: colors.textSubtle, fontSize: 12, lineHeight: 18 },

    card: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 12,
    },
    cardTitle: { color: colors.primary, fontSize: 14, fontWeight: '800', marginBottom: 6 },
    p: { color: colors.textSubtle, fontSize: 13, lineHeight: 19 },

    gapRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    gapText: { flex: 1, color: colors.textSubtle, fontSize: 12, lineHeight: 17 },
    });
}

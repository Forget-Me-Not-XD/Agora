// ========== Imports: ==========
import { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from "../theme/theme";

type ScreenHeaderProps = {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps ) {
    const colors = useThemeColors();
    const styles = makeStyles(colors);

    if (onBack) {
        return (
            <View style={styles.topBar}>
                <TouchableOpacity
                style={styles.backIconBtn}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Terug"
                >
                    <Feather name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{title}</Text>
                { right ?? <View style={styles.backSpacer} />}
            </View>
        );
    }

    return (
        <View style={styles.pageHeader}>
        <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>{title}</Text>
            {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
    );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
    return StyleSheet.create({
        topBar: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
        },
        backIconBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        backSpacer: { width: 36 },
        topBarTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: colors.text},

        pageHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
        },
        pageHeaderText: { flex: 1 },
        pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
        pageSubtitle: { fontSize: 16, color: colors.textSubtle, marginTop: 2 },
        headerRight: { flexDirection: 'row', gap: 8 },
    });
}
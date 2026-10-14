// ========== Imports: ==========
import { useMemo } from 'react';
import { View, Pressable, StyleSheet, AccessibilityActionEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';

// ========== Star rating ==========
// Two modes from one component: pass onChange and it becomes an interactive
// 0–5 picker (tapping the current star clears it back to 0); leave it out
// and it's a read-only display that can show fractions like 4.3.

const MAX = 5;

type StarRatingProps = {
    value: number;
    onChange?: (value: number) => void;
    size?: number;
    label?: string;
    // What a screen reader says at 0. Forms where 0 is a real score pass their own text.
    zeroLabel?: string;
};

function clamp(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(MAX, Math.max(0, value));
}

// Afrikaans uses a decimal comma, so 4.3 is read out as "4,3".
function formatRating(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function StarIcon({ fill, size, filledColor, emptyColor }: { fill: number; size: number; filledColor: string; emptyColor: string }) {
    return (
        <View style={{ width: size, height: size }}>
            <Ionicons name="star-outline" size={size} color={emptyColor} style={styles.layer} />
            {fill > 0 ? (
                // Clipping a filled star to a percentage of its width is what
                // lets read-only mode show 4.3 without half-star icons. The
                // inner View keeps the glyph at full size inside the clip.
                <View style={[styles.layer, styles.clip, { width: size * fill, height: size }]}>
                    <View style={{ width: size, height: size }}>
                        <Ionicons name="star" size={size} color={filledColor} style={styles.layer} />
                    </View>
                </View>
            ) : null}
        </View>
    );
}

export function StarRating({ value, onChange, size = 24, label = 'Gradering', zeroLabel = 'Geen gradering' }: StarRatingProps) {
    const colors = useThemeColors();
    const starColors = useMemo(
        () => ({ filledColor: colors.warning, emptyColor: colors.textSubtle }),
        [colors],
    );

    if (!onChange) {
        const rating = Math.round(clamp(value) * 10) / 10;

        return (
            <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${label}: ${formatRating(rating)} uit ${MAX} sterre`}
                style={styles.row}
            >
                {Array.from({ length: MAX }, (_, i) => (
                    <StarIcon key={i} fill={Math.min(1, Math.max(0, rating - i))} size={size} {...starColors} />
                ))}
            </View>
        );
    }

    const change = onChange;
    const rating = Math.round(clamp(value));

    // Screen readers treat the row as one adjustable control (swipe up/down)
    function handleAccessibilityAction(e: AccessibilityActionEvent) {
        if (e.nativeEvent.actionName === 'increment' && rating < MAX) change(rating + 1);
        if (e.nativeEvent.actionName === 'decrement' && rating > 0) change(rating - 1);
    }

    return (
        <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{
                min: 0,
                max: MAX,
                now: rating,
                text: rating === 0 ? zeroLabel : `${rating} uit ${MAX} sterre`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={handleAccessibilityAction}
            style={styles.row}
        >
            {Array.from({ length: MAX }, (_, i) => {
                const n = i + 1;
                return (
                    <Pressable
                        key={n}
                        // Android keeps accessible children focusable even inside an accessible
                        // parent, so hide the stars and let the row be the only TalkBack stop.
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                        onPress={() => change(n === rating ? 0 : n)}
                        hitSlop={{ top: 8, bottom: 8 }}
                        style={styles.starButton}
                    >
                        <StarIcon fill={n <= rating ? 1 : 0} size={size} {...starColors} />
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    starButton: { padding: 4 },
    layer: { position: 'absolute', top: 0, left: 0 },
    clip: { overflow: 'hidden' },
});

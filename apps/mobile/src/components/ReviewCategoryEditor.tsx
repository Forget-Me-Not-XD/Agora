// ========== Imports: ==========
import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import {
    REVIEW_CATEGORY_LIMITS,
    createDraft,
    type ReviewCategoryDraft,
    type ReviewCategoryErrors,
} from '../lib/review-categories';

type ReviewCategoryEditorProps = {
    categories: ReviewCategoryDraft[];
    onChange: (categories: ReviewCategoryDraft[]) => void;
    errors: ReviewCategoryErrors;
    disabled?: boolean;
};

export function ReviewCategoryEditor({ categories, onChange, errors, disabled = false }: ReviewCategoryEditorProps) {
    const colors = useThemeColors();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const canAdd = !disabled && categories.length < REVIEW_CATEGORY_LIMITS.maxCount;
    const canRemove = !disabled && categories.length > REVIEW_CATEGORY_LIMITS.minCount;

    function handleRename(key: string, name: string) {
        onChange(categories.map((category) => (category.key === key ? { ...category, name } : category)));
    }

    function handleRemove(key: string) {
        onChange(categories.filter((category) => category.key !== key));
    }

    function handleAdd() {
        onChange([...categories, createDraft()]);
    }

    return (
        <View style={styles.wrap}>
            <Text style={styles.label}>Resensie-kategorieë</Text>
            <Text style={styles.hint}>
                Bywoners beoordeel die geleentheid ná afloop op elkeen van hierdie kategorieë.
            </Text>

            {categories.map((category, index) => {
                const error = errors.rows[category.key];
                return (
                    <View key={category.key} style={styles.rowWrap}>
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, error ? styles.inputError : null]}
                                placeholder="Kategorienaam..."
                                placeholderTextColor={colors.textSubtle}
                                accessibilityLabel={`Kategorie ${index + 1}`}
                                value={category.name}
                                onChangeText={(name) => handleRename(category.key, name)}
                                maxLength={REVIEW_CATEGORY_LIMITS.maxNameLength}
                                editable={!disabled}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={[styles.removeBtn, !canRemove && styles.btnDisabled]}
                                onPress={() => handleRemove(category.key)}
                                disabled={!canRemove}
                                accessibilityRole="button"
                                accessibilityLabel={`Verwyder ${category.name.trim() || `kategorie ${index + 1}`}`}
                                accessibilityHint={canRemove ? undefined : 'Daar moet ten minste een kategorie wees'}
                            >
                                <Feather name="trash-2" size={18} color={colors.textSubtle} />
                            </TouchableOpacity>
                        </View>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>
                );
            })}

            <TouchableOpacity
                style={[styles.addBtn, !canAdd && styles.btnDisabled]}
                onPress={handleAdd}
                disabled={!canAdd}
                accessibilityRole="button"
            >
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>
                    Voeg kategorie by ({categories.length}/{REVIEW_CATEGORY_LIMITS.maxCount})
                </Text>
            </TouchableOpacity>

            {errors.list ? <Text style={styles.errorText}>{errors.list}</Text> : null}
        </View>
    );
}

// Die veld-style volg die textInput/fieldLabel in EventDetailScreen sodat die redigeerder
// soos deel van die skep-vorm lyk.
function makeStyles(colors: ReturnType<typeof useThemeColors>) {
    return StyleSheet.create({
        wrap: { marginTop: 14 },
        label: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.textSubtle,
            marginBottom: 2,
            letterSpacing: 0.3,
        },
        hint: { fontSize: 16, color: colors.textSubtle, marginBottom: 10 },
        rowWrap: { marginBottom: 8 },
        row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        input: {
            flex: 1,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            fontWeight: '600',
        },
        inputError: { borderColor: colors.red },
        removeBtn: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
        },
        addBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            paddingVertical: 6,
        },
        addBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
        btnDisabled: { opacity: 0.4 },
        errorText: { fontSize: 14, fontWeight: '600', color: colors.red, marginTop: 4 },
    });
}

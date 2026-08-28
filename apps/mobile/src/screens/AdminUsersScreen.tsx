// ========== Imports: ==========
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { ScreenHeader } from '../components/ScreenHeader';
import { getAllUsers, updateUser, ALL_USER_TAGS, getTagLabel } from '../api/users';
import { getRoleLabel } from '../lib/rbac';
import type { UserResponse, UserTag } from '../api/client';

export function AdminUsersScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<UserTag | 'alles'>('alles');

  const [selected, setSelected] = useState<UserResponse | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await getAllUsers();
      setUsers(result);
    } catch {
      setLoadError('Kon nie gebruikers laai nie.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = 
        !q || `${u.name} ${u.surname}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesTag = tagFilter === 'alles' || u.tags.includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [users, search, tagFilter]);

  const availableTags = selected
    ? ALL_USER_TAGS.filter((t) => !selected.tags.includes(t.value))
    : [];

  function closeDetail() {
    setSelected(null);
    setPickerOpen(false);
  }

  async function persistTags(nextTags: UserTag[]) {
    if (!selected) return;
    setTagBusy(true);
    try {
      const updated = await updateUser(selected.id, { tags: nextTags });
      setSelected(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      Alert.alert('Kon nie tag opdateer nie', 'Probeer asseblief weer.');
    } finally {
      setTagBusy(false);
    }
  }

  function addTag(tag: UserTag) {
    if (!selected) return;
    setPickerOpen(false);
    void persistTags([...selected.tags, tag]);
  }

  function removeTag(tag: UserTag) {
    if (!selected) return;
    void persistTags(selected.tags.filter((t) => t !== tag));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Bestuur Gebruikers"
        subtitle={`${users.length} geregistreerde gebruiker${users.length !== 1 ? 's' : ''}`}
      />

      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={colors.textSubtle} />
        <TextInput
          style={styles.searchInput}
          placeholder="Soek op naam of e-pos..."
          placeholderTextColor={colors.textSubtle}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Maak soektog skoon">
            <Feather name="x" size={14} color={colors.textSubtle} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, tagFilter === 'alles' && styles.chipActive]}
          onPress={() => setTagFilter('alles')}
          accessibilityLabel="Alle gebruikers"
          accessibilityState={{ selected: tagFilter === 'alles' }}
        >
          <Text style={[styles.chipText, tagFilter === 'alles' && styles.chipTextActive]}>Almal</Text>
        </TouchableOpacity>
        {ALL_USER_TAGS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, tagFilter === t.value && styles.chipActive]}
            onPress={() => setTagFilter(t.value)}
            accessibilityLabel={t.label}
            accessibilityState={{ selected: tagFilter === t.value }}
          >
            <Text style={[styles.chipText, tagFilter === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>


      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.centerFill}>
          <Feather name="alert-circle" size={28} color={colors.red} />
          <Text style={styles.emptyText}>{loadError}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Feather name="users" size={28} color={colors.textSubtle} />
              <Text style={styles.emptyText}>Geen gebruikers gevind nie.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setSelected(item)}
              activeOpacity={0.75}
              accessibilityLabel={`Bestuur ${item.name} ${item.surname}`}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name} {item.surname}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>{item.email}</Text>
                <View style={styles.rowBadges}>
                  <View style={[styles.badge, { backgroundColor: colors.infoBg }]}>
                    <Text style={[styles.badgeText, { color: colors.info }]}>{getRoleLabel(item.role)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: item.isActive ? colors.successBg : colors.border }]}>
                    <Text style={[styles.badgeText, { color: item.isActive ? colors.success : colors.textSubtle }]}>
                      {item.isActive ? 'Aktief' : 'Onaktief'}
                    </Text>
                  </View>
                  {item.tags.map((tag) => (
                    <View key={tag} style={[styles.badge, { backgroundColor: colors.warningBg }]}>
                      <Text style={[styles.badgeText, { color: colors.warning }]}>{getTagLabel(tag)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSubtle} />
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeDetail}>
        <Pressable style={styles.modalBackdrop} onPress={closeDetail}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selected.name} {selected.surname}
                  </Text>
                  <TouchableOpacity onPress={closeDetail} accessibilityLabel="Maak toe">
                    <Feather name="x" size={18} color={colors.textSubtle} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Tags</Text>
                <View style={styles.tagsRow}>
                  {selected.tags.length === 0 && (
                    <Text style={styles.noTagsText}>Geen tags toegeken nie</Text>
                  )}
                  {selected.tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{getTagLabel(tag)}</Text>
                      <TouchableOpacity
                        onPress={() => removeTag(tag)}
                        disabled={tagBusy}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel={`Verwyder ${getTagLabel(tag)}`}
                      >
                        <Feather name="x" size={12} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {availableTags.length > 0 && (
                    <TouchableOpacity
                      style={styles.addTagBtn}
                      onPress={() => setPickerOpen((v) => !v)}
                      disabled={tagBusy}
                      accessibilityLabel="Voeg tag by"
                    >
                      {tagBusy ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Feather name="plus" size={14} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {pickerOpen && (
                  <View style={styles.tagPicker}>
                    {availableTags.map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        style={styles.tagPickerRow}
                        onPress={() => addTag(t.value)}
                      >
                        <Text style={styles.tagPickerText}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.detailsBlock}>
                  <DetailLine label="E-pos" value={selected.email} colors={colors} />
                  <DetailLine label="Rol" value={getRoleLabel(selected.role)} colors={colors} />
                  <DetailLine label="Studiesentrum" value={selected.studyCenter || '—'} colors={colors} />
                  <DetailLine
                    label="Status"
                    value={selected.isActive ? 'Aktief' : 'Onaktief'}
                    colors={colors}
                    isLast
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DetailLine({
  label,
  value,
  colors,
  isLast,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ ...typography.caption, color: colors.textSubtle }}>{label}</Text>
      <Text style={{ ...typography.body, color: colors.text }}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600', paddingVertical: 0 },

    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { ...typography.caption, color: colors.textSubtle },
    chipTextActive: { color: colors.primaryText },

    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
    emptyText: { ...typography.bodyRegular, color: colors.textSubtle, textAlign: 'center' },

    listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
    },
    rowInfo: { flex: 1 },
    rowName: { ...typography.body, color: colors.text },
    rowMeta: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
    rowBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { ...typography.micro },

    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 18 },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalTitle: { ...typography.subtitle, color: colors.text, flex: 1, marginRight: 10 },

    sectionLabel: { ...typography.caption, color: colors.textSubtle, marginBottom: 8 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    noTagsText: { ...typography.caption, color: colors.textSubtle },
    tagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.warningBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagPillText: { ...typography.caption, color: colors.warning },
    addTagBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagPicker: {
      marginTop: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    tagPickerRow: { paddingHorizontal: 12, paddingVertical: 10 },
    tagPickerText: { ...typography.body, color: colors.text },

    detailsBlock: { marginTop: 16, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
  });
}

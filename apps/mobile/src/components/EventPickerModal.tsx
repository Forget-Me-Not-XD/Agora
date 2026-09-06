// ========== Imports: ==========
import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';
import { formatFullDate } from '../lib/event-status';

export interface SelectableEvent {
  id: string;
  title: string;
  date: string;
}

interface EventPickerModalProps {
  events: SelectableEvent[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function EventPickerModal({ events, selected, onChange }: EventPickerModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return events;
    return events.filter((e) => e.title.toLowerCase().includes(term));
  }, [events, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  }

  function toggleAllFiltered() {
    const next = new Set(selected);
    if (allFilteredSelected) {
      filtered.forEach((e) => next.delete(e.id));
    } else {
      filtered.forEach((e) => next.add(e.id));
    }
    onChange(next);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Feather name="check-square" size={15} color={colors.primary} />
        <Text style={styles.triggerText}>
          {selected.size === 0 ? 'Kies geleenthede...' : `${selected.size} geleentheid${selected.size !== 1 ? 'e' : ''} gekies`}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Kies geleenthede vir analise</Text>
              <TouchableOpacity onPress={close} accessibilityLabel="Maak toe">
                <Feather name="x" size={18} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Feather name="search" size={15} color={colors.textSubtle} />
              <TextInput
                style={styles.searchInput}
                placeholder="Soek 'n geleentheid..."
                placeholderTextColor={colors.textSubtle}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.selectAllRow} onPress={toggleAllFiltered} disabled={filtered.length === 0}>
              <Feather name={allFilteredSelected ? 'check-square' : 'square'} size={15} color={allFilteredSelected ? colors.primary : colors.textSubtle} />
              <Text style={styles.selectAllText}>{allFilteredSelected ? 'Deselekteer almal' : 'Kies almal (gefiltreer)'}</Text>
            </TouchableOpacity>

            <ScrollView style={styles.list}>
              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>Geen geleenthede pas by &quot;{query}&quot; nie.</Text>
              ) : (
                filtered.map((event) => {
                  const checked = selected.has(event.id);
                  return (
                    <TouchableOpacity key={event.id} style={styles.row} onPress={() => toggle(event.id)}>
                      <Feather name={checked ? 'check-square' : 'square'} size={15} color={checked ? colors.primary : colors.textSubtle} />
                      <Text style={styles.rowTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.rowDate}>{formatFullDate(event.date)}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity style={styles.doneBtn} onPress={close}>
              <Text style={styles.doneBtnText}>Klaar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    triggerText: { ...typography.body, color: colors.text },

    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      maxHeight: '80%',
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerTitle: { ...typography.subtitle, color: colors.text },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    searchInput: { ...typography.bodyRegular, color: colors.text, flex: 1, padding: 0 },

    selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    selectAllText: { ...typography.caption, color: colors.textSubtle },

    list: { marginTop: 4 },
    emptyText: { ...typography.bodyRegular, color: colors.textSubtle, textAlign: 'center', paddingVertical: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowTitle: { ...typography.bodyRegular, color: colors.text, flex: 1 },
    rowDate: { ...typography.caption, color: colors.textSubtle },

    doneBtn: {
      marginTop: 12,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    doneBtnText: { ...typography.body, color: colors.primaryText, fontWeight: '800' },
  });
}

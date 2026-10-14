import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors, type ThemeColors } from '../theme/theme';
import { typography } from '../theme/typography';

const VISIBLE_COUNT = 5;

// Die nuutste vyf wys altyd, die res eers as daarvoor gevra word. Daar is doelbewus geen datum by
// nie, sodat dit moeiliker is om 'n kommentaar aan 'n spesifieke bywoner te koppel. Hou dit gelyk
// aan die web se ReviewCommentList.
export function ReviewCommentList({ comments }: { comments: string[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);

  if (comments.length === 0) {
    return <Text style={styles.empty}>Nog geen kommentaar nie.</Text>;
  }

  const shown = showAll ? comments : comments.slice(0, VISIBLE_COUNT);

  return (
    <View style={styles.wrap}>
      {shown.map((comment, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.text}>{comment}</Text>
        </View>
      ))}

      {comments.length > VISIBLE_COUNT && (
        <TouchableOpacity
          onPress={() => setShowAll((current) => !current)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Text style={styles.toggle}>{showAll ? 'Wys minder' : `Wys alles (${comments.length})`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    empty: { ...typography.bodyRegular, color: colors.textSubtle },
    item: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    text: { ...typography.bodyRegular, color: colors.text },
    toggle: { ...typography.body, color: colors.primary, paddingVertical: 4 },
  });
}

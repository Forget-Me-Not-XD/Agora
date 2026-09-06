// ========== Imports: ==========
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { useThemeColors } from '../../theme/theme';
import { typography } from '../../theme/typography';
import type { PredictionAccuracyItem } from '../../api/analytics';

const BAR_HEIGHT = 10;
const BAR_GAP = 4;
const GROUP_GAP = 16;
const LABEL_WIDTH = 30;

export function PredictionAccuracyBarChart({ items }: { items: PredictionAccuracyItem[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [width, setWidth] = useState(280);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const trackWidth = Math.max(40, width - LABEL_WIDTH - 44);
  const groupHeight = BAR_HEIGHT * 2 + BAR_GAP + GROUP_GAP;
  const svgHeight = items.length * groupHeight;

  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.blue }]} />
          <Text style={styles.legendText}>Voorspel</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Werklik</Text>
        </View>
      </View>

      <View onLayout={onLayout}>
        <Svg width={width} height={svgHeight}>
          {items.map((item, i) => {
            const groupY = i * groupHeight;
            const predictedPct = Math.round(item.predictedFillRate * 100);
            const actualPct = Math.round(item.actualFillRate * 100);
            const predictedW = (Math.min(100, predictedPct) / 100) * trackWidth;
            const actualW = (Math.min(100, actualPct) / 100) * trackWidth;

            return (
              <G key={item.eventId}>
                <SvgText x={0} y={groupY + BAR_HEIGHT} fontSize={11} fill={colors.textSubtle}>
                  {`#${i + 1}`}
                </SvgText>

                <Rect x={LABEL_WIDTH} y={groupY} width={trackWidth} height={BAR_HEIGHT} rx={4} fill={colors.border} />
                <Rect x={LABEL_WIDTH} y={groupY} width={predictedW} height={BAR_HEIGHT} rx={4} fill={colors.blue} />
                <SvgText x={LABEL_WIDTH + trackWidth + 6} y={groupY + BAR_HEIGHT} fontSize={11} fill={colors.text}>
                  {`${predictedPct}%`}
                </SvgText>

                <Rect x={LABEL_WIDTH} y={groupY + BAR_HEIGHT + BAR_GAP} width={trackWidth} height={BAR_HEIGHT} rx={4} fill={colors.border} />
                <Rect x={LABEL_WIDTH} y={groupY + BAR_HEIGHT + BAR_GAP} width={actualW} height={BAR_HEIGHT} rx={4} fill={colors.success} />
                <SvgText x={LABEL_WIDTH + trackWidth + 6} y={groupY + BAR_HEIGHT * 2 + BAR_GAP} fontSize={11} fill={colors.text}>
                  {`${actualPct}%`}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legendList}>
        {items.map((item, i) => (
          <Text key={item.eventId} style={styles.legendListItem} numberOfLines={1}>
            #{i + 1} {item.title}
          </Text>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    legendRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { ...typography.caption, color: colors.textSubtle, fontWeight: '600' },
    legendList: { marginTop: 10, gap: 4 },
    legendListItem: { ...typography.caption, color: colors.textSubtle, fontWeight: '500' },
  });
}

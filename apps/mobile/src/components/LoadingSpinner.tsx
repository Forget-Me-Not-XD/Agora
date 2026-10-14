import { useMemo } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import LottieView from 'lottie-react-native';

// Plaas jou eie Lottie-animasie-JSON hier: apps/mobile/assets/app-loading.json
// (vervang eenvoudig die bestaande plekhouer-lêer op presies dieselfde pad --
// geen kode-verandering nodig nie). Dié een animasie word oral in die app
// gebruik waar inhoud nog laai, sodat die laai-ervaring oral eenders voel.
const ANIMATION = require('../../assets/app-loading.json');

interface Props {
  // Deursnee in dp. Vol-skerm laai-toestande gebruik 'n groter waarde as
  // inlyn kaart-/afdeling-laaitoestande.
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSpinner({ size = 56, style }: Props) {
  const dimStyle = useMemo(() => ({ width: size, height: size }), [size]);
  return (
    <View style={[styles.wrap, style]}>
      <LottieView source={ANIMATION} autoPlay loop style={dimStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

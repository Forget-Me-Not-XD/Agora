import type { TextStyle } from 'react-native';

type TypeStyle = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'letterSpacing'>;

export const typography = {
  display: { fontSize: 30, fontWeight: '900' } as TypeStyle,
  heroStat: { fontSize: 26, fontWeight: '900' } as TypeStyle,
  title: { fontSize: 20, fontWeight: '900' } as TypeStyle,
  subtitle: { fontSize: 17, fontWeight: '800' } as TypeStyle,
  body: { fontSize: 15, fontWeight: '600' } as TypeStyle,
  bodyRegular: { fontSize: 15, fontWeight: '500' } as TypeStyle,
  caption: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 } as TypeStyle,
  micro: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 } as TypeStyle,
} as const;

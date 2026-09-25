import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { typography, type TextVariant } from './typography';
import { useColors } from './use-colors';

type Props = TextProps & {
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
};

export function Text({ variant = 'body', style, ...props }: Props) {
  const palette = useColors();

  return <RNText {...props} style={[typography[variant], { color: palette.text }, style]} />;
}

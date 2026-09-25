import { useColorScheme } from 'react-native';

import { colors, type ColorTokens } from './colors';

export function useColors(): ColorTokens {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}

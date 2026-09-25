import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from './spacing';
import { useColors } from './use-colors';

type Props = {
  children: ReactNode;
};

export function Screen({ children }: Props) {
  const palette = useColors();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        {children}
      </View>
    </SafeAreaView>
  );
}

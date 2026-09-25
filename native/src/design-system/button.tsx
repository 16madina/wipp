import { StyleSheet } from 'react-native';

import { Pressable } from './pressable';
import { radii } from './radii';
import { spacing } from './spacing';
import { Text } from './text';
import { useColors } from './use-colors';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const palette = useColors();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: primary ? palette.accent : palette.surface,
          borderColor: primary ? palette.accent : palette.line,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        variant="label"
        style={{ color: primary ? palette.onAccent : palette.text, fontSize: 15, lineHeight: 18 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
});

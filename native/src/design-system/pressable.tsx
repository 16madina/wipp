import {
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

export function Pressable({ style, ...props }: Props) {
  return (
    <RNPressable
      {...props}
      style={({ pressed }) => [style, pressed ? { opacity: 0.72 } : null]}
    />
  );
}

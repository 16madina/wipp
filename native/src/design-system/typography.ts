import type { TextStyle } from 'react-native';

export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;

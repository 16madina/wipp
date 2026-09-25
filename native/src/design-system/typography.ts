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
  wordmark: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  preview: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;

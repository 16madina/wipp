export type ColorTokens = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
};

export const colors: Record<'light' | 'dark', ColorTokens> = {
  light: {
    background: '#F6F3EE',
    surface: '#FFFCF8',
    text: '#1B1A17',
    muted: '#7A746C',
    line: '#E4DDD4',
    accent: '#2F4C7A',
    onAccent: '#F4F1EB',
  },
  dark: {
    background: '#141311',
    surface: '#1E1C19',
    text: '#F4F1EB',
    muted: '#A39C93',
    line: '#2E2B27',
    accent: '#8EADD4',
    onAccent: '#141311',
  },
};

export type ColorSchemeName = keyof typeof colors;

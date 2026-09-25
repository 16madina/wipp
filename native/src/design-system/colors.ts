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

/** Reference palette for the dark chats surface. */
export const ink = {
  background: '#07090F',
  surface: '#121722',
  text: '#FFFFFF',
  muted: '#8E939C',
  line: '#1C2230',
  yellow: '#FFD83F',
  onYellow: '#1A1408',
  pill: '#161C28',
} as const;

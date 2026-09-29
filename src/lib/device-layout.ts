import { useWindowDimensions } from "react-native";

/** Largeur de référence iPhone (shell web 390, un peu plus large pour le compositeur). */
export const PHONE_MAX_WIDTH = 430;
export const TABLET_MIN = 600;

export function useDeviceLayout() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const tablet = shortest >= TABLET_MIN;
  const contentWidth = tablet ? Math.min(PHONE_MAX_WIDTH, width) : width;
  const compact = contentWidth < 380;
  const icon = compact ? 32 : 36;
  const headerIcon = compact ? 36 : 40;

  function tile(cols: number, hPad = 16, gap = 8) {
    const inner = Math.max(0, contentWidth - hPad * 2);
    return Math.floor((inner - gap * (cols - 1)) / cols);
  }

  return {
    width,
    height,
    tablet,
    contentWidth,
    shortest,
    longest,
    compact,
    icon,
    headerIcon,
    tile,
  };
}

import "../src/lib/crypto-polyfill";
import "../src/lib/alert-web";
import "../src/lib/push/android-call";
import { useEffect } from "react";
import { colors } from "../src/theme";
import { loadAppearance, useAppearance } from "../src/lib/appearance";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { GreatVibes_400Regular } from "@expo-google-fonts/great-vibes";
import { DancingScript_600SemiBold } from "@expo-google-fonts/dancing-script";
import * as SplashScreen from "expo-splash-screen";
import { ShareIntentProvider } from "expo-share-intent";

void SplashScreen.preventAutoHideAsync();
void loadAppearance();

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    GreatVibes_400Regular,
    DancingScript_600SemiBold,
  });

  const ready = useAppearance((s) => s.ready);
  const theme = useAppearance((s) => s.theme);

  useEffect(() => {
    if (loaded && ready) void SplashScreen.hideAsync();
  }, [loaded, ready]);

  if (!loaded || !ready) return <View style={{ flex: 1, backgroundColor: "#02081e" }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShareIntentProvider options={{ scheme: "wipp", resetOnBackground: false }}>
          <StatusBar style={theme === "light" ? "dark" : "light"} />
          <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: colors.bg } }} />
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

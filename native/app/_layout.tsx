import "../src/lib/crypto-polyfill";
import "../src/lib/alert-web";
import "../src/lib/push/android-call";
import { useEffect } from "react";
import { colors } from "../src/theme";
import { loadAppearance, useAppearance } from "../src/lib/appearance";
import { loadChatThemes } from "../src/lib/chat-themes";
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
import { useState } from "react";
import { readLanguage } from "../src/lib/language-pref";
import { setTrLanguage } from "../src/lib/tr";
import { useWippStore } from "../src/lib/store";

void SplashScreen.preventAutoHideAsync();
void loadAppearance();
loadChatThemes();

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

  // The saved language is read before the first screen, so nothing flashes in the other language.
  const [langReady, setLangReady] = useState(false);
  const language = useWippStore((s) => s.language);
  useEffect(() => {
    void readLanguage().then((saved) => {
      if (saved) {
        setTrLanguage(saved);
        useWippStore.setState({ language: saved });
      }
      setLangReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded && ready && langReady) void SplashScreen.hideAsync();
  }, [loaded, ready, langReady]);

  if (!loaded || !ready || !langReady) return <View style={{ flex: 1, backgroundColor: "#02081e" }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShareIntentProvider options={{ scheme: "wipp", resetOnBackground: false }}>
          <StatusBar style={theme === "light" ? "dark" : "light"} />
          {/* key: changing the language redraws every screen, so each text is read again in the new language. */}
          <Stack key={language} screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: colors.bg } }} />
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

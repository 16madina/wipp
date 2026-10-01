import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SurpriseReveal } from "../src/components/SurpriseReveal";
import { SurpriseAnimOverlay } from "../src/components/SurpriseAnimOverlay";
import { Header, Press } from "../src/components/ui";
import { colors } from "../src/theme";

/** Local receiver preview: no message is sent and no backend data is changed. */
export default function SurprisePreview() {
  const router = useRouter();
  const [reset, setReset] = useState(0);
  const [playing, setPlaying] = useState<{ id: string; n: number } | null>(null);
  const sequence = useRef(0);
  if (!__DEV__) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 430 }}>
        <Header title="Surprise reçue · aperçu local" onBack={() => router.replace("/")} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 48 }}>
          <View style={{ alignSelf: "flex-start", padding: 12, borderRadius: 16, backgroundColor: colors.bubbleThem }}>
            <Text style={{ color: colors.fg, fontSize: 16 }}>J’ai une petite surprise pour toi…</Text>
          </View>
          <SurpriseReveal
            key={reset}
            surprise={{ id: "local-love-preview", message: "Tu rends mes journées plus belles. ♥", surpriseType: "scratch", designId: "amour", animationId: "amour-pluie-cristal", surpriseOptions: {}, time: "", mine: false }}
            onPlayAnimation={(id) => setPlaying({ id, n: ++sequence.current })}
          />
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: 14 }}>Ouvre le cadeau, puis gratte la carte pour lire le message et découvrir l’animation.</Text>
          <Press accessibilityLabel="Recommencer la démonstration" onPress={() => { setPlaying(null); setReset((n) => n + 1); }} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.accent, fontSize: 15 }}>Recommencer</Text>
          </Press>
        </ScrollView>
        <SurpriseAnimOverlay centered animationId={playing?.id ?? null} playKey={playing?.n ?? 0} onDone={() => setPlaying(null)} />
      </View>
    </SafeAreaView>
  );
}

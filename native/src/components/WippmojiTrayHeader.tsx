import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { useWippStore } from "../lib/store";
import type { StickerDef } from "../lib/stickers";
import { tr } from "../lib/tr";
import { myWippmojis } from "../lib/wippmoji";
import { colors } from "../theme";
import { Press } from "./ui";
import { WippSticker } from "./WippSticker";

/** Top of the Wippmoji tab: entry to Wippmoji Studio, then my own Wippmojis (sent like any sticker). */
export function WippmojiTrayHeader({ onPick, onOpenStudio }: { onPick: (s: StickerDef) => void; onOpenStudio: () => void }) {
  const push = useWippStore((s) => s.push);
  const [mine, setMine] = useState<StickerDef[]>([]);
  useEffect(() => {
    void myWippmojis().then(setMine).catch(() => undefined);
  }, []);
  return (
    <View style={{ paddingHorizontal: 4, paddingBottom: 8, gap: 8 }}>
      <Press
        accessibilityLabel={tr("WIPP Studio")}
        onPress={() => {
          onOpenStudio();
          push({ name: "wippmoji-studio" });
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine }}
      >
        <Sparkles size={22} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 14, fontFamily: "Inter_700Bold" }}>{tr("Crée tes Wippmojis")}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Ton visage. Tes émotions. Tes Wippmojis.")}</Text>
        </View>
        <ChevronRight size={18} color={colors.accent} />
      </Press>
      {mine.length ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 12, fontFamily: "Inter_600SemiBold", marginLeft: 2 }}>{tr("Mes Wippmojis")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {mine.map((s) => (
              <Press key={s.id} accessibilityLabel={s.labelFr} onPress={() => onPick(s)} style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden" }}>
                <WippSticker id={s.id} size={64} still />
              </Press>
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

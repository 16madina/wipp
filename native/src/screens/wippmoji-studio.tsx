import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Camera, Check, RotateCcw, Sparkles } from "lucide-react-native";
import { Btn, GlassHeader, Header, Press, ScreenRoot } from "../components/ui";
import { WippSticker } from "../components/WippSticker";
import { useWippStore } from "../lib/store";
import { tr } from "../lib/tr";
import {
  createWippmojiAvatar,
  createWippmojiPack,
  forgetMyWippmojis,
  preparePhoto,
  wippmojiLibrary,
  wippmojiPack,
  wippmojiStatus,
  wippmojiStickerDef,
  type WippmojiAvatar,
  type WippmojiPack,
  type WippmojiStatus,
  type WippmojiStyle,
} from "../lib/wippmoji";
import { colors, fgA } from "../theme";

type Step = "home" | "consent" | "photo" | "making-avatar" | "avatar" | "expressions" | "making-pack" | "pack";

const STYLES: { id: WippmojiStyle; title: string; sub: string }[] = [
  { id: "realistic", get title() { return tr("Réaliste"); }, get sub() { return tr("Ton vrai visage, tes vraies expressions"); } },
  { id: "cartoon", get title() { return tr("Cartoon 3D"); }, get sub() { return tr("Ton personnage façon dessin animé"); } },
];

function errorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : tr("Une erreur est survenue. Réessaie.");
}

/** Wippmoji Studio: your face becomes a pack of 10 animated stickers. */
export function WippmojiStudioScreen() {
  const pop = useWippStore((s) => s.pop);
  const [step, setStep] = useState<Step>("home");
  const [status, setStatus] = useState<WippmojiStatus | null>(null);
  const [packs, setPacks] = useState<WippmojiPack[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [style, setStyle] = useState<WippmojiStyle>("realistic");
  const [avatar, setAvatar] = useState<WippmojiAvatar | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [language, setLanguage] = useState<"fr" | "en" | null>("fr");
  const [pack, setPack] = useState<WippmojiPack | null>(null);
  const [error, setError] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void wippmojiStatus().then(setStatus).catch(() => setStatus({ allowed: false, provider: "mock", packSize: 10, expressions: [] }));
    void wippmojiLibrary().then((l) => setPacks(l.packs)).catch(() => undefined);
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, []);

  const packSize = status?.packSize ?? 10;

  async function pick(camera: boolean) {
    setError("");
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(camera ? tr("Autorise l’appareil photo dans Réglages.") : tr("Autorise l’accès aux photos dans Réglages."));
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: false, quality: 0.9, exif: false };
    const res = camera ? await ImagePicker.launchCameraAsync({ ...opts, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]?.uri) setPhotoUri(res.assets[0].uri);
  }

  async function makeAvatar() {
    if (!photoUri) return;
    setError("");
    setStep("making-avatar");
    try {
      const made = await createWippmojiAvatar(await preparePhoto(photoUri), style);
      setAvatar(made);
      setStep("avatar");
    } catch (err) {
      setError(errorMessage(err));
      setStep("photo");
    }
  }

  function follow(p: WippmojiPack) {
    setPack(p);
    if (poll.current) clearInterval(poll.current);
    if (p.status !== "generating") {
      forgetMyWippmojis();
      setStep("pack");
      return;
    }
    poll.current = setInterval(() => {
      void wippmojiPack(p.id)
        .then((next) => {
          setPack(next);
          if (next.status !== "generating") {
            if (poll.current) clearInterval(poll.current);
            forgetMyWippmojis();
            setPacks((list) => [next, ...list.filter((x) => x.id !== next.id)]);
            setStep("pack");
          }
        })
        .catch(() => undefined);
    }, 6000);
  }

  async function makePack() {
    if (!avatar || chosen.length !== packSize) return;
    setError("");
    setStep("making-pack");
    try {
      follow(await createWippmojiPack(avatar.id, chosen, language));
    } catch (err) {
      setError(errorMessage(err));
      setStep("expressions");
    }
  }

  const back = () => {
    if (step === "home" || step === "making-avatar" || step === "making-pack") pop();
    else if (step === "consent" || step === "pack") setStep("home");
    else if (step === "photo") setStep("consent");
    else if (step === "avatar") setStep("photo");
    else if (step === "expressions") setStep("avatar");
  };

  const card = { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hair, padding: 16 } as const;

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={tr("Wippmoji Studio")} subtitle={tr("Ton visage. Tes émotions. Tes Wippmojis.")} onBack={back} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text> : null}

        {step === "home" ? (
          <>
            <View style={[card, { alignItems: "center", gap: 10, paddingVertical: 24 }]}>
              <Sparkles size={34} color={colors.accent} />
              <Text style={{ color: colors.fg, fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" }}>{tr("Tes propres stickers animés")}</Text>
              <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}>
                {tr("Une photo de toi suffit : WIPP crée ton personnage, puis 10 stickers animés avec tes expressions, à envoyer dans tes conversations.")}
              </Text>
              {status && !status.allowed ? (
                <Text style={{ color: colors.accent, fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 6 }}>{tr("Bientôt disponible")}</Text>
              ) : (
                <Btn label={tr("Créer mes Wippmojis")} disabled={!status} onPress={() => setStep("consent")} style={{ alignSelf: "stretch", marginTop: 8 }} />
              )}
              {status?.provider === "mock" && status.allowed ? (
                <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>{tr("Mode essai : les images sont des exemples, rien n’est facturé.")}</Text>
              ) : null}
            </View>
            <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{tr("Mes Wippmojis")}</Text>
            {packs.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: 14 }}>{tr("Tu n’as pas encore de Wippmojis.")}</Text>
            ) : (
              packs.map((p) => (
                <View key={p.id} style={card}>
                  <StickerGrid pack={p} />
                </View>
              ))
            )}
          </>
        ) : null}

        {step === "consent" ? (
          <View style={[card, { gap: 12 }]}>
            <Text style={{ color: colors.fg, fontSize: 18, fontFamily: "Inter_700Bold" }}>{tr("Avant de commencer")}</Text>
            <Text style={{ color: fgA(0.8), fontSize: 14, lineHeight: 21 }}>
              {tr("Ta photo est envoyée à xAI (Grok Imagine), le service d’intelligence artificielle qui crée ton personnage et tes animations. WIPP ne garde pas ta photo d’origine : seuls ton personnage et tes stickers sont conservés, et tu peux les supprimer à tout moment.")}
            </Text>
            <Text style={{ color: fgA(0.8), fontSize: 14, lineHeight: 21 }}>
              {tr("Utilise uniquement une photo de toi. Créer des stickers d’une autre personne sans son accord est interdit et peut être signalé.")}
            </Text>
            <Press onPress={() => setAgreed((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: agreed ? colors.accent : colors.dashed, backgroundColor: agreed ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                {agreed ? <Check size={16} color={colors.accentFg} /> : null}
              </View>
              <Text style={{ flex: 1, color: colors.fg, fontSize: 14, lineHeight: 20 }}>{tr("C’est bien moi sur la photo, et j’accepte qu’elle soit envoyée à xAI pour créer mes Wippmojis.")}</Text>
            </Press>
            <Btn label={tr("Continuer")} disabled={!agreed} onPress={() => setStep("photo")} />
          </View>
        ) : null}

        {step === "photo" ? (
          <>
            <View style={[card, { alignItems: "center", gap: 12 }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 240, height: 300, borderRadius: 18 }} contentFit="contain" />
              ) : (
                <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                  <Camera size={42} color={colors.muted} />
                </View>
              )}
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>{tr("De face, bien éclairé, le visage dégagé.")}</Text>
              <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
                <Btn label={tr("Prendre un selfie")} variant="secondary" onPress={() => void pick(true)} style={{ flex: 1 }} />
                <Btn label={tr("Ma galerie")} variant="secondary" onPress={() => void pick(false)} style={{ flex: 1 }} />
              </View>
            </View>
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold" }}>{tr("Ton style")}</Text>
            {STYLES.map((s) => (
              <Press key={s.id} onPress={() => setStyle(s.id)} style={[card, { flexDirection: "row", alignItems: "center", gap: 12, borderColor: style === s.id ? colors.accent : colors.hair, borderWidth: style === s.id ? 2 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{s.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{s.sub}</Text>
                </View>
                {style === s.id ? <Check size={20} color={colors.accent} /> : null}
              </Press>
            ))}
            <Btn label={tr("Créer mon personnage")} disabled={!photoUri} onPress={() => void makeAvatar()} />
          </>
        ) : null}

        {step === "making-avatar" || step === "making-pack" ? (
          <View style={[card, { alignItems: "center", gap: 14, paddingVertical: 28 }]}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
              {step === "making-avatar" ? tr("Création de ton personnage…") : tr("Création de tes Wippmojis…")}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>
              {step === "making-avatar" ? tr("Environ 20 secondes.") : tr("Quelques minutes. Tu peux quitter cet écran : tes stickers arriveront dans « Mes Wippmojis ».")}
            </Text>
            {step === "making-pack" && pack ? (
              <>
                <Text style={{ color: colors.accent, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  {tr("{0} sur {1} prêts", pack.stickers.filter((s) => s.status === "ready").length, pack.stickers.length)}
                </Text>
                <StickerGrid pack={pack} />
              </>
            ) : null}
          </View>
        ) : null}

        {step === "avatar" && avatar ? (
          <View style={[card, { alignItems: "center", gap: 12 }]}>
            <Image source={{ uri: avatar.referenceUrl }} style={{ width: 240, height: 240, borderRadius: 18 }} contentFit="contain" />
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{tr("Voici ton personnage")}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>{tr("Le fond vert disparaîtra sur tes stickers.")}</Text>
            <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
              <Btn label={tr("Recommencer")} variant="secondary" onPress={() => setStep("photo")} style={{ flex: 1 }} />
              <Btn label={tr("C’est moi !")} onPress={() => setStep("expressions")} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {step === "expressions" && status ? (
          <>
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold" }}>
              {tr("Choisis {0} expressions ({1}/{0})", packSize, chosen.length)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {status.expressions.map((e) => {
                const on = chosen.includes(e.id);
                return (
                  <Press
                    key={e.id}
                    onPress={() => setChosen((list) => (on ? list.filter((x) => x !== e.id) : list.length < packSize ? [...list, e.id] : list))}
                    style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? colors.accent : colors.chip, borderWidth: 1, borderColor: on ? colors.accent : colors.hair }}
                  >
                    <Text style={{ color: on ? colors.accentFg : colors.fg, fontSize: 14 }}>{e.fr}</Text>
                  </Press>
                );
              })}
            </View>
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 6 }}>{tr("Texte sur les stickers")}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([["fr", tr("Français")], ["en", "English"], [null, tr("Sans texte")]] as const).map(([id, label]) => (
                <Press key={String(id)} onPress={() => setLanguage(id)} style={{ flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: language === id ? colors.accent : colors.chip }}>
                  <Text style={{ color: language === id ? colors.accentFg : colors.fg, fontSize: 14 }}>{label}</Text>
                </Press>
              ))}
            </View>
            <Btn label={tr("Créer mes {0} Wippmojis", packSize)} disabled={chosen.length !== packSize} onPress={() => void makePack()} />
          </>
        ) : null}

        {step === "pack" && pack ? (
          <View style={[card, { gap: 12 }]}>
            <Text style={{ color: colors.fg, fontSize: 18, fontFamily: "Inter_700Bold" }}>
              {pack.status === "ready" ? tr("Tes Wippmojis sont prêts !") : tr("Une partie de tes Wippmojis est prête")}
            </Text>
            <StickerGrid pack={pack} />
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{tr("Retrouve-les dans le panneau des stickers, onglet Wippmoji, pour les envoyer.")}</Text>
            <Btn label={tr("Terminé")} onPress={() => setStep("home")} />
          </View>
        ) : null}
      </ScrollView>
    </ScreenRoot>
  );
}

/** The stickers of a pack, animated one after the other is too heavy: each shows its first image until it is ready. */
function StickerGrid({ pack }: { pack: WippmojiPack }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {pack.stickers.map((s) => {
        const def = wippmojiStickerDef(s);
        return (
          <View key={s.id} style={{ width: 92, alignItems: "center", gap: 4 }}>
            <View style={{ width: 84, height: 84, borderRadius: 14, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {def ? (
                <WippSticker id={def.id} size={84} />
              ) : s.status === "failed" ? (
                <RotateCcw size={22} color={colors.muted} />
              ) : (
                <ActivityIndicator color={colors.accent} />
              )}
            </View>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>{s.label ?? ""}</Text>
          </View>
        );
      })}
    </View>
  );
}


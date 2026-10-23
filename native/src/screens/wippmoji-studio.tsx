import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Animated, PanResponder, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Camera, Check, ChevronLeft, Crown, ImageIcon, Lightbulb, Minus, Plus, RotateCcw, Smile, Sparkles, Star } from "lucide-react-native";
import { Press } from "../components/ui";
import { WippSticker } from "../components/WippSticker";
import { WippMomentOverlay } from "../components/WippMomentOverlay";
import { useWippStore } from "../lib/store";
import { tr, trLang } from "../lib/tr";
import {
  createWippmojiAvatar,
  createWippmojiPack,
  forgetMyWippmojis,
  isWippPopId,
  preparePhoto,
  wippmojiLibrary,
  wippmojiPack,
  wippmojiStatus,
  wippmojiStickerDef,
  type PhotoCrop,
  type WippmojiAvatar,
  type WippmojiFraming,
  type WippmojiKind,
  type WippmojiPack,
  type WippmojiStatus,
  type WippmojiStyle,
} from "../lib/wippmoji";
import { accentA, bgA, colors, fgA } from "../theme";

/* Demo illustrations (examples only — never presented as the user's own creation). */
const ART = {
  hero: require("../../assets/wippmoji-studio/hero.jpg"),
  photoToCharacter: require("../../assets/wippmoji-studio/photo-to-character.jpg"),
  cartoon: require("../../assets/wippmoji-studio/style-cartoon.jpg"),
  realistic: require("../../assets/wippmoji-studio/style-realistic.jpg"),
  preview: require("../../assets/wippmoji-studio/preview.jpg"),
  packExpressions: require("../../assets/wippmoji-studio/pack-expressions.jpg"),
  packWippPop: require("../../assets/wippmoji-studio/pack-wipppop.jpg"),
  packUltimate: require("../../assets/wippmoji-studio/pack-ultimate.jpg"),
  /* Pack covers: WIPP's own Wippie stickers and Moments characters. */
  packs: {
    moji5: require("../../assets/wippmoji-studio/pack-moji-5.png"),
    moji10: require("../../assets/wippmoji-studio/pack-moji-10.png"),
    pop3: require("../../assets/wippmoji-studio/pack-pop-3.png"),
    pop7: require("../../assets/wippmoji-studio/pack-pop-7.png"),
  },
};
const EXPRESSION_ART: Record<string, number> = {
  mdr: require("../../assets/wippmoji-studio/expr-mdr.jpg"),
  bisous: require("../../assets/wippmoji-studio/expr-bisous.jpg"),
  "je-taime": require("../../assets/wippmoji-studio/expr-je-taime.jpg"),
  coucou: require("../../assets/wippmoji-studio/expr-coucou.jpg"),
  merci: require("../../assets/wippmoji-studio/expr-merci.jpg"),
  bravo: require("../../assets/wippmoji-studio/expr-bravo.jpg"),
  pfff: require("../../assets/wippmoji-studio/expr-pfff.jpg"),
  "oh-non": require("../../assets/wippmoji-studio/expr-oh-non.jpg"),
  "bonne-nuit": require("../../assets/wippmoji-studio/expr-bonne-nuit.jpg"),
  waouh: require("../../assets/wippmoji-studio/expr-waouh.jpg"),
  desole: require("../../assets/wippmoji-studio/expr-desole.jpg"),
  ok: require("../../assets/wippmoji-studio/expr-ok.jpg"),
};

/* Examples under the packs. Wippmoji: stickers made by the WIPP team in the Studio. WippPop: WIPP's own full-screen animations. */
const MOJI_EXAMPLES = ["wms_17e3489145504988bc53", "wms_4010bdbc4062400b9228", "wms_41cdf024fbdf45fe9570", "wms_bea069660db34da1acc2"].map(
  (f) => `wm:u_16a91279cf7c26e1d7b64bdd/wma_3cf91e77db1a43f09c86/${f}.mp4`,
);
/* WippPop look = the WIPP Moments (3D chibi character, effects around): WIPP's own Moments are shown as examples. */
const POP_EXAMPLES = [
  { id: "moment-01", label: () => tr("Salut") },
  { id: "moment-03", label: () => tr("Cœurs") },
  { id: "moment-02", label: () => tr("MDR") },
];

type Step = "intro" | "kind" | "photo" | "crop" | "style" | "making-avatar" | "preview" | "packs" | "expressions" | "making-pack" | "done";
type Photo = { uri: string; width: number; height: number };
type StepState = "done" | "active" | "todo";

const FRAMINGS: { id: WippmojiFraming; ratio: number; zoom: number; lift: number; label: () => string }[] = [
  { id: "face", ratio: 1, zoom: 1.7, lift: 0.75, label: () => tr("Visage") },
  { id: "bust", ratio: 4 / 5, zoom: 1.2, lift: 0.6, label: () => tr("Buste") },
  { id: "full", ratio: 3 / 5, zoom: 1, lift: 0, label: () => tr("Taille entière") },
];


function errorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : tr("Une erreur est survenue. Réessaie.");
}

/** WIPP Studio: your photo becomes your character, then Wippmoji stickers or WippPop full-screen animations. */
export function WippmojiStudioScreen() {
  const leave = useWippStore((s) => s.pop);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("intro");
  const [kind, setKind] = useState<WippmojiKind>("moji");
  const [popSize, setPopSize] = useState(3);
  const [mojiSize, setMojiSize] = useState(10);
  const [exampleStyle, setExampleStyle] = useState<WippmojiStyle>("cartoon");
  const [demoPop, setDemoPop] = useState<{ uri: string; n: number } | null>(null);
  const [status, setStatus] = useState<WippmojiStatus | null>(null);
  const [packs, setPacks] = useState<WippmojiPack[]>([]);
  const [avatars, setAvatars] = useState<WippmojiAvatar[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [framing, setFraming] = useState<WippmojiFraming>("bust");
  const [crop, setCrop] = useState<PhotoCrop | null>(null);
  const [style, setStyle] = useState<WippmojiStyle>("realistic");
  const [avatar, setAvatar] = useState<WippmojiAvatar | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [choiceCat, setChoiceCat] = useState("tous");
  const [language, setLanguage] = useState<"fr" | "en" | null>(trLang() === "en" ? "en" : "fr");
  const [pack, setPack] = useState<WippmojiPack | null>(null);
  const [error, setError] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const refreshLibrary = () =>
    wippmojiLibrary()
      .then((l) => {
        setPacks(l.packs);
        setAvatars(l.avatars);
      })
      .catch(() => undefined);

  useEffect(() => {
    void wippmojiStatus().then(setStatus).catch(() => setStatus({ allowed: false, provider: "mock", packSize: 10, expressions: [] }));
    void refreshLibrary();
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, []);

  const go = (next: Step) => {
    setError("");
    fade.setValue(0);
    setStep(next);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const pop = kind === "pop";
  const packSize = pop ? popSize : mojiSize;
  const charactersLeft = status?.charactersLeft ? status.charactersLeft[kind] : null;
  const choices = pop ? (status?.pop?.animations ?? []) : (status?.expressions ?? []);

  async function pick(camera: boolean) {
    setError("");
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(camera ? tr("Autorise l’appareil photo dans Réglages.") : tr("Autorise l’accès aux photos dans Réglages."));
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: false, quality: 0.9, exif: false };
    const res = camera ? await ImagePicker.launchCameraAsync({ ...opts, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync(opts);
    const a = res.canceled ? null : res.assets[0];
    if (!a?.uri) return;
    let size = { width: a.width, height: a.height };
    if (!size.width || !size.height) {
      // Some web pickers do not report the size.
      size = await Image.loadAsync(a.uri).then((img) => ({ width: img.width, height: img.height })).catch(() => ({ width: 1000, height: 1000 }));
    }
    setPhoto({ uri: a.uri, ...size });
    // A tall photo is most likely a full-body one.
    setFraming(pop || size.height / size.width > 1.45 ? "full" : "bust");
    go("crop");
  }

  async function makeAvatar() {
    if (!photo) return;
    go("making-avatar");
    try {
      const made = await createWippmojiAvatar(await preparePhoto(photo.uri, crop ?? undefined), pop ? "cartoon" : style, framing, kind);
      setAvatar(made);
      setStatus((st) => (st?.charactersLeft ? { ...st, charactersLeft: { ...st.charactersLeft, [kind]: Math.max(0, st.charactersLeft[kind] - 1) } } : st));
      setAvatars((list) => [made, ...list.filter((x) => x.id !== made.id)]);
      go("preview");
    } catch (err) {
      go("crop");
      setError(errorMessage(err));
    }
  }

  function follow(p: WippmojiPack) {
    setPack(p);
    if (poll.current) clearInterval(poll.current);
    if (p.status !== "generating") {
      forgetMyWippmojis();
      go("done");
      return;
    }
    go("making-pack");
    poll.current = setInterval(() => {
      void wippmojiPack(p.id)
        .then((next) => {
          setPack(next);
          if (next.status !== "generating") {
            if (poll.current) clearInterval(poll.current);
            forgetMyWippmojis();
            setPacks((list) => [next, ...list.filter((x) => x.id !== next.id)]);
            go("done");
          }
        })
        .catch(() => undefined);
    }, 6000);
  }

  async function makePack() {
    if (!avatar || chosen.length !== packSize) return;
    setPack(null);
    go("making-pack");
    try {
      follow(await createWippmojiPack(avatar.id, chosen, language, pop ? "wipppop" : "expressions"));
    } catch (err) {
      go("expressions");
      setError(errorMessage(err));
    }
  }

  const back = () => {
    if (poll.current && step === "making-pack") clearInterval(poll.current);
    const prev: Partial<Record<Step, Step>> = { packs: "intro", style: "packs", photo: pop ? "packs" : "style", crop: "photo", preview: photo ? "crop" : "photo", expressions: "preview", done: "intro" };
    const to = prev[step];
    if (!to) leave();
    else go(to);
  };

  const flow: Step[] = pop ? ["photo", "crop", "preview"] : ["style", "photo", "crop", "preview"];
  const flowIndex = flow.indexOf(step);
  const generating = step === "making-pack" || step === "making-avatar";

  const packSteps = (): { label: string; state: StepState }[] => {
    const pending = pack ? pack.stickers.some((s) => s.status === "pending") : true;
    const finished = !!pack && pack.status !== "generating";
    return [
      { label: tr("Génération du personnage"), state: "done" },
      { label: tr("Création des animations"), state: pending ? "active" : "done" },
      { label: tr("Optimisation des fichiers"), state: pending ? "todo" : finished ? "done" : "active" },
      { label: tr("Finalisation de ton pack"), state: finished ? "done" : pending ? "todo" : "active" },
    ];
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {step !== "intro" ? (
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
          {step !== "making-avatar" ? (
            <Press onPress={back} hitSlop={10} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={26} color={colors.fg} />
            </Press>
          ) : (
            <View style={{ width: 36 }} />
          )}
          {flowIndex >= 0 ? (
            <>
              <ProgressBar value={(flowIndex + 1) / flow.length} />
              <Text style={{ color: colors.muted, fontSize: 13, width: 36, textAlign: "right" }}>
                {flowIndex + 1}/{flow.length}
              </Text>
            </>
          ) : step === "expressions" ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_700Bold" }}>{pop ? tr("WippPop") : tr("Wippmoji")}</Text>
                <View style={{ marginTop: 6, flexDirection: "row" }}>
                  <ProgressBar value={chosen.length / packSize} />
                </View>
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, width: 44, textAlign: "right" }}>
                {chosen.length}/{packSize}
              </Text>
            </>
          ) : (
            <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold", textAlign: generating ? "center" : "left" }}>
              {generating ? tr("Génération en cours") : tr("WIPP Studio")}
            </Text>
          )}
          {generating ? <View style={{ width: 36 }} /> : null}
        </View>
      ) : null}

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        {step === "intro" ? (
          <Intro status={status} packs={packs} onBack={leave} onStart={(k?: WippmojiKind) => { if (k) setKind(k); go("packs"); }} onOpenPack={follow} onPlay={(id) => setDemoPop((d) => ({ uri: id, n: (d?.n ?? 0) + 1 }))} topInset={insets.top} bottomInset={insets.bottom} />
        ) : null}

        {step === "photo" ? (
          <Page bottomInset={insets.bottom} error={error} footer={null}>
            <Title title={tr("Ajoute ta photo")} sub={tr("Utilise un selfie, une photo du visage ou une photo en pied.")} />
            {avatars.some((x) => (x.kind ?? "moji") === kind && (pop || x.style === style)) ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_700Bold" }}>{tr("Utiliser un personnage déjà créé")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {avatars
                    .filter((x) => (x.kind ?? "moji") === kind && (pop || x.style === style))
                    .map((x) => (
                      <Press
                        key={x.id}
                        accessibilityLabel={tr("Utiliser ce personnage")}
                        onPress={() => {
                          setAvatar(x);
                          go("preview");
                        }}
                        style={{ width: 78, height: 78, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair }}
                      >
                        <Image source={{ uri: x.referenceUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" contentPosition="top" />
                      </Press>
                    ))}
                </ScrollView>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Ou ajoute une nouvelle photo :")}</Text>
              </View>
            ) : null}
            <Press
              onPress={() => (agreed ? void pick(false) : setError(tr("Coche d’abord la case ci-dessous.")))}
              style={{ borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, padding: 16, alignItems: "center", gap: 8 }}
            >
              <Image source={ART.photoToCharacter} style={{ width: "100%", aspectRatio: 214 / 222, borderRadius: 16 }} contentFit="cover" />
              <View style={{ marginTop: -40, width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.surface }}>
                <Camera size={26} color={colors.accentFg} />
              </View>
              <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{tr("Ajouter une photo")}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 18 }}>{tr("Appuie pour choisir une photo ou prends une photo maintenant.")}</Text>
              <Text style={{ color: colors.muted, fontSize: 10, opacity: 0.7 }}>{tr("Illustration d’exemple")}</Text>
            </Press>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <SourceButton icon={<ImageIcon size={24} color={colors.fg} />} label={tr("Galerie")} disabled={!agreed} onPress={() => void pick(false)} />
              <SourceButton icon={<Camera size={24} color={colors.fg} />} label={tr("Appareil photo")} disabled={!agreed} onPress={() => void pick(true)} />
            </View>
            <Press
              onPress={() => {
                setAgreed((v) => !v);
                setError("");
              }}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: agreed ? colors.accent : colors.hair }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: agreed ? colors.accent : colors.muted, backgroundColor: agreed ? colors.accent : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                {agreed ? <Check size={14} color={colors.accentFg} /> : null}
              </View>
              <Text style={{ flex: 1, color: fgA(0.85), fontSize: 13, lineHeight: 19 }}>
                {tr("C’est bien moi sur la photo. J’accepte qu’elle soit envoyée à xAI (Grok Imagine) pour créer mon personnage. WIPP ne garde pas ma photo d’origine.")}
              </Text>
            </Press>
          </Page>
        ) : null}

        {step === "crop" && photo ? (
          <Page bottomInset={insets.bottom} error={error} footer={<MainButton label={tr("Continuer")} onPress={() => void makeAvatar()} disabled={!crop} />}>
            <Title title={tr("Recadre ta photo")} sub={tr("Positionne et ajuste la zone pour un meilleur résultat.")} />
            <Cropper photo={photo} framing={framing} onCrop={setCrop} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              {FRAMINGS.map((f) => {
                const on = framing === f.id;
                return (
                  <Press
                    key={f.id}
                    onPress={() => setFraming(f.id)}
                    style={{ flex: 1, height: 86, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: on ? accentA(0.12) : colors.surface, borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.hair }}
                  >
                    <View style={{ width: f.id === "face" ? 26 : f.id === "bust" ? 22 : 16, height: 30, borderRadius: 5, borderWidth: 2, borderColor: on ? colors.accent : colors.muted }} />
                    <Text style={{ color: on ? colors.accent : colors.muted, fontSize: 12, fontFamily: on ? "Inter_600SemiBold" : undefined }}>{f.label()}</Text>
                  </Press>
                );
              })}
            </View>
          </Page>
        ) : null}

        {step === "style" ? (
          <Page bottomInset={insets.bottom} error={error} footer={<MainButton label={tr("Continuer")} onPress={() => go("photo")} />}>
            <Title title={tr("Choisis ton style")} sub={tr("Deux rendus uniques, basés sur ta photo.")} />
            <StyleCard art={ART.cartoon} title={tr("Cartoon 3D")} sub={tr("Un personnage façon dessin animé, fun et expressif.")} on={style === "cartoon"} onPress={() => setStyle("cartoon")} />
            <StyleCard art={ART.realistic} title={tr("Réaliste")} sub={tr("Ton vrai visage, des expressions naturelles.")} on={style === "realistic"} onPress={() => setStyle("realistic")} />
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>{tr("Illustrations d’exemple. Ton personnage sera créé à partir de ta photo.")}</Text>
          </Page>
        ) : null}

        {step === "making-avatar" ? (
          <Generation
            image={photo ? { uri: photo.uri } : ART.preview}
            title={tr("Création de ton personnage…")}
            progress={null}
            steps={[
              { label: tr("Génération du personnage"), state: "active" },
              { label: tr("Création des animations"), state: "todo" },
              { label: tr("Optimisation des fichiers"), state: "todo" },
              { label: tr("Finalisation de ton pack"), state: "todo" },
            ]}
            note={tr("Environ 20 à 40 secondes.")}
            bottomInset={insets.bottom}
          />
        ) : null}

        {step === "preview" && avatar ? (
          <Page
            bottomInset={insets.bottom}
            error={error}
            tallFooter
            footer={
              <View style={{ gap: 10 }}>
                <MainButton label={charactersLeft === null ? tr("Recommencer") : tr("Recommencer ({0} restant)", charactersLeft)} disabled={charactersLeft === 0} variant="secondary" icon={<RotateCcw size={18} color={colors.fg} />} onPress={() => go(photo ? "crop" : "photo")} />
                <MainButton label={tr("Valider mon personnage")} icon={<Check size={18} color={colors.accentFg} />} onPress={() => { setChosen([]); go("expressions"); }} />
              </View>
            }
          >
            <Title title={pop ? tr("Aperçu de ton WippPop") : tr("Aperçu de ton Wippmoji")} sub={tr("Voici ton personnage ! Il sera utilisé pour toutes tes créations.")} />
            <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, alignItems: "center", paddingVertical: 12 }}>
              <Image source={{ uri: avatar.referenceUrl }} style={{ width: "88%", aspectRatio: 1 }} contentFit="contain" transition={200} />
              <View style={{ position: "absolute", top: 14, left: 16 }}>
                <Sparkles size={20} color={colors.accent} />
              </View>
              <View style={{ position: "absolute", bottom: 18, right: 18 }}>
                <Sparkles size={16} color={colors.accent} />
              </View>
            </View>
            {avatars.filter((a) => (a.kind ?? "moji") === kind).length > 1 ? (
              <>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Tes personnages créés : touche pour choisir")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {avatars.filter((a) => (a.kind ?? "moji") === kind).map((a) => (
                    <Press key={a.id} onPress={() => setAvatar(a)} style={{ width: 70, height: 70, borderRadius: 14, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 2, borderColor: a.id === avatar.id ? colors.accent : colors.hair }}>
                      <Image source={{ uri: a.referenceUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    </Press>
                  ))}
                </ScrollView>
              </>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>{tr("Le fond vert disparaîtra sur tes stickers.")}</Text>
            )}
          </Page>
        ) : null}

        {step === "packs" ? (
          <Page bottomInset={insets.bottom} error={error} footer={null}>
            <Tabs
              value={kind}
              options={[
                ["moji", tr("Wippmoji")],
                ["pop", tr("WippPop")],
              ]}
              onChange={(k) => setKind(k as WippmojiKind)}
            />
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}>
              {pop ? tr("De grandes animations avec ton personnage cartoon, qui traversent l’écran de tes amis.") : tr("Des stickers animés à ton image, à envoyer dans tes conversations.")}
            </Text>
            {(pop ? [3, 7] : [5, 10]).map((n) => (
              <PackCard
                key={n}
                art={pop ? (n === 3 ? ART.packs.pop3 : ART.packs.pop7) : n === 5 ? ART.packs.moji5 : ART.packs.moji10}
                title={pop ? tr("{0} grandes animations", n) : tr("{0} stickers", n)}
                sub={pop ? tr("WippPop plein écran avec ton personnage") : tr("Wippmojis animés, cartoon ou réalistes")}
                price={(pop ? status?.prices?.pop : status?.prices?.moji)?.[String(n)] ?? tr("Prix à venir")}
                note={status?.allowed ? tr("Offert pendant les essais") : null}
                icon={pop ? <Star size={16} color={colors.accent} /> : <Smile size={16} color={colors.accent} />}
                onPress={() => {
                  // Characters included already used: continue with one of them.
                  const mineOfKind = avatars.filter((a) => (a.kind ?? "moji") === kind);
                  if (charactersLeft === 0 && mineOfKind.length) {
                    if (pop) setPopSize(n);
                    else setMojiSize(n);
                    setAvatar(mineOfKind[0]);
                    go("preview");
                    return;
                  }
                  if (pop) {
                    setPopSize(n);
                    setStyle("cartoon");
                    go("photo");
                  } else {
                    setMojiSize(n);
                    go("style");
                  }
                }}
              />
            ))}
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 6 }}>{tr("À quoi ça ressemble")}</Text>
            {!pop ? (
              <>
                <Tabs
                  small
                  value={exampleStyle}
                  options={[
                    ["cartoon", tr("Cartoon")],
                    ["realistic", tr("Réaliste")],
                  ]}
                  onChange={(v) => setExampleStyle(v as WippmojiStyle)}
                />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  {exampleStyle === "realistic"
                    ? MOJI_EXAMPLES.map((id) => (
                        <View key={id} style={{ width: "23%", aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surface, overflow: "hidden" }}>
                          <WippSticker id={id} size={80} fill />
                        </View>
                      ))
                    : ["mdr", "bisous", "coucou", "bravo"].map((id) => (
                        <View key={id} style={{ width: "23%", aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surface, overflow: "hidden" }}>
                          <Image source={EXPRESSION_ART[id]} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                        </View>
                      ))}
                </View>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  {POP_EXAMPLES.map((ex) => (
                    <Press key={ex.id} onPress={() => setDemoPop((d) => ({ uri: ex.id, n: (d?.n ?? 0) + 1 }))} style={{ width: "31%", gap: 4, alignItems: "center" }}>
                      <View style={{ width: "100%", aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                        <WippSticker id={ex.id} size={100} fill still />
                        <View style={{ position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
                          <ArrowRight size={18} color="#fff" />
                        </View>
                      </View>
                      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{ex.label()}</Text>
                    </Press>
                  ))}
                </View>
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>{tr("Des WIPP Moments : tes WippPop auront le même style, avec ton personnage.")}</Text>
              </>
            )}
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>{tr("Le paiement dans l’application arrive bientôt.")}</Text>
          </Page>
        ) : null}

        {step === "expressions" && status ? (
          <Page
            bottomInset={insets.bottom}
            error={error}
            footer={<MainButton label={`${tr("Continuer")} (${chosen.length}/${packSize})`} disabled={chosen.length !== packSize} onPress={() => void makePack()} />}
          >
            <Title
              title={pop ? tr("Choisis tes {0} animations", packSize) : tr("Choisis tes {0} expressions", packSize)}
              sub={pop ? tr("Elles entreront dans l’écran de tes amis, avec ton personnage.") : tr("Sélectionne les stickers que tu utilises le plus souvent.")}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(
                [
                  ["tous", tr("Tous")],
                  ["ivoirien", tr("Ivoirien")],
                  ["salut", tr("Salut")],
                  ["amour", tr("Amour")],
                  ["humeur", tr("Humeur")],
                  ["classique", tr("Classiques")],
                ] as const
              ).map(([id, label]) => (
                <Press
                  key={id}
                  onPress={() => setChoiceCat(id)}
                  style={{ height: 32, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: choiceCat === id ? colors.accent : colors.surface, borderWidth: 1, borderColor: choiceCat === id ? colors.accent : colors.hair }}
                >
                  <Text style={{ color: choiceCat === id ? colors.accentFg : colors.fg, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
                </Press>
              ))}
            </ScrollView>
            <ExpressionGrid
              expressions={choiceCat === "tous" ? choices : choices.filter((c) => (c.cat ?? "classique") === choiceCat)}
              demo={!pop}
              chosen={chosen}
              fallback={avatar?.referenceUrl ?? null}
              onToggle={(id) => setChosen((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < packSize ? [...list, id] : list))}
            />
            {!pop ? <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>{tr("Miniatures d’exemple : tes stickers seront créés avec ton personnage.")}</Text> : null}
            <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 }}>{tr("Texte sur les stickers")}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([["fr", tr("Français")], ["en", "English"], [null, tr("Sans texte")]] as const).map(([id, label]) => (
                <Press
                  key={String(id)}
                  onPress={() => setLanguage(id)}
                  style={{ flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: language === id ? colors.accent : colors.surface, borderWidth: 1, borderColor: language === id ? colors.accent : colors.hair }}
                >
                  <Text style={{ color: language === id ? colors.accentFg : colors.fg, fontSize: 14 }}>{label}</Text>
                </Press>
              ))}
            </View>
          </Page>
        ) : null}

        {step === "making-pack" ? (
          <Generation
            image={avatar ? { uri: avatar.referenceUrl } : pack ? { uri: pack.posterUrl } : ART.preview}
            title={pop ? tr("Création de tes WippPop…") : tr("Création de tes Wippmojis…")}
            progress={pack ? { done: pack.stickers.filter((s) => s.status !== "pending").length, total: pack.stickers.length } : { done: 0, total: packSize }}
            steps={packSteps()}
            note={tr("Cela peut prendre quelques minutes. Tu peux quitter cet écran : ton pack t’attendra dans « Mes Wippmojis ».")}
            onLeave={leave}
            bottomInset={insets.bottom}
          />
        ) : null}

        {step === "done" && pack ? (
          <Page
            bottomInset={insets.bottom}
            error={error}
            footer={
              <MainButton
                label={tr("Terminé")}
                onPress={() => {
                  setPacks((list) => [pack, ...list.filter((x) => x.id !== pack.id)]);
                  void refreshLibrary();
                  go("intro");
                }}
              />
            }
          >
            <Title
              title={pack.type === "wipppop" ? (pack.status === "ready" ? tr("Tes WippPop sont prêts !") : tr("Une partie de tes WippPop est prête")) : pack.status === "ready" ? tr("Tes Wippmojis sont prêts !") : tr("Une partie de tes Wippmojis est prête")}
              sub={pack.type === "wipppop" ? tr("Touche une animation pour la voir en grand.") : tr("Retrouve-les dans le panneau des stickers, onglet Wippmoji, pour les envoyer. Touche un sticker pour le voir en grand.")}
            />
            <StickerGrid pack={pack} onPlay={(id) => setDemoPop((d) => ({ uri: id, n: (d?.n ?? 0) + 1 }))} />
          </Page>
        ) : null}
      </Animated.View>
      {demoPop && isWippPopId(demoPop.uri) ? (
        <WippMomentOverlay stickerId={demoPop.uri} playKey={demoPop.n} onDone={() => setDemoPop(null)} />
      ) : demoPop ? (
        <PopDemo key={demoPop.n} uri={demoPop.uri} onDone={() => setDemoPop(null)} />
      ) : null}
    </View>
  );
}

/* ——— Screens ——— */

function Intro({
  status,
  packs,
  onBack,
  onStart,
  onOpenPack,
  onPlay,
  topInset,
  bottomInset,
}: {
  status: WippmojiStatus | null;
  packs: WippmojiPack[];
  onBack: () => void;
  onStart: (kind?: WippmojiKind) => void;
  onOpenPack: (p: WippmojiPack) => void;
  onPlay: (stickerId: string) => void;
  topInset: number;
  bottomInset: number;
}) {
  const { height } = useWindowDimensions();
  const closed = status && !status.allowed;
  const [libTab, setLibTab] = useState<WippmojiKind>("moji");
  // Once you have Wippmojis, the Studio opens on them; creating more is the secondary action.
  if (packs.length > 0) {
    const shown = packs.filter((p) => (p.type === "wipppop") === (libTab === "pop"));
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: topInset + 6, paddingHorizontal: 12, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Press onPress={onBack} hitSlop={10} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={26} color={colors.fg} />
          </Press>
          <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{tr("WIPP Studio")}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 14, paddingBottom: 110 + bottomInset }}>
          <Tabs
            value={libTab}
            options={[
              ["moji", tr("Mes Wippmojis")],
              ["pop", tr("Mes WippPop")],
            ]}
            onChange={(v) => setLibTab(v as WippmojiKind)}
          />
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            {libTab === "pop"
              ? tr("Touche un WippPop pour le voir en grand.")
              : tr("Pour les envoyer : dans une conversation, ouvre le panneau des stickers, onglet Wippmoji. Touche un sticker pour le voir en grand.")}
          </Text>
          {shown.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 20 }}>
              {libTab === "pop" ? tr("Tu n’as pas encore de WippPop.") : tr("Tu n’as pas encore de Wippmojis.")}
            </Text>
          ) : null}
          {shown.map((p) => (
            <Press key={p.id} onPress={() => onOpenPack(p)} style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, padding: 12, gap: 8 }}>
              {p.status === "generating" ? <Text style={{ color: colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{tr("En cours de création : touche pour suivre")}</Text> : null}
              <StickerGrid pack={p} onPlay={onPlay} />
            </Press>
          ))}
        </ScrollView>
        {!closed ? (
          <View style={{ position: "absolute", left: 20, right: 20, bottom: bottomInset + 16 }}>
            <MainButton label={libTab === "pop" ? tr("Créer d’autres WippPop") : tr("Créer d’autres Wippmojis")} icon={<Plus size={20} color={colors.accentFg} />} onPress={() => onStart(libTab)} />
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + bottomInset }}>
        <View style={{ height: Math.min(height * 0.46, 430), backgroundColor: colors.surface }}>
          <Image source={ART.hero} style={{ width: "100%", height: "100%" }} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={[bgA(0), colors.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110 }} pointerEvents="none" />
          <View style={{ position: "absolute", top: topInset + 6, left: 12, right: 12, flexDirection: "row", alignItems: "center" }}>
            <Press onPress={onBack} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color="#fff" />
            </Press>
            <Text style={{ flex: 1, textAlign: "center", color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold", marginRight: 38, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 6 }}>
              {tr("WIPP Studio")}
            </Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 22, gap: 10 }}>
          <Text style={{ color: colors.fg, fontSize: 34, lineHeight: 40, fontFamily: "Inter_700Bold" }}>
            {tr("Transforme-toi en")} <Text style={{ color: colors.accent }}>{tr("Wippmoji !")}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>{tr("Une photo suffit pour créer tes propres stickers et animations.")}</Text>
          <View style={{ flexDirection: "row", marginTop: 14 }}>
            {[
              { icon: <Smile size={28} color={colors.accent} />, label: tr("Ton style") },
              { icon: <Star size={28} color={colors.accent} />, label: tr("Tes émotions") },
              { icon: <Crown size={28} color={colors.accent} />, label: tr("Ton univers") },
            ].map((f) => (
              <View key={f.label} style={{ flex: 1, alignItems: "center", gap: 8 }}>
                {f.icon}
                <Text style={{ color: colors.fg, fontSize: 13 }}>{f.label}</Text>
              </View>
            ))}
          </View>
          {status?.provider === "mock" && status.allowed ? (
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 8 }}>{tr("Mode essai : les images sont des exemples, rien n’est facturé.")}</Text>
          ) : null}
          {packs.length > 0 ? (
            <View style={{ marginTop: 22, gap: 12 }}>
              <Text style={{ color: colors.fg, fontSize: 18, fontFamily: "Inter_700Bold" }}>{tr("Mes Wippmojis")}</Text>
              {packs.map((p) => (
                <Press key={p.id} onPress={() => onOpenPack(p)} style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, padding: 12, gap: 8 }}>
                  {p.status === "generating" ? <Text style={{ color: colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{tr("En cours de création : touche pour suivre")}</Text> : null}
                  <StickerGrid pack={p} onPlay={onPlay} />
                </Press>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ position: "absolute", left: 20, right: 20, bottom: bottomInset + 16 }}>
        {closed ? (
          <View style={{ height: 56, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.accent, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{tr("Bientôt disponible")}</Text>
          </View>
        ) : (
          <MainButton label={tr("Commencer")} disabled={!status} onPress={() => onStart()} />
        )}
      </View>
    </View>
  );
}

function Generation({
  image,
  title,
  progress,
  steps,
  note,
  onLeave,
  bottomInset,
}: {
  image: { uri: string } | number;
  title: string;
  progress: { done: number; total: number } | null;
  steps: { label: string; state: StepState }[];
  note: string;
  onLeave?: () => void;
  bottomInset: number;
}) {
  const ratio = progress && progress.total ? progress.done / progress.total : 0;
  const size = 210;
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: bottomInset + 30 }}>
      <View style={{ alignSelf: "center", width: size, height: size, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.hair} strokeWidth={6} fill="none" />
          {progress ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colors.accent}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={circ * (1 - Math.max(0.03, ratio))}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : null}
        </Svg>
        <View style={{ width: size - 30, height: size - 30, borderRadius: (size - 30) / 2, overflow: "hidden", backgroundColor: colors.surface }}>
          <Image source={image} style={{ width: "100%", height: "100%" }} contentFit="cover" contentPosition="top" />
        </View>
      </View>
      <Text style={{ color: colors.fg, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" }}>{title}</Text>
      {progress ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center" }}>
            {progress.done} / {progress.total}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <ProgressBar value={ratio} />
          </View>
        </>
      ) : null}
      <View style={{ gap: 16, marginTop: 6 }}>
        {steps.map((s) => (
          <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {s.state === "done" ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Check size={14} color={colors.accentFg} />
              </View>
            ) : s.state === "active" ? (
              <ActivityIndicator color={colors.accent} style={{ width: 24, height: 24 }} />
            ) : (
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.hair }} />
            )}
            <Text style={{ color: s.state === "todo" ? colors.muted : colors.fg, fontSize: 15 }}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, marginTop: 8 }}>
        <Lightbulb size={20} color={colors.accent} />
        <Text style={{ flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 }}>{note}</Text>
      </View>
      {onLeave ? <MainButton label={tr("Quitter, je reviendrai plus tard")} variant="secondary" onPress={onLeave} /> : null}
    </ScrollView>
  );
}

/* ——— Pieces ——— */

function Page({ children, footer, error, bottomInset, tallFooter }: { children: ReactNode; footer: ReactNode; error: string; bottomInset: number; tallFooter?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 16, paddingBottom: (footer ? (tallFooter ? 170 : 104) : 30) + bottomInset }} keyboardShouldPersistTaps="handled">
        {error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20, textAlign: "center" }}>{error}</Text> : null}
        {children}
      </ScrollView>
      {footer ? <View style={{ position: "absolute", left: 18, right: 18, bottom: bottomInset + 14 }}>{footer}</View> : null}
    </View>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ alignItems: "center", gap: 6, marginTop: 4 }}>
      <Text style={{ color: colors.fg, fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 10 }}>{sub}</Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.hair, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: colors.accent }} />
    </View>
  );
}

function MainButton({ label, onPress, disabled, variant = "primary", icon }: { label: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "secondary"; icon?: ReactNode }) {
  const primary = variant === "primary";
  return (
    <Press
      onPress={disabled ? undefined : onPress}
      style={{
        height: 56,
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: primary ? colors.accent : colors.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.hair,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      <Text style={{ color: primary ? colors.accentFg : colors.fg, fontSize: 16, fontFamily: "Inter_700Bold" }}>{label}</Text>
      {primary && !icon ? <ArrowRight size={20} color={colors.accentFg} /> : null}
    </Press>
  );
}

function SourceButton({ icon, label, onPress, disabled }: { icon: ReactNode; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Press
      onPress={disabled ? undefined : onPress}
      style={{ flex: 1, height: 92, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.45 : 1 }}
    >
      {icon}
      <Text style={{ color: colors.fg, fontSize: 14 }}>{label}</Text>
    </Press>
  );
}

function Tabs({ value, options, onChange, small }: { value: string; options: [string, string][]; onChange: (v: string) => void; small?: boolean }) {
  return (
    <View style={{ flexDirection: "row", padding: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, alignSelf: small ? "center" : "stretch" }}>
      {options.map(([id, label]) => {
        const on = id === value;
        return (
          <Press key={id} onPress={() => onChange(id)} style={{ flex: small ? undefined : 1, paddingHorizontal: small ? 18 : 0, height: small ? 34 : 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.accent : "transparent" }}>
            <Text style={{ color: on ? colors.accentFg : colors.fg, fontSize: small ? 13 : 15, fontFamily: "Inter_700Bold" }}>{label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

/** Example WippPop played over the whole screen, then gone. */
function PopDemo({ uri, onDone }: { uri: string; onDone: () => void }) {
  const { width } = useWindowDimensions();
  useEffect(() => {
    const t = setTimeout(onDone, 6400);
    return () => clearTimeout(t);
  }, [onDone]);
  const size = Math.min(width, 520);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
      <WippSticker id={uri} size={size} />
    </View>
  );
}

function StyleCard({ art, title, sub, on, onPress }: { art: number; title: string; sub: string; on: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ borderRadius: 22, overflow: "hidden", backgroundColor: colors.surface, borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.hair }}>
      <Image source={art} style={{ width: "100%", aspectRatio: 179 / 130 }} contentFit="cover" contentPosition="top" />
      <View
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 2,
          borderColor: on ? colors.accent : "rgba(255,255,255,0.85)",
          backgroundColor: on ? colors.accent : "rgba(0,0,0,0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on ? <Check size={15} color={colors.accentFg} /> : null}
      </View>
      <View style={{ padding: 14 }}>
        <Text style={{ color: colors.fg, fontSize: 18, fontFamily: "Inter_700Bold" }}>{title}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 18 }}>{sub}</Text>
      </View>
    </Press>
  );
}

function PackCard({
  art,
  title,
  sub,
  price,
  note,
  badge,
  soon,
  icon,
  onPress,
}: {
  art: number;
  title: string;
  sub: string;
  price: string;
  note?: string | null;
  badge?: string;
  soon?: boolean;
  icon: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Press
      onPress={soon ? undefined : onPress}
      style={{ borderRadius: 22, overflow: "hidden", backgroundColor: colors.surface, borderWidth: badge ? 2 : 1, borderColor: badge ? colors.accent : colors.hair, flexDirection: "row", minHeight: 150 }}
    >
      <View style={{ flex: 1, padding: 16, gap: 8, justifyContent: "center" }}>
        {badge ? (
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.accent }}>
            <Text style={{ color: colors.accentFg, fontSize: 11, fontFamily: "Inter_700Bold" }}>{badge}</Text>
          </View>
        ) : null}
        <Text style={{ color: colors.fg, fontSize: 21, lineHeight: 25, fontFamily: "Inter_700Bold" }}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {icon}
          <Text style={{ flex: 1, color: fgA(0.8), fontSize: 13 }}>{sub}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: soon ? colors.chip : colors.accent }}>
            <Text style={{ color: soon ? colors.fg : colors.accentFg, fontSize: 14, fontFamily: "Inter_700Bold" }}>{price}</Text>
          </View>
          {soon ? <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Bientôt")}</Text> : <ArrowRight size={18} color={colors.accent} />}
        </View>
        {!soon && note ? <Text style={{ color: colors.accent, fontSize: 12 }}>{note}</Text> : null}
      </View>
      <View style={{ width: 140, padding: 8, opacity: soon ? 0.75 : 1, backgroundColor: accentA(0.08) }}>
        <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="contain" />
      </View>
    </Press>
  );
}

function ExpressionGrid({ expressions, chosen, fallback, onToggle, demo = true }: { expressions: { id: string; fr: string; en: string }[]; chosen: string[]; fallback: string | null; onToggle: (id: string) => void; demo?: boolean }) {
  const en = trLang() === "en";
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
      {expressions.map((e) => {
        const on = chosen.includes(e.id);
        const art = demo ? EXPRESSION_ART[e.id] : undefined;
        return (
          <Press key={e.id} onPress={() => onToggle(e.id)} style={{ width: "31.5%", alignItems: "center", gap: 6 }}>
            <View style={{ width: "100%", aspectRatio: 1, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, borderWidth: on ? 2.5 : 1, borderColor: on ? colors.accent : colors.hair }}>
              {art ? (
                <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : fallback ? (
                <Image source={{ uri: fallback }} style={{ width: "100%", height: "100%" }} contentFit="cover" contentPosition="top" />
              ) : null}
              {on ? (
                <View style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                  <Check size={13} color={colors.accentFg} />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={{ color: on ? colors.accent : colors.fg, fontSize: 13, fontFamily: on ? "Inter_600SemiBold" : undefined }}>
              {en ? e.en : e.fr}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/** The photo in a frame of the chosen shape: drag to move, buttons to zoom. Reports the crop in photo pixels. */
function Cropper({ photo, framing, onCrop }: { photo: Photo; framing: WippmojiFraming; onCrop: (c: PhotoCrop) => void }) {
  const { width: screenW } = useWindowDimensions();
  const f = FRAMINGS.find((x) => x.id === framing) ?? FRAMINGS[1];
  const boxW = Math.min(screenW - 36, 420);
  const frameW = Math.round(f.ratio >= 0.8 ? boxW * 0.82 : boxW * 0.62);
  const frameH = Math.round(frameW / f.ratio);
  const base = Math.max(frameW / photo.width, frameH / photo.height);
  const [zoom, setZoom] = useState(f.zoom);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const scale = base * zoom;
  const rw = photo.width * scale;
  const rh = photo.height * scale;
  const maxX = Math.max(0, (rw - frameW) / 2);
  const maxY = Math.max(0, (rh - frameH) / 2);
  const o = { x: Math.max(-maxX, Math.min(maxX, offset.x)), y: Math.max(-maxY, Math.min(maxY, offset.y)) };
  const left = (frameW - rw) / 2 + o.x;
  const top = (frameH - rh) / 2 + o.y;

  // New framing: start from a sensible frame (faces sit in the upper part of a photo).
  useEffect(() => {
    setZoom(f.zoom);
    const h = photo.height * base * f.zoom;
    setOffset({ x: 0, y: Math.max(0, (h - frameH) / 2) * f.lift });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framing, photo.uri]);

  useEffect(() => {
    onCrop({
      originX: Math.max(0, Math.round(-left / scale)),
      originY: Math.max(0, Math.round(-top / scale)),
      width: Math.min(photo.width, Math.round(frameW / scale)),
      height: Math.min(photo.height, Math.round(frameH / scale)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, top, scale, frameW, frameH]);

  const start = useRef(o);
  const live = useRef(o);
  live.current = o;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current = live.current;
        },
        onPanResponderMove: (_e, g) => setOffset({ x: start.current.x + g.dx, y: start.current.y + g.dy }),
      }),
    [],
  );

  const zoomBtn = (icon: ReactNode, onPress: () => void) => (
    <Press onPress={onPress} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.hair }}>
      {icon}
    </Press>
  );

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ width: boxW, paddingVertical: 14, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center" }}>
        <View {...pan.panHandlers} style={{ width: frameW, height: frameH, overflow: "hidden", borderRadius: 6 }}>
          <Image source={{ uri: photo.uri }} style={{ position: "absolute", left, top, width: rw, height: rh }} contentFit="fill" />
          {[1, 2].map((i) => (
            <View key={`v${i}`} pointerEvents="none" style={{ position: "absolute", left: (frameW * i) / 3, top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.35)" }} />
          ))}
          {[1, 2].map((i) => (
            <View key={`h${i}`} pointerEvents="none" style={{ position: "absolute", top: (frameH * i) / 3, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.35)" }} />
          ))}
          {(["tl", "tr", "bl", "br"] as const).map((c) => (
            <View
              key={c}
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 26,
                height: 26,
                borderColor: "#fff",
                ...(c[0] === "t" ? { top: 0, borderTopWidth: 3 } : { bottom: 0, borderBottomWidth: 3 }),
                ...(c[1] === "l" ? { left: 0, borderLeftWidth: 3 } : { right: 0, borderRightWidth: 3 }),
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {zoomBtn(<Minus size={18} color={colors.fg} />, () => setZoom((z) => Math.max(1, +(z - 0.15).toFixed(2))))}
        <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Glisse pour déplacer, zoome avec + et −")}</Text>
        {zoomBtn(<Plus size={18} color={colors.fg} />, () => setZoom((z) => Math.min(4, +(z + 0.15).toFixed(2))))}
      </View>
    </View>
  );
}

/** The stickers of a pack: each shows its first image until it is ready. */
function StickerGrid({ pack, onPlay }: { pack: WippmojiPack; onPlay?: (stickerId: string) => void }) {
  const pop = pack.type === "wipppop";
  const h = 84;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {pack.stickers.map((s) => {
        const def = wippmojiStickerDef(s, pop);
        return (
          <Press key={s.id} onPress={def && onPlay ? () => onPlay(def.id) : undefined} style={{ width: 92, alignItems: "center", gap: 4 }}>
            <View style={{ width: 84, height: h, borderRadius: 14, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {def ? <WippSticker id={def.id} size={84} fill={pop} /> : s.status === "failed" ? <RotateCcw size={22} color={colors.muted} /> : <ActivityIndicator color={colors.accent} />}
            </View>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>
              {s.label ?? ""}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

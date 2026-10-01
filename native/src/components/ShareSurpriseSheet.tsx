import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { Animated, Dimensions, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Gift,
  Images,
  MapPin,
  PartyPopper,
  Smile,
  Sparkles,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react-native";
import { wippSrc } from "../lib/assets";
import { useDeviceLayout } from "../lib/device-layout";
import { haptic } from "../lib/haptics";
import {
  animationCollections,
  countdownChoices,
  defaultDesign,
  defaultOptions,
  designPicker,
  findAnimation,
  surpriseAnimationCategories,
  surpriseDesigns,
  surpriseKindArt,
  type Surprise,
  type SurpriseOptions,
  type SurpriseType,
} from "../lib/surprise";
import { useWippStore } from "../lib/store";
import { colors, layout } from "../theme";
import { SurpriseReveal } from "./SurpriseReveal";
import { SurpriseAnimOverlay } from "./SurpriseAnimOverlay";
import { Press } from "./ui";

const CONTENT = [
  { label: "Galerie", icon: Images },
  { label: "Caméra", icon: Camera },
  { label: "GIF", icon: WandSparkles },
  { label: "Stickers", icon: Smile },
  { label: "Document", icon: FileText },
  { label: "Localisation", icon: MapPin },
  { label: "Contact", icon: UserRound },
] as const;

const KINDS = [
  { id: "scratch" as const, title: "Message à gratter", description: "Cache ton message. Il devra le gratter pour le découvrir.", Icon: Sparkles },
  { id: "countdown" as const, title: "Compte à rebours", description: "Ton message se dévoile après un certain temps.", Icon: Clock3 },
  { id: "gift" as const, title: "Message cadeau", description: "Un joli paquet à ouvrir pour découvrir ton message.", Icon: Gift },
  { id: "confetti" as const, title: "Confettis", description: "Ton message s’affiche avec une animation spéciale.", Icon: PartyPopper },
];

const TONES = ["Tendre", "Drôle", "Poétique", "Enthousiaste", "Sobre"] as const;

type Stage = "share" | "compose" | "contacts";
type Drawer = "animation" | "card" | null;

function RightDrawer({
  visible,
  title,
  onClose,
  onBack,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const width = Math.min(340, Math.round(Dimensions.get("window").width * 0.9));
  const slide = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(width);
    Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  }, [visible, width, slide]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
        <Animated.View
          style={{
            width,
            backgroundColor: colors.surprisePanel,
            paddingTop: insets.top + 28,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 16,
            borderLeftWidth: 1,
            borderLeftColor: colors.hair,
            transform: [{ translateX: slide }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
            {onBack ? (
              <Press onPress={onBack} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={22} color={colors.fg} />
              </Press>
            ) : null}
            <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: colors.fg }}>{title}</Text>
            <Press onPress={onClose} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <X size={21} color={colors.fg} />
            </Press>
          </View>
          <ScrollView>{children}</ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ShareSurpriseSheet({
  open,
  onClose,
  onShare,
  onSurprise,
  onStickers,
  initialStage = "share",
}: {
  open: boolean;
  onClose: () => void;
  onShare: (label: string) => void;
  onSurprise: (surprise: Surprise) => void;
  onStickers: () => void;
  initialStage?: "share" | "compose";
}) {
  const insets = useSafeAreaInsets();
  const { tile, compact } = useDeviceLayout();
  const users = useWippStore((s) => s.users);
  const contacts = Object.values(users).filter((u) => u.connected);
  const [stage, setStage] = useState<Stage>(initialStage);
  const [secret, setSecret] = useState("");
  const [kind, setKind] = useState<SurpriseType>("scratch");
  const [design, setDesign] = useState<string | null>(defaultDesign("scratch"));
  const [opts, setOpts] = useState<SurpriseOptions>(defaultOptions("scratch"));
  const [animation, setAnimation] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [animCat, setAnimCat] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [previewPlay, setPreviewPlay] = useState<{ id: string; n: number } | null>(null);
  const previewSequence = useRef(0);
  useEffect(() => {
    if (!preview) setPreviewPlay(null);
  }, [preview]);
  const [assist, setAssist] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Tendre");
  const gift = wippSrc("fx/surprise/cadeau.jpg");
  const shareW = tile(3, 16, 8);
  const picker = designPicker[kind];
  const PickerIcon = picker.icon;
  const selectedAnim = findAnimation(animation);

  useEffect(() => {
    if (open) {
      setStage(initialStage);
      setDrawer(null);
      setPreview(false);
    }
  }, [open, initialStage]);

  function close() {
    setStage("share");
    setSecret("");
    setDrawer(null);
    setPreview(false);
    setAssist(false);
    onClose();
  }

  function pick(label: string) {
    haptic("select");
    if (label === "Stickers") {
      close();
      onStickers();
      return;
    }
    if (label === "Contact") {
      setStage("contacts");
      return;
    }
    onShare(label);
    close();
  }

  function chooseKind(id: SurpriseType) {
    if (id !== kind) {
      setKind(id);
      setDesign(defaultDesign(id));
      setOpts(defaultOptions(id));
    }
    haptic("select");
  }

  function draft(): Surprise {
    return {
      id: `surprise-${Date.now()}`,
      message: secret.trim() || "Ton message secret",
      surpriseType: kind,
      designId: design,
      animationId: animation,
      surpriseOptions: opts,
      mine: true,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  }

  if (!open) return null;
  const animItems = animCat ? (animationCollections[animCat] ?? []) : surpriseAnimationCategories;
  const drawerTitle =
    drawer === "card"
      ? picker.label
      : animCat
        ? (surpriseAnimationCategories.find((item) => item.id === animCat)?.label ?? "Animations")
        : "Ajouter une animation";

  return (
    <>
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View
          style={{
            maxHeight: "92%",
            flexGrow: 0,
            backgroundColor: stage === "compose" ? colors.surprisePanel : "#121722",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 8,
          }}
        >
          {stage === "share" ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: compact ? 22 : 27, fontFamily: "Inter_700Bold", color: colors.fg }}>Partager</Text>
                  <Text style={{ marginTop: 4, fontSize: 13, color: colors.shareSubtitle }}>Envoyez du contenu ou créez une surprise.</Text>
                </View>
                <Press onPress={close} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <X size={22} color={colors.fg} />
                </Press>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CONTENT.map(({ label, icon: Icon }) => (
                  <Press
                    key={label}
                    onPress={() => pick(label)}
                    style={{
                      width: shareW,
                      height: layout.shareTileHeight,
                      borderRadius: 14,
                      backgroundColor: colors.shareTile,
                      borderWidth: 1,
                      borderColor: colors.shareTileBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Icon size={34} color={colors.surpriseGold} strokeWidth={1.8} fill={label === "Localisation" || label === "Contact" ? colors.surpriseGold : "none"} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{label}</Text>
                  </Press>
                ))}
              </View>
              <Press
                onPress={() => {
                  haptic("select");
                  setStage("compose");
                }}
                style={{
                  marginTop: 16,
                  minHeight: 105,
                  borderRadius: 20,
                  backgroundColor: colors.shareTileHighlight,
                  borderWidth: 1,
                  borderColor: colors.surpriseGold,
                  paddingHorizontal: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {gift ? <Image source={gift} style={{ width: 100, height: 100 }} contentFit="contain" /> : <Gift size={48} color={colors.accent} />}
                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 21, fontFamily: "Inter_700Bold", color: colors.surpriseGold }}>Surprise</Text>
                    <Sparkles size={18} color={colors.surpriseGold} />
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 11, color: colors.shareSubtitle }}>Transforme tes messages en expériences.</Text>
                </View>
                <ChevronRight size={25} color={colors.surpriseGold} />
              </Press>
            </View>
          ) : null}

          {stage === "contacts" ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.fg }}>Contact</Text>
                <Press onPress={() => setStage("share")}>
                  <X size={22} color={colors.fg} />
                </Press>
              </View>
              <ScrollView style={{ maxHeight: 320 }}>
                {contacts.map((u) => (
                  <Press
                    key={u.id}
                    onPress={() => {
                      onShare(`👤 ${u.displayName}`);
                      close();
                    }}
                    style={{ height: 48, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.hair }}
                  >
                    <Text style={{ fontSize: 16, color: colors.fg }}>{u.displayName}</Text>
                  </Press>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {stage === "compose" ? (
            <View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0, maxHeight: 720 }}
                contentContainerStyle={{ flexGrow: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 }}
              >
                <View style={{ minHeight: 62, alignItems: "center", justifyContent: "center" }}>
                  <Press onPress={close} style={{ position: "absolute", left: 0, width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.hair, alignItems: "center", justifyContent: "center" }}>
                    <X size={18} color={colors.fg} />
                  </Press>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Gift size={22} color={colors.surpriseBright} />
                    <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.fg }}>Surprise</Text>
                    <Sparkles size={20} color={colors.surpriseBright} />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.surpriseSecondary }}>Transforme tes messages en expériences.</Text>
                </View>
                <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.surpriseBright, backgroundColor: colors.navy, padding: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <TextInput
                      value={secret}
                      onChangeText={setSecret}
                      placeholder="Écris ton message..."
                      placeholderTextColor={colors.surpriseSecondary}
                      maxLength={layout.surpriseMessageLimit}
                      multiline
                      style={{ flex: 1, minHeight: 60, color: colors.fg, fontSize: 16 }}
                    />
                    <Press
                      onPress={() => setAssist((v) => !v)}
                      style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                    >
                      <WandSparkles size={14} color={colors.accentFg} />
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accentFg }}>Assistant ✧</Text>
                    </Press>
                  </View>
                  <Text style={{ textAlign: "right", fontSize: 11, color: colors.surpriseSecondary }}>
                    {secret.length}/{layout.surpriseMessageLimit}
                  </Text>
                </View>
                {assist ? (
                  <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.surpriseLine, backgroundColor: colors.surpriseInk, padding: 12 }}>
                    <Text style={{ color: colors.surpriseGold, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Assistant surprise</Text>
                    <TextInput
                      value={occasion}
                      onChangeText={setOccasion}
                      placeholder="L'occasion… ex. anniversaire de Deena"
                      placeholderTextColor={colors.muted}
                      style={{ borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10, color: colors.fg }}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                      {TONES.map((item) => (
                        <Press
                          key={item}
                          onPress={() => setTone(item)}
                          style={{
                            borderRadius: 999,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: tone === item ? colors.surpriseGold : "transparent",
                            borderWidth: 1,
                            borderColor: tone === item ? colors.surpriseGold : colors.hair,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: tone === item ? colors.surpriseInk : colors.fg }}>{item}</Text>
                        </Press>
                      ))}
                    </ScrollView>
                    <Press
                      onPress={() => {
                        if (occasion.trim().length < 2) return;
                        const line =
                          tone === "Drôle"
                            ? `Petite surprise pour ${occasion.trim()}… prépare-toi à sourire 😄`
                            : tone === "Poétique"
                              ? `Pour ${occasion.trim()}, un secret tout en douceur t’attend.`
                              : `Pour ${occasion.trim()} : un message ${tone.toLowerCase()} rien que pour toi.`;
                        setSecret(line.slice(0, layout.surpriseMessageLimit));
                        setAssist(false);
                      }}
                      style={{ marginTop: 10, height: 40, borderRadius: 999, backgroundColor: colors.surpriseGold, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.surpriseInk }}>Générer le message</Text>
                    </Press>
                  </View>
                ) : null}
                <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
                  <Press
                    onPress={() => {
                      setAnimCat(null);
                      setDrawer("animation");
                    }}
                    style={{ flex: 1, minHeight: 48, borderRadius: 10, backgroundColor: colors.shareTile, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <WandSparkles size={20} color={colors.surpriseBright} />
                    <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.fg }}>Ajouter une animation</Text>
                    <ChevronRight size={16} color={colors.surpriseBright} />
                  </Press>
                  <Press
                    onPress={() => setDrawer("card")}
                    style={{ flex: 1, minHeight: 48, borderRadius: 10, backgroundColor: colors.shareTile, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <PickerIcon size={20} color={colors.surpriseBright} />
                    <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{picker.label}</Text>
                    <ChevronRight size={16} color={colors.surpriseBright} />
                  </Press>
                </View>
                <Text style={{ marginTop: 12, fontSize: 18, fontFamily: "Inter_700Bold", color: colors.fg }}>Choisis le type de surprise</Text>
                <Text style={{ fontSize: 12, color: colors.surpriseSecondary, marginBottom: 8 }}>Comment veux-tu révéler ton message ?</Text>
                <View style={{ gap: 8 }}>
                  {[KINDS.slice(0, 2), KINDS.slice(2, 4)].map((row) => (
                    <View key={row[0]!.id} style={{ flexDirection: "row", gap: 8 }}>
                      {row.map((item) => {
                        const art = wippSrc(surpriseKindArt[item.id]);
                        const on = kind === item.id;
                        return (
                          <Press
                            key={item.id}
                            onPress={() => chooseKind(item.id)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              minHeight: 168,
                              borderRadius: 12,
                              padding: 10,
                              backgroundColor: colors.shareTile,
                              borderWidth: on ? 1.5 : 1,
                              borderColor: on ? colors.surpriseGold : colors.shareTileBorder,
                              overflow: "hidden",
                            }}
                          >
                            <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.surpriseBright, alignItems: "center", justifyContent: "center" }}>
                              <item.Icon size={16} color={colors.surpriseBright} />
                            </View>
                            {art ? <Image source={art} style={{ width: "100%", height: 64, alignSelf: "center" }} contentFit="contain" /> : null}
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.fg }} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={{ marginTop: 2, fontSize: 11, color: colors.surpriseSecondary }} numberOfLines={2}>
                              {item.description}
                            </Text>
                          </Press>
                        );
                      })}
                    </View>
                  ))}
                </View>
                {selectedAnim ? (
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {wippSrc(selectedAnim.art) ? <Image source={wippSrc(selectedAnim.art)} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" /> : null}
                    <Text style={{ color: colors.surpriseBright, fontSize: 12 }}>Animation : {selectedAnim.label}</Text>
                  </View>
                ) : null}
                <Press
                  onPress={() => setPreview(true)}
                  style={{ marginTop: 10, height: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.surpriseLine, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Eye size={18} color={colors.surpriseBright} />
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.surpriseBright }}>Aperçu</Text>
                </Press>
                <Press
                  onPress={() => {
                    if (!secret.trim()) return;
                    onSurprise(draft());
                    close();
                  }}
                  style={{
                    marginTop: 8,
                    height: 48,
                    borderRadius: 999,
                    backgroundColor: secret.trim() ? colors.accent : colors.surface2,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: secret.trim() ? colors.accentFg : colors.muted }}>Envoyer la surprise</Text>
                  <Sparkles size={18} color={secret.trim() ? colors.accentFg : colors.muted} />
                </Press>
              </ScrollView>
            </View>
          ) : null}
        </View>

      </View>
    </Modal>

        <RightDrawer
          visible={Boolean(drawer)}
          title={drawerTitle}
          onClose={() => {
            setDrawer(null);
            setAnimCat(null);
          }}
          onBack={drawer === "animation" && animCat ? () => setAnimCat(null) : undefined}
        >
          {drawer === "card" ? (
            <>
              {surpriseDesigns[kind].length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {surpriseDesigns[kind].map((card) => {
                    const art = card.art ? wippSrc(card.art) : undefined;
                    return (
                      <Press
                        key={card.id}
                        onPress={() => {
                          setDesign(card.id);
                          setDrawer(null);
                        }}
                        style={{
                          width: "47%",
                          height: 110,
                          borderRadius: 8,
                          backgroundColor: design === card.id ? "#485160" : "#303746",
                          borderWidth: 1,
                          borderColor: design === card.id ? colors.surpriseGold : colors.hair,
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {art ? <Image source={art} style={{ width: 64, height: 64 }} contentFit="contain" /> : <Text style={{ fontSize: 34, color: colors.surpriseBright }}>{card.mark}</Text>}
                        <Text style={{ marginTop: 4, color: colors.fg, fontSize: 13 }}>{card.label}</Text>
                      </Press>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: colors.muted }}>Les styles arrivent bientôt.</Text>
              )}
              {kind === "countdown" ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.fg, marginBottom: 8 }}>Durée</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    {countdownChoices.map((choice) => (
                      <Press
                        key={choice.seconds}
                        onPress={() => setOpts({ countdown: { seconds: choice.seconds } })}
                        style={{
                          width: "47%",
                          height: 56,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: opts.countdown?.seconds === choice.seconds ? "#485160" : "#303746",
                          borderWidth: 1,
                          borderColor: opts.countdown?.seconds === choice.seconds ? colors.surpriseGold : colors.hair,
                        }}
                      >
                        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{choice.label}</Text>
                      </Press>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {animItems.map((item) => {
                  const art = wippSrc(item.art);
                  const on = animation === item.id;
                  const collection = surpriseAnimationCategories.find((c) => c.id === item.id)?.collection;
                  const hasCollection = Boolean(collection) && !animCat;
                  return (
                    <Press
                      key={item.id}
                      onPress={() => {
                        if (hasCollection && collection) {
                          setAnimCat(collection);
                          return;
                        }
                        setAnimation(item.id);
                        setDrawer(null);
                        setAnimCat(null);
                      }}
                      style={{
                        width: "47%",
                        height: layout.surpriseAnimationTileHeight,
                        borderRadius: 8,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: on ? colors.surpriseGold : colors.hair,
                        backgroundColor: on ? "#485160" : "#303746",
                        alignItems: "center",
                      }}
                    >
                      {art ? <Image source={art} style={{ width: "100%", height: "78%" }} contentFit="contain" /> : null}
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{item.label}</Text>
                      {hasCollection ? <ChevronRight size={16} color={colors.surpriseBright} style={{ position: "absolute", right: 8, top: 8 }} /> : null}
                    </Press>
                  );
                })}
              </View>
              {animation ? (
                <Press
                  onPress={() => {
                    setAnimation(null);
                    setDrawer(null);
                  }}
                  style={{ marginTop: 16, alignItems: "center" }}
                >
                  <Text style={{ color: colors.muted }}>Retirer l’animation</Text>
                </Press>
              ) : null}
            </>
          )}
        </RightDrawer>

        <Modal visible={preview} transparent animationType="fade" onRequestClose={() => setPreview(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 }}>
            <View style={{ borderRadius: 20, backgroundColor: colors.surprisePanel, borderWidth: 1, borderColor: colors.surpriseLine, padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.surpriseSecondary, fontSize: 13 }}>{KINDS.find((k) => k.id === kind)?.title}</Text>
                <Press onPress={() => setPreview(false)}>
                  <X size={22} color={colors.fg} />
                </Press>
              </View>
              <Text style={{ marginTop: 8, textAlign: "center", fontSize: 21, fontFamily: "Inter_700Bold", color: colors.fg }}>Surprise ✨</Text>
              <View style={{ marginTop: 12, alignItems: "center" }}>
                <SurpriseReveal demo surprise={draft()} onPlayAnimation={(id) => setPreviewPlay({ id, n: ++previewSequence.current })} />
              </View>
              <Press onPress={() => setPreview(false)} style={{ marginTop: 16, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.surpriseBright, fontFamily: "Inter_600SemiBold" }}>Retour à ma surprise</Text>
              </Press>
            </View>
            <SurpriseAnimOverlay centered animationId={previewPlay?.id ?? null} playKey={previewPlay?.n ?? 0} onDone={() => setPreviewPlay(null)} />
          </View>
        </Modal>
    </>
  );
}

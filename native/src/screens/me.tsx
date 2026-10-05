import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { getTouchCapabilities, uwbPermission, uwbProbe, type UwbPermission } from "wipp-touch-native";
import * as ImagePicker from "expo-image-picker";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  ChevronRight,
  FileText,
  Globe,
  Hand,
  HelpCircle,
  ImagePlus,
  Lock,
  LogOut,
  MapPin,
  Megaphone,
  Moon,
  Pencil,
  QrCode,
  Settings,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Tag,
  User,
  UserPlus,
  Store,
} from "lucide-react-native";
import { Image } from "expo-image";
import { Avatar } from "../components/Avatar";
import { BusinessCardExperience, CoverCameraHint, EmptyBusinessCard } from "../components/business-face";
import { WippWordmark } from "../components/Logo";
import { Btn, EdgeBack, Field, GlassHeader, Header, PendingNote, Press, Row, ScreenRoot, SearchField, Section, Toggle } from "../components/ui";
import { LEGAL_CONTACT, legalDoc, type LegalDocId } from "../lib/legal";
import { DEFAULT_COUNTRY } from "../lib/countries";
import { WORLD_COUNTRIES, findWorldCountry } from "../lib/countries-world";
import { AddressField, CategorySheet, DialPhoneField, FlagImage, HoursSheet, SelectField, WorldCountrySheet } from "../components/card-editor-parts";
import {
  CARD_CATEGORIES,
  cardToShop,
  getMyBusinessCard,
  getPublicBusinessCard,
  saveMyBusinessCard,
  uploadBusinessImageFile,
  withSignedCardMedia,
  type BusinessCardView,
  type CardInput,
} from "../lib/business-card";
import { usePrivatePinAsk } from "../components/PrivatePinGate";
import {
  authenticateBiometric,
  biometricAvailable,
  enablePrivateVault,
  inspectBiometricHardware,
  isBiometricPreferred,
  isPrivateEnabled,
  lastPinWaitMs,
  replacePrivateCode,
  setBiometricPreferred,
  verifyPin,
} from "../lib/private-vault";
import { shareWippPublic } from "../lib/share-public";
import { TAKEN_USERNAMES } from "../lib/seed";
import { APP_HOST } from "../lib/utils";
import { isPrivateChat, useT, useWippStore } from "../lib/store";
import { colors, layout } from "../theme";
import { errorText } from "../lib/error-fr";
import { EventCard } from "../components/event-parts";
import { wippSrc } from "../lib/assets";

export function MeScreen() {
  const t = useT();
  const me = useWippStore((s) => s.me);
  const push = useWippStore((s) => s.push);
  const language = useWippStore((s) => s.language);
  const users = useWippStore((s) => s.users);
  const chats = useWippStore((s) => s.chats);
  const listings = useWippStore((s) => s.listings);
  const lifestyle = useWippStore((s) => s.lifestyle);
  const [aboutOpen, setAboutOpen] = useState(false);
  const contacts = Object.values(users).filter((u) => u?.connected).length;
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  void vaultEpoch;
  const groups = chats.filter((c) => c.type === "group" && c.participantIds.includes("me") && !isPrivateChat(c.id)).length;
  const myEvents = lifestyle.filter((e) => e.hostId === "me").length;
  const myListings = listings.filter((l) => l.sellerId === "me").length;
  const country = me.country === "CA" ? "Canada" : me.country;
  async function shareProfile() {
    const link = `https://${APP_HOST}/@${me.username}`;
    await shareWippPublic(`@${me.username} ${link}`);
  }
  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
          <WippWordmark size={26} />
          <View style={{ flex: 1 }} />
          <Press onPress={() => push({ name: "my-qr" })} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <QrCode size={20} color={colors.fg} />
          </Press>
          <Press onPress={() => push({ name: "appearance" })} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Settings size={20} color={colors.fg} />
          </Press>
        </View>
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <View style={{ borderRadius: 16, backgroundColor: colors.navy, padding: 14, overflow: "hidden" }}>
            <Text style={{ position: "absolute", top: 12, right: 12, fontFamily: "GreatVibes_400Regular", fontSize: 22, color: colors.accent, maxWidth: 120, textAlign: "right" }}>
              {t("goodVibes")}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Press
                accessibilityLabel="Changer la photo de profil"
                onPress={() => {
                  void import("../lib/profile-photo").then(({ changeProfilePhoto }) =>
                    changeProfilePhoto().catch((err) => {
                      Alert.alert("Photo", errorText(err, "Envoi impossible"));
                    }),
                  );
                }}
              >
                <View style={{ borderRadius: 999, borderWidth: 2, borderColor: colors.accent, padding: 2 }}>
                  <Avatar user={me} size={72} />
                </View>
                <View style={{ position: "absolute", right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                  <Camera size={14} color={colors.accentFg} />
                </View>
              </Press>
              <View style={{ flex: 1, paddingRight: 72, paddingTop: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text numberOfLines={1} style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{me.displayName}</Text>
                  <BadgeCheck size={16} color={colors.accent} />
                </View>
                <Text style={{ fontSize: 12, color: "rgba(247,249,252,0.55)" }}>@{me.username}</Text>
                <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} color={colors.accent} />
                  <Text style={{ fontSize: 11, color: "rgba(247,249,252,0.7)" }}>{me.city}, {country}</Text>
                </View>
              </View>
            </View>
            {me.bio ? <Text style={{ marginTop: 10, fontSize: 12, color: "rgba(247,249,252,0.8)" }}>{me.bio}</Text> : null}
            <View style={{ marginTop: 12, flexDirection: "row" }}>
              {[
                [contacts, t("statContacts"), () => push({ name: "new-chat" })],
                [groups, t("statGroups"), () => push({ name: "my-groups" })],
                [myEvents, t("statEvents"), () => push({ name: "my-activity", kind: "events" })],
                [myListings, t("statListings"), () => push({ name: "my-activity", kind: "listings" })],
              ].map(([n, label, go]) => (
                <Press key={String(label)} onPress={go as () => void} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{n as number}</Text>
                  <Text style={{ fontSize: 10, color: "rgba(247,249,252,0.5)" }}>{label as string}</Text>
                </Press>
              ))}
            </View>
            <View style={{ marginTop: 12, flexDirection: "row", gap: 6 }}>
              <Press onPress={() => push({ name: "account" })} style={{ flex: 1, height: 40, borderRadius: 999, borderWidth: 1, borderColor: "rgba(247,249,252,0.2)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Pencil size={14} color={colors.paper} />
                <Text style={{ fontSize: 11, color: colors.paper }}>{t("editProfile")}</Text>
              </Press>
              <Press onPress={() => push({ name: "my-qr" })} style={{ flex: 1, height: 40, borderRadius: 999, borderWidth: 1, borderColor: "rgba(247,249,252,0.2)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <QrCode size={14} color={colors.paper} />
                <Text style={{ fontSize: 11, color: colors.paper }}>{t("myQr")}</Text>
              </Press>
              <Press onPress={() => void shareProfile()} style={{ flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Share2 size={14} color={colors.accentFg} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accentFg }}>{t("share")}</Text>
              </Press>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>{t("myActivity")}</Text>
            <Press onPress={() => push({ name: "my-activity", kind: "listings" })}>
              <Text style={{ fontSize: 12, color: colors.accent }}>{t("seeAll")} ›</Text>
            </Press>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { icon: Tag, title: t("myCard"), sub: t("myCardSub"), go: () => push({ name: "business-card" }) },
              { icon: Megaphone, title: t("myListings"), sub: t("myListingsSub"), go: () => push({ name: "my-activity", kind: "listings" }) },
              { icon: CalendarDays, title: t("myEvents"), sub: t("myEventsSub"), go: () => push({ name: "my-activity", kind: "events" }) },
              { icon: Bookmark, title: t("saved"), sub: t("savedSub"), go: () => push({ name: "my-activity", kind: "saved" }) },
            ].map((tile) => (
              <Press key={tile.title} onPress={tile.go} style={{ flex: 1, minHeight: 118, borderRadius: 16, backgroundColor: "rgba(11,18,32,0.8)", padding: 10, borderWidth: 1, borderColor: colors.hair }}>
                <tile.icon size={20} color={colors.accent} />
                <Text style={{ marginTop: "auto", fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{tile.title}</Text>
                <Text style={{ marginTop: 2, fontSize: 9, color: colors.muted }}>{tile.sub}</Text>
              </Press>
            ))}
          </View>
        </View>
        <View style={{ marginTop: 20 }}>
          <Section title={t("myWipp")}>
            <Row icon={<User size={16} color={colors.fg} />} label={t("account")} onPress={() => push({ name: "account" })} />
            <Row icon={<Shield size={16} color={colors.fg} />} label={t("privacy")} onPress={() => push({ name: "privacy" })} />
            <Row icon={<Lock size={16} color={colors.fg} />} label={t("security")} onPress={() => push({ name: "security" })} />
          </Section>
        </View>
        <View style={{ marginTop: 16 }}>
          <Section title={t("preferences")}>
            <Row icon={<Bell size={16} color={colors.fg} />} label={t("notifications")} onPress={() => push({ name: "notifications" })} />
            <Row icon={<Moon size={16} color={colors.fg} />} label={t("appearance")} onPress={() => push({ name: "appearance" })} />
            <Row icon={<Hand size={16} color={colors.fg} />} label={t("accessibility")} onPress={() => push({ name: "accessibility" })} />
            <Row icon={<Globe size={16} color={colors.fg} />} label={t("language")} value={language === "fr" ? t("french") : t("english")} onPress={() => push({ name: "language" })} />
          </Section>
        </View>
        <View style={{ marginTop: 16 }}>
          <Section title={t("devicesHelp")}>
            <Row icon={<Smartphone size={16} color={colors.fg} />} label={t("devices")} onPress={() => push({ name: "devices" })} />
            <Row icon={<HelpCircle size={16} color={colors.fg} />} label={t("help")} onPress={() => push({ name: "help" })} />
            <Row icon={<FileText size={16} color={colors.fg} />} label={t("termsOfUse")} onPress={() => push({ name: "legal", doc: "terms" })} />
            <Row icon={<Shield size={16} color={colors.fg} />} label={t("privacyPolicy")} onPress={() => push({ name: "legal", doc: "privacy" })} />
            <Row icon={<BadgeCheck size={16} color={colors.fg} />} label="18 ans et plus" onPress={() => push({ name: "legal", doc: "age" })} />
            <Row
              icon={<UserPlus size={16} color={colors.fg} />}
              label={t("invite")}
              trailing={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.accentFg }}>{t("inviteReward")}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </View>
              }
              onPress={() => void shareProfile()}
            />
            <Row icon={<Sparkles size={16} color={colors.fg} />} label="À propos" value={aboutOpen ? undefined : t("appVersion")} onPress={() => setAboutOpen((v) => !v)} />
            {aboutOpen ? (
              <Text style={{ paddingHorizontal: 16, paddingBottom: 12, fontSize: 13, color: colors.muted, lineHeight: 18 }}>
                WIPP — messagerie et appels, 18+, sans publicité. {t("appVersion")}.{"\n"}Contact : {LEGAL_CONTACT}
              </Text>
            ) : null}
          </Section>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "rgba(11,18,32,0.8)", paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.hair }}>
          <WippWordmark size={18} />
          <Text style={{ flex: 1, fontFamily: "GreatVibes_400Regular", fontSize: 18, color: colors.muted }}>{t("footerTagline")}</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{t("appVersion")}</Text>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <Btn
            label={t("signOut")}
            variant="ghost"
            onPress={() => {
              Alert.alert(t("signOut"), t("signOutConfirm"), [
                { text: "Annuler", style: "cancel" },
                { text: t("signOut"), style: "destructive", onPress: () => useWippStore.getState().signOut() },
              ]);
            }}
          />
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

export function AccountScreen() {
  const t = useT();
  const me = useWippStore((s) => s.me);
  const pop = useWippStore((s) => s.pop);
  const updateMe = useWippStore((s) => s.updateMe);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [city, setCity] = useState(me.city);
  const taken = TAKEN_USERNAMES.has(username.toLowerCase()) && username.toLowerCase() !== me.username;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("editProfile")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <Avatar user={me} size={88} />
          <Text style={{ marginTop: 8, color: colors.accent }}>{t("changePhoto")}</Text>
        </View>
        <Field label={t("displayName")} value={displayName} onChangeText={setDisplayName} />
        <Field label={t("username")} value={username} onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 20))} />
        {taken ? <Text style={{ color: colors.danger, fontSize: 12 }}>{t("usernameTaken")}</Text> : null}
        <Field label={t("bio")} value={bio} onChangeText={(v) => setBio(v.slice(0, 140))} />
        <Field label="Ville" value={city} onChangeText={setCity} />
        <Btn label="Enregistrer" onPress={() => { updateMe({ displayName, username, bio, city }); pop(); }} />
      </ScrollView>
    </ScreenRoot>
  );
}

function SettingsList({ title, rows }: { title: string; rows: { label: string; value?: string; onPress?: () => void }[] }) {
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        <Section title="">
          {rows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} onPress={r.onPress} />
          ))}
        </Section>
      </ScrollView>
    </ScreenRoot>
  );
}

/** Lock-screen preview of messages (decrypted on the phone). */
function MessagePreviewSection() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    void import("../lib/messaging/identity").then((m) => m.getMessagePreviewEnabled().then(setOn));
  }, []);
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  return (
    <Section title="Notifications">
      <Row
        label="Aperçu des messages"
        trailing={
          <Toggle
            value={on}
            onChange={(v: boolean) => {
              setOn(v);
              void import("../lib/messaging/identity").then((m) => m.setMessagePreviewEnabled(v));
            }}
          />
        }
      />
      <Text style={{ paddingHorizontal: 16, paddingTop: 6, color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        {on
          ? "Le début du message s’affiche dans la notification. Il est déchiffré sur ce téléphone : WIPP ne peut pas le lire."
          : "Les notifications affichent seulement « Nouveau message »."}
      </Text>
    </Section>
  );
}

/** WIPP Touch → iOS "Nearby Interactions" permission: real state + shortcut to the iPhone settings. */
function TouchPermissionSection() {
  const caps = useMemo(() => getTouchCapabilities(), []);
  const [perm, setPerm] = useState<UwbPermission>(() => uwbPermission());
  useEffect(() => {
    if (!caps.uwb && !caps.uwbCapable) return;
    const refresh = () => {
      if (Platform.OS === "android") {
        void uwbProbe().then(setPerm);
        return;
      }
      // Only re-probe when it was refused (avoids triggering the first-time iOS prompt here).
      if (uwbPermission() === "denied") void uwbProbe().then(setPerm);
      else setPerm(uwbPermission());
    };
    refresh();
    const sub = AppState.addEventListener("change", (st) => st === "active" && refresh());
    return () => sub.remove();
  }, [caps.uwb, caps.uwbCapable]);
  const android = Platform.OS === "android";
  if (android ? !caps.uwbCapable : !caps.uwb) return null;
  const denied = perm === "denied";
  return (
    <Section title="WIPP Touch">
      <Row
        label={android ? "Appareils à proximité" : "Interactions à proximité"}
        value={denied ? "Désactivées" : perm === "granted" ? "Activées" : "Demandées au premier WIPP Touch"}
        onPress={denied ? () => void Linking.openSettings() : undefined}
      />
      {denied ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {android
              ? "Autorisation de proximité désactivée. WIPP Touch utilise « Appareils à proximité » pour confirmer que les deux téléphones sont réellement proches. Paramètres → Applications → WIPP → Autorisations → Appareils à proximité."
              : "WIPP Touch utilise les interactions à proximité de votre iPhone pour confirmer que les deux téléphones sont réellement proches. Réglages → WIPP → Interactions à proximité."}
          </Text>
          <Btn label={android ? "Activer dans les réglages" : "Activer dans les réglages de l’iPhone"} onPress={() => void Linking.openSettings()} />
        </View>
      ) : null}
    </Section>
  );
}

export function PrivacyScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  const { askPin, gate } = usePrivatePinAsk();
  const [pane, setPane] = useState<"home" | "prive" | "create" | "confirm">("home");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [bioOn, setBioOn] = useState(isBiometricPreferred());
  const [bioHw, setBioHw] = useState<{ hasHardware: boolean; enrolled: boolean } | null>(null);
  useEffect(() => {
    void inspectBiometricHardware().then((hw) => setBioHw({ hasHardware: hw.hasHardware, enrolled: hw.enrolled }));
    setBioOn(isBiometricPreferred());
  }, [vaultEpoch]);

  async function finishCreate(code: string) {
    const existed = isPrivateEnabled();
    try {
      if (existed) {
        await replacePrivateCode(code);
      } else {
        await enablePrivateVault(code, false);
        setBioOn(false);
      }
      setPane("prive");
      setDraft("");
      setPending("");
      if (!existed && bioHw?.hasHardware && bioHw.enrolled) {
        Alert.alert("WIPP Privé", "Utiliser la biométrie de cet appareil pour ouvrir WIPP Privé ?", [
          {
            text: "Plus tard",
            onPress: () => {
              void setBiometricPreferred(false);
              setBioOn(false);
            },
          },
          {
            text: "Activer",
            onPress: () => {
              void (async () => {
                const bio = await authenticateBiometric();
                const on = bio === "success";
                await setBiometricPreferred(on);
                setBioOn(on);
              })();
            },
          },
        ]);
      } else {
        Alert.alert(
          "WIPP Privé",
          existed
            ? "Le code a été modifié. Tes conversations privées sont inchangées."
            : "Pour ouvrir WIPP Privé, maintiens le logo WIPP pendant 3 secondes.",
        );
      }
    } catch {
      Alert.alert("WIPP Privé", "Le code doit contenir au moins 4 caractères.");
    }
  }

  if (pane === "create" || pane === "confirm") {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header
            title="WIPP Privé"
            onBack={() => {
              setPane("prive");
              setDraft("");
              setPending("");
            }}
          />
        </GlassHeader>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {pane === "create"
              ? "Choisis un code WIPP Privé. Il est distinct du code PIN du téléphone."
              : "Confirme le code WIPP Privé."}
          </Text>
          <Field label={pane === "create" ? "Nouveau code" : "Confirmer"} value={draft} onChangeText={setDraft} secureTextEntry autoCapitalize="none" />
          <Btn
            label="Continuer"
            disabled={draft.trim().length < 4}
            onPress={() => {
              if (pane === "create") {
                setPending(draft.trim());
                setDraft("");
                setPane("confirm");
                return;
              }
              if (draft.trim() !== pending) {
                Alert.alert("WIPP Privé", "Les deux codes ne correspondent pas.");
                setDraft("");
                setPane("create");
                return;
              }
              void finishCreate(pending);
            }}
          />
        </ScrollView>
      </ScreenRoot>
    );
  }

  if (pane === "prive") {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header title="WIPP Privé" onBack={() => setPane("home")} />
        </GlassHeader>
        <ScrollView>
          <Section title="">
            <Row
              label={isPrivateEnabled() ? "Modifier le code" : "Créer le code"}
              onPress={() => {
                void (async () => {
                  if (isPrivateEnabled()) {
                    const old = await askPin();
                    if (!old) return;
                    const checked = await verifyPin(old);
                    if (!checked.ok) {
                      const secs = Math.max(1, Math.ceil((checked.waitMs || lastPinWaitMs()) / 1000));
                      Alert.alert("WIPP Privé", `Code incorrect. Réessaie dans ${secs} s.`);
                      return;
                    }
                  }
                  setPane("create");
                })();
              }}
            />
            {bioHw?.hasHardware ? (
              <Row
                label="Biométrie"
                value={bioHw.enrolled ? (bioOn ? "Activée" : "Désactivée") : "Non configurée"}
                trailing={
                  bioHw.enrolled ? (
                    <Toggle
                      value={bioOn}
                      onChange={(v) => {
                        void (async () => {
                          if (v) {
                            const bio = await authenticateBiometric();
                            if (bio !== "success") return;
                          }
                          await setBiometricPreferred(v);
                          setBioOn(v);
                        })();
                      }}
                    />
                  ) : undefined
                }
              />
            ) : null}
            <Row
              label="Code oublié ?"
              onPress={() => {
                void (async () => {
                  if (await biometricAvailable()) {
                    const bio = await authenticateBiometric();
                    if (bio !== "success") return;
                    setPane("create");
                    return;
                  }
                  Alert.alert(
                    "Code oublié",
                    "Sans biométrie valide, ce code ne peut pas être récupéré. Aucun SMS, e-mail ou copie serveur. Le coffre reste scellé sur cet appareil.",
                  );
                })();
              }}
            />
          </Section>
          <Text style={{ paddingHorizontal: 16, paddingTop: 12, color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            Espace discret. Aucun bouton WIPP Privé sur l’écran Chats. Maintiens le logo WIPP 3 secondes pour l’ouvrir.
          </Text>
        </ScrollView>
        {gate}
      </ScreenRoot>
    );
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("privacy")} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        <Section title="">
          <Row label={t("nearbyVis")} onPress={() => push({ name: "nearby" })} />
          <Row label="WIPP Privé" value={isPrivateEnabled() ? "Activé" : "Désactivé"} onPress={() => setPane("prive")} />
          <Row label={t("blockedList")} onPress={() => push({ name: "blocked" })} />
        </Section>
        <MessagePreviewSection />
        <TouchPermissionSection />
      </ScrollView>
    </ScreenRoot>
  );
}

export function SecurityScreen() {
  const t = useT();
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("security")} onBack={useWippStore.getState().pop} />
      </GlassHeader>
      <Section title="">
        <Row label="Verrouillage WIPP Privé" value={isPrivateEnabled() ? "Activé" : "Désactivé"} />
        <Row label="Appareils liés" onPress={() => useWippStore.getState().push({ name: "devices" })} />
        <Row label={t("deleteAccount")} danger onPress={() => useWippStore.getState().push({ name: "delete-account" })} />
      </Section>
    </ScreenRoot>
  );
}

export function NotificationsScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const notifs = useWippStore((s) => s.notifs);
  const setNotif = useWippStore((s) => s.setNotif);
  const pushMaster = useWippStore((s) => s.pushMaster);
  const pushGranted = useWippStore((s) => s.pushGranted);
  const setPushMaster = useWippStore((s) => s.setPushMaster);
  const setPushGranted = useWippStore((s) => s.setPushGranted);
  const [denied, setDenied] = useState(false);
  const rows = [
    ["messages", "Messages"] as const,
    ["requests", "Demandes"] as const,
    ["calls", "Appels"] as const,
    ["stories", "Stories"] as const,
  ];

  useEffect(() => {
    void import("../lib/push").then(({ getPermissionStatus }) =>
      getPermissionStatus().then((p) => {
        const granted = p.status === "granted";
        setPushGranted(granted);
        if (p.status === "denied") setDenied(true);
      }),
    );
  }, [setPushGranted]);

  async function toggleMaster(on: boolean) {
    if (!on) {
      setPushMaster(false);
      void import("../lib/push").then(({ disablePushFromSettings }) => disablePushFromSettings());
      return;
    }
    const { enablePushFromSettings } = await import("../lib/push");
    const res = await enablePushFromSettings();
    setPushGranted(res.granted);
    setPushMaster(res.granted);
    setDenied(!res.granted && res.status === "denied");
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("notifications")} onBack={pop} />
      </GlassHeader>
      <Section title={t("pushMaster")}>
        <Row
          label={t("pushMaster")}
          value={pushMaster ? t("pushOn") : t("pushOff")}
          trailing={<Toggle value={pushMaster} onChange={(v) => void toggleMaster(v)} />}
        />
      </Section>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 10 }}>
        {t("pushMasterHint")}
      </Text>
      {denied && !pushGranted ? (
        <Text style={{ color: colors.danger, fontSize: 13, paddingHorizontal: 20, paddingTop: 8 }}>{t("pushDenied")}</Text>
      ) : null}
      <Section title="">
        {rows.map(([key, label]) => (
          <Row key={key} label={label} trailing={<Toggle value={notifs[key]} onChange={(v) => setNotif(key, v)} />} />
        ))}
      </Section>
      {__DEV__ ? (
        <Text style={{ color: colors.muted, fontSize: 11, paddingHorizontal: 20, paddingTop: 12 }}>
          DEV · permission {pushGranted ? "accordée" : "non accordée"}
        </Text>
      ) : null}
    </ScreenRoot>
  );
}

export function AppearanceScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("appearance")} onBack={pop} />
      </GlassHeader>
      <Row label={t("themeLight")} />
      <Row label="Sombre" />
      <Row label="Système" />
    </ScreenRoot>
  );
}

export function AccessibilityScreen() {
  const t = useT();
  const [h, setH] = useState(true);
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("accessibility")} onBack={pop} />
      </GlassHeader>
      <Row label="Retours haptiques" trailing={<Toggle value={h} onChange={setH} />} />
      <Row label="Texte plus grand" trailing={<Toggle value={false} onChange={() => {}} />} />
      <Row label="Réduire les animations" trailing={<Toggle value={false} onChange={() => {}} />} />
    </ScreenRoot>
  );
}

export function LanguageScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const language = useWippStore((s) => s.language);
  const setLanguage = useWippStore((s) => s.setLanguage);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("language")} onBack={pop} />
      </GlassHeader>
      <Row label={t("french")} value={language === "fr" ? "✓" : undefined} onPress={() => setLanguage("fr")} />
      <Row label={t("english")} value={language === "en" ? "✓" : undefined} onPress={() => setLanguage("en")} />
    </ScreenRoot>
  );
}

export function DevicesScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("devices")} onBack={pop} />
      </GlassHeader>
      <PendingNote label="LINKED DEVICES BACKEND — PENDING" />
      <Row label="Cet appareil" value="WIPP" />
      <Text style={{ paddingHorizontal: 16, paddingTop: 8, color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        Liste multi-appareils sécurisée non encore branchée. Aucun appareil fictif.
      </Text>
    </ScreenRoot>
  );
}

export function HelpScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("help")} onBack={pop} />
      </GlassHeader>
      <Text style={{ padding: 16, color: colors.muted, lineHeight: 20 }}>Contact : {LEGAL_CONTACT}</Text>
    </ScreenRoot>
  );
}

export function BlockedScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const blocked = useWippStore((s) => s.blockedIds);
  const users = useWippStore((s) => s.users);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  async function reload() {
    const { listBlockedProfiles } = await import("../lib/connections");
    const rows = await listBlockedProfiles();
    useWippStore.setState({ blockedIds: [...new Set(rows.flatMap((row) => [row.id, `srvuser:${row.id}`]))] });
    setNames(Object.fromEntries(rows.map((row) => [row.id, row.displayName || (row.username ? `@${row.username}` : "")])));
  }
  useEffect(() => {
    void (async () => {
      try {
        await reload();
        setLoadError("");
      } catch (e) {
        setLoadError(errorText(e, "Impossible de charger les comptes bloqués."));
      } finally {
        setReady(true);
      }
    })();
  }, []);
  const seen = new Set<string>();
  const rows = blocked.filter((id) => {
    const raw = id.startsWith("srvuser:") ? id.slice("srvuser:".length) : id;
    if (seen.has(raw)) return false;
    seen.add(raw);
    return true;
  });
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("blockedList")} onBack={pop} />
      </GlassHeader>
      {!ready ? <Text style={{ padding: 16, color: colors.muted }}>Chargement…</Text> : null}
      {loadError ? <Text style={{ padding: 16, color: colors.danger }}>{loadError}</Text> : null}
      {ready && !loadError && rows.length === 0 ? <Text style={{ padding: 16, color: colors.muted }}>{t("blockedEmpty")}</Text> : null}
      {rows.map((id) => {
        const raw = id.startsWith("srvuser:") ? id.slice("srvuser:".length) : id;
        const user = users[id] ?? users[`srvuser:${raw}`] ?? users[raw];
        const label = names[raw] || user?.displayName || (user?.username ? `@${user.username}` : "Profil bloqué");
        return (
          <Row
            key={raw}
            label={label}
            value={t("unblock")}
            onPress={() => {
              Alert.alert(t("unblock"), `Débloquer ${label} ?`, [
                { text: "Annuler", style: "cancel" },
                {
                  text: t("unblock"),
                  onPress: () => {
                    void import("../lib/connections").then(async ({ unblockProfile }) => {
                      const ok = await unblockProfile(raw);
                      if (!ok) {
                        Alert.alert(t("unblock"), "Impossible pour le moment.");
                        return;
                      }
                      try {
                        await reload();
                      } catch (e) {
                        setLoadError(errorText(e, "Impossible de charger les comptes bloqués."));
                      }
                    });
                  },
                },
              ]);
            }}
          />
        );
      })}
    </ScreenRoot>
  );
}

export function DeleteAccountScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const armed = phrase.trim().toUpperCase() === "SUPPRIMER";
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("deleteAccount")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>Supprimer votre compte ?</Text>
        <Text style={{ marginTop: 12, color: colors.muted, lineHeight: 20 }}>
          Cette action demande la suppression du profil WIPP associé à la session en cours : stories, carte professionnelle, annonces et données de compte que le serveur peut effacer. Les messages déjà reçus par d’autres personnes peuvent rester dans leur conversation. Le compte Firebase du numéro n’est pas effacé par l’application. Une page web existe, mais elle demande un mot de passe : https://wippapp.com/delete-account. Les comptes créés par téléphone peuvent aussi écrire à support@wippapp.com.
        </Text>
        <Text style={{ marginTop: 16, color: colors.fg }}>Écris SUPPRIMER pour confirmer.</Text>
        <TextInput
          value={phrase}
          onChangeText={setPhrase}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="SUPPRIMER"
          placeholderTextColor={colors.muted}
          style={{ marginTop: 8, height: 48, borderRadius: 8, backgroundColor: colors.navy, color: colors.fg, paddingHorizontal: 12 }}
        />
        {error ? <Text style={{ marginTop: 12, color: colors.danger }}>{error}</Text> : null}
        <Btn
          label={busy ? "Suppression…" : t("deleteAccountCta")}
          variant="danger"
          disabled={!armed || busy}
          onPress={() => {
            setBusy(true);
            setError("");
            void (async () => {
              const { wippApi } = await import("../lib/proximity/wipp-session");
              await wippApi("account/delete-self", { method: "POST", body: JSON.stringify({ confirm: "SUPPRIMER" }) });
              useWippStore.getState().signOut();
            })().catch((err) => {
              setBusy(false);
              setError(errorText(err, "La suppression n’est pas encore disponible sur le serveur."));
            });
          }}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </ScreenRoot>
  );
}

export function LegalScreen({ doc }: { doc: LegalDocId }) {
  const pop = useWippStore((s) => s.pop);
  const lang = useWippStore((s) => s.language);
  const paper = legalDoc(lang, doc);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={paper.title} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 12, color: colors.muted }}>{paper.updated}</Text>
        <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 20, color: colors.muted }}>{paper.intro}</Text>
        {paper.sections.map((section) => (
          <View key={section.title} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{section.title}</Text>
            {section.paragraphs.map((p) => (
              <Text key={p.slice(0, 40)} style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.fg }}>{p}</Text>
            ))}
          </View>
        ))}
        <Text style={{ marginTop: 32, fontSize: 13, color: colors.muted }}>Contact : {LEGAL_CONTACT}</Text>
      </ScrollView>
    </ScreenRoot>
  );
}

export function MyActivityScreen({ kind }: { kind: "listings" | "events" | "saved" }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const allListings = useWippStore((s) => s.listings);
  const allEvents = useWippStore((s) => s.lifestyle);
  const saves = useWippStore((s) => s.saves);
  const shops = useWippStore((s) => s.shops);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { fetchListings, fetchEvents, fetchSaves, myProfileId } = await import("../lib/lot7/api");
        let me = useWippStore.getState().serverProfileId;
        if (!me) {
          try {
            me = await myProfileId();
            useWippStore.setState({ serverProfileId: me });
          } catch {
            me = null;
          }
        }
        const next: { listings?: typeof allListings; lifestyle?: typeof allEvents; saves?: typeof saves } = {};
        if (kind === "listings" || kind === "saved") next.listings = await fetchListings(me);
        if (kind === "events" || kind === "saved") next.lifestyle = await fetchEvents(me);
        if (kind === "saved") next.saves = await fetchSaves();
        if (!cancelled) {
          useWippStore.setState(next);
          setLoadError("");
        }
      } catch (e) {
        if (!cancelled) setLoadError(errorText(e, "Chargement impossible."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);
  const listings = allListings.filter((l) => (kind === "saved" ? saves.some((s) => s.kind === "listing" && s.id === l.id) : l.sellerId === "me"));
  const events = allEvents.filter((e) => (kind === "saved" ? saves.some((s) => s.kind === "event" && s.id === e.id) : e.hostId === "me"));
  const savedShops = shops.filter((s) => saves.some((x) => x.kind === "business" && (x.id === s.handle || x.id === s.id)));
  const title = kind === "listings" ? "Mes annonces" : kind === "events" ? "Mes événements" : "Mes enregistrés";
  const create = kind === "listings"
    ? () => push({ name: "create-listing" })
    : kind === "events"
      ? () => push({ name: "create-lifestyle" })
      : null;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header
          title={title}
          onBack={pop}
          right={create ? (
            <Press onPress={create} accessibilityLabel={kind === "listings" ? "Créer une annonce" : "Créer un événement"} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{kind === "listings" ? "+ Annonce" : "+ Événement"}</Text>
            </Press>
          ) : null}
        />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {kind === "saved" ? savedShops.map((s) => (
          <Press key={s.id} onPress={() => push({ name: "business-card-view", publicId: s.handle })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{s.name}</Text>
          </Press>
        )) : null}
        {kind !== "events" ? listings.map((l) => (
          <Press key={l.id} onPress={() => push({ name: "listing", listingId: l.id })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{l.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{l.city}</Text>
          </Press>
        )) : null}
        {kind !== "listings" ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {events.map((e) => {
              const start = e.startsAt ? new Date(e.startsAt) : null;
              const end = e.endsAt ? new Date(e.endsAt) : null;
              return (
                <EventCard
                  key={e.id}
                  title={e.title}
                  subtitle={(e.details || e.note || e.place || "").split("\n")[0]}
                  image={e.image ? (e.image.startsWith("http") ? { uri: e.image } : wippSrc(e.image)) : null}
                  starts={start && !Number.isNaN(start.getTime()) ? start : null}
                  ends={end && !Number.isNaN(end.getTime()) ? end : null}
                  city={e.city}
                  online={e.isOnline}
                  priceLabel={e.isFree === false ? [e.price, e.currency].filter(Boolean).join(" ") || "PAYANT" : "GRATUIT"}
                  onPress={() => push({ name: "lifestyle", itemId: e.id })}
                />
              );
            })}
          </View>
        ) : null}
        {loadError ? <Text style={{ padding: 16, color: colors.danger, fontSize: 13 }}>{loadError}</Text> : null}
        {kind === "listings" && listings.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Aucune annonce pour le moment</Text>
            <Text style={{ marginTop: 6, color: colors.muted }}>Publiez votre première annonce.</Text>
            <Btn label="Créer une annonce" onPress={() => push({ name: "create-listing" })} style={{ marginTop: 16 }} />
          </View>
        ) : null}
        {kind === "events" && events.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Aucun événement à venir</Text>
            <Btn label="Créer un événement" onPress={() => push({ name: "create-lifestyle" })} style={{ marginTop: 16 }} />
          </View>
        ) : null}
        {kind === "saved" && !loadError && listings.length + events.length + savedShops.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Vous n’avez encore rien enregistré.</Text>
            <Btn label="Explorer" onPress={() => push({ name: "explore" })} style={{ marginTop: 16 }} />
          </View>
        ) : null}
      </ScrollView>
    </ScreenRoot>
  );
}

export function BusinessCardScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const [card, setCard] = useState<BusinessCardView | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        const result = await getMyBusinessCard();
        setCard(result.card);
      } catch (e) {
        setCard(null);
        const status = typeof e === "object" && e && "status" in e ? Number((e as { status?: number }).status) : 0;
        if (status === 401 || status === 403) setError("Connecte-toi pour créer ta carte professionnelle.");
        else if (status === 404) setError("La carte professionnelle n’est pas encore disponible sur le serveur.");
        else setError(errorText(e, "Impossible de charger la carte."));
      }
    })();
  }, []);
  if (card === undefined) {
    return (
      <ScreenRoot>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenRoot>
    );
  }
  if (!card) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyBusinessCard onBack={pop} onCreate={() => push({ name: "business-card-editor" })} onHelp={() => push({ name: "help" })} />
        {error ? <Text style={{ position: "absolute", left: 20, right: 20, bottom: 24, color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
      </View>
    );
  }
  return <OwnedCard card={card} onBack={pop} onEdit={() => push({ name: "business-card-editor" })} />;
}

function cardHttpStatus(e: unknown): number {
  return typeof e === "object" && e && "status" in e ? Number((e as { status?: number }).status) : 0;
}

function cardErrorMessage(e: unknown, fallback: string): string {
  const status = cardHttpStatus(e);
  if (status === 401 || status === 403) return "Connecte-toi pour créer ta carte professionnelle.";
  if (status === 404) return "La carte professionnelle n’est pas encore disponible sur le serveur.";
  if (e instanceof Error && e.message && e.message !== "upload") return errorText(e, fallback);
  return fallback;
}

type Draft = CardInput & { coverUrl: string | null; logoUrl: string | null; photoUrls: string[] };
const emptyDraft: Draft = {
  name: "",
  category: "",
  description: "",
  country: "Canada",
  city: "",
  address: null,
  // A shop address is public by default; the owner can hide it (e.g. home-based business).
  showAddress: true,
  hours: null,
  businessPhone: null,
  website: null,
  coverPath: null,
  logoPath: null,
  photoPaths: [],
  coverUrl: null,
  logoUrl: null,
  photoUrls: [],
};

/** Country from a verified E.164 number: longest calling code wins, "+1" means Canada. */
function countryFromPhone(phone?: string | null) {
  if (!phone) return undefined;
  if (phone.startsWith("+1")) return findWorldCountry("CA");
  return [...WORLD_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => phone.startsWith(c.dial));
}

export function BusinessCardEditorScreen() {
  const pop = useWippStore((s) => s.pop);
  const replace = useWippStore((s) => s.replace);
  const [profileId, setProfileId] = useState("");
  const profileRef = useRef("");
  const localRef = useRef<{ cover?: { uri: string; mime: string }; logo?: { uri: string; mime: string } }>({});
  const pathRef = useRef<{ cover: string | null; logo: string | null }>({ cover: null, logo: null });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hasCard, setHasCard] = useState(false);
  const [busy, setBusy] = useState(true);
  const [uploadLabel, setUploadLabel] = useState("");
  const [error, setError] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const cardCountry = findWorldCountry(draft.country) ?? DEFAULT_COUNTRY;
  function rememberProfile(id: string) {
    profileRef.current = id;
    setProfileId(id);
  }
  useEffect(() => {
    void (async () => {
      try {
        const { waitForFirebaseUser } = await import("../lib/firebase-phone");
        const user = await waitForFirebaseUser();
        if (!user) {
          setError("Connecte-toi pour créer ta carte professionnelle.");
          return;
        }
        const r = await getMyBusinessCard();
        if (r.profileId) rememberProfile(r.profileId);
        if (!r.card) {
          // Default to the country the account signed up with (from the verified phone number).
          const signup = findWorldCountry(r.userCountry) ?? countryFromPhone(user.phoneNumber);
          if (signup) setDraft((d) => ({ ...d, country: signup.fr }));
        }
        if (r.card) {
          setHasCard(true);
          pathRef.current = { cover: r.card.coverPath, logo: r.card.logoPath };
          const card = await withSignedCardMedia(r.card);
          setDraft({
            name: r.card.name,
            category: r.card.category,
            description: r.card.description,
            country: r.card.country,
            city: r.card.city,
            address: r.card.address,
            showAddress: r.card.showAddress,
            hours: r.card.hours,
            businessPhone: r.card.businessPhone,
            website: r.card.website,
            coverPath: r.card.coverPath,
            logoPath: r.card.logoPath,
            photoPaths: card.photoPaths ?? [],
            coverUrl: card.coverUrl,
            logoUrl: card.logoUrl,
            photoUrls: card.photoUrls ?? [],
          });
          if (card.coverUnresolved || card.logoUnresolved) {
            setError("Une image enregistrée n’a pas pu être affichée. Tu peux la renvoyer.");
          }
        }
      } catch (e) {
        setError(cardErrorMessage(e, "Impossible de charger la carte."));
        const status = cardHttpStatus(e);
        if (status === 401 || status === 403) return;
        const stored = useWippStore.getState().serverProfileId;
        if (stored) {
          rememberProfile(stored);
          return;
        }
        try {
          const { myProfileId } = await import("../lib/lot7/api");
          rememberProfile(await myProfileId());
        } catch {
          /* keep the classified load error */
        }
      } finally {
        setBusy(false);
      }
    })();
  }, []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  async function resolveProfile(): Promise<string> {
    if (profileRef.current) return profileRef.current;
    const stored = useWippStore.getState().serverProfileId;
    if (stored) {
      rememberProfile(stored);
      return stored;
    }
    const { waitForFirebaseUser } = await import("../lib/firebase-phone");
    const user = await waitForFirebaseUser();
    if (!user) throw Object.assign(new Error("Connecte-toi pour créer ta carte professionnelle."), { status: 401 });
    try {
      const r = await getMyBusinessCard();
      if (r.profileId) {
        rememberProfile(r.profileId);
        return r.profileId;
      }
    } catch (e) {
      const status = cardHttpStatus(e);
      if (status === 401 || status === 403 || status === 404) throw e;
    }
    const { myProfileId } = await import("../lib/lot7/api");
    const id = await myProfileId();
    rememberProfile(id);
    return id;
  }
  async function uploadRole(role: "cover" | "logo", file: { uri: string; mime: string }, id: string) {
    const media = await uploadBusinessImageFile(id, file.uri, file.mime, role, (sent, total) => {
      setUploadLabel(total > 0 ? `Envoi… ${Math.round((sent / total) * 100)}%` : "Envoi…");
    });
    if (role === "cover") {
      localRef.current.cover = undefined;
      pathRef.current.cover = media.path;
      set("coverPath", media.path);
      set("coverUrl", media.url || file.uri);
    } else {
      localRef.current.logo = undefined;
      pathRef.current.logo = media.path;
      set("logoPath", media.path);
      set("logoUrl", media.url || file.uri);
    }
    return media.path;
  }
  async function pick(role: "cover" | "logo" | "photo") {
    setError("");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Accès aux photos refusé.");
      Alert.alert("Photos", "WIPP a besoin d’accéder à tes photos pour la carte.", [
        { text: "Annuler", style: "cancel" },
        { text: "Réglages", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    const asset = res.assets?.[0];
    if (res.canceled || !asset?.uri) return;
    const mime = asset.mimeType ?? "image/jpeg";
    if (role === "photo") {
      setUploadLabel("Envoi…");
      try {
        const id = await resolveProfile();
        const media = await uploadBusinessImageFile(id, asset.uri, mime, "photo");
        setDraft((d) => ({
          ...d,
          photoPaths: [...d.photoPaths, media.path].slice(0, 8),
          photoUrls: [...d.photoUrls, media.url || asset.uri].slice(0, 8),
        }));
      } catch (e) {
        setError(cardErrorMessage(e, "Envoi de l’image impossible. Réessaie."));
      } finally {
        setUploadLabel("");
      }
      return;
    }
    setDraft((d) => (role === "cover" ? { ...d, coverUrl: asset.uri } : { ...d, logoUrl: asset.uri }));
    if (role === "cover") localRef.current.cover = { uri: asset.uri, mime };
    else localRef.current.logo = { uri: asset.uri, mime };
    setUploadLabel("Envoi…");
    try {
      const id = await resolveProfile();
      await uploadRole(role, { uri: asset.uri, mime }, id);
    } catch (e) {
      setError(cardErrorMessage(e, "Envoi de l’image impossible. Réessaie."));
    } finally {
      setUploadLabel("");
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      let coverPath = pathRef.current.cover ?? draft.coverPath;
      let logoPath = pathRef.current.logo ?? draft.logoPath;
      if (localRef.current.cover || localRef.current.logo) {
        const id = await resolveProfile();
        if (localRef.current.cover) coverPath = await uploadRole("cover", localRef.current.cover, id);
        if (localRef.current.logo) logoPath = await uploadRole("logo", localRef.current.logo, id);
      }
      const saved = await saveMyBusinessCard({
        name: draft.name,
        category: draft.category,
        description: draft.description,
        country: draft.country,
        city: draft.city,
        address: draft.address,
        showAddress: draft.showAddress,
        hours: draft.hours,
        businessPhone: draft.businessPhone,
        website: draft.website,
        coverPath,
        logoPath,
        photoPaths: draft.photoPaths,
      });
      // Position for "à proximité": the picked address, else the city centre.
      void (async () => {
        const { geocodeCity } = await import("../lib/geo");
        const where = coordsRef.current ?? (await geocodeCity(draft.city.trim(), cardCountry.id));
        if (where) {
          const { saveCardPosition } = await import("../lib/lot7/api");
          await saveCardPosition(where.lat, where.lng).catch(() => undefined);
        }
      })();
      if (!saved?.publicId && !saved?.name) {
        setError("Le serveur n’a pas renvoyé la carte enregistrée.");
        return;
      }
      // Alert.alert does nothing in a browser: on web, open the card directly.
      if (Platform.OS === "web") replace({ name: "business-card" });
      else
        Alert.alert("Carte enregistrée", "Ta carte est enregistrée. La photo et la bannière se rechargent à l’ouverture.", [
          { text: "Voir ma carte", onPress: () => replace({ name: "business-card" }) },
        ]);
    } catch (e) {
      const status = cardHttpStatus(e);
      console.warn("[wipp] card save failed", status || "no-status", errorText(e, "unknown"));
      setError(cardErrorMessage(e, "Enregistrement impossible."));
    } finally {
      setBusy(false);
    }
  }
  if (busy && !profileId) {
    return (
      <ScreenRoot>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenRoot>
    );
  }
  return (
    <EdgeBack onBack={pop}>
    <ScreenRoot>
      <GlassHeader>
        <Header
          title={hasCard ? "Modifier ma carte" : "Créer ma carte de visite"}
          onBack={pop}
          right={hasCard ? (
            <Press onPress={pop} accessibilityLabel="Aperçu">
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>Aperçu</Text>
            </Press>
          ) : undefined}
        />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View>
          <Press accessibilityLabel="Bannière" onPress={() => void pick("cover")} style={{ height: 168, borderRadius: 18, overflow: "hidden", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
            {draft.coverUrl ? <Image source={{ uri: draft.coverUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : null}
            {uploadLabel ? (
              <Text style={{ position: "absolute", top: 8, color: colors.paper, fontSize: 13 }}>{uploadLabel}</Text>
            ) : draft.coverUrl ? (
              <CoverCameraHint />
            ) : (
              <View style={{ alignItems: "center", gap: 6 }}>
                <ImagePlus size={28} color={colors.accent} />
                <Text style={{ color: colors.fg, fontSize: 13 }}>Ajouter une bannière</Text>
              </View>
            )}
          </Press>
          <Press accessibilityLabel="Photo" onPress={() => void pick("logo")} style={{ marginTop: -36, marginLeft: 16, width: 84, height: 84 }}>
            <View style={{ flex: 1, borderRadius: 42, overflow: "hidden", backgroundColor: colors.navy, borderWidth: 3, borderColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
              {draft.logoUrl ? (
                <Image source={{ uri: draft.logoUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
              ) : (
                <Camera size={26} color={colors.accent} />
              )}
            </View>
            {/* Edit badge only once a photo exists, outside the clipped circle so it is fully visible. */}
            {draft.logoUrl ? (
              <View style={{ position: "absolute", right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                <Camera size={14} color={colors.accentFg} />
              </View>
            ) : null}
          </Press>
        </View>
        {draft.coverUrl ? (
          <Press onPress={() => { localRef.current.cover = undefined; pathRef.current.cover = null; set("coverPath", null); set("coverUrl", null); }} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Retirer la bannière</Text>
          </Press>
        ) : null}
        {draft.logoUrl ? (
          <Press onPress={() => { localRef.current.logo = undefined; pathRef.current.logo = null; set("logoPath", null); set("logoUrl", null); }} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Retirer la photo</Text>
          </Press>
        ) : null}
        <View style={{ marginTop: 16, gap: 12 }}>
          <Field label="Nom de la boutique *" value={draft.name} onChangeText={(v) => set("name", v)} />
          <SelectField label="Catégorie *" value={draft.category} placeholder="Choisis ta catégorie" onPress={() => setCategoryOpen(true)} />
          <Field
            label="Description"
            value={draft.description}
            onChangeText={(v) => set("description", v.slice(0, 600))}
            placeholder="Ex. Salon de tresses à Abidjan depuis 2019. Box braids, nattes collées, perruques sur mesure. Sur rendez-vous, déplacement possible."
            multiline
          />
          <Text style={{ marginTop: -6, fontSize: 11, color: "rgba(249,250,251,0.45)" }}>
            Dis ce que tu proposes, pour qui, et ce qui te rend unique. {draft.description.length}/600
          </Text>
          <SelectField
            label="Pays *"
            value={cardCountry.fr}
            placeholder="Choisis un pays"
            left={<FlagImage id={cardCountry.id} />}
            onPress={() => setCountryOpen(true)}
          />
          <Field label="Ville *" value={draft.city} onChangeText={(v) => set("city", v)} />
          <AddressField country={cardCountry} value={draft.address ?? ""} onChange={(v) => set("address", v)} onPickCity={(c) => set("city", c)} onPickCoords={(lat, lng) => (coordsRef.current = { lat, lng })} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Afficher l’adresse sur ma carte</Text>
              <Text style={{ marginTop: 3, color: colors.muted, fontSize: 12, lineHeight: 16 }}>
                {draft.showAddress
                  ? "Les clients voient ton adresse et peuvent venir te voir."
                  : "Adresse masquée : seuls la ville et le pays sont visibles. Utile si tu travailles à domicile."}
              </Text>
            </View>
            <Toggle value={draft.showAddress} onChange={(v) => set("showAddress", v)} />
          </View>
          <SelectField label="Horaires (facultatifs)" value={draft.hours} placeholder="Choisir les jours et les heures" onPress={() => setHoursOpen(true)} />
          <DialPhoneField country={cardCountry} value={draft.businessPhone ?? ""} onChange={(v) => set("businessPhone", v)} />
          <Text style={{ fontSize: 11, color: "rgba(249,250,251,0.45)" }}>Ton numéro personnel WIPP n’est jamais utilisé.</Text>
          <Field label="Lien site web (optionnel)" value={draft.website ?? ""} placeholder="www.monactivite.ca" keyboardType="url" autoCapitalize="none" onChangeText={(v) => set("website", v || null)} />
        </View>
        <Text style={{ marginTop: 20, marginBottom: 8, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Photos de la boutique</Text>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {draft.photoUrls.map((url) => (
            <Image key={url} source={{ uri: url }} style={{ width: 96, height: 80, borderRadius: 12 }} contentFit="cover" />
          ))}
          {draft.photoUrls.length < 8 ? (
            <Press onPress={() => void pick("photo")} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
              <ImagePlus size={22} color={colors.accent} />
            </Press>
          ) : null}
        </ScrollView>
        {error ? <Text style={{ marginTop: 16, color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
        <Btn label={busy ? "Enregistrement…" : hasCard ? "Enregistrer les modifications" : "Créer ma carte de visite"} disabled={busy || !draft.name.trim() || !draft.category.trim() || !draft.city.trim()} onPress={() => void save()} style={{ marginTop: 24 }} />
      </ScrollView>
      <WorldCountrySheet
        open={countryOpen}
        selectedId={cardCountry.id}
        onClose={() => setCountryOpen(false)}
        onPick={(c) => {
          // Keep the phone number, switch its calling code to the new country.
          setDraft((d) => {
            const local = d.businessPhone ? d.businessPhone.replace(/^\+\d+\s*/, "") : "";
            return { ...d, country: c.fr, businessPhone: local ? `${c.dial} ${local}` : d.businessPhone };
          });
        }}
      />
      <CategorySheet open={categoryOpen} categories={CARD_CATEGORIES} selected={draft.category} onClose={() => setCategoryOpen(false)} onPick={(c) => set("category", c)} />
      <HoursSheet open={hoursOpen} onClose={() => setHoursOpen(false)} onSave={(v) => set("hours", v)} />
    </ScreenRoot>
    </EdgeBack>
  );
}

function useCardContacts() {
  const chats = useWippStore((s) => s.chats);
  const users = useWippStore((s) => s.users);
  return useMemo(
    () =>
      chats
        .filter((c) => c.type === "dm" && !c.shopId)
        .map((c) => {
          const id = c.participantIds.find((x) => x !== "me");
          const user = id ? users[id] : undefined;
          return user ? { id: c.id, name: user.displayName, username: user.username, avatar: user.avatar } : null;
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    [chats, users],
  );
}

function OwnedCard({ card, onBack, onEdit }: { card: BusinessCardView; onBack: () => void; onEdit: () => void }) {
  const sendMessage = useWippStore((s) => s.sendMessage);
  const push = useWippStore((s) => s.push);
  const contacts = useCardContacts();
  return (
    <BusinessCardExperience
      card={card}
      owner
      onBack={onBack}
      onEdit={onEdit}
      contacts={contacts}
      onSend={(chatId) => {
        const shop = cardToShop(card);
        useWippStore.setState((s) => ({ shops: s.shops.some((x) => x.id === shop.id) ? s.shops : [...s.shops, shop] }));
        sendMessage(chatId, { type: "shop", text: card.name, shopId: shop.id, imageUrl: shop.logo || shop.image });
        push({ name: "conversation", chatId });
      }}
    />
  );
}

export function BusinessCardViewScreen({ publicId }: { publicId: string }) {
  const pop = useWippStore((s) => s.pop);
  const contacts = useCardContacts();
  const [card, setCard] = useState<BusinessCardView | null | undefined>();
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    void getPublicBusinessCard(publicId.replace(/^business:/, ""))
      .then(async (next) => setCard(next ? await withSignedCardMedia(next) : null))
      .catch(() => setCard(null));
  }, [publicId]);
  if (!card) {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header title="Carte professionnelle" onBack={pop} />
        </GlassHeader>
        {card === null ? (
          <Text style={{ padding: 24, textAlign: "center", color: colors.muted }}>Cette carte n’est pas disponible.</Text>
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        )}
      </ScreenRoot>
    );
  }
  const place = [card.address, card.city, card.country].filter(Boolean).join(", ");
  return (
    <BusinessCardExperience
      card={card}
      onBack={pop}
      opening={opening}
      contacts={contacts}
      onSend={(chatId) => {
        const shop = cardToShop(card);
        useWippStore.getState().sendMessage(chatId, { type: "shop", text: card.name, shopId: shop.id, imageUrl: shop.logo || shop.image });
        useWippStore.getState().push({ name: "conversation", chatId });
      }}
      onWrite={() => {
        setOpening(true);
        void useWippStore.getState().openBusinessChat(card.publicId).catch((err) => {
          setOpening(false);
          Alert.alert("Conversation", errorText(err, "Impossible d’ouvrir la conversation."));
        });
      }}
      onCall={card.businessPhone ? () => void Linking.openURL(`tel:${card.businessPhone}`) : undefined}
      onRoute={place ? () => void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(place)}`) : undefined}
    />
  );
}

export function AdminScreen() {
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Admin" onBack={pop} />
      </GlassHeader>
      <PendingNote label="adminCheck serveur — non exposé sans session" />
    </ScreenRoot>
  );
}

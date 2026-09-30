import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock,
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
  Store,
  Tag,
  User,
  UserPlus,
} from "lucide-react-native";
import { Image } from "expo-image";
import { Avatar } from "../components/Avatar";
import { WippWordmark } from "../components/Logo";
import { QrCard } from "../components/QrCard";
import { Btn, Field, GlassHeader, Header, PendingNote, Press, Row, ScreenRoot, SearchField, Section, Toggle } from "../components/ui";
import { LEGAL_CONTACT, legalDoc, type LegalDocId } from "../lib/legal";
import { COUNTRIES } from "../lib/countries";
import {
  CARD_CATEGORIES,
  cardLink,
  cardToShop,
  getMyBusinessCard,
  getPublicBusinessCard,
  saveMyBusinessCard,
  uploadBusinessImage,
  type BusinessCardView,
  type CardInput,
} from "../lib/business-card";
import { businessQr } from "../lib/qr-payload";
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
  const contacts = Object.values(users).filter((u) => u.connected).length;
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
              <View>
                <View style={{ borderRadius: 999, borderWidth: 2, borderColor: colors.accent, padding: 2 }}>
                  <Avatar user={me} size={72} />
                </View>
                <View style={{ position: "absolute", right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                  <Camera size={14} color={colors.accentFg} />
                </View>
              </View>
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
          <Row label={t("blocked")} onPress={() => push({ name: "blocked" })} />
          <Row label="Photo" value="Tout le monde" />
          <Row label="Dernière connexion" value="Contacts" />
          <Row label="Appels" value="Contacts" />
          <Row label="Stories" value="Contacts" />
        </Section>
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
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("blocked")} onBack={pop} />
      </GlassHeader>
      {blocked.length === 0 ? <Text style={{ padding: 16, color: colors.muted }}>Personne n’est bloqué.</Text> : blocked.map((id) => <Row key={id} label={id} />)}
    </ScreenRoot>
  );
}

export function DeleteAccountScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("deleteAccount")} onBack={pop} />
      </GlassHeader>
      <PendingNote label="Suppression compte serveur" />
      <Text style={{ padding: 16, color: colors.muted }}>{t("deleteAccountBody")}</Text>
      <View style={{ padding: 16 }}>
        <Btn label={t("deleteAccountCta")} variant="danger" onPress={pop} />
      </View>
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
  const listings = allListings.filter((l) => (kind === "saved" ? saves.some((s) => s.kind === "listing" && s.id === l.id) : l.sellerId === "me"));
  const events = allEvents.filter((e) => (kind === "saved" ? saves.some((s) => s.kind === "event" && s.id === e.id) : e.hostId === "me"));
  const savedShops = shops.filter((s) => saves.some((x) => x.kind === "business" && (x.id === s.handle || x.id === s.id)));
  const title = kind === "listings" ? "Mes annonces" : kind === "events" ? "Mes événements" : "Enregistrés";
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {kind === "saved" ? savedShops.map((s) => (
          <Press key={s.id} onPress={() => push({ name: "business-card-view", publicId: s.handle })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{s.name}</Text>
          </Press>
        )) : null}
        {kind !== "events" ? listings.map((l) => (
          <Press key={l.id} onPress={() => push({ name: "listing", listingId: l.id })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{l.title}</Text>
          </Press>
        )) : null}
        {kind !== "listings" ? events.map((e) => (
          <Press key={e.id} onPress={() => push({ name: "lifestyle", itemId: e.id })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{e.title}</Text>
          </Press>
        )) : null}
        {kind === "listings" && listings.length === 0 ? <Text style={{ padding: 16, color: colors.muted }}>Aucune annonce</Text> : null}
        {kind === "events" && events.length === 0 ? <Text style={{ padding: 16, color: colors.muted }}>Aucun événement</Text> : null}
        {kind === "saved" && listings.length + events.length + savedShops.length === 0 ? <Text style={{ padding: 16, color: colors.muted }}>Rien d’enregistré</Text> : null}
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
      } catch {
        setCard(null);
        setError("Connecte-toi pour créer ta carte professionnelle.");
      }
    })();
  }, []);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={card?.name || "Ma carte de visite"} onBack={pop} />
      </GlassHeader>
      {card === undefined ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : card ? (
        <BusinessCardBody card={card} owner onEdit={() => push({ name: "business-card-editor" })} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 28 }}>
          <View style={{ alignSelf: "center", width: 80, height: 80, borderRadius: 16, backgroundColor: "rgba(255,216,77,0.1)", alignItems: "center", justifyContent: "center" }}>
            <Store size={40} color={colors.accent} />
          </View>
          <Text style={{ marginTop: 28, fontSize: 29, fontFamily: "Inter_600SemiBold", color: colors.fg, lineHeight: 32 }}>
            Crée ta carte{"\n"}
            <Text style={{ color: colors.accent }}>professionnelle</Text>
          </Text>
          <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 22, color: "rgba(249,250,251,0.6)" }}>
            Fais découvrir ton activité sur WIPP et permets aux gens de te contacter sans partager ton numéro personnel.
          </Text>
          {[
            ["Présente ton activité", "Photos, description, horaires…"],
            ["Partage ton QR professionnel", "À imprimer ou à partager sur WIPP."],
            ["Reçois des messages sur WIPP", "Les personnes te contactent directement."],
          ].map(([title, sub]) => (
            <View key={title} style={{ marginTop: 12, flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.navy }}>
              <View>
                <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{title}</Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: "rgba(249,250,251,0.5)" }}>{sub}</Text>
              </View>
            </View>
          ))}
          {error ? <Text style={{ marginTop: 12, color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
          <Btn label="Créer ma carte de visite →" onPress={() => push({ name: "business-card-editor" })} style={{ marginTop: 20 }} />
        </ScrollView>
      )}
    </ScreenRoot>
  );
}

type Draft = CardInput & { coverUrl: string | null; logoUrl: string | null; photoUrls: string[] };
const emptyDraft: Draft = {
  name: "",
  category: "Mode & accessoires",
  description: "",
  country: "Canada",
  city: "",
  address: null,
  showAddress: false,
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

export function BusinessCardEditorScreen() {
  const pop = useWippStore((s) => s.pop);
  const replace = useWippStore((s) => s.replace);
  const [profileId, setProfileId] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        const r = await getMyBusinessCard();
        setProfileId(r.profileId);
        if (r.userCountry && !r.card) setDraft((d) => ({ ...d, country: r.userCountry! }));
        if (r.card) {
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
            photoPaths: r.card.photoPaths,
            coverUrl: r.card.coverUrl,
            logoUrl: r.card.logoUrl,
            photoUrls: r.card.photoUrls,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setBusy(false);
      }
    })();
  }, []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  async function pick(role: "cover" | "logo" | "photo") {
    if (!profileId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, base64: true });
    if (res.canceled || !res.assets[0]?.base64) return;
    setBusy(true);
    try {
      const b64 = res.assets[0].base64;
      const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const mime = res.assets[0].mimeType ?? "image/jpeg";
      const media = await uploadBusinessImage(profileId, bytes, mime, role);
      if (role === "cover") {
        set("coverPath", media.path);
        set("coverUrl", media.url);
      } else if (role === "logo") {
        set("logoPath", media.path);
        set("logoUrl", media.url);
      } else {
        set("photoPaths", [...draft.photoPaths, media.path].slice(0, 8));
        set("photoUrls", [...draft.photoUrls, media.url].slice(0, 8));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveMyBusinessCard({
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
        coverPath: draft.coverPath,
        logoPath: draft.logoPath,
        photoPaths: draft.photoPaths,
      });
      replace({ name: "business-card" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
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
    <ScreenRoot>
      <GlassHeader>
        <Header title="Modifier ma carte" onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Press onPress={() => void pick("cover")} style={{ height: 144, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          {draft.coverUrl ? <Image source={{ uri: draft.coverUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <ImagePlus size={28} color={colors.accent} />}
          <Text style={{ position: "absolute", bottom: 8, color: colors.paper, fontSize: 10 }}>Photo de couverture</Text>
        </Press>
        <Press onPress={() => void pick("logo")} style={{ marginTop: 16, width: 80, height: 80, borderRadius: 40, overflow: "hidden", backgroundColor: colors.navy, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          {draft.logoUrl ? <Image source={{ uri: draft.logoUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <ImagePlus size={24} color={colors.accent} />}
        </Press>
        <View style={{ marginTop: 16, gap: 12 }}>
          <Field label="Nom de l’activité *" value={draft.name} onChangeText={(v) => set("name", v)} />
          <Text style={{ fontSize: 12, color: colors.muted }}>Catégorie *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CARD_CATEGORIES.map((c) => (
              <Press
                key={c}
                onPress={() => set("category", c)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: draft.category === c ? colors.accent : colors.navy,
                }}
              >
                <Text style={{ color: draft.category === c ? colors.accentFg : colors.fg, fontSize: 13 }}>{c}</Text>
              </Press>
            ))}
          </ScrollView>
          <Field label="Description" value={draft.description} onChangeText={(v) => set("description", v)} multiline />
          <Press onPress={() => setCountryOpen(true)} style={{ borderRadius: 8, backgroundColor: colors.navy, padding: 16 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Pays *</Text>
            <Text style={{ marginTop: 4, color: colors.fg }}>{draft.country}</Text>
          </Press>
          <Field label="Ville *" value={draft.city} onChangeText={(v) => set("city", v)} />
          <Field label="Adresse (facultative)" value={draft.address ?? ""} onChangeText={(v) => set("address", v || null)} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: colors.fg, fontSize: 13 }}>Publier l’adresse précise</Text>
            <Toggle value={draft.showAddress} onChange={(v) => set("showAddress", v)} />
          </View>
          <Field label="Horaires (facultatifs)" value={draft.hours ?? ""} placeholder="Lun–Sam · 10 h–19 h" onChangeText={(v) => set("hours", v || null)} />
          <Field label="Téléphone professionnel (facultatif)" value={draft.businessPhone ?? ""} keyboardType="phone-pad" onChangeText={(v) => set("businessPhone", v || null)} />
          <Text style={{ fontSize: 11, color: "rgba(249,250,251,0.45)" }}>Ton numéro personnel WIPP n’est jamais utilisé.</Text>
          <Field label="Site web (facultatif)" value={draft.website ?? ""} placeholder="www.monactivite.ca" keyboardType="url" autoCapitalize="none" onChangeText={(v) => set("website", v || null)} />
        </View>
        <Text style={{ marginTop: 20, marginBottom: 8, fontSize: 12, color: colors.muted }}>Photos de l’activité · {draft.photoUrls.length}/8</Text>
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
        <Btn label={busy ? "Enregistrement…" : "Enregistrer"} disabled={busy || !draft.name.trim() || !draft.city.trim()} onPress={() => void save()} style={{ marginTop: 24 }} />
      </ScrollView>
      <Modal visible={countryOpen} transparent animationType="slide" onRequestClose={() => setCountryOpen(false)}>
        <Press onPress={() => setCountryOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <Press onPress={() => undefined} style={{ maxHeight: "70%", backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", marginBottom: 12 }}>Choisir un pays</Text>
            <ScrollView>
              {COUNTRIES.map((c) => (
                <Press
                  key={c.id}
                  onPress={() => {
                    set("country", c.fr);
                    setCountryOpen(false);
                  }}
                  style={{ paddingVertical: 12 }}
                >
                  <Text style={{ color: colors.fg }}>{c.fr}</Text>
                </Press>
              ))}
            </ScrollView>
          </Press>
        </Press>
      </Modal>
    </ScreenRoot>
  );
}

export function BusinessCardViewScreen({ publicId }: { publicId: string }) {
  const pop = useWippStore((s) => s.pop);
  const [card, setCard] = useState<BusinessCardView | null | undefined>();
  useEffect(() => {
    void getPublicBusinessCard(publicId.replace(/^business:/, "")).then(setCard).catch(() => setCard(null));
  }, [publicId]);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={card?.name || "Carte professionnelle"} onBack={pop} />
      </GlassHeader>
      {card ? (
        <BusinessCardBody card={card} />
      ) : card === null ? (
        <Text style={{ padding: 24, textAlign: "center", color: colors.muted }}>Cette carte n’est pas disponible.</Text>
      ) : (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      )}
    </ScreenRoot>
  );
}

function BusinessCardBody({
  card,
  owner,
  onEdit,
}: {
  card: BusinessCardView;
  owner?: boolean;
  onEdit?: () => void;
}) {
  const push = useWippStore((s) => s.push);
  const chats = useWippStore((s) => s.chats);
  const users = useWippStore((s) => s.users);
  const sendMessage = useWippStore((s) => s.sendMessage);
  const [share, setShare] = useState(false);
  const [q, setQ] = useState("");
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState("");
  const savedBiz = useWippStore((s) => s.saves.some((item) => item.kind === "business" && item.id === card.publicId));
  const link = cardLink(card.publicId);
  const qr = businessQr(card.publicId);
  const contacts = chats
    .filter((c) => c.type === "dm" && !c.shopId)
    .map((c) => {
      const id = c.participantIds.find((x) => x !== "me");
      return id ? { chat: c, user: users[id] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x?.user))
    .filter((x) => !isPrivateChat(x.chat.id))
    .filter((x) => `${x.user.displayName} ${x.user.username}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);
  async function writeOnWipp() {
    setOpening(true);
    setActionError("");
    try {
      await useWippStore.getState().openBusinessChat(card.publicId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible d’ouvrir la conversation");
    } finally {
      setOpening(false);
    }
  }
  function shareTo(chatId: string) {
    const shop = cardToShop(card);
    useWippStore.setState((s) => ({
      shops: s.shops.some((x) => x.id === shop.id) ? s.shops : [...s.shops, shop],
    }));
    sendMessage(chatId, { type: "shop", text: card.name, shopId: shop.id, imageUrl: shop.logo || shop.image });
    setShare(false);
    push({ name: "conversation", chatId });
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView>
        <View style={{ height: 160, backgroundColor: colors.navy }}>
          {card.coverUrl ? <Image source={{ uri: card.coverUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Store size={48} color="rgba(255,216,77,0.6)" />
            </View>
          )}
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ marginTop: -24, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            {card.logoUrl ? (
              <Image source={{ uri: card.logoUrl }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.accent }} />
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.navy, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.accent, fontSize: 20, fontFamily: "Inter_600SemiBold" }}>{card.name.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, paddingBottom: 4 }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{card.name}</Text>
              <Text style={{ fontSize: 12, color: "rgba(249,250,251,0.55)" }}>{card.category}</Text>
            </View>
          </View>
          <View style={{ marginTop: 20, gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MapPin size={16} color={colors.accent} />
              <Text style={{ color: "rgba(249,250,251,0.75)", fontSize: 12, flex: 1 }}>
                {card.address ? `${card.address}\n${card.city}, ${card.country}` : `${card.city}, ${card.country}`}
              </Text>
            </View>
            {card.hours ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Clock size={16} color={colors.accent} />
                <Text style={{ color: "rgba(249,250,251,0.75)", fontSize: 12 }}>{card.hours}</Text>
              </View>
            ) : null}
            {card.website ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Globe size={16} color={colors.accent} />
                <Text style={{ color: "rgba(249,250,251,0.75)", fontSize: 12 }}>{card.website}</Text>
              </View>
            ) : null}
          </View>
          {card.description ? <Text style={{ marginTop: 16, fontSize: 13, lineHeight: 20, color: "rgba(249,250,251,0.8)" }}>{card.description}</Text> : null}
          {card.photoUrls.length ? (
            <ScrollView horizontal style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
              {card.photoUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={{ width: 96, height: 80, borderRadius: 8 }} contentFit="cover" />
              ))}
            </ScrollView>
          ) : null}
          {owner ? (
            <View style={{ marginTop: 20, flexDirection: "row", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 16 }}>
              <QrCard value={qr} size={124} pad={5} />
              <Text style={{ flex: 1, fontSize: 13, color: colors.fg }}>Scanner pour découvrir ma carte sur WIPP.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", padding: 16, paddingBottom: 20, backgroundColor: colors.ink }}>
        {actionError ? <Text style={{ marginBottom: 8, color: colors.danger, fontSize: 12 }}>{actionError}</Text> : null}
        {owner ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Btn label="Modifier" variant="secondary" onPress={onEdit} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn label="Partager" variant="secondary" onPress={() => setShare(true)} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Btn label={opening ? "Ouverture…" : "Écrire sur WIPP"} disabled={opening} onPress={() => void writeOnWipp()} />
            <Btn
              label={savedBiz ? "Retirer" : "Enregistrer"}
              variant="secondary"
              onPress={() => {
                const on = savedBiz;
                void import("../lib/lot7/api").then(async ({ toggleSave }) => {
                  await toggleSave("business", card.publicId, !on);
                  useWippStore.setState((s) => ({
                    saves: on
                      ? s.saves.filter((x) => !(x.kind === "business" && x.id === card.publicId))
                      : [...s.saves, { kind: "business", id: card.publicId }],
                  }));
                });
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {card.businessPhone ? (
                <View style={{ flex: 1 }}>
                  <Btn label="Appeler" variant="secondary" onPress={() => void Linking.openURL(`tel:${card.businessPhone}`)} />
                </View>
              ) : null}
              {card.address || card.city ? (
                <View style={{ flex: 1 }}>
                  <Btn
                    label="Itinéraire"
                    variant="secondary"
                    onPress={() => void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent([card.address, card.city, card.country].filter(Boolean).join(", "))}`)}
                  />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Btn label="Partager" variant="secondary" onPress={() => setShare(true)} />
              </View>
            </View>
          </View>
        )}
      </View>
      <Modal visible={share} transparent animationType="slide" onRequestClose={() => setShare(false)}>
        <Press onPress={() => setShare(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <Press onPress={() => undefined} style={{ maxHeight: "70%", backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", marginBottom: 12 }}>Partager ma carte professionnelle</Text>
            <SearchField value={q} onChangeText={setQ} placeholder="Rechercher un contact" />
            <ScrollView horizontal contentContainerStyle={{ gap: 12, marginTop: 12 }}>
              {contacts.map(({ chat, user }) => (
                <Press key={chat.id} onPress={() => shareTo(chat.id)} style={{ width: 56, alignItems: "center" }}>
                  <Avatar user={user} size={46} />
                  <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 10, color: colors.fg }}>{user.firstName}</Text>
                </Press>
              ))}
            </ScrollView>
            <Press onPress={() => void shareWippPublic(`Découvre ${card.name} sur WIPP ${link}`)} style={{ marginTop: 16, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Share2 size={20} color={colors.accent} />
              <Text style={{ color: colors.fg }}>Partager le lien professionnel</Text>
            </Press>
            <Press onPress={() => void shareWippPublic(qr)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <QrCode size={20} color={colors.accent} />
              <Text style={{ color: colors.fg }}>Partager le QR</Text>
            </Press>
          </Press>
        </Press>
      </Modal>
    </View>
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

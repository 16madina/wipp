import { useState } from "react";
import { Alert, ScrollView, Share, Text, View } from "react-native";
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
} from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { WippWordmark } from "../components/Logo";
import { Btn, Field, GlassHeader, Header, PendingNote, Press, Row, ScreenRoot, Section, Toggle } from "../components/ui";
import { LEGAL_CONTACT, legalDoc, type LegalDocId } from "../lib/legal";
import { TAKEN_USERNAMES } from "../lib/seed";
import { APP_HOST } from "../lib/utils";
import { useT, useWippStore } from "../lib/store";
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
  const groups = chats.filter((c) => c.type === "group" && c.participantIds.includes("me")).length;
  const myEvents = lifestyle.filter((e) => e.hostId === "me").length;
  const myListings = listings.filter((l) => l.sellerId === "me").length;
  const country = me.country === "CA" ? "Canada" : me.country;
  async function shareProfile() {
    const link = `https://${APP_HOST}/@${me.username}`;
    await Share.share({ message: `@${me.username} ${link}` });
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
            <Row icon={<Smartphone size={16} color={colors.fg} />} label={t("devices")} value="1" onPress={() => push({ name: "devices" })} />
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
  const push = useWippStore((s) => s.push);
  return (
    <SettingsList
      title={t("privacy")}
      rows={[
        { label: "WIPP Privé", onPress: () => push({ name: "wipp-private" }) },
        { label: t("blocked"), onPress: () => push({ name: "blocked" }) },
        { label: "Photo", value: "Tout le monde" },
        { label: "Dernière connexion", value: "Contacts" },
        { label: "Appels", value: "Contacts" },
        { label: "Stories", value: "Contacts" },
      ]}
    />
  );
}

export function SecurityScreen() {
  const t = useT();
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("security")} onBack={useWippStore.getState().pop} />
      </GlassHeader>
      <PendingNote label="Biométrie native — Phase 2" />
      <Section title="">
        <Row label="Verrouillage de l’app" value="Simulé (web)" />
        <Row label="Sessions" onPress={() => useWippStore.getState().push({ name: "devices" })} />
        <Row label={t("deleteAccount")} danger onPress={() => useWippStore.getState().push({ name: "delete-account" })} />
      </Section>
    </ScreenRoot>
  );
}

export function NotificationsScreen() {
  const t = useT();
  const [on, setOn] = useState(true);
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("notifications")} onBack={pop} />
      </GlassHeader>
      <PendingNote label="Push FCM / APNs — Phase 2" />
      <Row label="Messages" trailing={<Toggle value={on} onChange={setOn} />} />
      <Row label="Demandes" trailing={<Toggle value={on} onChange={setOn} />} />
      <Row label="Appels" trailing={<Toggle value={on} onChange={setOn} />} />
      <Row label="Stories" trailing={<Toggle value={on} onChange={setOn} />} />
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
      <Row label="Cet appareil" value="Expo" />
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
  const listings = allListings.filter((l) => l.sellerId === "me");
  const events = allEvents.filter((e) => e.hostId === "me");
  const title = kind === "listings" ? "Mes annonces" : kind === "events" ? "Mes événements" : "Enregistrés";
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {kind !== "events" ? listings.map((l) => (
          <Press key={l.id} onPress={() => push({ name: "listing", listingId: l.id })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{l.title}</Text>
          </Press>
        )) : events.map((e) => (
          <Press key={e.id} onPress={() => push({ name: "lifestyle", itemId: e.id })} style={{ padding: 16 }}>
            <Text style={{ color: colors.fg }}>{e.title}</Text>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function BusinessCardScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const me = useWippStore((s) => s.me);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Ma carte de visite" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 16, alignItems: "center" }}>
        <Avatar user={me} size={72} />
        <Text style={{ marginTop: 12, fontSize: 20, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{me.displayName}</Text>
        <Text style={{ color: colors.muted }}>{me.bio}</Text>
        <Btn label="Modifier" onPress={() => push({ name: "business-card-editor" })} style={{ marginTop: 20, alignSelf: "stretch" }} />
      </View>
    </ScreenRoot>
  );
}

export function BusinessCardEditorScreen() {
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Carte professionnelle" onBack={pop} />
      </GlassHeader>
      <PendingNote label="Cartes publiques serveur" />
      <View style={{ padding: 16 }}>
        <Btn label="Enregistrer" onPress={pop} />
      </View>
    </ScreenRoot>
  );
}

export function BusinessCardViewScreen({ publicId }: { publicId: string }) {
  const pop = useWippStore((s) => s.pop);
  const shop = useWippStore((s) => s.shops.find((s) => s.id === publicId || s.handle === publicId || s.id === `business:${publicId}`));
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={shop?.name ?? "Carte"} onBack={pop} />
      </GlassHeader>
      <Text style={{ padding: 16, color: colors.muted }}>{shop?.bio ?? publicId}</Text>
      <View style={{ padding: 16 }}>
        <Btn
          label="Écrire"
          onPress={() => void useWippStore.getState().openBusinessChat(shop?.handle ?? publicId)}
        />
      </View>
    </ScreenRoot>
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

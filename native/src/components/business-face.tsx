import { useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, Share, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import {
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  MessageCircle,
  Clock,
  Download,
  Globe,
  HelpCircle,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  QrCode,
  Share2,
} from "lucide-react-native";
import { Avatar } from "./Avatar";
import { QrCard } from "./QrCard";
import { WippWordmark } from "./Logo";
import { businessIntro } from "../lib/assets";
import { EdgeBack, GlassHeader, Header, Press, ScreenRoot, SearchField } from "./ui";
import { cardLink } from "../lib/business-card";
import type { BusinessCardView } from "../lib/business-card";
import { businessQr } from "../lib/qr-payload";
import { openState, socialUrl, websiteUrl } from "../lib/business-hours";
import { qrGrid } from "../lib/qr";
import { colors, fgA, whiteA } from "../theme";

export async function exportBusinessQr(value: string, name: string) {
  const grid = qrGrid(value);
  const cell = 10;
  const pad = 24;
  const size = grid.length * cell + pad * 2;
  const rects = grid
    .map((row, r) =>
      row
        .map((on, c) => (on ? `<rect x="${pad + c * cell}" y="${pad + r * cell}" width="${cell}" height="${cell}" rx="1" fill="#0B1220"/>` : ""))
        .join(""),
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#F7F9FC"/>${rects}</svg>`;
  const file = `${cacheDirectory ?? ""}wipp-${name.replace(/[^\w]+/g, "-").slice(0, 32) || "carte"}.svg`;
  await writeAsStringAsync(file, svg);
  await Share.share({ url: file, message: value });
}

function InfoRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <View style={{ width: 22, alignItems: "center", marginTop: 1 }}>{icon}</View>
      <Text style={{ flex: 1, color: fgA(0.82), fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function ActionButton({ icon, label, onPress, primary, grow }: { icon: ReactNode; label: string; onPress?: () => void; primary?: boolean; grow?: boolean }) {
  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      style={{
        flex: grow ? 1.5 : 1,
        height: 50,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 4,
        backgroundColor: primary ? colors.accent : colors.surface2,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.hair,
      }}
    >
      {icon}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, color: primary ? colors.accentFg : colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </Press>
  );
}

/** Round social network button (brand colours). */
function SocialButton({ kind, onPress }: { kind: "instagram" | "tiktok" | "facebook"; onPress: () => void }) {
  const size = 38;
  const label = kind === "instagram" ? "Instagram" : kind === "tiktok" ? "TikTok" : "Facebook";
  if (kind === "instagram") {
    return (
      <Press onPress={onPress} accessibilityLabel={label}>
        <LinearGradient colors={["#feda75", "#fa7e1e", "#d62976", "#962fbf"]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
          <Instagram size={20} color="#fff" />
        </LinearGradient>
      </Press>
    );
  }
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: kind === "tiktok" ? "#000" : "#1877f2", borderWidth: kind === "tiktok" ? 1 : 0, borderColor: "rgba(255,255,255,0.25)" }}>
      {kind === "tiktok" ? (
        <Svg width={19} height={19} viewBox="0 0 24 24">
          <Path fill="#fff" d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
        </Svg>
      ) : (
        <Facebook size={20} color="#fff" fill="#fff" />
      )}
    </Press>
  );
}

export function EmptyBusinessCard({ onCreate, onHelp, onBack }: { onCreate: () => void; onHelp: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <EdgeBack onBack={onBack}>
    <View style={{ flex: 1, backgroundColor: "#05070d" }}>
      {/* The artwork already holds the title, text and the three points: only the controls are drawn here. */}
      <View style={{ width: "100%", aspectRatio: 941 / 1670 }}>
        <Image source={businessIntro} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        <LinearGradient pointerEvents="none" colors={["rgba(5,7,13,0)", "#05070d"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
      </View>
      <View style={{ position: "absolute", top: insets.top + 6, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" }}>
        <Press accessibilityLabel="Retour" onPress={onBack} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Press>
        <Press accessibilityLabel="Aide" onPress={onHelp} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <HelpCircle size={22} color={colors.fg} />
        </Press>
      </View>
      <Press
        onPress={onCreate}
        style={{ position: "absolute", left: 22, right: 22, bottom: Math.max(insets.bottom, 16) + 8, height: 56, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold", fontSize: 17 }}>Créer ma carte de visite →</Text>
      </Press>
    </View>
    </EdgeBack>
  );
}

export function BusinessCardExperience({
  card,
  owner,
  onBack,
  onEdit,
  onWrite,
  opening,
  contacts,
  onSend,
  onCall,
  onRoute,
}: {
  card: BusinessCardView;
  owner?: boolean;
  onBack: () => void;
  onEdit?: () => void;
  onWrite?: () => void;
  opening?: boolean;
  contacts: { id: string; name: string; username: string; avatar?: string }[];
  onSend: (id: string) => void;
  onCall?: () => void;
  onRoute?: () => void;
}) {
  const [share, setShare] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [q, setQ] = useState("");
  const insets = useSafeAreaInsets();
  const back = share ? () => setShare(false) : onBack;
  const link = cardLink(card.publicId);
  const qr = businessQr(card.publicId);
  const photos = (card.photoUrls ?? []).filter((url) => url.startsWith("http") || url.startsWith("file"));
  const shown = photos.slice(0, 4);
  const extra = Math.max(0, photos.length - 4);
  const place = [card.address, card.city, card.country].filter(Boolean).join(", ");
  const filtered = contacts.filter((c) => `${c.name} ${c.username}`.toLowerCase().includes(q.trim().toLowerCase()));

  async function copyLink() {
    await Clipboard.setStringAsync(link);
    Alert.alert("Lien copié", "Le lien de ta carte est dans le presse-papiers.");
  }

  if (share) {
    return (
      <EdgeBack onBack={back}>
      <ScreenRoot>
        <GlassHeader>
          <Header title="Partager ma carte" onBack={back} />
        </GlassHeader>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 12 }} keyboardShouldPersistTaps="handled">
          <SearchField placeholder="Rechercher un contact" value={q} onChangeText={setQ} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 16 }}>
            {filtered.slice(0, 8).map((c) => (
              <Press key={c.id} onPress={() => onSend(c.id)} style={{ width: 64, alignItems: "center" }}>
                <Avatar user={{ displayName: c.name, avatar: c.avatar }} size={56} />
                <Text numberOfLines={1} style={{ marginTop: 6, color: colors.fg, fontSize: 12 }}>{c.name.split(" ")[0]}</Text>
              </Press>
            ))}
          </ScrollView>
          {[
            { icon: Share2, title: "Partager sur WIPP", sub: "Envoyer ma carte à un contact WIPP", go: () => undefined },
            { icon: Globe, title: "Copier le lien de ma carte", sub: "Le lien sera copié dans le presse-papiers", go: () => void copyLink() },
            { icon: QrCode, title: "Partager le QR code", sub: "Envoyer mon QR en image", go: () => void exportBusinessQr(qr, card.name).catch(() => Alert.alert("QR", "Le partage du QR a échoué.")) },
            { icon: Share2, title: "Partager ailleurs", sub: "WhatsApp, Instagram, etc.", go: () => void Share.share({ message: `${card.name} sur WIPP\n${link}` }) },
          ].map((row) => (
            <Press key={row.title} onPress={row.go} style={{ flexDirection: "row", gap: 14, alignItems: "center", paddingVertical: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
                <row.icon size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{row.title}</Text>
                <Text style={{ marginTop: 2, color: colors.muted, fontSize: 13 }}>{row.sub}</Text>
              </View>
            </Press>
          ))}
          <Text style={{ marginTop: 18, marginBottom: 8, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Récents</Text>
          {filtered.length === 0 ? <Text style={{ color: colors.muted }}>Aucun contact WIPP pour l’instant.</Text> : null}
          {filtered.map((c) => (
            <View key={`row-${c.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
              <Avatar user={{ displayName: c.name, avatar: c.avatar }} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{c.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>@{c.username}</Text>
              </View>
              <Press onPress={() => onSend(c.id)} style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold" }}>Envoyer</Text>
              </Press>
            </View>
          ))}
        </ScrollView>
        </KeyboardAvoidingView>
      </ScreenRoot>
      </EdgeBack>
    );
  }

  const openNow = openState(card.weekHours);
  const socials = [
    card.instagram ? { key: "instagram" as const, url: socialUrl.instagram(card.instagram) } : null,
    card.tiktok ? { key: "tiktok" as const, url: socialUrl.tiktok(card.tiktok) } : null,
    card.facebook ? { key: "facebook" as const, url: socialUrl.facebook(card.facebook) } : null,
  ].filter((x): x is { key: "instagram" | "tiktok" | "facebook"; url: string } => x !== null);
  const tags = (card.tags ?? []).filter(Boolean).slice(0, 3);
  const COVER = 230;
  const LOGO = 104;

  return (
    <EdgeBack onBack={onBack}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Cover, full width, fading into the page */}
        <View style={{ height: COVER, backgroundColor: colors.surface2 }}>
          {card.coverUrl ? (
            <Image source={{ uri: card.coverUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: COVER }} contentFit="cover" />
          ) : owner ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: card.coverUnresolved ? colors.danger : colors.muted, textAlign: "center", paddingHorizontal: 16 }}>
                {card.coverUnresolved ? "La bannière est enregistrée, mais son affichage a échoué." : "Ajoute une photo de couverture"}
              </Text>
            </View>
          ) : null}
          <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", colors.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
        </View>

        {/* Logo · name · category · tags */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, marginTop: -LOGO / 2 - 6, gap: 14 }}>
          <View style={{ width: LOGO + 8, height: LOGO + 8, borderRadius: (LOGO + 8) / 2, padding: 4, backgroundColor: colors.bg, shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 14 }}>
            <View style={{ flex: 1, borderRadius: LOGO / 2, borderWidth: 2.5, borderColor: colors.accent, overflow: "hidden", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              {card.logoUrl ? (
                <Image source={{ uri: card.logoUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <Text style={{ color: card.logoUnresolved ? colors.danger : colors.accent, fontFamily: "Inter_700Bold", fontSize: 30 }}>
                  {card.logoUnresolved ? "!" : card.name.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
          </View>
          <View style={{ flex: 1, paddingTop: LOGO / 2 + 10, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={2} style={{ flexShrink: 1, color: colors.fg, fontSize: 24, fontFamily: "Inter_700Bold" }}>{card.name}</Text>
              {card.verified ? <BadgeCheck size={22} color="#ffffff" fill="#1d9bf0" accessibilityLabel="Boutique vérifiée par WIPP" /> : null}
            </View>
            {card.category ? <Text style={{ marginTop: 2, color: colors.muted, fontSize: 14 }}>{card.category}</Text> : null}
          </View>
        </View>
        {tags.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 12 }}>
            {tags.map((t) => (
              <View key={t} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hair }}>
                <Text style={{ color: colors.fg, fontSize: 13 }}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Main actions */}
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 16 }}>
          {owner ? (
            <>
              <ActionButton primary icon={<Pencil size={18} color={colors.accentFg} />} label="Modifier" onPress={onEdit} />
              <ActionButton icon={<Share2 size={18} color={colors.fg} />} label="Partager" onPress={() => setShare(true)} />
            </>
          ) : (
            <>
              <ActionButton primary grow icon={<MessageCircle size={17} color={colors.accentFg} />} label={opening ? "Ouverture…" : "Écrire sur WIPP"} onPress={onWrite} />
              {onCall ? <ActionButton icon={<Phone size={16} color={colors.fg} />} label="Appeler" onPress={onCall} /> : null}
              {onRoute ? <ActionButton icon={<MapPin size={16} color={colors.fg} />} label="Itinéraire" onPress={onRoute} /> : null}
            </>
          )}
        </View>

        {/* Information + social networks */}
        <View style={{ marginHorizontal: 16, marginTop: 14, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hair, padding: 14, flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 12 }}>
            {place ? (
              <Press onPress={onRoute} disabled={!onRoute} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MapPin size={18} color={colors.accent} />
                <Text style={{ flex: 1, color: colors.fg, fontSize: 14 }}>{place}</Text>
                {onRoute ? <ChevronRight size={16} color={colors.muted} /> : null}
              </Press>
            ) : null}
            {card.hours ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Clock size={18} color={colors.accent} />
                <Text style={{ flexShrink: 1, color: colors.fg, fontSize: 14 }}>{card.hours}</Text>
                {openNow ? (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: openNow.open ? "rgba(46,204,113,0.16)" : "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: openNow.open ? "rgba(46,204,113,0.6)" : colors.hair }}>
                    <Text style={{ color: openNow.open ? "#2ecc71" : colors.muted, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{openNow.label}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {!owner && card.businessPhone ? (
              <Press onPress={onCall} disabled={!onCall} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Phone size={18} color={colors.accent} />
                <Text style={{ flex: 1, color: colors.fg, fontSize: 14 }}>{card.businessPhone}</Text>
              </Press>
            ) : null}
            {card.website ? (
              <Press onPress={() => void Linking.openURL(websiteUrl(card.website!))} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Globe size={18} color={colors.accent} />
                <Text numberOfLines={1} style={{ flex: 1, color: colors.fg, fontSize: 14 }}>{card.website}</Text>
              </Press>
            ) : null}
          </View>
          {socials.length ? (
            <View style={{ borderLeftWidth: 1, borderLeftColor: colors.hair, paddingLeft: 12, justifyContent: "center", gap: 10 }}>
              {socials.map((x) => (
                <SocialButton key={x.key} kind={x.key} onPress={() => void Linking.openURL(x.url)} />
              ))}
            </View>
          ) : null}
        </View>

        {card.description ? (
          <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hair, padding: 14 }}>
            <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_600SemiBold" }}>À propos</Text>
            <Text numberOfLines={aboutOpen ? undefined : 3} style={{ marginTop: 6, color: fgA(0.8), fontSize: 14, lineHeight: 21 }}>{card.description}</Text>
            {card.description.length > 140 ? (
              <Press onPress={() => setAboutOpen((v) => !v)} style={{ marginTop: 4 }}>
                <Text style={{ color: colors.accent, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{aboutOpen ? "Voir moins" : "Voir plus"}</Text>
              </Press>
            ) : null}
          </View>
        ) : null}

        {photos.length ? (
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, marginBottom: 10 }}>Photos de la boutique</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {photos.map((url) => (
                <Image key={url} source={{ uri: url }} style={{ width: 150, height: 120, borderRadius: 16 }} contentFit="cover" />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {owner ? (
          <View style={{ marginHorizontal: 16, marginTop: 18, borderRadius: 20, backgroundColor: colors.surface2, padding: 14, flexDirection: "row", gap: 14, alignItems: "center" }}>
            <QrCard value={qr} size={120} pad={6} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 16, lineHeight: 22, fontFamily: "Inter_600SemiBold" }}>Scannez pour{"\n"}découvrir ma carte{"\n"}sur WIPP</Text>
              <Press onPress={() => void exportBusinessQr(qr, card.name).catch(() => Alert.alert("QR", "Le téléchargement a échoué."))} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Download size={16} color={colors.accent} />
                <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>Télécharger le QR</Text>
              </Press>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating back / more over the cover */}
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 6, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" }}>
        <Press accessibilityLabel="Retour" onPress={onBack} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <ChevronLeft size={24} color="#fff" />
        </Press>
        <Press accessibilityLabel="Partager" onPress={() => (owner ? setShare(true) : void Share.share({ message: `${card.name}\n${link}` }))} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <MoreHorizontal size={22} color="#fff" />
        </Press>
      </View>

      {!owner ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: whiteA(0.06) }}>
          <Press onPress={() => void Share.share({ message: `${card.name}\n${link}` })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hair }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <QrCode size={22} color={colors.accentFg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Partager la boutique</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>QR WIPP · Lien · Réseaux</Text>
            </View>
          </Press>
        </View>
      ) : null}
    </View>
    </EdgeBack>
  );
}

export function CoverCameraHint() {
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 12, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Camera size={14} color={colors.fg} />
        <Text style={{ color: colors.fg, fontSize: 13 }}>Changer la photo de couverture</Text>
      </View>
    </View>
  );
}

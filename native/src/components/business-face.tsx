import { useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import {
  Camera,
  Clock,
  Download,
  Globe,
  HelpCircle,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  QrCode,
  Share2,
  Store,
} from "lucide-react-native";
import { Avatar } from "./Avatar";
import { QrCard } from "./QrCard";
import { WippWordmark } from "./Logo";
import { EdgeBack, GlassHeader, Header, Press, ScreenRoot, SearchField } from "./ui";
import { cardLink } from "../lib/business-card";
import type { BusinessCardView } from "../lib/business-card";
import { businessQr } from "../lib/qr-payload";
import { qrGrid } from "../lib/qr";
import { colors } from "../theme";

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
      <Text style={{ flex: 1, color: "rgba(249,250,251,0.82)", fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function EmptyBusinessCard({ onCreate, onHelp, onBack }: { onCreate: () => void; onHelp: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const cards = [
    { icon: Camera, title: "Présente ton activité", sub: "Photos, description, horaires..." },
    { icon: QrCode, title: "Partage ton QR professionnel", sub: "À imprimer ou à partager sur WIPP." },
    { icon: MessageCircle, title: "Reçois des messages sur WIPP", sub: "Les clients te contactent directement sur l’application." },
  ];
  return (
    <EdgeBack onBack={onBack}>
    <ScreenRoot>
      <GlassHeader>
        <Header
          title="Ma carte de visite"
          onBack={onBack}
          right={
            <Press accessibilityLabel="Aide" onPress={onHelp} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <HelpCircle size={22} color={colors.fg} />
            </Press>
          }
        />
      </GlassHeader>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 16) + 20, paddingTop: 18 }}>
        <View style={{ alignSelf: "center", width: 84, height: 84, borderRadius: 24, backgroundColor: "rgba(255,216,77,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Store size={40} color={colors.accent} />
        </View>
        <Text style={{ marginTop: 28, fontSize: 34, lineHeight: 38, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
          Crée ta carte{"\n"}
          <Text style={{ color: colors.accent }}>professionnelle</Text>
        </Text>
        <Text style={{ marginTop: 14, fontSize: 16, lineHeight: 23, color: "rgba(249,250,251,0.62)" }}>
          Fais découvrir ton activité sur WIPP et permets aux gens de te contacter sans partager ton numéro personnel.
        </Text>
        <View style={{ marginTop: 22, gap: 12 }}>
          {cards.map((item) => (
            <View key={item.title} style={{ flexDirection: "row", gap: 14, padding: 16, borderRadius: 18, backgroundColor: colors.navy }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,216,77,0.12)", alignItems: "center", justifyContent: "center" }}>
                <item.icon size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{item.title}</Text>
                <Text style={{ marginTop: 3, color: "rgba(249,250,251,0.55)", fontSize: 13, lineHeight: 18 }}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
        <Press onPress={onCreate} style={{ marginTop: 28, height: 54, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Créer ma carte de visite →</Text>
        </Press>
      </ScrollView>
    </ScreenRoot>
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

  return (
    <EdgeBack onBack={onBack}>
    <ScreenRoot>
      <GlassHeader>
        <Header
          title="Ma carte de visite"
          onBack={onBack}
          right={<MoreHorizontal size={22} color={colors.fg} />}
        />
      </GlassHeader>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ marginHorizontal: 16, borderRadius: 24, overflow: "hidden", backgroundColor: colors.navy }}>
          <View style={{ height: 168, backgroundColor: colors.navy }}>
            {card.coverUrl ? (
              <Image source={{ uri: card.coverUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 168 }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: card.coverUnresolved ? colors.danger : colors.muted, textAlign: "center", paddingHorizontal: 16 }}>
                  {card.coverUnresolved ? "La bannière est enregistrée, mais son affichage a échoué." : "Ajoute une photo de couverture"}
                </Text>
              </View>
            )}
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
            <View style={{ marginTop: -36, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
              {card.logoUrl ? (
                <Image source={{ uri: card.logoUrl }} style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.ink }} />
              ) : (
                <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: card.logoUnresolved ? colors.danger : colors.accent, fontFamily: "Inter_600SemiBold" }}>
                    {card.logoUnresolved ? "!" : card.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, paddingBottom: 6 }}>
                <Text style={{ color: colors.fg, fontSize: 22, fontFamily: "Inter_600SemiBold" }}>{card.name}</Text>
                {card.category ? <Text style={{ marginTop: 2, color: "rgba(249,250,251,0.6)", fontSize: 13 }}>{card.category}</Text> : null}
              </View>
            </View>
            <View style={{ marginTop: 16, gap: 10 }}>
              {place ? <InfoRow icon={<MapPin size={16} color={colors.accent} />} text={place} /> : null}
              {card.hours ? <InfoRow icon={<Clock size={16} color={colors.accent} />} text={card.hours} /> : null}
              {!owner && card.businessPhone ? <InfoRow icon={<Phone size={16} color={colors.accent} />} text={card.businessPhone} /> : null}
              {card.website ? <InfoRow icon={<Globe size={16} color={colors.accent} />} text={card.website} /> : null}
            </View>
            {card.description ? <Text style={{ marginTop: 14, color: "rgba(249,250,251,0.86)", fontSize: 15, lineHeight: 22 }}>{card.description}</Text> : null}
            {photos.length ? (
              <View style={{ marginTop: 18 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", marginBottom: 10 }}>Photos de la boutique</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {shown.map((url, index) => (
                    <View key={url} style={{ width: 92, height: 78, borderRadius: 12, overflow: "hidden" }}>
                      <Image source={{ uri: url }} style={{ width: 92, height: 78 }} contentFit="cover" />
                      {extra > 0 && index === shown.length - 1 ? (
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>+{extra}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {owner ? (
              <View style={{ marginTop: 18, flexDirection: "row", gap: 14, alignItems: "center" }}>
                <QrCard value={qr} size={132} pad={6} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontSize: 16, lineHeight: 22, fontFamily: "Inter_600SemiBold" }}>Scannez pour{"\n"}découvrir ma carte{"\n"}sur WIPP</Text>
                  <View style={{ marginTop: 10 }}>
                    <WippWordmark size={18} />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
      {owner ? (
        <View style={{ flexDirection: "row", justifyContent: "space-around", paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
          <Press onPress={onEdit} style={{ alignItems: "center", justifyContent: "center", gap: 6, minWidth: 88, minHeight: 52 }}>
            <Pencil size={20} color={colors.fg} />
            <Text style={{ color: colors.fg, fontSize: 13 }}>Modifier</Text>
          </Press>
          <Press onPress={() => setShare(true)} style={{ alignItems: "center", justifyContent: "center", gap: 6, minWidth: 88, minHeight: 52 }}>
            <Share2 size={20} color={colors.fg} />
            <Text style={{ color: colors.fg, fontSize: 13 }}>Partager</Text>
          </Press>
          <Press onPress={() => void exportBusinessQr(qr, card.name).catch(() => Alert.alert("QR", "Le téléchargement a échoué."))} style={{ alignItems: "center", justifyContent: "center", gap: 6, minWidth: 88, minHeight: 52 }}>
            <Download size={20} color={colors.fg} />
            <Text style={{ color: colors.fg, fontSize: 13 }}>Télécharger</Text>
          </Press>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), gap: 10, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
          <Press onPress={onWrite} style={{ height: 54, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", opacity: opening ? 0.6 : 1 }}>
            <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{opening ? "Ouverture…" : "Écrire sur WIPP"}</Text>
          </Press>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {onCall ? (
              <Press onPress={onCall} style={{ alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, minWidth: 72 }}>
                <Phone size={20} color={colors.fg} />
                <Text style={{ color: colors.fg, fontSize: 13 }}>Appeler</Text>
              </Press>
            ) : null}
            {onRoute ? (
              <Press onPress={onRoute} style={{ alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, minWidth: 72 }}>
                <MapPin size={20} color={colors.fg} />
                <Text style={{ color: colors.fg, fontSize: 13 }}>Itinéraire</Text>
              </Press>
            ) : null}
            <Press onPress={() => void Share.share({ message: `${card.name}\n${link}` })} style={{ alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, minWidth: 72 }}>
              <Share2 size={20} color={colors.fg} />
              <Text style={{ color: colors.fg, fontSize: 13 }}>Partager</Text>
            </Press>
          </View>
        </View>
      )}
    </ScreenRoot>
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

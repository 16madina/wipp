import { useState, type ReactNode } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  AlignLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Settings,
  Ticket,
  Type,
  Users,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AddressField, FlagImage, WorldCountrySheet } from "../components/card-editor-parts";
import { CalendarSheet, TimeSheet, dayLabel } from "../components/event-parts";
import { findWorldCountry } from "../lib/countries-world";
import { eventHero } from "../lib/assets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, GlassHeader, Header, Press, ScreenRoot, Toggle } from "../components/ui";
import { useWippStore } from "../lib/store";
import type { Listing } from "../lib/types";
import { colors } from "../theme";

const LISTING_CATS = [
  { id: "goods", label: "Objets" },
  { id: "home", label: "Maison" },
  { id: "auto", label: "Auto" },
  { id: "jobs", label: "Emploi" },
  { id: "services", label: "Services" },
] as const;

const CONDITIONS: { id: NonNullable<Listing["condition"]>; label: string }[] = [
  { id: "new", label: "Neuf" },
  { id: "like_new", label: "Comme neuf" },
  { id: "good", label: "Bon état" },
  { id: "used", label: "Usagé" },
];

const EVENT_CATS = ["Musique", "Soirée", "Affaires", "Sport", "Culture", "Food", "Communauté", "Autre"];
const CURRENCIES = ["CAD", "EUR", "USD", "XOF"];

type DraftPhoto = { uri: string; path?: string; mime: string };

function needsCondition(cat: string) {
  return cat === "goods" || cat === "home" || cat === "auto";
}

function priceLabel(amount: string, currency: string, free: boolean, negotiable: boolean) {
  if (free) return negotiable ? "Gratuit · négociable" : "Gratuit";
  const value = amount.trim();
  const base = value ? `${value} ${currency}` : "";
  if (!base) return negotiable ? "Prix négociable" : "";
  return negotiable ? `${base} · négociable` : base;
}

function readPrice(label: string) {
  const negotiable = /négociable/i.test(label);
  const free = /^gratuit/i.test(label.trim());
  const currency = CURRENCIES.find((item) => label.includes(item)) ?? "CAD";
  const amount = label.replace(/·\s*négociable/i, "").replace(currency, "").replace(/^gratuit/i, "").trim();
  return { amount: free ? "" : amount, currency, free, negotiable };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 18, borderRadius: 18, backgroundColor: colors.glassCard, padding: 14 }}>
      <Text style={{ color: colors.accent, fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 }}>{title}</Text>
      <View style={{ marginTop: 12, gap: 12 }}>{children}</View>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={{ color: colors.muted, fontSize: 12, fontFamily: "Inter_500Medium" }}>{children}</Text>;
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad" | "url" | "phone-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(139,147,167,0.8)"
      multiline={multiline}
      keyboardType={keyboardType}
      style={{
        minHeight: multiline ? 120 : 48,
        borderRadius: 12,
        backgroundColor: colors.navy,
        color: colors.fg,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 0,
        fontSize: 16,
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const on = value === option.id;
        return (
          <Press
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: on ? colors.accent : colors.navy,
            }}
          >
            <Text style={{ color: on ? colors.accentFg : colors.fg, fontSize: 13 }}>{option.label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Press onPress={() => onChange(!value)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
      <Text style={{ color: colors.fg, fontSize: 15 }}>{label}</Text>
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: value ? colors.accent : colors.muted, backgroundColor: value ? colors.accent : "transparent" }} />
    </Press>
  );
}

async function pickImages(multiple: boolean) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Photos", "Autorise l’accès aux photos pour illustrer ta publication.");
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 6 : 1,
  });
  if (res.canceled) return [];
  return res.assets.filter((asset) => asset.uri).map((asset) => ({
    uri: asset.uri,
    mime: asset.mimeType ?? "image/jpeg",
  }));
}

export function CreateListingScreen({ listingId }: { listingId?: string }) {
  const pop = useWippStore((s) => s.pop);
  const existing = useWippStore((s) => (listingId ? s.listings.find((item) => item.id === listingId) : undefined));
  const me = useWippStore((s) => s.me);
  const legacyPrice = readPrice(existing?.price ?? "");
  const storedFree = /^gratuit/i.test((existing?.price ?? "").trim()) || (!existing?.currency && legacyPrice.free);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<Listing["category"]>(existing?.category ?? "goods");
  const [condition, setCondition] = useState<Listing["condition"] | "">(existing?.condition ?? "");
  const [amount, setAmount] = useState(storedFree ? "" : existing?.currency ? (existing.price ?? "") : legacyPrice.amount);
  const [currency, setCurrency] = useState(existing?.currency || legacyPrice.currency);
  const [free, setFree] = useState(storedFree);
  const [negotiable, setNegotiable] = useState(existing?.negotiable ?? legacyPrice.negotiable);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [country, setCountry] = useState(existing?.country ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [area, setArea] = useState(existing?.area ?? "");
  const [contactMode, setContactMode] = useState<"wipp" | "phone">(existing?.contactPhone ? "phone" : "wipp");
  const [phone, setPhone] = useState(existing?.contactPhone ?? "");
  const [photos, setPhotos] = useState<DraftPhoto[]>(() => {
    const paths = existing?.photoPaths?.length ? existing.photoPaths : existing?.image ? [existing.image] : [];
    return paths.map((path, index) => ({
      uri: existing?.photos?.[index] || (path.startsWith("http") ? path : ""),
      path: path.startsWith("http") ? undefined : path,
      mime: "image/jpeg",
    }));
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const insets = useSafeAreaInsets();
  const showCondition = needsCondition(category);

  async function addPhotos() {
    const picked = await pickImages(true);
    if (!picked.length) return;
    setPhotos((current) => [...current, ...picked].slice(0, 6));
  }

  async function publish() {
    if (!title.trim() || !city.trim()) {
      setError("Le titre et la ville sont requis.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { uploadPublicMediaFile, saveListing, fetchListings, myProfileId } = await import("../lib/lot7/api");
      let owner = useWippStore.getState().serverProfileId;
      if (!owner) {
        owner = await myProfileId();
        useWippStore.setState({ serverProfileId: owner });
      }
      const paths: string[] = [];
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        setStatus(`Photo ${index + 1}/${photos.length}`);
        if (photo.path) {
          paths.push(photo.path);
          continue;
        }
        if (photo.uri.startsWith("http")) {
          paths.push(photo.uri);
          continue;
        }
        const ext = photo.mime.includes("png") ? "png" : "jpg";
        const path = `listings/${owner}/${crypto.randomUUID()}.${ext}`;
        await uploadPublicMediaFile(path, photo.uri, photo.mime, (sent, total) => {
          if (total > 0) setStatus(`Photo ${index + 1} · ${Math.round((sent / total) * 100)}%`);
        });
        paths.push(path);
      }
      setStatus("Publication…");
      const id = await saveListing({
        id: listingId,
        title: title.trim(),
        description: description.trim(),
        category,
        price: free ? "Gratuit" : amount.trim(),
        city: city.trim(),
        photo: paths[0] ?? null,
        country: country.trim(),
        area: area.trim(),
        phone: contactMode === "phone" ? phone.trim() : "",
        negotiable,
        currency: free ? "" : currency,
        condition: showCondition ? condition : "",
        photos: paths,
      });
      useWippStore.setState({ listings: await fetchListings(owner) });
      useWippStore.getState().replace({ name: "listing", listingId: id || listingId || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const cover = photos[0];
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={listingId ? "Modifier l’annonce" : "Créer une annonce"} onBack={pop} />
      </GlassHeader>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Press onPress={() => void addPhotos()} style={{ height: 220, borderRadius: 22, overflow: "hidden", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
            {cover ? <Image source={{ uri: cover.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Camera color={colors.accent} size={36} />}
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12, borderRadius: 12, backgroundColor: "rgba(5,7,12,0.72)", paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ color: colors.paper, fontFamily: "Inter_600SemiBold" }}>{cover ? "Ajouter des photos" : "+ Ajouter des photos"}</Text>
            </View>
          </Press>
          {photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={{ width: 84 }}>
                  <Image source={{ uri: photo.uri }} style={{ width: 84, height: 84, borderRadius: 12 }} contentFit="cover" />
                  <Text style={{ marginTop: 4, color: index === 0 ? colors.accent : colors.muted, fontSize: 11 }}>{index === 0 ? "Couverture" : "Photo"}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Press disabled={index === 0} onPress={() => setPhotos((items) => {
                      const next = items.slice();
                      const [item] = next.splice(index, 1);
                      next.splice(index - 1, 0, item);
                      return next;
                    })}>
                      <Text style={{ color: colors.muted }}>←</Text>
                    </Press>
                    <Press onPress={() => setPhotos((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      <X color={colors.danger} size={14} />
                    </Press>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Section title="ESSENTIEL">
            <Label>Titre de l’annonce *</Label>
            <Input value={title} onChangeText={setTitle} placeholder="Ex. Vélo de ville, taille M" />
            <Label>Catégorie *</Label>
            <Chips options={LISTING_CATS.map((item) => ({ id: item.id, label: item.label }))} value={category} onChange={(id) => setCategory(id as Listing["category"])} />
          </Section>

          {showCondition ? (
            <Section title="ÉTAT">
              <Chips options={CONDITIONS.map((item) => ({ id: item.id, label: item.label }))} value={condition ?? ""} onChange={(id) => setCondition(id as NonNullable<Listing["condition"]>)} />
            </Section>
          ) : null}

          <Section title="PRIX">
            <ToggleRow label="Gratuit" value={free} onChange={setFree} />
            {free ? null : (
              <>
                <Label>Prix</Label>
                <Input value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />
                <Chips options={CURRENCIES.map((item) => ({ id: item, label: item }))} value={currency} onChange={setCurrency} />
              </>
            )}
            <ToggleRow label="Prix négociable" value={negotiable} onChange={setNegotiable} />
          </Section>

          <Section title="DESCRIPTION">
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="Décris l’objet, ce qui est inclus, et ce que la personne doit savoir avant de te écrire."
              multiline
            />
          </Section>

          <Section title="LOCALISATION">
            <Label>Pays</Label>
            <Input value={country} onChangeText={setCountry} placeholder="Canada" />
            <Label>Ville *</Label>
            <Input value={city} onChangeText={setCity} placeholder="Montréal" />
            <Label>Quartier</Label>
            <Input value={area} onChangeText={setArea} placeholder="Plateau" />
            <Text style={{ color: colors.muted, fontSize: 12 }}>L’adresse précise n’est pas publiée. Les gens te trouvent par la ville, puis par message WIPP.</Text>
          </Section>

          <Section title="CONTACT">
            <Chips
              options={[{ id: "wipp", label: "Message WIPP" }, { id: "phone", label: "Téléphone" }]}
              value={contactMode}
              onChange={(id) => setContactMode(id as "wipp" | "phone")}
            />
            {contactMode === "phone" ? (
              <>
                <Label>Téléphone</Label>
                <Input value={phone} onChangeText={setPhone} placeholder="+1…" keyboardType="phone-pad" />
              </>
            ) : (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <MessageCircle color={colors.accent} size={18} />
                <Text style={{ color: colors.fg, flex: 1 }}>Message via WIPP{me.username ? ` · @${me.username}` : ""}</Text>
              </View>
            )}
          </Section>

          <Section title="APERÇU">
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>{title.trim() || "Ton annonce"}</Text>
            <Text style={{ color: colors.accent, marginTop: 4 }}>{priceLabel(amount, currency, free, negotiable) || "Prix à préciser"}</Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <MapPin color={colors.muted} size={14} />
              <Text style={{ color: colors.muted }}>{city.trim() || "Ville"} · {LISTING_CATS.find((item) => item.id === category)?.label}</Text>
            </View>
          </Section>
          {status ? <Text style={{ color: colors.muted, marginTop: 8 }}>{status}</Text> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          {error ? <Text style={{ color: colors.danger, marginBottom: 8, textAlign: "center" }}>{error}</Text> : null}
          <Btn label={busy ? "Publication…" : listingId ? "Enregistrer" : "Publier l’annonce"} disabled={busy} onPress={() => void publish()} />
        </View>
      </KeyboardAvoidingView>
    </ScreenRoot>
  );
}

export function CreateLifestyleScreen({ eventId }: { eventId?: string }) {
  const pop = useWippStore((s) => s.pop);
  const existing = useWippStore((s) => (eventId ? s.lifestyle.find((item) => item.id === eventId) : undefined));
  const initialOnline = existing?.isOnline ?? existing?.place === "En ligne";
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [summary, setSummary] = useState(existing?.details ?? "");
  const [starts, setStarts] = useState<Date | null>(existing?.startsAt ? new Date(existing.startsAt) : null);
  const [ends, setEnds] = useState<Date | null>(existing?.endsAt ? new Date(existing.endsAt) : null);
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const [online, setOnline] = useState(initialOnline);
  const [venue, setVenue] = useState(initialOnline ? "" : (existing?.place === "En ligne" ? "" : existing?.place ?? ""));
  const [address, setAddress] = useState(existing?.address ?? "");
  const [country, setCountry] = useState(existing?.country ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [link, setLink] = useState(existing?.onlineUrl ?? (initialOnline ? existing?.contact ?? "" : ""));
  const [free, setFree] = useState(existing?.isFree ?? true);
  const [amount, setAmount] = useState(existing?.isFree === false ? existing.price ?? "" : "");
  const [currency, setCurrency] = useState(existing?.currency || "CAD");
  const [access, setAccess] = useState(
    (existing?.contact ?? "").replace(/^18\+( · )?/, "").replace(/\d+ places max( · )?/, "").trim(),
  );
  const [cover, setCover] = useState<DraftPhoto | null>(
    existing?.image || existing?.coverPath
      ? { uri: existing.image || existing.coverPath || "", path: existing.coverPath?.startsWith("http") ? undefined : existing.coverPath, mime: "image/jpeg" }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  // Extra rules travel in the "contact" text (no dedicated columns yet).
  const [limitOn, setLimitOn] = useState(/places max/.test(existing?.contact ?? ""));
  const [limit, setLimit] = useState(/(\d+) places max/.exec(existing?.contact ?? "")?.[1] ?? "");
  const [adultOnly, setAdultOnly] = useState(/^18\+/.test(existing?.contact ?? ""));
  const insets = useSafeAreaInsets();

  async function addCover() {
    const picked = await pickImages(false);
    if (picked[0]) setCover(picked[0]);
  }

  async function publish() {
    if (!title.trim()) {
      setError("Le nom de l’événement est requis.");
      return;
    }
    if (!starts || Number.isNaN(starts.getTime())) {
      setError("Choisis la date et l’heure de début.");
      return;
    }
    if (!online && !city.trim()) {
      setError("Indique la ville pour un événement en personne.");
      return;
    }
    if (ends && starts && ends.getTime() < starts.getTime()) {
      setError("La fin ne peut pas être avant le début.");
      return;
    }
    if (!free && !amount.trim()) {
      setError("Indique le prix de l’événement payant.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { uploadPublicMediaFile, saveEvent, fetchEvents, myProfileId } = await import("../lib/lot7/api");
      let owner = useWippStore.getState().serverProfileId;
      if (!owner) {
        owner = await myProfileId();
        useWippStore.setState({ serverProfileId: owner });
      }
      let photo = existing?.coverPath && !existing.coverPath.startsWith("http") ? existing.coverPath : null;
      if (cover?.uri.startsWith("http") && !cover.path) {
        photo = cover.uri;
      } else if (cover && !cover.path) {
        setStatus("Couverture…");
        const ext = cover.mime.includes("png") ? "png" : "jpg";
        photo = `events/${owner}/${crypto.randomUUID()}.${ext}`;
        await uploadPublicMediaFile(photo, cover.uri, cover.mime, (sent, total) => {
          if (total > 0) setStatus(`Couverture · ${Math.round((sent / total) * 100)}%`);
        });
      } else if (cover?.path) {
        photo = cover.path;
      } else if (!cover) {
        photo = null;
      }
      setStatus("Publication…");
      const id = await saveEvent({
        id: eventId,
        title: title.trim(),
        description: summary.trim(),
        city: city.trim(),
        place: online ? "En ligne" : venue.trim(),
        starts: starts.toISOString(),
        photo,
        contact: [adultOnly ? "18+" : "", limitOn && limit ? `${limit} places max` : "", access.trim()].filter(Boolean).join(" · "),
        ends: ends ? ends.toISOString() : "",
        category: category.trim(),
        country: country.trim(),
        address: online ? "" : address.trim(),
        online,
        url: online ? link.trim() : "",
        free,
        price: free ? "" : amount.trim(),
        currency: free ? "" : currency,
      });
      useWippStore.setState({ lifestyle: await fetchEvents(owner) });
      useWippStore.getState().replace({ name: "lifestyle", itemId: id || eventId || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const dateValue = starts;
  const startT = starts ? `${String(starts.getHours()).padStart(2, "0")}:${String(starts.getMinutes()).padStart(2, "0")}` : "";
  const endT = ends ? `${String(ends.getHours()).padStart(2, "0")}:${String(ends.getMinutes()).padStart(2, "0")}` : "";
  const atTime = (day: Date, t: string) => {
    const d = new Date(day);
    const [h, m] = t.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };
  const eventCountry = findWorldCountry(country) ?? findWorldCountry("CA")!;
  const row = { flexDirection: "row" as const, gap: 12, padding: 14, borderRadius: 18, backgroundColor: "rgba(16,22,36,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 10 };
  const iconBox = { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,216,77,0.10)", alignItems: "center" as const, justifyContent: "center" as const };
  const rowTitle = { color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" };
  const box = { minHeight: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 12, justifyContent: "center" as const };
  const inputStyle = { flex: 1, color: colors.fg, fontSize: 15, paddingVertical: 10, ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {}) } as object;

  return (
    <ScreenRoot>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {/* Hero: illustration on the right, title on the left (artwork has no text). */}
          <View style={{ height: 200, marginHorizontal: -14, marginBottom: 4 }}>
            <Image source={eventHero} style={{ position: "absolute", right: 0, top: 0, width: "62%", height: "100%" }} contentFit="cover" />
            <LinearGradient colors={[colors.ink, "rgba(5,7,13,0.6)", "rgba(5,7,13,0)"]} locations={[0.35, 0.55, 0.8]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
            <LinearGradient colors={["rgba(5,7,13,0)", colors.ink]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40 }} />
            <Press accessibilityLabel="Retour" onPress={pop} style={{ position: "absolute", top: insets.top + 4, left: 10, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={26} color={colors.fg} />
            </Press>
            <View style={{ position: "absolute", left: 18, bottom: 18, width: "62%" }}>
              <Text style={{ color: colors.fg, fontSize: 30, lineHeight: 33, fontFamily: "Inter_800ExtraBold" }}>
                {eventId ? "Modifier l’" : "Créer un\n"}<Text style={{ color: colors.accent }}>événement</Text>
              </Text>
              <Text style={{ marginTop: 8, color: "rgba(249,250,251,0.8)", fontSize: 13, lineHeight: 18 }}>Partage ton événement sur WIPP et rassemble ta communauté.</Text>
            </View>
          </View>

          <View style={[row, { alignItems: "center" }]}>
            <View style={iconBox}><ImageIcon size={20} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={rowTitle}>Photo de l’événement</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Ajoute une image attrayante</Text>
            </View>
            <Press onPress={() => void addCover()} style={{ width: 130, height: 76, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.3)", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
              {cover ? <Image source={{ uri: cover.uri }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : (
                <>
                  <ImagePlus size={22} color={colors.fg} />
                  <Text style={{ marginTop: 4, color: colors.fg, fontSize: 12 }}>Ajouter une photo</Text>
                </>
              )}
            </Press>
          </View>

          <View style={row}>
            <View style={iconBox}><Type size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={rowTitle}>Titre de l’événement *</Text>
              <View style={[box, { flexDirection: "row", alignItems: "center" }]}>
                <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 100))} placeholder="Ex. Soirée Afrobeats" placeholderTextColor={colors.muted} style={inputStyle} />
                <Text style={{ color: colors.muted, fontSize: 11 }}>{title.length}/100</Text>
              </View>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><AlignLeft size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={rowTitle}>Description</Text>
              <View style={box}>
                <TextInput value={summary} onChangeText={(v) => setSummary(v.slice(0, 500))} placeholder="Parle de ton événement : programme, artistes, pour qui…" placeholderTextColor={colors.muted} multiline style={[inputStyle, { minHeight: 64, textAlignVertical: "top" }]} />
                <Text style={{ alignSelf: "flex-end", color: colors.muted, fontSize: 11, marginBottom: 6 }}>{summary.length}/500</Text>
              </View>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><CalendarDays size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={rowTitle}>Date et heure *</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Press onPress={() => setPicking("start")} style={[box, { flex: 1.2, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                  <CalendarDays size={16} color={colors.muted} />
                  <Text numberOfLines={1} style={{ flex: 1, color: dateValue ? colors.fg : colors.muted, fontSize: 14 }}>{dateValue ? dayLabel(dateValue) : "Date"}</Text>
                  <ChevronDown size={16} color={colors.muted} />
                </Press>
                <Press disabled={!dateValue} onPress={() => setPicking("end")} style={[box, { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, opacity: dateValue ? 1 : 0.5 }]}>
                  <Clock size={16} color={colors.muted} />
                  <Text numberOfLines={1} style={{ flex: 1, color: dateValue ? colors.fg : colors.muted, fontSize: 14 }}>{dateValue ? `${startT}${endT ? `–${endT}` : ""}` : "Heure"}</Text>
                  <ChevronDown size={16} color={colors.muted} />
                </Press>
              </View>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><MapPin size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={rowTitle}>Lieu *</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[["place", "En personne"], ["online", "En ligne"]].map(([id, label]) => (
                    <Press key={id} onPress={() => setOnline(id === "online")} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: (id === "online") === online ? colors.accent : "rgba(255,255,255,0.06)" }}>
                      <Text style={{ fontSize: 12, color: (id === "online") === online ? colors.accentFg : colors.fg }}>{label}</Text>
                    </Press>
                  ))}
                </View>
              </View>
              {online ? (
                <View style={box}>
                  <TextInput value={link} onChangeText={setLink} placeholder="Lien (Zoom, YouTube, Instagram…)" placeholderTextColor={colors.muted} keyboardType="url" autoCapitalize="none" style={inputStyle} />
                </View>
              ) : (
                <>
                  <View style={box}>
                    <TextInput value={venue} onChangeText={setVenue} placeholder="Nom du lieu (salle, bar, parc…)" placeholderTextColor={colors.muted} style={inputStyle} />
                  </View>
                  <Press onPress={() => setCountryOpen(true)} style={[box, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
                    <FlagImage id={eventCountry.id} size={14} />
                    <Text style={{ flex: 1, color: colors.fg, fontSize: 14 }}>{eventCountry.fr}</Text>
                    <ChevronDown size={16} color={colors.muted} />
                  </Press>
                  <AddressField country={eventCountry} value={address} onChange={(v) => setAddress(v ?? "")} onPickCity={setCity} />
                  <View style={box}>
                    <TextInput value={city} onChangeText={setCity} placeholder="Ville *" placeholderTextColor={colors.muted} style={inputStyle} />
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={[row, { alignItems: "center" }]}>
            <View style={iconBox}><Ticket size={20} color={colors.accent} /></View>
            <Text style={[rowTitle, { flex: 1 }]}>Type</Text>
            {[[true, "Gratuit"], [false, "Payant"]].map(([val, label]) => (
              <Press key={String(label)} onPress={() => setFree(val as boolean)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: free === val ? colors.accent : "rgba(255,255,255,0.15)" }}>
                <Text style={{ color: free === val ? colors.accent : colors.fg, fontFamily: "Inter_600SemiBold" }}>{label as string}</Text>
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: free === val ? colors.accent : "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" }}>
                  {free === val ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} /> : null}
                </View>
              </Press>
            ))}
          </View>

          <View style={row}>
            <View style={iconBox}><LayoutGrid size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={rowTitle}>Catégorie</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EVENT_CATS.map((c) => (
                  <Press key={c} onPress={() => setCategory(category === c ? "" : c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: category === c ? colors.accent : "transparent", borderWidth: 1, borderColor: category === c ? colors.accent : "rgba(255,255,255,0.18)" }}>
                    <Text style={{ color: category === c ? colors.accentFg : colors.fg, fontSize: 13 }}>{c}</Text>
                  </Press>
                ))}
              </View>
            </View>
          </View>

          {free ? null : (
            <View style={row}>
              <View style={iconBox}><CircleDollarSign size={20} color={colors.accent} /></View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={rowTitle}>Prix du billet *</Text>
                <View style={[box, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                  <TextInput value={amount} onChangeText={setAmount} placeholder="Ex. 25" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={inputStyle} />
                  <Press onPress={() => setCurrency(CURRENCIES[(CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length])} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.12)" }}>
                    <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{currency}</Text>
                    <ChevronDown size={14} color={colors.muted} />
                  </Press>
                </View>
                <Text style={{ color: colors.muted, fontSize: 11 }}>WIPP n’encaisse pas les billets : le prix est une information. Ajoute ton lien de billetterie ci-dessous si tu en as un.</Text>
              </View>
            </View>
          )}

          <View style={row}>
            <View style={iconBox}><Settings size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={rowTitle}>Paramètres avancés</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Users size={18} color={colors.accent} />
                <Text style={{ flex: 1, color: colors.fg }}>Limiter le nombre de places</Text>
                <Toggle value={limitOn} onChange={setLimitOn} />
              </View>
              {limitOn ? (
                <View style={box}>
                  <TextInput value={limit} onChangeText={(v) => setLimit(v.replace(/\D/g, ""))} placeholder="Nombre de places" placeholderTextColor={colors.muted} keyboardType="number-pad" style={inputStyle} />
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ width: 18, textAlign: "center", color: colors.accent, fontFamily: "Inter_700Bold", fontSize: 11 }}>18</Text>
                <Text style={{ flex: 1, color: colors.fg }}>Événement 18+</Text>
                <Toggle value={adultOnly} onChange={setAdultOnly} />
              </View>
              <View style={box}>
                <TextInput value={access} onChangeText={setAccess} placeholder={free ? "Précision : entrée libre, code vestimentaire…" : "Lien de billetterie ou précision"} placeholderTextColor={colors.muted} style={inputStyle} />
              </View>
            </View>
          </View>
          {status ? <Text style={{ color: colors.muted, marginTop: 8 }}>{status}</Text> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          {error ? <Text style={{ color: colors.danger, marginBottom: 8, textAlign: "center" }}>{error}</Text> : null}
          <Press disabled={busy} onPress={() => void publish()} style={{ height: 56, borderRadius: 18, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: busy ? 0.7 : 1 }}>
            <Text style={{ color: colors.accentFg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{busy ? "Publication…" : eventId ? "Enregistrer" : "Publier mon événement"}</Text>
            {busy ? null : <ArrowRight size={20} color={colors.accentFg} />}
          </Press>
        </View>
      </KeyboardAvoidingView>
      <CalendarSheet
        open={picking === "start"}
        value={starts}
        onClose={() => setPicking(null)}
        onPick={(day) => {
          const keep = startT || "20:00";
          const next = atTime(day, keep);
          setStarts(next);
          if (ends) setEnds(atTime(day, endT));
          setPicking(null);
        }}
      />
      <TimeSheet
        open={picking === "end"}
        start={startT}
        end={endT}
        onClose={() => setPicking(null)}
        onSave={(a, b) => {
          if (starts) {
            setStarts(atTime(starts, a));
            if (b) {
              const e = atTime(starts, b);
              // An end before the start means it finishes after midnight.
              if (e.getTime() <= atTime(starts, a).getTime()) e.setDate(e.getDate() + 1);
              setEnds(e);
            } else setEnds(null);
          }
          setPicking(null);
        }}
      />
      <WorldCountrySheet open={countryOpen} selectedId={eventCountry.id} onClose={() => setCountryOpen(false)} onPick={(c) => setCountry(c.fr)} />
    </ScreenRoot>
  );
}

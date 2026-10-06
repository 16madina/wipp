import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  AlignLeft,
  ArrowLeftRight,
  ArrowRight,
  Briefcase,
  Car,
  Gamepad2,
  Gift,
  House,
  MoreHorizontal,
  Phone,
  Plus,
  Shirt,
  Smartphone,
  Sofa,
  Tag,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  LocateFixed,
  Pin,
  SlidersHorizontal,
  MapPin,
  MessageCircle,
  Settings,
  Ticket,
  Type,
  Users,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AddressField, DialPhoneField, FlagImage, WorldCountrySheet } from "../components/card-editor-parts";
import { CalendarSheet, TimeSheet, dayLabel } from "../components/event-parts";
import { findWorldCountry } from "../lib/countries-world";
import { eventHero, listingHero } from "../lib/assets";
import { LISTING_CATEGORIES } from "../lib/listing-cats";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Press, ScreenRoot, Toggle } from "../components/ui";
import { useWippStore } from "../lib/store";
import type { Listing } from "../lib/types";
import { colors, accentA, bgA, fgA, whiteA } from "../theme";
import { errorText } from "../lib/error-fr";

const EVENT_CATS = ["Musique", "Soirée", "Affaires", "Sport", "Culture", "Food", "Communauté", "Autre"];
const CONDITIONS: { id: NonNullable<Listing["condition"]>; label: string }[] = [
  { id: "new", label: "Neuf" },
  { id: "like_new", label: "Comme neuf" },
  { id: "good", label: "Bon état" },
  { id: "used", label: "Usagé" },
];

const CURRENCIES = ["CAD", "EUR", "USD", "XOF"];

type DraftPhoto = { uri: string; path?: string; mime: string };

function needsCondition(cat: string) {
  return ["goods", "home", "auto", "electronics", "fashion", "leisure"].includes(cat);
}

function readPrice(label: string) {
  const negotiable = /négociable/i.test(label);
  const free = /^gratuit/i.test(label.trim());
  const currency = CURRENCIES.find((item) => label.includes(item)) ?? "CAD";
  const amount = label.replace(/·\s*négociable/i, "").replace(currency, "").replace(/^gratuit/i, "").trim();
  return { amount: free ? "" : amount, currency, free, negotiable };
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
  const legacyPrice = readPrice(existing?.price ?? "");
  const storedFree = /^gratuit/i.test((existing?.price ?? "").trim()) || (!existing?.currency && legacyPrice.free);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<Listing["category"]>(existing?.category ?? "");
  const [condition, setCondition] = useState<Listing["condition"] | "">(existing?.condition ?? "");
  const [amount, setAmount] = useState(storedFree ? "" : existing?.currency ? (existing.price ?? "") : legacyPrice.amount);
  const [currency, setCurrency] = useState(existing?.currency || legacyPrice.currency);
  const [mode, setMode] = useState<"sale" | "give" | "swap">(/^échange/i.test((existing?.price ?? "").trim()) ? "swap" : storedFree ? "give" : "sale");
  const [negotiable, setNegotiable] = useState(existing?.negotiable ?? legacyPrice.negotiable);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [country, setCountry] = useState(existing?.country ?? "");
  const [countryOpen, setCountryOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(existing?.lat != null && existing?.lng != null ? { lat: existing.lat, lng: existing.lng } : null);
  const [locating, setLocating] = useState(false);
  const [boost, setBoost] = useState(Boolean(existing?.boosted));
  const [publishAt, setPublishAt] = useState<Date | null>(existing?.publishAt && existing.publishAt > Date.now() ? new Date(existing.publishAt) : null);
  const [scheduling, setScheduling] = useState<"day" | "time" | null>(null);
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
    setPhotos((current) => [...current, ...picked].slice(0, 8));
  }

  async function publish() {
    if (!photos.length) {
      setError("Ajoute au moins une photo.");
      return;
    }
    if (!title.trim() || !category) {
      setError("Le titre et la catégorie sont requis.");
      return;
    }
    if (!city.trim()) {
      setError("Indique la ville (ou choisis une adresse).");
      return;
    }
    if (mode === "sale" && !amount.trim()) {
      setError("Indique le prix, ou choisis « À donner » ou « Échange ».");
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
        price: mode === "give" ? "Gratuit" : mode === "swap" ? "Échange" : amount.trim(),
        city: city.trim(),
        photo: paths[0] ?? null,
        country: (country.trim() || listingCountry.fr),
        area: area.trim(),
        phone: contactMode === "phone" ? phone.trim() : "",
        negotiable: mode === "sale" && negotiable,
        currency: mode === "sale" ? currency : "",
        condition: showCondition ? condition : "",
        photos: paths,
      });
      const savedId = id || listingId || "";
      if (savedId) {
        setStatus("Finalisation…");
        const { saveListingExtras } = await import("../lib/lot7/api");
        const { geocodeCity } = await import("../lib/geo");
        // No precise address picked: place the listing at its city so distance still works.
        const where = coords ?? (await geocodeCity(city.trim(), listingCountry.id));
        await saveListingExtras(savedId, { lat: where?.lat ?? null, lng: where?.lng ?? null, boost, publishAt });
      }
      useWippStore.setState({ listings: await fetchListings(owner) });
      useWippStore.getState().replace({ name: "listing", listingId: savedId });
    } catch (err) {
      setError(errorText(err, "Publication impossible."));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const listingCountry = findWorldCountry(country) ?? findWorldCountry("CA")!;
  const row = { flexDirection: "row" as const, gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: whiteA(0.06), marginTop: 10 };
  const iconBox = { width: 42, height: 42, borderRadius: 12, backgroundColor: accentA(0.10), alignItems: "center" as const, justifyContent: "center" as const };
  const rowTitle = { color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" };
  const box = { minHeight: 44, borderRadius: 12, backgroundColor: whiteA(0.06), paddingHorizontal: 12, justifyContent: "center" as const };
  const inputStyle = { flex: 1, color: colors.fg, fontSize: 15, paddingVertical: 10, ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {}) } as object;
  const star = <Text style={{ color: colors.danger }}> *</Text>;
  const pill = (on: boolean) => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, borderColor: on ? colors.accent : whiteA(0.15), backgroundColor: on ? colors.accent : "transparent" });
  const pillText = (on: boolean) => ({ color: on ? colors.accentFg : colors.fg, fontSize: 13, fontFamily: on ? "Inter_600SemiBold" : "Inter_500Medium" });
  const CAT_ICON: Record<string, typeof Car> = { auto: Car, realty: House, electronics: Smartphone, fashion: Shirt, home: Sofa, jobs: Briefcase, leisure: Gamepad2, goods: MoreHorizontal };

  return (
    <ScreenRoot>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ height: 210, marginHorizontal: -14, marginBottom: 4 }}>
            <Image source={listingHero} style={{ position: "absolute", right: 0, top: 30, width: "68%", height: 180 }} contentFit="cover" />
            <LinearGradient colors={[colors.bg, bgA(0.55), bgA(0)]} locations={[0.3, 0.5, 0.75]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
            <LinearGradient colors={[bgA(0), colors.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40 }} />
            <View style={{ position: "absolute", top: insets.top + 4, left: 6, right: 10, flexDirection: "row", alignItems: "center" }}>
              <Press accessibilityLabel="Retour" onPress={pop} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={26} color={colors.fg} />
              </Press>
              <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontFamily: "Inter_600SemiBold" }}>{listingId ? "Modifier l’annonce" : "Publier une annonce"}</Text>
            </View>
            <View style={{ position: "absolute", left: 18, bottom: 16, width: "60%" }}>
              <Text style={{ color: colors.fg, fontSize: 29, lineHeight: 32, fontFamily: "Inter_800ExtraBold" }}>
                Vends, achète,{"\n"}<Text style={{ color: colors.accent }}>trouve plus</Text>
              </Text>
              <Text style={{ marginTop: 6, color: fgA(0.8), fontSize: 13, lineHeight: 18 }}>Publie ton annonce et touche la communauté WIPP près de toi.</Text>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><ImageIcon size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 10 }}>
              <View>
                <Text style={rowTitle}>Photos de l’annonce{star}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Ajoute jusqu’à 8 photos · la 1re est la couverture</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {photos.length < 8 ? (
                  <Press onPress={() => void addPhotos()} style={{ width: 84, height: 84, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: whiteA(0.35), alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                      <Plus size={16} color={colors.accentFg} />
                    </View>
                    <Text style={{ color: colors.fg, fontSize: 11, textAlign: "center" }}>Ajouter des photos</Text>
                  </Press>
                ) : null}
                {photos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} style={{ width: 84, height: 84, borderRadius: 14, overflow: "hidden", borderWidth: index === 0 ? 2 : 0, borderColor: colors.accent }}>
                    <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    <Press accessibilityLabel="Retirer" onPress={() => setPhotos((items) => items.filter((_, k) => k !== index))} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                      <X size={13} color="#fff" />
                    </Press>
                    {index > 0 ? (
                      <Press accessibilityLabel="Mettre en couverture" onPress={() => setPhotos((items) => [items[index], ...items.filter((_, k) => k !== index)])} style={{ position: "absolute", left: 4, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.6)" }}>
                        <Text style={{ color: "#fff", fontSize: 10 }}>Couverture</Text>
                      </Press>
                    ) : null}
                  </View>
                ))}
                {Array.from({ length: Math.max(0, 4 - photos.length) }, (_, k) => (
                  <View key={`slot${k}`} style={{ width: 84, height: 84, borderRadius: 14, backgroundColor: whiteA(0.05), alignItems: "center", justifyContent: "center" }}>
                    <ImageIcon size={20} color={fgA(0.3)} />
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><Type size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={rowTitle}>Titre de l’annonce{star}</Text>
              <View style={[box, { flexDirection: "row", alignItems: "center" }]}>
                <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 100))} placeholder="Ex. iPhone 14 Pro en excellent état" placeholderTextColor={colors.muted} style={inputStyle} />
                <Text style={{ color: colors.muted, fontSize: 11 }}>{title.length}/100</Text>
              </View>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><AlignLeft size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={rowTitle}>Description</Text>
              <View style={box}>
                <TextInput value={description} onChangeText={(v) => setDescription(v.slice(0, 500))} placeholder="Décris ton article en détail : état, caractéristiques, raisons de vente…" placeholderTextColor={colors.muted} multiline style={[inputStyle, { minHeight: 70, textAlignVertical: "top" }]} />
                <Text style={{ alignSelf: "flex-end", color: colors.muted, fontSize: 11, marginBottom: 6 }}>{description.length}/500</Text>
              </View>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><LayoutGrid size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={rowTitle}>Catégorie{star}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {LISTING_CATEGORIES.map((c) => {
                  const Icon = CAT_ICON[c.id] ?? MoreHorizontal;
                  const on = category === c.id;
                  return (
                    <Press key={c.id} onPress={() => setCategory(c.id)} style={pill(on)}>
                      <Icon size={16} color={on ? colors.accentFg : colors.fg} />
                      <Text style={pillText(on)}>{c.label}</Text>
                    </Press>
                  );
                })}
              </View>
              {showCondition ? (
                <>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>État</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {CONDITIONS.map((c) => (
                      <Press key={c.id} onPress={() => setCondition(condition === c.id ? "" : c.id)} style={[pill(condition === c.id), { height: 36 }]}>
                        <Text style={pillText(condition === c.id)}>{c.label}</Text>
                      </Press>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><CircleDollarSign size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={rowTitle}>Prix{star}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {([["sale", "À vendre", Tag], ["give", "À donner", Gift], ["swap", "Échange", ArrowLeftRight]] as const).map(([id, label, Icon]) => (
                  <Press key={id} onPress={() => setMode(id)} style={[pill(mode === id), { flex: 1, height: 60, flexDirection: "column", justifyContent: "center", gap: 4, paddingHorizontal: 4 }]}>
                    <Icon size={18} color={mode === id ? colors.accentFg : colors.fg} />
                    <Text numberOfLines={1} style={pillText(mode === id)}>{label}</Text>
                  </Press>
                ))}
              </View>
              {mode === "sale" ? (
                <>
                  <View style={[box, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                    <Text style={{ color: colors.muted, fontSize: 16 }}>$</Text>
                    <TextInput value={amount} onChangeText={setAmount} placeholder={`Prix (${currency})`} placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={inputStyle} />
                    <Press onPress={() => setCurrency(CURRENCIES[(CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length])} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: whiteA(0.12) }}>
                      <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{currency}</Text>
                      <ChevronDown size={14} color={colors.muted} />
                    </Press>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ flex: 1, color: colors.fg }}>Prix négociable</Text>
                    <Toggle value={negotiable} onChange={setNegotiable} />
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><MapPin size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={rowTitle}>Lieu{star}</Text>
              <Press onPress={() => setCountryOpen(true)} style={[box, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <FlagImage id={listingCountry.id} size={14} />
                <Text style={{ flex: 1, color: colors.fg, fontSize: 14 }}>{listingCountry.fr}</Text>
                <ChevronDown size={16} color={colors.muted} />
              </Press>
              <AddressField country={listingCountry} value={area} onChange={(v) => setArea(v ?? "")} onPickCity={setCity} onPickCoords={(lat, lng) => setCoords({ lat, lng })} />
              <Press
                disabled={locating}
                onPress={() => {
                  setLocating(true);
                  setError("");
                  void (async () => {
                    const { getMyPosition, reverseGeocode } = await import("../lib/geo");
                    const pos = await getMyPosition();
                    if (!pos) {
                      setError("Position indisponible. Autorise la localisation, ou tape ta ville.");
                      return;
                    }
                    setCoords(pos);
                    const place = await reverseGeocode(pos).catch(() => null);
                    if (place?.city) setCity(place.city);
                    if (place?.area) setArea(place.area);
                    const c = place?.countryCode ? findWorldCountry(place.countryCode) : undefined;
                    if (c) setCountry(c.fr);
                  })().finally(() => setLocating(false));
                }}
                style={[box, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: accentA(0.5), backgroundColor: "transparent" }]}
              >
                <LocateFixed size={18} color={colors.accent} />
                <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>{locating ? "Localisation…" : coords ? "Position enregistrée ✓" : "Utiliser ma position"}</Text>
              </Press>
              <View style={box}>
                <TextInput value={city} onChangeText={setCity} placeholder="Ville *" placeholderTextColor={colors.muted} style={inputStyle} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 11 }}>Seuls la ville et le quartier sont affichés, jamais ton adresse exacte.</Text>
            </View>
          </View>

          <View style={row}>
            <View style={iconBox}><Phone size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={rowTitle}>Préférences de contact</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Press onPress={() => setContactMode("wipp")} style={[pill(contactMode === "wipp"), { flex: 1, height: 56 }]}>
                  <MessageCircle size={18} color={contactMode === "wipp" ? colors.accentFg : colors.fg} />
                  <View>
                    <Text style={pillText(contactMode === "wipp")}>Chat WIPP</Text>
                    <Text style={{ fontSize: 10, color: contactMode === "wipp" ? colors.accentFg : colors.muted }}>Recommandé (anonyme)</Text>
                  </View>
                </Press>
                <Press onPress={() => setContactMode("phone")} style={[pill(contactMode === "phone"), { flex: 1, height: 56 }]}>
                  <Phone size={18} color={contactMode === "phone" ? colors.accentFg : colors.fg} />
                  <View>
                    <Text style={pillText(contactMode === "phone")}>Téléphone</Text>
                    <Text style={{ fontSize: 10, color: contactMode === "phone" ? colors.accentFg : colors.muted }}>Afficher mon numéro</Text>
                  </View>
                </Press>
              </View>
              {contactMode === "phone" ? <DialPhoneField country={listingCountry} value={phone} onChange={(v) => setPhone(v ?? "")} /> : null}
            </View>
          </View>
          <View style={row}>
            <View style={iconBox}><SlidersHorizontal size={20} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 12 }}>
              <Text style={rowTitle}>Options</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pin size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg }}>Mettre en avant mon annonce</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>En haut des résultats pendant 7 jours · une annonce à la fois</Text>
                </View>
                <Toggle value={boost} onChange={setBoost} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Clock size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg }}>Programmer la publication</Text>
                  <Text style={{ color: publishAt ? colors.accent : colors.muted, fontSize: 11 }}>
                    {publishAt ? `Visible le ${dayLabel(publishAt)} à ${String(publishAt.getHours()).padStart(2, "0")}:${String(publishAt.getMinutes()).padStart(2, "0")}` : "Choisir une date et une heure"}
                  </Text>
                </View>
                <Toggle value={Boolean(publishAt)} onChange={(on) => (on ? setScheduling("day") : setPublishAt(null))} />
              </View>
            </View>
          </View>
          {status ? <Text style={{ color: colors.muted, marginTop: 8 }}>{status}</Text> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          {error ? <Text style={{ color: colors.danger, marginBottom: 8, textAlign: "center" }}>{error}</Text> : null}
          <Press disabled={busy} onPress={() => void publish()} style={{ height: 56, borderRadius: 18, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: busy ? 0.7 : 1 }}>
            <Text style={{ color: colors.accentFg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{busy ? "Publication…" : listingId ? "Enregistrer" : "Publier mon annonce"}</Text>
            {busy ? null : <ArrowRight size={20} color={colors.accentFg} />}
          </Press>
        </View>
      </KeyboardAvoidingView>
      <WorldCountrySheet open={countryOpen} selectedId={listingCountry.id} onClose={() => setCountryOpen(false)} onPick={(c) => setCountry(c.fr)} />
      <CalendarSheet
        open={scheduling === "day"}
        value={publishAt}
        onClose={() => setScheduling(null)}
        onPick={(day) => {
          const next = new Date(day);
          next.setHours(publishAt?.getHours() ?? 9, publishAt?.getMinutes() ?? 0, 0, 0);
          setPublishAt(next);
          setScheduling("time");
        }}
      />
      <TimeSheet
        open={scheduling === "time"}
        start={publishAt ? `${String(publishAt.getHours()).padStart(2, "0")}:${String(publishAt.getMinutes()).padStart(2, "0")}` : "09:00"}
        end=""
        single
        title="Heure de publication"
        onClose={() => setScheduling(null)}
        onSave={(a) => {
          if (publishAt) {
            const [h, m] = a.split(":").map(Number);
            const next = new Date(publishAt);
            next.setHours(h || 0, m || 0, 0, 0);
            if (next.getTime() <= Date.now()) {
              setError("Choisis une date et une heure dans le futur.");
              setPublishAt(null);
            } else setPublishAt(next);
          }
          setScheduling(null);
        }}
      />
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
  const legacyLimit = /(\d+) places max/.exec(existing?.contact ?? "")?.[1];
  const [limitOn, setLimitOn] = useState(Boolean(existing?.capacity || legacyLimit));
  const [limit, setLimit] = useState(existing?.capacity ? String(existing.capacity) : legacyLimit ?? "");
  const [adultOnly, setAdultOnly] = useState(Boolean(existing?.adultOnly) || /^18\+/.test(existing?.contact ?? ""));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(existing?.lat ? { lat: existing.lat, lng: existing.lng } : null);
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
        contact: access.trim(),
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
      const savedId = id || eventId || "";
      if (savedId) {
        const { saveEventExtras } = await import("../lib/lot7/api");
        const { geocodeCity } = await import("../lib/geo");
        const where = online ? null : coords ?? (city.trim() ? await geocodeCity(city.trim(), eventCountry.id) : null);
        await saveEventExtras(savedId, { lat: where?.lat ?? null, lng: where?.lng ?? null, capacity: limitOn && limit ? Number(limit) : null, adult: adultOnly });
      }
      useWippStore.setState({ lifestyle: await fetchEvents(owner) });
      useWippStore.getState().replace({ name: "lifestyle", itemId: savedId });
    } catch (err) {
      setError(errorText(err, "Publication impossible."));
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
  const row = { flexDirection: "row" as const, gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: whiteA(0.06), marginTop: 10 };
  const iconBox = { width: 42, height: 42, borderRadius: 12, backgroundColor: accentA(0.10), alignItems: "center" as const, justifyContent: "center" as const };
  const rowTitle = { color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" };
  const box = { minHeight: 44, borderRadius: 12, backgroundColor: whiteA(0.06), paddingHorizontal: 12, justifyContent: "center" as const };
  const inputStyle = { flex: 1, color: colors.fg, fontSize: 15, paddingVertical: 10, ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {}) } as object;

  return (
    <ScreenRoot>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {/* Hero: illustration on the right, title on the left (artwork has no text). */}
          <View style={{ height: 200, marginHorizontal: -14, marginBottom: 4 }}>
            <Image source={eventHero} style={{ position: "absolute", right: 0, top: 0, width: "62%", height: "100%" }} contentFit="cover" />
            <LinearGradient colors={[colors.bg, bgA(0.6), bgA(0)]} locations={[0.35, 0.55, 0.8]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
            <LinearGradient colors={[bgA(0), colors.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40 }} />
            <Press accessibilityLabel="Retour" onPress={pop} style={{ position: "absolute", top: insets.top + 4, left: 10, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={26} color={colors.fg} />
            </Press>
            <View style={{ position: "absolute", left: 18, bottom: 18, width: "62%" }}>
              <Text style={{ color: colors.fg, fontSize: 30, lineHeight: 33, fontFamily: "Inter_800ExtraBold" }}>
                {eventId ? "Modifier l’" : "Créer un\n"}<Text style={{ color: colors.accent }}>événement</Text>
              </Text>
              <Text style={{ marginTop: 8, color: fgA(0.8), fontSize: 13, lineHeight: 18 }}>Partage ton événement sur WIPP et rassemble ta communauté.</Text>
            </View>
          </View>

          <View style={[row, { alignItems: "center" }]}>
            <View style={iconBox}><ImageIcon size={20} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={rowTitle}>Photo de l’événement</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Ajoute une image attrayante</Text>
            </View>
            <Press onPress={() => void addCover()} style={{ width: 130, height: 76, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: whiteA(0.3), overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
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
                    <Press key={id} onPress={() => setOnline(id === "online")} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: (id === "online") === online ? colors.accent : whiteA(0.06) }}>
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
                  <AddressField country={eventCountry} value={address} onChange={(v) => setAddress(v ?? "")} onPickCity={setCity} onPickCoords={(lat, lng) => setCoords({ lat, lng })} />
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
              <Press key={String(label)} onPress={() => setFree(val as boolean)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: free === val ? colors.accent : whiteA(0.15) }}>
                <Text style={{ color: free === val ? colors.accent : colors.fg, fontFamily: "Inter_600SemiBold" }}>{label as string}</Text>
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: free === val ? colors.accent : whiteA(0.4), alignItems: "center", justifyContent: "center" }}>
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
                  <Press key={c} onPress={() => setCategory(category === c ? "" : c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: category === c ? colors.accent : "transparent", borderWidth: 1, borderColor: category === c ? colors.accent : whiteA(0.18) }}>
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
                  <Press onPress={() => setCurrency(CURRENCIES[(CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length])} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: whiteA(0.12) }}>
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

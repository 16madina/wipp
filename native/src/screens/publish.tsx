import { useEffect, useState, type ReactNode } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, MapPin, MessageCircle, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, GlassHeader, Header, Press, ScreenRoot } from "../components/ui";
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

const EVENT_CATS = ["Musique", "Sport", "Food", "Communauté", "Culture", "Autre"];
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

function DateSheet({
  visible,
  value,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSave: (next: Date) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
    // Capture the date only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  function shift(part: "day" | "hour" | "minute", delta: number) {
    const next = new Date(draft);
    if (part === "day") next.setDate(next.getDate() + delta);
    if (part === "hour") next.setHours(next.getHours() + delta);
    if (part === "minute") next.setMinutes(next.getMinutes() + delta * 5);
    setDraft(next);
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press onPress={onClose} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Press onPress={() => undefined} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>{draft.toLocaleString()}</Text>
          <View style={{ marginTop: 16, gap: 10 }}>
            <Stepper label="Jour" onMinus={() => shift("day", -1)} onPlus={() => shift("day", 1)} />
            <Stepper label="Heure" onMinus={() => shift("hour", -1)} onPlus={() => shift("hour", 1)} />
            <Stepper label="Minutes" onMinus={() => shift("minute", -1)} onPlus={() => shift("minute", 1)} />
          </View>
          <Btn label="Utiliser cette date" onPress={() => onSave(draft)} style={{ marginTop: 18 }} />
        </Press>
      </Press>
    </Modal>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: colors.fg }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Press onPress={onMinus} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.fg, fontSize: 20 }}>−</Text>
        </Press>
        <Press onPress={onPlus} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.fg, fontSize: 20 }}>+</Text>
        </Press>
      </View>
    </View>
  );
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
          {error ? <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text> : null}
          {status ? <Text style={{ color: colors.muted, marginTop: 8 }}>{status}</Text> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          <Btn label={busy ? "Publication…" : listingId ? "Enregistrer" : "Publier l’annonce"} disabled={busy} onPress={() => void publish()} />
        </View>
      </KeyboardAvoidingView>
    </ScreenRoot>
  );
}

export function CreateLifestyleScreen({ eventId }: { eventId?: string }) {
  const pop = useWippStore((s) => s.pop);
  const existing = useWippStore((s) => (eventId ? s.lifestyle.find((item) => item.id === eventId) : undefined));
  const me = useWippStore((s) => s.me);
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
  const [access, setAccess] = useState(existing?.contact && !/^https?:/i.test(existing.contact) ? existing.contact : "");
  const [cover, setCover] = useState<DraftPhoto | null>(
    existing?.image || existing?.coverPath
      ? { uri: existing.image || existing.coverPath || "", path: existing.coverPath?.startsWith("http") ? undefined : existing.coverPath, mime: "image/jpeg" }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
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
      useWippStore.setState({ lifestyle: await fetchEvents(owner) });
      useWippStore.getState().replace({ name: "lifestyle", itemId: id || eventId || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={eventId ? "Modifier l’événement" : "Créer un événement"} onBack={pop} />
      </GlassHeader>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Press onPress={() => void addCover()} style={{ height: 220, borderRadius: 22, overflow: "hidden", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
            {cover ? <Image source={{ uri: cover.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Camera color={colors.accent} size={36} />}
            <View style={{ position: "absolute", bottom: 12, borderRadius: 12, backgroundColor: "rgba(5,7,12,0.72)", paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: colors.paper, fontFamily: "Inter_600SemiBold" }}>+ Ajouter une couverture</Text>
            </View>
          </Press>
          <Section title="INFORMATIONS">
            <Label>Nom de l’événement *</Label>
            <Input value={title} onChangeText={setTitle} placeholder="Ex. Session acoustique au parc" />
            <Label>Catégorie</Label>
            <Chips options={EVENT_CATS.map((item) => ({ id: item, label: item }))} value={category} onChange={setCategory} />
          </Section>
          <Section title="DATE ET HEURE">
            <Label>Début *</Label>
            <Press onPress={() => setPicking("start")} style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.navy, justifyContent: "center", paddingHorizontal: 14 }}>
              <Text style={{ color: starts ? colors.fg : colors.muted }}>{starts ? starts.toLocaleString() : "Choisir la date et l’heure"}</Text>
            </Press>
            <Label>Fin</Label>
            <Press onPress={() => setPicking("end")} style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.navy, justifyContent: "center", paddingHorizontal: 14 }}>
              <Text style={{ color: ends ? colors.fg : colors.muted }}>{ends ? ends.toLocaleString() : "Facultatif"}</Text>
            </Press>
          </Section>
          <Section title="LIEU">
            <Chips
              options={[{ id: "place", label: "En personne" }, { id: "online", label: "En ligne" }]}
              value={online ? "online" : "place"}
              onChange={(id) => setOnline(id === "online")}
            />
            {online ? (
              <>
                <Label>Lien</Label>
                <Input value={link} onChangeText={setLink} placeholder="https://" keyboardType="url" />
              </>
            ) : (
              <>
                <Label>Lieu</Label>
                <Input value={venue} onChangeText={setVenue} placeholder="Nom de la salle ou du parc" />
                <Label>Pays</Label>
                <Input value={country} onChangeText={setCountry} placeholder="Canada" />
                <Label>Ville *</Label>
                <Input value={city} onChangeText={setCity} placeholder="Montréal" />
                <Label>Adresse</Label>
                <Input value={address} onChangeText={setAddress} placeholder="Rue, sans publier un repère privé inutile" />
              </>
            )}
          </Section>
          <Section title="DESCRIPTION">
            <Input value={summary} onChangeText={setSummary} placeholder="Ce qui se passe, pour qui, et comment participer." multiline />
          </Section>
          <Section title="ORGANISATEUR">
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{me.displayName || "Ton profil WIPP"}</Text>
            <Text style={{ color: colors.muted }}>{me.username ? `@${me.username}` : "Le profil connecté organise cet événement."}</Text>
          </Section>
          <Section title="ACCÈS">
            <ToggleRow label="Événement gratuit" value={free} onChange={setFree} />
            {free ? null : (
              <>
                <Label>Prix *</Label>
                <Input value={amount} onChangeText={setAmount} placeholder="15" keyboardType="decimal-pad" />
                <Chips options={CURRENCIES.map((item) => ({ id: item, label: item }))} value={currency} onChange={setCurrency} />
              </>
            )}
            <Label>Précision facultative</Label>
            <Input value={access} onChangeText={setAccess} placeholder={free ? "Entrée libre, places limitées…" : "Lien externe, sans paiement dans WIPP"} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>WIPP n’encaisse pas les billets. Le prix est une information.</Text>
          </Section>
          {error ? <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text> : null}
          {status ? <Text style={{ color: colors.muted, marginTop: 8 }}>{status}</Text> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          <Btn label={busy ? "Publication…" : eventId ? "Enregistrer" : "Publier l’événement"} disabled={busy} onPress={() => void publish()} />
        </View>
      </KeyboardAvoidingView>
      <DateSheet
        visible={picking !== null}
        value={picking === "end" ? ends ?? starts ?? new Date() : starts ?? new Date()}
        onClose={() => setPicking(null)}
        onSave={(next) => {
          if (picking === "end") setEnds(next);
          else setStarts(next);
          setPicking(null);
        }}
      />
    </ScreenRoot>
  );
}

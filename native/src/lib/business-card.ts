import { Platform } from "react-native";
import { FileSystemSessionType, FileSystemUploadType, createUploadTask } from "expo-file-system/legacy";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./firebase-config";
import { firebaseIdToken } from "./firebase-phone";
import { signStorageObject } from "./storage-sign";
import { supabase } from "./supabase";
import { errorText } from "./error-fr";

export type BusinessCardView = {
  lat?: number | null;
  lng?: number | null;
  id: string;
  publicId: string;
  ownerProfileId: string;
  name: string;
  category: string;
  description: string;
  country: string;
  city: string;
  address: string | null;
  showAddress: boolean;
  hours: string | null;
  businessPhone: string | null;
  website: string | null;
  coverPath: string | null;
  logoPath: string | null;
  photoPaths: string[];
  isPublished: boolean;
  coverUrl: string | null;
  logoUrl: string | null;
  photoUrls: string[];
  coverUnresolved?: boolean;
  logoUnresolved?: boolean;
};

export type MyCardResult = {
  profileId: string;
  userCountry: string | null;
  card: BusinessCardView | null;
};

export type CardInput = {
  name: string;
  category: string;
  description: string;
  country: string;
  city: string;
  address: string | null;
  showAddress: boolean;
  hours: string | null;
  businessPhone: string | null;
  website: string | null;
  coverPath: string | null;
  logoPath: string | null;
  photoPaths: string[];
};

export const CARD_CATEGORIES = [
  "Mode & accessoires",
  "Vêtements",
  "Chaussures",
  "Bijoux & montres",
  "Beauté",
  "Cosmétiques & soins",
  "Coiffure",
  "Tresses & perruques",
  "Barbier",
  "Onglerie",
  "Maquillage",
  "Restaurant",
  "Traiteur",
  "Pâtisserie & boulangerie",
  "Café & bar",
  "Épicerie & alimentation",
  "Santé & bien-être",
  "Sport & fitness",
  "Immobilier",
  "Construction",
  "Rénovation & bricolage",
  "Plomberie & électricité",
  "Nettoyage & ménage",
  "Transport & livraison",
  "Automobile & mécanique",
  "Téléphonie & électronique",
  "Informatique & web",
  "Photo & vidéo",
  "Événementiel & décoration",
  "Musique & DJ",
  "Créateur / média",
  "Éducation & cours",
  "Garde d’enfants",
  "Services professionnels",
  "Juridique & comptabilité",
  "Voyage & tourisme",
  "Maison & déco",
  "Animaux",
  "Art & artisanat",
  "Association & communauté",
  "Autre",
] as const;

export function cardLink(publicId: string) {
  return `https://wippapp.com/b/${publicId}`;
}

export function cardToShop(
  card: Pick<
    BusinessCardView,
    "publicId" | "name" | "category" | "description" | "city" | "country" | "address" | "hours" | "businessPhone" | "coverUrl" | "logoUrl" | "ownerProfileId"
  > & { lat?: number | null; lng?: number | null },
  ownerId?: string,
) {
  const cat = card.category.toLowerCase();
  const category =
    /ongle|onglerie|nail/.test(cat) ? "nails" as const
    : /coiff|hair|tress|perruq|barb/.test(cat) ? "hair" as const
    : /beauté|beaute|beauty|cosm|maquill|soin/.test(cat) ? "beauty" as const
    : /restau|food|traiteur|épicerie|epicerie|aliment/.test(cat) ? "restaurant" as const
    : /plomb/.test(cat) ? "plumbing" as const
    : /immo/.test(cat) ? "realty" as const
    : /boulang|pâtiss|patiss/.test(cat) ? "bakery" as const
    : /caf/.test(cat) ? "cafe" as const
    : /bijou|jewel/.test(cat) ? "jewelry" as const
    : /maison|déco|deco/.test(cat) ? "home" as const
    : ("services" as const);
  return {
    id: `business:${card.publicId}`,
    name: card.name,
    ownerId: ownerId ?? (card.ownerProfileId ? `srvuser:${card.ownerProfileId}` : ""),
    handle: card.publicId,
    bio: card.description,
    address: card.address ?? "",
    city: card.city,
    country: card.country,
    phone: card.businessPhone ?? "",
    lat: card.lat ?? 0,
    lng: card.lng ?? 0,
    hours: card.hours ?? "",
    plan: "vitrine" as const,
    image: card.coverUrl || card.logoUrl || "",
    logo: card.logoUrl ?? undefined,
    photos: [],
    code: "",
    qrToken: card.publicId,
    tags: [card.category],
    category,
  };
}

async function cardsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<T>(path, init);
}

export async function getMyBusinessCard() {
  const result = await cardsApi<MyCardResult>("business-cards/me");
  if (!result.card) return result;
  return { ...result, card: await withSignedCardMedia(result.card) };
}

export async function saveMyBusinessCard(input: CardInput) {
  const saved = await cardsApi<BusinessCardView>("business-cards/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return withSignedCardMedia(saved);
}

export async function listPublicBusinessCards(q = "") {
  const query = q.trim();
  const path = query ? `business-cards/public?q=${encodeURIComponent(query)}` : "business-cards/public";
  return cardsApi<BusinessCardView[]>(path);
}

export async function getPublicBusinessCard(publicId: string) {
  return cardsApi<BusinessCardView | null>(`business-cards/public/${encodeURIComponent(publicId)}`);
}

/** The published business card of a person (contact info), or null. */
export async function getBusinessCardOfOwner(profileId: string) {
  const id = profileId.replace(/^srvuser:/, "");
  const r = await cardsApi<{ card: BusinessCardView | null }>(`business-cards/owner/${encodeURIComponent(id)}`);
  return r.card;
}

export async function signBusinessImage(path: string) {
  return signStorageObject("wipp-business-cards", path);
}

async function resolveCardImage(url: string | null, path: string | null) {
  if (url) return { url, unresolved: false };
  if (!path) return { url: null, unresolved: false };
  try {
    return { url: await signBusinessImage(path), unresolved: false };
  } catch (err) {
    console.warn("[wipp] card image unresolved", errorText(err, "unknown"));
    return { url: null, unresolved: true };
  }
}

export async function withSignedCardMedia(card: BusinessCardView): Promise<BusinessCardView> {
  const cover = await resolveCardImage(card.coverUrl, card.coverPath);
  const logo = await resolveCardImage(card.logoUrl, card.logoPath);
  const photoUrls = await Promise.all(
    (card.photoPaths ?? []).map(async (path, index) => {
      const existing = card.photoUrls?.[index];
      if (existing && /^https?:\/\//i.test(existing)) return existing;
      try {
        return await signBusinessImage(path);
      } catch (err) {
        console.warn("[wipp] card gallery unresolved", errorText(err, "unknown"));
        return "";
      }
    }),
  );
  return {
    ...card,
    coverUrl: cover.url,
    logoUrl: logo.url,
    photoUrls: photoUrls.filter(Boolean),
    coverUnresolved: cover.unresolved,
    logoUnresolved: logo.unresolved,
  };
}

/** Streams the file. The card row is updated only after this upload succeeds. */
export async function uploadBusinessImageFile(
  profileId: string,
  uri: string,
  mime: string,
  role: "cover" | "logo" | "photo",
  onProgress?: (sent: number, total: number) => void,
) {
  if (!mime.startsWith("image/")) throw new Error("Choisis une image");
  const token = await firebaseIdToken();
  if (!token) throw new Error("Session requise");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `${profileId}/${role}-${crypto.randomUUID()}.${ext}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/wipp-business-cards/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": mime,
    "x-upsert": "false",
  };
  if (Platform.OS === "web") {
    // No native upload task in the browser: send the picked file (blob: or data: URI) with fetch.
    const body = await (await fetch(uri)).blob();
    onProgress?.(0, body.size);
    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (!res.ok) throw new Error("Envoi de l’image impossible");
    onProgress?.(body.size, body.size);
    try {
      return { path, url: await signBusinessImage(path) };
    } catch {
      return { path, url: uri };
    }
  }
  const task = createUploadTask(
    endpoint,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      sessionType: FileSystemSessionType.FOREGROUND,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": mime,
        "x-upsert": "false",
      },
    },
    (data) => {
      if (data.totalBytesExpectedToSend > 0) onProgress?.(data.totalBytesSent, data.totalBytesExpectedToSend);
    },
  );
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) throw new Error("Envoi de l’image impossible");
  try {
    return { path, url: await signBusinessImage(path) };
  } catch {
    return { path, url: "" };
  }
}

/** Opens the normal 1:1 conversation with the card owner. Does not create a business inbox. */
export async function messageCardOwner(ownerProfileId: string) {
  const id = ownerProfileId.replace(/^srvuser:/, "");
  if (!id) throw new Error("Profil WIPP introuvable.");
  const { data, error } = await supabase.from("wipp_public_profiles").select("username").eq("id", id).maybeSingle();
  if (error || !data?.username) throw new Error("Profil WIPP introuvable.");
  const { useWippStore } = await import("./store");
  await useWippStore.getState().openServerDm(data.username);
}

import { supabase } from "./supabase";

export type BusinessCardView = {
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
  "Beauté",
  "Coiffure",
  "Restaurant",
  "Services professionnels",
  "Immobilier",
  "Construction",
  "Santé & bien-être",
  "Créateur / média",
  "Autre",
] as const;

export function cardLink(publicId: string) {
  return `https://wippapp.com/b/${publicId}`;
}

export function cardToShop(
  card: Pick<
    BusinessCardView,
    "publicId" | "name" | "category" | "description" | "city" | "country" | "address" | "hours" | "businessPhone" | "coverUrl" | "logoUrl" | "ownerProfileId"
  >,
  ownerId?: string,
) {
  const cat = card.category.toLowerCase();
  const category =
    /ongle|nail/.test(cat) ? "nails" as const
    : /coiff|hair/.test(cat) ? "hair" as const
    : /beauté|beauty/.test(cat) ? "beauty" as const
    : /restau|food|traiteur/.test(cat) ? "restaurant" as const
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
    lat: 0,
    lng: 0,
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
  return cardsApi<MyCardResult>("business-cards/me");
}

export async function saveMyBusinessCard(input: CardInput) {
  return cardsApi<BusinessCardView>("business-cards/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function listPublicBusinessCards() {
  return cardsApi<BusinessCardView[]>("business-cards/public");
}

export async function getPublicBusinessCard(publicId: string) {
  return cardsApi<BusinessCardView | null>(`business-cards/public/${encodeURIComponent(publicId)}`);
}

export async function uploadBusinessImage(
  profileId: string,
  bytes: Uint8Array,
  mime: string,
  role: "cover" | "logo" | "photo",
) {
  if (!mime.startsWith("image/")) throw new Error("Choisis une image");
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("L’image dépasse 8 Mo");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `${profileId}/${role}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("wipp-business-cards").upload(path, bytes, { contentType: mime });
  if (error) throw new Error(error.message);
  const { data } = await supabase.storage.from("wipp-business-cards").createSignedUrl(path, 3600);
  return { path, url: data?.signedUrl ?? "" };
}

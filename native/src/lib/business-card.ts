import { supabase } from "./supabase";
import { callServerFn } from "./server-fn";

const FN = {
  getMyBusinessCard: "be8fd899c8f036ecaef12bb38299f05d803d8e5a65a024032ef67f65456b7e10",
  saveMyBusinessCard: "af7c1e18713b57aaf761532331fd576e5c958701df828fc8410c181447d0b80c",
  listPublicBusinessCards: "0b9f88e5e843fa90837890eb8b5b7d18aa7e650a771a913281ba47e22178ab6b",
  getPublicBusinessCard: "13a38302c8034af02c6cbe586a9cc3749ac1aefd141735a45b0d35d472549edf",
} as const;

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

export async function getMyBusinessCard() {
  return callServerFn<MyCardResult>(FN.getMyBusinessCard, {});
}

export async function saveMyBusinessCard(input: CardInput) {
  return callServerFn<BusinessCardView>(FN.saveMyBusinessCard, input);
}

export async function listPublicBusinessCards() {
  return callServerFn<BusinessCardView[]>(FN.listPublicBusinessCards, {});
}

export async function getPublicBusinessCard(publicId: string) {
  return callServerFn<BusinessCardView | null>(FN.getPublicBusinessCard, { publicId });
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

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./firebase-config";
import { firebaseIdToken } from "./firebase-phone";

/** Signs a private object with the current Firebase token. Never logs the token or the signed URL. */
export async function signStorageObject(bucket: "wipp-business-cards" | "wipp-public-media", path: string) {
  const token = await firebaseIdToken();
  if (!token) throw new Error("Session requise pour afficher l’image.");
  const encoded = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encoded}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!res.ok) {
    console.warn("[wipp] media sign failed", bucket, res.status);
    throw new Error(res.status === 401 || res.status === 403 ? "Image privée illisible." : "Affichage de l’image impossible.");
  }
  let signed = "";
  try {
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    signed = data.signedUrl || data.signedURL || "";
  } catch {
    signed = "";
  }
  if (!signed) throw new Error("Affichage de l’image impossible.");
  if (signed.startsWith("http")) return signed;
  return `${SUPABASE_URL}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
}

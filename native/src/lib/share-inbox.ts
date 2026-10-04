import * as FileSystem from "expo-file-system/legacy";
import type { ShareIntent, ShareIntentFile } from "expo-share-intent";
import { LIMITS } from "./messaging/media-crypto";

export type ShareDraft =
  | { kind: "text"; text: string }
  | { kind: "image" | "video"; uri: string; mime: string; name: string; size: number };

const IMAGE = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"]);
const VIDEO = new Set(["video/mp4", "video/quicktime", "video/webm", "video/mpeg", "video/3gpp"]);

function mimeOf(file: ShareIntentFile) {
  const raw = (file.mimeType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (raw && raw !== "application/octet-stream") return raw;
  const name = `${file.fileName} ${file.path}`.toLowerCase();
  if (/\.(jpe?g)$/.test(name)) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".mp4") || name.endsWith(".m4v")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return raw;
}

async function localFile(uri: string, ext: string) {
  if (!uri.startsWith("content://") && !uri.startsWith("ph://") && !uri.startsWith("assets-library://")) return uri;
  const dest = `${FileSystem.cacheDirectory}wipp-share-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

async function byteSize(uri: string, reported: number | null) {
  if (reported && reported > 0) return reported;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && "size" in info && typeof info.size === "number" ? info.size : 0;
}

export const SHARE_MAX_FILES = 10;

async function fileDraft(file: ShareIntentFile): Promise<ShareDraft> {
  const mime = mimeOf(file);
  const kind = IMAGE.has(mime) ? "image" : VIDEO.has(mime) ? "video" : null;
  if (!kind) throw new Error("Ce type de fichier n’est pas pris en charge.");
  const ext = kind === "video" ? "mp4" : mime.includes("png") ? "png" : "jpg";
  const uri = await localFile(file.path, ext);
  const size = await byteSize(uri, file.size);
  const limit = kind === "video" ? LIMITS.video : LIMITS.image;
  if (!size) throw new Error("Fichier introuvable.");
  if (size > limit) throw new Error(kind === "video" ? "Une vidéo dépasse 100 Mo." : "Une image dépasse 16 Mo.");
  return { kind, uri, mime, name: file.fileName || (kind === "video" ? "video.mp4" : "image.jpg"), size };
}

/**
 * Turns an OS share into WIPP drafts (up to 10 photos/videos, or one text). Does not send.
 * Unsupported or too-large files are skipped; `skipped` says how many.
 */
export async function draftsFromShare(intent: ShareIntent): Promise<{ drafts: ShareDraft[]; skipped: number }> {
  const files = intent.files ?? [];
  if (files.length) {
    const drafts: ShareDraft[] = [];
    let skipped = Math.max(0, files.length - SHARE_MAX_FILES);
    let lastError: unknown = null;
    for (const file of files.slice(0, SHARE_MAX_FILES)) {
      try {
        drafts.push(await fileDraft(file));
      } catch (err) {
        skipped += 1;
        lastError = err;
      }
    }
    if (!drafts.length) throw lastError instanceof Error ? lastError : new Error("Rien à envoyer.");
    return { drafts, skipped };
  }
  const text = (intent.webUrl || intent.text || "").trim();
  if (!text) throw new Error("Rien à envoyer.");
  if (text.length > 8000) throw new Error("Ce texte est trop long.");
  return { drafts: [{ kind: "text", text }], skipped: 0 };
}

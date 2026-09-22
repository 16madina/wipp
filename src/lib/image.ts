const PHOTO_DIRS = ["/avatars/", "/media/", "/brand/"];

export function webpSrc(src?: string | null) {
  if (!src) return src ?? "";
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) return src;
  if (!PHOTO_DIRS.some((d) => src.startsWith(d))) return src;
  return src.replace(/\.(jpe?g|png)$/i, ".webp");
}

export function isLazyPhoto(src?: string | null) {
  if (!src) return false;
  return !src.startsWith("data:") && !src.startsWith("blob:");
}

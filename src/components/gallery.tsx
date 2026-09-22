import { useRef, useState } from "react";
import { ImagePlus, Play, Video } from "lucide-react";
import { Sheet } from "@/components/ui";
import { SmartImg } from "@/components/smart-img";
import { useT } from "@/lib/store";
import { STORY_VIDEO_MAX_MS } from "@/lib/types";
import { cn } from "@/lib/utils";

export const GALLERY_IMAGES = [
  "/media/coffee.jpg",
  "/media/food.jpg",
  "/media/river.jpg",
  "/media/soccer.jpg",
  "/media/apt.jpg",
  "/media/chair.jpg",
  "/media/civic.jpg",
  "/avatars/deena.jpg",
  "/avatars/maya.jpg",
  "/avatars/alex.jpg",
  "/avatars/samira.jpg",
  "/avatars/julien.jpg",
  "/avatars/noah.jpg",
  "/avatars/lea.jpg",
  "/avatars/sofia.jpg",
  "/avatars/aisha.jpg",
  "/avatars/ines.jpg",
  "/avatars/karim.jpg",
  "/avatars/malik.jpg",
  "/avatars/adama.jpg",
] as const;

export const GALLERY_VIDEOS = [
  { src: "/stories/soccer.mp4", poster: "/media/soccer.jpg", durationMs: 10_000 },
  { src: "/stories/river.mp4", poster: "/media/river.jpg", durationMs: 10_000 },
  { src: "/stories/food.mp4", poster: "/media/food.jpg", durationMs: 10_000 },
  { src: "/stories/city.mp4", poster: "/media/coffee.jpg", durationMs: 10_000 },
] as const;

export type StoryMediaPick =
  | { type: "image"; url: string }
  | { type: "video"; url: string; durationMs: number };

export function formatStoryDuration(ms: number) {
  const s = Math.min(60, Math.max(1, Math.round(ms / 1000)));
  if (s >= 60) return "1:00";
  return `0:${String(s).padStart(2, "0")}`;
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 960;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

export function readVideoFile(file: File): Promise<{ url: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationMs = Math.round((Number.isFinite(video.duration) ? video.duration : 0) * 1000);
      if (!durationMs) {
        URL.revokeObjectURL(url);
        reject(new Error("video"));
        return;
      }
      if (durationMs > STORY_VIDEO_MAX_MS + 500) {
        URL.revokeObjectURL(url);
        reject(new Error("too-long"));
        return;
      }
      resolve({ url, durationMs: Math.min(durationMs, STORY_VIDEO_MAX_MS) });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video"));
    };
    video.src = url;
  });
}

export function GalleryGrid({
  onPick,
  selected,
}: {
  onPick: (url: string) => void;
  selected?: string;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void readImageFile(file).then(onPick);
        }}
      />
      <button
        type="button"
        className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl glass-card text-[14px] font-medium"
        onClick={() => input.current?.click()}
      >
        <ImagePlus className="size-4" />
        {t("fromDevice")}
      </button>
      <p className="mb-2 px-0.5 text-[12px] font-medium tracking-wide text-muted uppercase">
        {t("recents")}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {GALLERY_IMAGES.map((src) => (
          <button
            key={src}
            type="button"
            className={cn(
              "aspect-square overflow-hidden rounded-md bg-surface-2",
              selected === src && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
            )}
            onClick={() => onPick(src)}
            aria-label={t("pickPhoto")}
          >
            <SmartImg src={src} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StoryMediaGrid({
  kind,
  onPick,
}: {
  kind: "image" | "video";
  onPick: (pick: StoryMediaPick) => void;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={kind === "video" ? "video/*" : "image/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError(null);
          if (kind === "video") {
            void readVideoFile(file).then(
              (clip) => onPick({ type: "video", url: clip.url, durationMs: clip.durationMs }),
              (err: Error) => setError(err.message === "too-long" ? t("storyVideoTooLong") : t("storyVideoFail")),
            );
          } else {
            void readImageFile(file).then((url) => onPick({ type: "image", url }));
          }
        }}
      />
      <button
        type="button"
        className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl glass-card text-[14px] font-medium"
        onClick={() => input.current?.click()}
      >
        {kind === "video" ? <Video className="size-4" /> : <ImagePlus className="size-4" />}
        {t("fromDevice")}
        {kind === "video" ? (
          <span className="text-[12px] font-normal text-muted">· {t("storyVideoMax")}</span>
        ) : null}
      </button>
      {error ? <p className="mb-2 text-center text-[13px] text-danger">{error}</p> : null}
      <p className="mb-2 px-0.5 text-[12px] font-medium tracking-wide text-muted uppercase">
        {t("recents")}
      </p>
      {kind === "video" ? (
        <div className="grid grid-cols-3 gap-1">
          {GALLERY_VIDEOS.map((clip) => (
            <button
              key={clip.src}
              type="button"
              className="relative aspect-square overflow-hidden rounded-md bg-surface-2"
              onClick={() => onPick({ type: "video", url: clip.src, durationMs: clip.durationMs })}
              aria-label={t("pickVideo")}
            >
              <SmartImg src={clip.poster} alt="" className="size-full object-cover" />
              <span className="absolute inset-0 bg-ink/20" />
              <span className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink/55">
                <Play className="size-3.5 translate-x-px text-paper" />
              </span>
              <span className="absolute right-1.5 bottom-1.5 rounded-full bg-ink/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-paper">
                {formatStoryDuration(clip.durationMs)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {GALLERY_IMAGES.map((src) => (
            <button
              key={src}
              type="button"
              className="aspect-square overflow-hidden rounded-md bg-surface-2"
              onClick={() => onPick({ type: "image", url: src })}
              aria-label={t("pickPhoto")}
            >
              <SmartImg src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GallerySheet({
  open,
  onClose,
  onPick,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
  title?: string;
}) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={title ?? t("gallery")}>
      <div className="max-h-[68vh] overflow-y-auto no-scrollbar">
        <GalleryGrid
          onPick={(url) => {
            onPick(url);
            onClose();
          }}
        />
      </div>
    </Sheet>
  );
}

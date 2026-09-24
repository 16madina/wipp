import { useEffect, useRef, useState } from "react";
import { emojiFromStickerId, isEmojiSticker } from "@/lib/emoji";
import { playStickerCue } from "@/lib/sticker-fx";
import { STICKER_PLAY_S, stickerById, type StickerId } from "@/lib/stickers";
import { useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function keyGreen(data: ImageData) {
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const g = p[i + 1];
    const b = p[i + 2];
    const maxRB = Math.max(r, b);
    const greenLead = g - maxRB;
    if (g > 48 && greenLead > 14 && g > (r + b) * 0.42) {
      const spill = Math.min(1, greenLead / 36);
      p[i + 3] = Math.round(p[i + 3] * Math.max(0, 1 - spill * 1.35));
    } else if (g > r && g > b && greenLead > 6) {
      p[i + 1] = maxRB + Math.round(greenLead * 0.25);
    }
  }
}

function StickerClip({
  src,
  poster,
  size,
  loopSoft,
  label,
  onLongPress,
}: {
  src: string;
  poster: string;
  size: number;
  loopSoft?: boolean;
  label: string;
  onLongPress?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const played = useRef(false);
  const raf = useRef(0);

  function paint() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (video.readyState < 2) return;
    ctx.drawImage(video, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);
    keyGreen(frame);
    ctx.putImageData(frame, 0, 0);
  }

  function tick() {
    paint();
    const video = videoRef.current;
    if (video && !video.paused && !video.ended) {
      raf.current = requestAnimationFrame(tick);
    }
  }

  function playOnce() {
    const video = videoRef.current;
    if (!video) return;
    video.loop = Boolean(loopSoft);
    video.playbackRate = loopSoft ? 0.92 : 1;
    video.currentTime = 0;
    void video.play().then(() => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(tick);
    });
  }

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const posterImg = new Image();
    posterImg.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || played.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(posterImg, 0, 0, canvas.width, canvas.height);
    };
    posterImg.src = poster;

    const onTime = () => {
      if (loopSoft) return;
      if (video.currentTime >= STICKER_PLAY_S) {
        video.pause();
        paint();
      }
    };
    const onEnded = () => {
      if (!loopSoft) {
        video.pause();
        paint();
      }
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    video.addEventListener("seeked", paint);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || played.current) return;
        played.current = true;
        playOnce();
      },
      { threshold: 0.45 },
    );
    io.observe(canvas);

    return () => {
      io.disconnect();
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("seeked", paint);
      cancelAnimationFrame(raf.current);
    };
  }, [size, loopSoft, src]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className="relative shrink-0 cursor-pointer"
      style={{ width: size, height: size }}
      onClick={(e) => {
        e.stopPropagation();
        playOnce();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playOnce();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.();
      }}
      onPointerDown={(e) => {
        if (!onLongPress) return;
        const hold = window.setTimeout(() => onLongPress(), 480);
        const up = () => {
          window.clearTimeout(hold);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointerup", up);
        void e;
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute opacity-0"
        style={{ width: 1, height: 1 }}
      />
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

const playedMoments = new Set<string>();

function CastSticker({
  row,
  size,
  className,
  onLongPress,
  onceKey,
}: {
  row: NonNullable<ReturnType<typeof stickerById>>;
  size: number;
  className?: string;
  onLongPress?: () => void;
  onceKey?: string;
}) {
  const reduce = useWgoStore((s) => s.a11y.reduceMotion);
  const [play, setPlay] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  function go(fromTap: boolean) {
    setPlay((n) => n + 1);
    if (reduce || size < 110) return;
    if (row.moment && onceKey && !fromTap) {
      if (playedMoments.has(onceKey)) return;
      playedMoments.add(onceKey);
    }
    playStickerCue(row, true);
  }

  useEffect(() => {
    const el = box.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || seen.current) return;
        seen.current = true;
        go(false);
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [row.id, reduce, onceKey]);

  const replay = size >= 110;

  return (
    <div
      ref={box}
      role={replay ? "button" : undefined}
      tabIndex={replay ? 0 : undefined}
      aria-label={row.labelFr}
      className={cn("relative shrink-0", replay && "cursor-pointer", className)}
      style={{ width: size, height: size }}
      onClick={
        replay
          ? (e) => {
              e.stopPropagation();
              go(true);
            }
          : undefined
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go(true);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.();
      }}
    >
      <img
        key={play}
        src={row.src}
        alt=""
        draggable={false}
        className={cn("size-full object-contain", !reduce && play > 0 && `cast-go cast-${row.motion}`)}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function WippSticker({
  id,
  size = 72,
  className,
  animated = false,
  onLongPress,
  onceKey,
}: {
  id: StickerId;
  size?: number;
  className?: string;
  animated?: boolean;
  onLongPress?: () => void;
  onceKey?: string;
}) {
  const row = stickerById(id);
  if (isEmojiSticker(id)) {
    const emoji = emojiFromStickerId(id);
    return (
      <span
        role="img"
        aria-label={emoji}
        className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
        style={{ width: size, height: size, fontSize: size * 0.78 }}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress?.();
        }}
        onPointerDown={() => {
          if (!onLongPress) return;
          const hold = window.setTimeout(() => onLongPress(), 480);
          const up = () => {
            window.clearTimeout(hold);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointerup", up);
        }}
      >
        {emoji}
      </span>
    );
  }
  if (!row) return null;
  if (row.motion) {
    return <CastSticker row={row} size={size} className={className} onLongPress={onLongPress} onceKey={onceKey} />;
  }
  if (animated && row.anim) {
    return (
      <StickerClip
        src={row.anim}
        poster={row.src}
        size={size}
        loopSoft={"loopSoft" in row && row.loopSoft}
        label={row.labelFr}
        onLongPress={onLongPress}
      />
    );
  }
  return (
    <img
      src={row.src}
      alt={row.labelFr}
      width={size}
      height={size}
      draggable={false}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

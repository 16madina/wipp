import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import type { ScratchDesign } from "@/components/scratch-card";
import type { SurpriseCardDef } from "@/lib/surprise-cards";
import { useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function soundOn() {
  const a11y = useWgoStore.getState().a11y;
  return a11y?.reduceMotion !== true && a11y?.stickerSound !== false;
}

let audio: AudioContext | null = null;
function ac() {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audio ||= new Ctor();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function scratchNoise() {
  if (!soundOn()) return;
  const ctx = ac();
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * 0.045);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900 + Math.random() * 500;
  filter.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.03;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
}

function ting() {
  if (!soundOn()) return;
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1318, t);
  g.gain.setValueAtTime(0.035, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.18);
}

function foilColors(material: ScratchDesign) {
  if (material === "love") return ["#8d3d52", "#e7a0b0", "#5c2434"] as const;
  if (material === "birthday") return ["#8a6420", "#f0d56a", "#c9842a"] as const;
  if (material === "fun") return ["#7a5b00", "#c99212", "#ffd84d"] as const;
  if (material === "secret") return ["#121418", "#8d939c", "#2a2e36"] as const;
  return ["#6e5420", "#d7b45a", "#a68534"] as const;
}

/** Opaque foil covering the whole scratch zone — finger reveals the message underneath. */
function paintFoil(ctx: CanvasRenderingContext2D, w: number, h: number, material: ScratchDesign, hint: string) {
  const base = foilColors(material);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, base[0]);
  g.addColorStop(0.45, base[1]);
  g.addColorStop(1, base[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    const n = Math.random();
    ctx.fillStyle = n > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
  }
  // Soft edge so it sits on the gold brushstroke
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.48, h * 0.42, -0.06, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = material === "secret" ? "#d5d8de" : "#1a1408";
  ctx.font = `600 ${Math.max(12, Math.min(15, w * 0.08))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(hint, w / 2, h / 2);
}

/**
 * Permanent card asset + secret message + interactive scratch layer over scratch_zone.
 * Recipient scratches the foil with their finger; when enough is cleared, message shows and onReveal fires (animation).
 */
export function SurpriseCardView({
  card,
  text,
  hint,
  resetKey = 0,
  interactive = true,
  revealed = false,
  onReveal,
  className,
}: {
  card: SurpriseCardDef;
  text: string;
  hint: string;
  resetKey?: number;
  interactive?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const done = useRef(Boolean(revealed));
  const lastSound = useRef(0);
  const lastHaptic = useRef(0);
  const [open, setOpen] = useState(revealed);
  const [fading, setFading] = useState(false);
  const [hintOn, setHintOn] = useState(!revealed && interactive);

  useEffect(() => {
    done.current = Boolean(revealed);
    setOpen(revealed);
    setFading(false);
    setHintOn(!revealed && interactive);
    last.current = null;
  }, [resetKey, card.card_id, revealed, interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || open) return;
    let stop = false;
    const paint = () => {
      if (stop) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) {
        requestAnimationFrame(paint);
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      paintFoil(ctx, w, h, card.scratch_material, hint);
    };
    paint();
    return () => {
      stop = true;
    };
  }, [open, card.scratch_material, hint, resetKey]);

  function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, dpr: number) {
    // Finger-sized hole — wide enough for real thumb strokes on mobile
    const r = (28 + Math.random() * 10) * dpr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = r * (0.3 + Math.random() * 0.7);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, r * (0.22 + Math.random() * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function finish() {
    if (done.current) return;
    done.current = true;
    setHintOn(false);
    setFading(true);
    haptic("success");
    ting();
    // Foil fades → message fully visible → animation kicks in
    window.setTimeout(() => {
      setOpen(true);
      onReveal?.();
    }, 280);
  }

  function cleared(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < sample.length; i += 12) {
      total++;
      if (sample[i] < 28) clear++;
    }
    return total ? clear / total : 0;
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!interactive || done.current || fading) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    setHintOn(false);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dpr = canvas.width / Math.max(1, rect.width);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    const prev = last.current;
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 5));
      for (let i = 1; i <= steps; i++) {
        stamp(ctx, (prev.x + (dx * i) / steps) * dpr, (prev.y + (dy * i) / steps) * dpr, dpr);
      }
    } else {
      stamp(ctx, x * dpr, y * dpr, dpr);
    }
    ctx.restore();
    last.current = { x, y };
    const now = Date.now();
    if (now - lastSound.current > 70) {
      lastSound.current = now;
      scratchNoise();
    }
    if (now - lastHaptic.current > 120) {
      lastHaptic.current = now;
      haptic("tap");
    }
    // ~35% of the foil cleared → reveal message + fire animation
    if (cleared(ctx, canvas) >= 0.35) finish();
  }

  const z = card.scratch_zone;

  return (
    <div className={cn("relative w-full select-none", className)}>
      {/* Layer 1 — permanent asset (never scratched) */}
      <img
        src={card.asset_url}
        alt=""
        draggable={false}
        decoding="async"
        className="pointer-events-none block h-auto w-full object-contain"
      />

      {/* Layers 2–4 — message under foil → interactive foil → “Gratte…” */}
      <div
        className="absolute overflow-hidden rounded-[40%]"
        style={{
          left: `${z.x}%`,
          top: `${z.y}%`,
          width: `${z.w}%`,
          height: `${z.h}%`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-2 text-center">
          <p className="whitespace-pre-wrap font-serif text-[13px] font-bold italic leading-snug text-[#1a1208] sm:text-[15px]">
            {text.trim() || "···"}
          </p>
        </div>

        {!open ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 size-full touch-none"
            style={{
              pointerEvents: interactive ? "auto" : "none",
              touchAction: "none",
              opacity: fading ? 0 : 1,
              transition: "opacity 280ms ease",
              cursor: interactive ? "crosshair" : "default",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              last.current = null;
              e.currentTarget.setPointerCapture(e.pointerId);
              scratch(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons || e.pointerType === "touch" || e.pointerType === "pen") scratch(e);
            }}
            onPointerUp={() => {
              last.current = null;
            }}
            onPointerCancel={() => {
              last.current = null;
            }}
          />
        ) : null}

        {hintOn && interactive ? (
          <span className="scratch-finger pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}

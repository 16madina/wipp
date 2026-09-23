import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { useWgoStore } from "@/lib/store";

export type ScratchDesign = "gold" | "love" | "birthday" | "fun" | "secret" | "heart" | "spark" | "crown" | "duo";

function lookOf(design: ScratchDesign) {
  if (design === "heart" || design === "gold") return "gold";
  if (design === "duo" || design === "love") return "love";
  if (design === "crown" || design === "birthday") return "birthday";
  if (design === "spark" || design === "fun") return "fun";
  return "secret";
}

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

function paintFoil(ctx: CanvasRenderingContext2D, w: number, h: number, design: ScratchDesign, hint: string) {
  const look = lookOf(design);
  const base =
    look === "love" ? ["#8d3d52", "#e7a0b0", "#5c2434"]
    : look === "birthday" ? ["#8a6420", "#f0d56a", "#c9842a"]
    : look === "fun" ? ["#7a5b00", "#c99212", "#ffd84d"]
    : look === "secret" ? ["#121418", "#8d939c", "#2a2e36"]
    : ["#6e5420", "#d7b45a", "#a68534"];
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, base[0]);
  g.addColorStop(0.45, base[1]);
  g.addColorStop(1, base[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    const n = Math.random();
    ctx.fillStyle = n > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
  }
  if (look === "birthday") {
    const colors = ["#ffd84d", "#ff5a7a", "#7ec8ff", "#fff"];
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
    }
  }
  ctx.fillStyle = look === "secret" ? "#d5d8de" : "#1a1408";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(hint, w / 2, h - 22);
}

export function ScratchCard({
  text,
  design = "gold",
  revealed = false,
  time,
  hint,
  found,
  replayLabel,
  onReveal,
  preview = false,
}: {
  text: string;
  design?: ScratchDesign;
  revealed?: boolean;
  time?: string;
  wait?: string;
  hint: string;
  found: string;
  replayLabel: string;
  onReveal?: () => void;
  preview?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const done = useRef(Boolean(revealed));
  const lastSound = useRef(0);
  const lastHaptic = useRef(0);
  const [open, setOpen] = useState(revealed);
  const [fading, setFading] = useState(false);
  const [hintOn, setHintOn] = useState(!revealed && !preview);
  const [bits, setBits] = useState<{ id: number; x: number; y: number; c: string }[]>([]);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!preview) setOpen(revealed);
  }, [revealed, preview]);

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
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFoil(ctx, w, h, design, hint);
    };
    paint();
    return () => {
      stop = true;
    };
  }, [open, design, hint]);

  function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, dpr: number) {
    const r = (20 + Math.random() * 6) * dpr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = r * (0.45 + Math.random() * 0.55);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, r * (0.18 + Math.random() * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function finish() {
    if (done.current) return;
    done.current = true;
    setHintOn(false);
    setFading(true);
    setBurst(true);
    haptic("success");
    ting();
    window.setTimeout(() => {
      setOpen(true);
      onReveal?.();
    }, 460);
    window.setTimeout(() => setBurst(false), 700);
  }

  function cleared(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < sample.length; i += 16) {
      total++;
      if (sample[i] < 24) clear++;
    }
    return total ? clear / total : 0;
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (done.current || preview || fading) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setHintOn(false);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dpr = canvas.width / rect.width;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    const prev = last.current;
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 6));
      for (let i = 1; i <= steps; i++) {
        stamp(ctx, (prev.x + (dx * i) / steps) * dpr, (prev.y + (dy * i) / steps) * dpr, dpr);
      }
    } else {
      stamp(ctx, x * dpr, y * dpr, dpr);
    }
    ctx.restore();
    last.current = { x, y };
    const dust = lookOf(design) === "secret" ? "#c5c8ce" : lookOf(design) === "love" ? "#e7a0b0" : "#e7c56a";
    const id = Date.now() + Math.random();
    setBits((list) => [...list.slice(-18), { id, x: x + (Math.random() * 10 - 5), y, c: dust }]);
    window.setTimeout(() => setBits((list) => list.filter((b) => b.id !== id)), 560);
    const now = Date.now();
    if (now - lastSound.current > 70) {
      lastSound.current = now;
      scratchNoise();
    }
    if (now - lastHaptic.current > 140) {
      lastHaptic.current = now;
      haptic("tap");
    }
    if (cleared(ctx, canvas) >= 0.7) finish();
  }

  return (
    <div className="w-[232px]" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="relative overflow-hidden rounded-3xl bg-[#f6f1e6] shadow-[0_0_24px_rgb(255_216_77/0.18)] ring-1 ring-[#ffd84d]/70">
        <div className="flex min-h-[280px] items-center justify-center bg-white px-5 py-8 text-center">
          <p aria-hidden={!open && !fading} className="whitespace-pre-wrap text-[22px] font-bold leading-snug text-black">{text}</p>
        </div>
        {!open ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full touch-none"
            style={{
              pointerEvents: preview ? "none" : "auto",
              opacity: fading ? 0 : 1,
              transition: "opacity 420ms ease",
            }}
            onPointerDown={(e) => {
              last.current = null;
              e.currentTarget.setPointerCapture(e.pointerId);
              scratch(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons || e.pointerType === "touch") scratch(e);
            }}
            onPointerUp={() => {
              last.current = null;
            }}
          />
        ) : null}
        {bits.map((b) => (
          <i key={b.id} className="scratch-flake" style={{ left: b.x, top: b.y, background: b.c }} />
        ))}
        {hintOn ? <span className="scratch-finger pointer-events-none absolute" aria-hidden /> : null}
        {burst ? <span className="pointer-events-none absolute inset-0 scratch-burst" aria-hidden /> : null}
        {time && open ? <span className="absolute bottom-2 right-3 text-[11px] tabular-nums text-[#1a1408]/50">{time}</span> : null}
      </div>
      {open && revealed && !preview ? (
        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-[#ffd84d]">✨ {found}</span>
          <button
            type="button"
            className="text-[10px] text-[#ffd84d]/80 underline"
            onClick={() => {
              setBurst(true);
              ting();
              window.setTimeout(() => setBurst(false), 700);
            }}
          >
            {replayLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

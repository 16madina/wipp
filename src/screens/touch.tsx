import { useEffect, useMemo, useRef, useState } from "react";
import { Check, QrCode, ScanLine } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { WippMark, WippWordmark } from "@/components/logo";
import { Btn, Header, StatusBar } from "@/components/ui";
import { NEARBY } from "@/lib/seed";
import { announce, haptic, reducedMotion } from "@/lib/haptics";
import { useT, useWgoStore } from "@/lib/store";
import type { MeProfile, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "reaching" | "contact" | "pick" | "offer" | "waiting" | "connected" | "failed";

const CLOSE_M = 15;
const TOKEN_MS = 60_000;

function mintToken() {
  return `WIPP-TEMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function playConnectChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(784, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* silent / blocked */
  }
}

function MiniPhone({
  side,
  user,
  phase,
}: {
  side: "me" | "them";
  user?: User | MeProfile | null;
  phase: Phase;
}) {
  const showPeer = side === "them" && phase !== "idle" && phase !== "failed";
  return (
    <div className={cn("mini-phone", side === "me" ? "phone-me" : "phone-them")}>
      <span className="mini-island" />
      <div className="mini-phone-screen">
        {side === "me" ? (
          <>
            <Avatar user={user} size={40} />
            <WippWordmark className="mt-2 text-[13px] text-paper" />
          </>
        ) : showPeer ? (
          <>
            <Avatar user={user} size={40} />
            <p className="mt-2 text-[13px] font-semibold text-paper">{user?.firstName}</p>
          </>
        ) : (
          <span className="touch-radar" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
    </div>
  );
}

function Lockup({
  me,
  peer,
  done,
}: {
  me: MeProfile;
  peer?: User | null;
  done?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 px-4 py-5">
      <div className="flex flex-col items-center">
        <Avatar user={me} size={56} />
        <p className="mt-1.5 text-[11px] font-semibold tracking-wide uppercase">{me.firstName}</p>
      </div>
      <div className="relative flex size-12 items-center justify-center">
        <WippMark size={done ? 36 : 44} invert />
        {done ? (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg">
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col items-center">
        {peer ? <Avatar user={peer} size={56} /> : <span className="size-14 rounded-full bg-paper/10" />}
        <p className="mt-1.5 text-[11px] font-semibold tracking-wide uppercase">{peer?.firstName ?? "…"}</p>
      </div>
    </div>
  );
}

export function WgoTouchScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const me = useWgoStore((s) => s.me);
  const users = useWgoStore((s) => s.users);
  const blocked = useWgoStore((s) => s.blockedIds);
  const allowed = useWgoStore((s) => s.touchAllowed);
  const setTouchAllowed = useWgoStore((s) => s.setTouchAllowed);
  const completeTouch = useWgoStore((s) => s.completeTouch);
  const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);

  const nearby = useMemo(
    () =>
      NEARBY.filter((n) => n.meters <= CLOSE_M && !blocked.includes(n.id) && users[n.id])
        .map((n) => ({ ...n, user: users[n.id] }))
        .sort((a, b) => {
          const ac = a.user.connected ? 1 : 0;
          const bc = b.user.connected ? 1 : 0;
          if (ac !== bc) return ac - bc;
          return a.meters - b.meters;
        }),
    [blocked, users],
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [hold, setHold] = useState(0);
  const [peerId, setPeerId] = useState<string | null>(null);
  const tokenRef = useRef(mintToken());
  const tokenUntilRef = useRef(Date.now() + TOKEN_MS);
  const holding = useRef(false);
  const timers = useRef<number[]>([]);
  const peer = peerId ? users[peerId] : nearby[0]?.user;

  useEffect(() => {
    return () => {
      holding.current = false;
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (phase !== "idle" || !allowed) return;
    const id = window.setInterval(() => {
      if (Date.now() >= tokenUntilRef.current) {
        tokenRef.current = mintToken();
        tokenUntilRef.current = Date.now() + TOKEN_MS;
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, allowed]);

  function later(ms: number, fn: () => void) {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }

  function remint() {
    tokenRef.current = mintToken();
    tokenUntilRef.current = Date.now() + TOKEN_MS;
  }

  function resetToIdle() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    holding.current = false;
    setHold(0);
    setPeerId(null);
    remint();
    setPhase("idle");
  }

  function afterContact() {
    if (nearby.length === 0) {
      setPhase("failed");
      haptic("error");
      return;
    }
    if (nearby.length === 1) {
      setPeerId(nearby[0].id);
      setPhase("offer");
      return;
    }
    setPhase("pick");
  }

  function start() {
    if (phase !== "idle") return;
    if (!tokenRef.current || Date.now() >= tokenUntilRef.current) remint();
    holding.current = false;
    setHold(1);
    haptic("hold");
    if (reducedMotion()) {
      afterContact();
      return;
    }
    setPhase("reaching");
    later(720, () => {
      setPhase("contact");
      haptic("connect");
    });
    later(720 + 560, afterContact);
  }

  function onPointerDown() {
    if (phase !== "idle") return;
    holding.current = true;
    const t0 = Date.now();
    const tick = () => {
      if (!holding.current) return;
      const p = Math.min(1, (Date.now() - t0) / 700);
      setHold(p);
      if (p >= 1) start();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function onPointerUp() {
    if (phase !== "idle") return;
    holding.current = false;
    setHold(0);
  }

  function acceptPeer(id: string) {
    setPeerId(id);
    setPhase("waiting");
    later(1100, () => {
      completeTouch(id);
      remint();
      setPhase("connected");
      haptic("success");
      playConnectChime();
      announce(t("touchConnected"));
    });
  }

  const detecting = phase === "idle" || phase === "reaching" || phase === "contact";
  const animPhase = detecting ? phase : phase === "failed" ? "idle" : "reveal";

  if (!allowed) {
    return (
      <div className="flex h-full flex-col bg-navy text-paper">
        <StatusBar />
        <Header title={t("wgoTouch")} onBack={pop} className="text-paper [&_button]:text-paper" />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <WippMark size={72} invert />
          <h1 className="mt-6 max-w-[18ch] text-[22px] font-semibold leading-tight">{t("touchPermTitle")}</h1>
          <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-paper/65">{t("touchPermBody")}</p>
          <Btn className="mt-8 w-full" onClick={() => setTouchAllowed(true)}>
            {t("touchAllow")}
          </Btn>
          <Btn variant="ghost" className="mt-2 w-full text-paper" onClick={pop}>
            {t("later")}
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="isolate flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header title={t("wgoTouch")} onBack={pop} className="text-paper [&_button]:text-paper" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
        <div className="touch-glow" data-phase={animPhase} />

        {detecting ? (
          <button
            type="button"
            className="touch-stage"
            data-phase={animPhase}
            aria-label={t("touchHold")}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <MiniPhone side="me" user={me} phase={phase} />
            <div className="touch-spark" aria-hidden>
              <span className="touch-flash" />
              <svg viewBox="0 0 64 64" className="touch-mark">
                <circle className="dot-l" cx="20" cy="32" r="5.5" fill="#F7F9FC" />
                <circle className="dot-r" cx="44" cy="32" r="5.5" fill="#FFD84D" />
                <path
                  className="smile"
                  d="M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8"
                  stroke="#F7F9FC"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <MiniPhone side="them" user={peer} phase={phase} />
            {phase === "idle" && hold > 0 ? (
              <span
                className="touch-hold-ring"
                style={{
                  background: `conic-gradient(var(--color-accent) ${hold * 360}deg, transparent 0)`,
                }}
              />
            ) : null}
          </button>
        ) : phase === "pick" ? (
          <p className="px-8 pt-4 text-center text-[14px] leading-relaxed text-paper/70">{t("touchPick")}</p>
        ) : phase === "offer" || phase === "waiting" || phase === "connected" ? (
          <Lockup me={me} peer={peer} done={phase === "connected"} />
        ) : (
          <div className="flex justify-center px-4 py-8">
            <WippMark size={64} invert />
          </div>
        )}

        {detecting ? (
          <>
            <p
              className={cn(
                "px-8 text-center text-[14px] leading-relaxed text-paper/60",
                phase === "contact" && "text-accent",
              )}
            >
              {phase === "idle" ? t("touchHint") : phase === "reaching" ? t("touchSearching") : t("touchContact")}
            </p>
            {phase === "idle" ? (
              <p className="mt-1 px-8 text-center text-[11px] text-paper/40">{t("touchVisible")}</p>
            ) : null}
          </>
        ) : null}

        {phase === "pick" ? (
          <div className="mt-4 px-4">
            {nearby.map((n) => (
              <button
                key={n.id}
                type="button"
                className="press mb-2 flex w-full items-center gap-3 rounded-2xl bg-paper/8 px-3 py-3 text-left ring-1 ring-paper/10"
                onClick={() => {
                  setPeerId(n.id);
                  setPhase("offer");
                }}
              >
                <Avatar user={n.user} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{n.user.displayName}</span>
                  <span className="text-[12px] text-paper/55">@{n.user.username}</span>
                </span>
                <span className="text-[12px] tabular-nums text-accent">{n.meters}&nbsp;m</span>
              </button>
            ))}
          </div>
        ) : null}

        {phase === "offer" && peer ? (
          <div className="relative z-10 mx-4 mt-1 rounded-2xl bg-paper/8 px-5 py-5 text-center ring-1 ring-accent/30 rise">
            <p className="text-[12px] font-medium tracking-[0.14em] text-accent uppercase">{t("touchDetected")}</p>
            <Avatar user={peer} size={72} className="mx-auto mt-3" />
            <p className="mt-3 text-[20px] font-semibold">{peer.displayName}</p>
            <p className="text-[14px] text-paper/55">@{peer.username}</p>
            <p className="mt-2 text-[13px] leading-snug text-paper/75">
              {peer.firstName} {t("touchWantsShare")}
            </p>
          </div>
        ) : null}

        {phase === "waiting" ? (
          <p className="px-8 pt-2 text-center text-[14px] leading-relaxed text-paper/60">{t("touchWaiting")}</p>
        ) : null}

        {phase === "connected" && peer ? (
          <div className="relative z-10 mx-4 mt-1 rounded-2xl bg-paper/8 px-5 py-5 text-center ring-1 ring-accent/35 rise">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <p className="mt-3 text-[22px] font-semibold">{t("touchConnected")}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-paper/70">
              {peer.displayName} {t("touchAdded")}
            </p>
            <p className="mt-2 text-[12px] text-paper/45">{t("touchBothOk")}</p>
          </div>
        ) : null}

        {phase === "failed" ? (
          <p className="px-8 text-center text-[15px] leading-relaxed text-paper/70">{t("touchFail")}</p>
        ) : null}
      </div>

      <div className="relative z-10 shrink-0 px-5 pb-8 pt-3">
        {phase === "idle" ? (
          <>
            <Btn className="w-full" onClick={start}>
              {t("touchCta")}
            </Btn>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn variant="secondary" className="text-paper" onClick={() => push({ name: "scanner" })}>
                <ScanLine className="size-4" />
                {t("touchScanQr")}
              </Btn>
              <Btn variant="secondary" className="text-paper" onClick={() => push({ name: "my-qr" })}>
                <QrCode className="size-4" />
                {t("touchShowQr")}
              </Btn>
            </div>
          </>
        ) : null}

        {phase === "offer" && peerId ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" className="text-paper" onClick={resetToIdle}>
              {t("touchRefuse")}
            </Btn>
            <Btn onClick={() => acceptPeer(peerId)}>{t("accept")}</Btn>
          </div>
        ) : null}

        {phase === "waiting" ? (
          <p className="h-12 text-center text-[13px] leading-[48px] text-paper/50">{t("touchWaiting")}</p>
        ) : null}

        {phase === "connected" && peerId ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn
              variant="secondary"
              className="text-paper"
              onClick={() => push({ name: "found-profile", userId: peerId, via: "touch" })}
            >
              {t("viewProfile")}
            </Btn>
            <Btn onClick={() => openOrCreateDm(peerId)}>{t("write")}</Btn>
          </div>
        ) : null}

        {phase === "failed" ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" className="text-paper" onClick={() => push({ name: "scanner" })}>
              {t("touchScanQr")}
            </Btn>
            <Btn onClick={() => push({ name: "my-qr" })}>{t("touchShowQr")}</Btn>
          </div>
        ) : null}

        {phase === "pick" || phase === "reaching" || phase === "contact" ? (
          <button type="button" className="mt-1 h-11 w-full text-[13px] text-paper/45" onClick={resetToIdle}>
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

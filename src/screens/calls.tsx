import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  ChevronDown,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Lock,
  SwitchCamera,
  Timer,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { QrCard } from "@/components/qr-card";
import { BlockSheet, ReportSheet, SafetyRow } from "@/components/safety";
import { Btn, Chip, Empty, Header, IconBtn, Sheet, StatusBar } from "@/components/ui";
import { formatChatTime, formatDuration } from "@/lib/format";
import { haptic, hapticStop } from "@/lib/haptics";
import { createLiveKitSession, fetchCallToken, type LiveKitSessionStatus } from "@/lib/livekit/session";
import { isChatSealed, useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/lib/types";

function groupCallLogs(calls: CallLog[]) {
  const groups: { items: CallLog[] }[] = [];
  for (const c of calls) {
    const head = groups[groups.length - 1]?.items[0];
    if (
      head &&
      head.userId === c.userId &&
      head.kind === c.kind &&
      head.direction === c.direction &&
      head.missed === c.missed
    ) {
      groups[groups.length - 1].items.push(c);
    } else {
      groups.push({ items: [c] });
    }
  }
  return groups;
}

function callPipSrc(avatar?: string) {
  const m = avatar?.match(/\/avatars\/([^/.]+)\.\w+$/);
  return m ? `/calls/${m[1]}.mp4` : "";
}

type OsPipVideo = HTMLVideoElement & {
  autoPictureInPicture?: boolean;
  disablePictureInPicture?: boolean;
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
};

async function enterOsPip(video: HTMLVideoElement | null) {
  if (!video) return false;
  const v = video as OsPipVideo;
  v.disablePictureInPicture = false;
  if ("autoPictureInPicture" in v) v.autoPictureInPicture = true;
  try {
    if (video.paused) await video.play();
  } catch {
    /* autoplay */
  }
  try {
    if (document.pictureInPictureElement !== video && document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  } catch {
    /* blocked */
  }
  try {
    if (v.webkitPresentationMode !== "picture-in-picture") {
      v.webkitSetPresentationMode?.("picture-in-picture");
    }
  } catch {
    /* ios */
  }
  return (
    document.pictureInPictureElement === video || v.webkitPresentationMode === "picture-in-picture"
  );
}

async function leaveOsPip(video: HTMLVideoElement | null) {
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
  } catch {
    /* already out */
  }
  const v = video as OsPipVideo | null;
  try {
    v?.webkitSetPresentationMode?.("inline");
  } catch {
    /* ios */
  }
}

export function CallsScreen() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const calls = useWgoStore((s) => s.calls);
  const users = useWgoStore((s) => s.users);
  const push = useWgoStore((s) => s.push);
  const startCall = useWgoStore((s) => s.startCall);
  const live = useWgoStore((s) => s.liveCall);
  const expandCall = useWgoStore((s) => s.expandCall);
  const deleteCalls = useWgoStore((s) => s.deleteCalls);
  const markCallsSeen = useWgoStore((s) => s.markCallsSeen);
  const blockedIds = useWgoStore((s) => s.blockedIds);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState<{ ids: string[]; userId: string; kind: "audio" | "video" } | null>(null);
  const [reportUser, setReportUser] = useState<string | null>(null);
  const [blockUserId, setBlockUserId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const list = filter === "missed" ? calls.filter((c) => c.missed) : calls;
  const contacts = Object.values(users).filter((u) => u.connected && !blockedIds.includes(u.id));
  const groups = groupCallLogs(list);

  useEffect(() => {
    markCallsSeen();
  }, [markCallsSeen]);

  useEffect(() => {
    if (!live?.pip) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live?.pip]);

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-10">
        <StatusBar />
        <div className="flex items-center justify-between px-4 pb-2">
          <h1 className="text-[22px] font-semibold tracking-tight">{t("callsTitle")}</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-[13px] font-medium text-muted"
              onClick={() => push({ name: "call-link" })}
            >
              {t("createCallLink")}
            </button>
            <IconBtn label={t("newCall")} onClick={() => setPicker(true)}>
              <Phone className="size-5" />
            </IconBtn>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            {t("all")}
          </Chip>
          <Chip active={filter === "missed"} onClick={() => setFilter("missed")}>
            {t("missed")}
          </Chip>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
        {live?.pip ? (
          <button
            type="button"
            onClick={expandCall}
            className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-accent/15 px-3 py-3 text-left outline outline-1 outline-accent/40"
          >
            <span className="relative flex size-12 items-center justify-center">
              <span className="wgo-call-ring absolute inset-0 rounded-full bg-accent/40" />
              <Avatar user={users[live.userId]} size={48} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{t("callInProgress")}</span>
              <span className="text-[12px] tabular-nums text-muted">
                {users[live.userId]?.displayName} · {formatDuration((now - (live.startedAt || now)) / 1000)}
              </span>
            </span>
            <span className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg">
              {t("returnToCall")}
            </span>
          </button>
        ) : !live ? (
          <button
            type="button"
            onClick={() => startCall("maya", "video", "in")}
            className="glass-card mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl px-3 py-3 text-left"
          >
            <span className="relative flex size-12 items-center justify-center">
              <span className="wgo-call-ring absolute inset-0 rounded-full bg-accent/40" />
              <Avatar user={users.maya} size={48} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{users.maya?.displayName}</span>
              <span className="text-[12px] text-muted">
                {t("incomingFrom")} · {t("videoCall")}
              </span>
            </span>
            <span className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg">
              {t("answer")}
            </span>
          </button>
        ) : null}
        {groups.length === 0 ? (
          <Empty title={t("noResults")} body={t("createCallLink")} />
        ) : (
          groups.map((g) => {
            const c = g.items[0];
            const u = users[c.userId];
            const Icon = c.missed ? PhoneMissed : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
            const ids = g.items.map((x) => x.id);
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <button type="button" onClick={() => push({ name: "found-profile", userId: c.userId })}>
                  <Avatar user={u} size={48} />
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => startCall(c.userId, c.kind)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ ids, userId: c.userId, kind: c.kind });
                  }}
                  onPointerDown={(e) => {
                    const id = window.setTimeout(() => setMenu({ ids, userId: c.userId, kind: c.kind }), 480);
                    const clear = () => window.clearTimeout(id);
                    e.currentTarget.addEventListener("pointerup", clear, { once: true });
                    e.currentTarget.addEventListener("pointercancel", clear, { once: true });
                  }}
                >
                  <p className={cn("truncate font-medium", c.missed && "text-danger")}>
                    {u?.displayName}
                    {g.items.length > 1 ? ` (${g.items.length})` : ""}
                  </p>
                  <p className="flex items-center gap-1 text-[13px] text-muted">
                    <Icon className="size-3.5" />
                    {c.kind === "video" ? t("videoCall") : t("audioCall")}
                    {c.duration ? ` · ${formatDuration(c.duration)}` : ""}
                  </p>
                </button>
                <span className="text-[12px] text-muted">{formatChatTime(c.at, lang)}</span>
                <IconBtn label={t("callAgain")} onClick={() => startCall(c.userId, c.kind)}>
                  {c.kind === "video" ? <Video className="size-5" /> : <Phone className="size-5" />}
                </IconBtn>
              </div>
            );
          })
        )}
      </div>
      <Sheet open={picker} onClose={() => setPicker(false)} title={t("newCall")}>
        <div className="no-scrollbar max-h-[50vh] overflow-y-auto">
          {contacts.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2">
              <Avatar user={u} size={40} />
              <span className="min-w-0 flex-1 text-[15px] font-medium">{u.displayName}</span>
              <IconBtn
                label={t("audioCall")}
                onClick={() => {
                  setPicker(false);
                  startCall(u.id, "audio");
                }}
              >
                <Phone className="size-5" />
              </IconBtn>
              <IconBtn
                label={t("videoCall")}
                onClick={() => {
                  setPicker(false);
                  startCall(u.id, "video");
                }}
              >
                <Video className="size-5" />
              </IconBtn>
            </div>
          ))}
        </div>
      </Sheet>
      <Sheet
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        title={menu ? users[menu.userId]?.displayName : t("callsTitle")}
      >
        {menu ? (
          <div className="flex flex-col gap-2 pb-2">
            <Btn
              onClick={() => {
                startCall(menu.userId, "audio");
                setMenu(null);
              }}
            >
              {t("audioCall")}
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => {
                startCall(menu.userId, "video");
                setMenu(null);
              }}
            >
              {t("videoCall")}
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                deleteCalls(menu.ids);
                setMenu(null);
              }}
            >
              {t("deleteCall")}
            </Btn>
            <SafetyRow
              onReport={() => {
                setReportUser(menu.userId);
                setMenu(null);
              }}
              onBlock={() => {
                setBlockUserId(menu.userId);
                setMenu(null);
              }}
            />
          </div>
        ) : null}
      </Sheet>
      <ReportSheet
        open={Boolean(reportUser)}
        onClose={() => setReportUser(null)}
        kind="user"
        targetId={reportUser ?? ""}
        blockUserId={reportUser ?? undefined}
      />
      {blockUserId ? (
        <BlockSheet open onClose={() => setBlockUserId(null)} userId={blockUserId} />
      ) : null}
    </div>
  );
}


export function CallLinkScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const startCall = useWgoStore((s) => s.startCall);
  const me = useWgoStore((s) => s.me);
  const [copied, setCopied] = useState(false);
  const link = `wipp.me/call/${me.username}`;
  async function share() {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
    } catch {
      /* ignore */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar className="text-paper" />
      <Header title={t("createCallLink")} onBack={pop} className="text-paper [&_button]:text-paper" />
      <div className="flex flex-1 flex-col items-center px-6 pt-4">
        <p className="text-center text-[14px] leading-relaxed text-paper/65">{t("callLinkBody")}</p>
        <div className="mt-6 rounded-2xl bg-paper p-4">
          <QrCard value={link} size={200} />
        </div>
        <p className="mt-4 text-[13px] text-accent">{link}</p>
        <Btn className="mt-6 w-full" onClick={share}>
          {copied ? t("copied") : t("share")}
        </Btn>
        <Btn variant="secondary" className="mt-2 w-full bg-paper/10 text-paper" onClick={() => startCall("maya", "video")}>
          {t("joinCall")}
        </Btn>
      </div>
    </div>
  );
}

export function ActiveCallScreen({
  userId,
  kind,
  dir = "out",
}: {
  userId: string;
  kind: "audio" | "video";
  dir?: "in" | "out";
}) {
  const startCall = useWgoStore((s) => s.startCall);
  const live = useWgoStore((s) => s.liveCall);
  useEffect(() => {
    if (!live) startCall(userId, kind, dir);
    else if (live.pip) useWgoStore.getState().expandCall();
  }, [dir, kind, live, startCall, userId]);
  return null;
}

export function CallLayer() {
  const live = useWgoStore((s) => s.liveCall);
  if (!live) return null;
  return <CallSession key={live.userId} />;
}

function CallSession() {
  const t = useT();
  const live = useWgoStore((s) => s.liveCall);
  const user = useWgoStore((s) => (live ? s.users[live.userId] : undefined));
  const me = useWgoStore((s) => s.me);
  const endCall = useWgoStore((s) => s.endCall);
  const setCallEphemeral = useWgoStore((s) => s.setCallEphemeral);
  const minimizeCall = useWgoStore((s) => s.minimizeCall);
  const expandCall = useWgoStore((s) => s.expandCall);
  const [phase, setPhase] = useState<"incoming" | "ring" | "live" | "ended">(
    live?.dir === "in" ? "incoming" : "ring",
  );
  const [mode, setMode] = useState<"audio" | "video">(live?.kind ?? "audio");
  const forcedEphemeral = useWgoStore((s) => {
    const id = s.liveCall?.userId;
    if (!id) return false;
    return s.chats.some(
      (c) =>
        c.ephemeral &&
        !isChatSealed(c) &&
        c.participantIds.includes(id) &&
        c.participantIds.includes("me"),
    );
  });
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [camOff, setCamOff] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mediaError, setMediaError] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [lkStatus, setLkStatus] = useState<LiveKitSessionStatus>("idle");
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const osPipVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const mixLocalRef = useRef<HTMLVideoElement>(null);
  const statusRef = useRef("");
  const dragStartY = useRef<number | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lkRef = useRef(createLiveKitSession((s) => setLkStatus(s)));
  const hangingRef = useRef(false);
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
  const [osPipOn, setOsPipOn] = useState(false);
  const pip = Boolean(live?.pip);
  const wantMedia = phase === "ring" || phase === "live";

  useEffect(() => {
    if (phase !== "ring") return;
    const id = window.setTimeout(() => {
      setPhase("live");
      setT0(Date.now());
    }, 2200);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "incoming" && phase !== "ring") return;
    if (pip) return;
    let ctx: AudioContext | null = null;
    let interval = 0;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const burst = () => {
        if (!ctx) return;
        const tStart = ctx.currentTime;
        for (const freq of phase === "incoming" ? [440, 480] : [520]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, tStart);
          gain.gain.exponentialRampToValueAtTime(0.06, tStart + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.85);
          osc.connect(gain).connect(ctx.destination);
          osc.start(tStart);
          osc.stop(tStart + 0.9);
        }
      };
      void ctx.resume().then(() => {
        burst();
        interval = window.setInterval(burst, 1800);
      });
    } catch {
      /* autoplay / unsupported */
    }
    if (phase === "incoming") haptic("incoming");
    return () => {
      window.clearInterval(interval);
      hapticStop();
      void ctx?.close();
    };
  }, [phase, pip]);

  useEffect(() => {
    if (!wantMedia) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      return;
    }
    // LiveKit owns media once connected — skip duplicate getUserMedia.
    if (lkStatus === "connected" || lkStatus === "connecting") return;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: mode === "video" ? { facingMode: facing, width: { ideal: 720 } } : false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current = stream;
        stream.getAudioTracks().forEach((tr) => {
          tr.enabled = !muted;
        });
        stream.getVideoTracks().forEach((tr) => {
          tr.enabled = !camOff;
        });
        const node = pip ? pipVideoRef.current : localRef.current;
        if (node) {
          node.srcObject = stream;
          void node.play().catch(() => undefined);
        }
        setLocalReady(false);
        setMediaError(false);
      })
      .catch(() => setMediaError(true));
    return () => {
      cancelled = true;
    };
  }, [wantMedia, mode, facing, lkStatus]);

  // Try LiveKit when the call goes live; fall back to local media if not configured.
  useEffect(() => {
    if (phase !== "live" || !live || !user) return;
    let cancelled = false;
    const lk = lkRef.current;
    void (async () => {
      setLkStatus("connecting");
      const token = await fetchCallToken({
        peerId: live.userId,
        kind: mode,
        identity: me.username || me.id || "me",
        displayName: me.displayName,
      });
      if (cancelled) return;
      if (token.mode !== "livekit") {
        setLkStatus("local");
        return;
      }
      try {
        // Hand mic/cam to LiveKit — stop local preview tracks first.
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        await lk.connect({
          url: token.url,
          token: token.token,
          video: mode === "video",
          audio: true,
        });
        if (cancelled) {
          await lk.disconnect();
          return;
        }
        lk.setMuted(muted);
        lk.setCameraEnabled(!camOff && mode === "video");
        lk.attachLocalVideo(localRef.current);
        lk.attachRemoteVideo(remoteRef.current);
        setLocalReady(true);
        setMediaError(false);
      } catch {
        if (!cancelled) setLkStatus("local");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, live?.userId, mode]);

  useEffect(() => {
    if (lkStatus !== "connected") return;
    lkRef.current.setMuted(muted);
  }, [muted, lkStatus]);

  useEffect(() => {
    if (lkStatus !== "connected") return;
    lkRef.current.setCameraEnabled(!camOff && mode === "video");
  }, [camOff, mode, lkStatus]);

  useEffect(() => {
    if (lkStatus !== "connected") return;
    lkRef.current.attachLocalVideo(localRef.current);
    lkRef.current.attachRemoteVideo(remoteRef.current);
  }, [lkStatus, pip]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const node = pip ? pipVideoRef.current : localRef.current;
    if (node) {
      node.srcObject = stream;
      void node.play().catch(() => undefined);
    }
  }, [pip]);

  useEffect(() => {
    if (!wantMedia || localReady) return;
    const id = window.setTimeout(() => setMediaError(true), 2500);
    return () => window.clearTimeout(id);
  }, [wantMedia, localReady]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((tr) => {
      tr.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((tr) => {
      tr.enabled = !camOff;
    });
  }, [camOff]);

  useEffect(() => {
    const el = mixLocalRef.current;
    if (!el) return;
    el.srcObject = streamRef.current;
    if (streamRef.current) void el.play().catch(() => undefined);
  }, [wantMedia, mode, facing, pip]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      void lkRef.current.disconnect();
      if (document.pictureInPictureElement) {
        void document.exitPictureInPicture().catch(() => undefined);
      }
    };
  }, []);

  const elapsed = phase === "live" && t0 ? (now - t0) / 1000 : 0;
  const videoOn = mode === "video" && !camOff;
  const liveVideo = videoOn && phase === "live";
  const showSelf = mode === "video" && phase !== "ended";
  const canPip = phase === "live" || phase === "ring";

  const status =
    phase === "incoming"
      ? `${t("incomingFrom")} · ${mode === "video" ? t("videoCall") : t("audioCall")}`
      : phase === "ring"
        ? t("ringing")
        : phase === "ended"
          ? t("callEnded")
          : formatDuration(elapsed);
  statusRef.current = status;

  useEffect(() => {
    const video = osPipVideoRef.current;
    if (!video || !user) return;
    const src = callPipSrc(user.avatar);
    if (!src) return;
    video.srcObject = null;
    if (!video.currentSrc.includes(src)) video.src = src;
    video.loop = true;
    video.muted = true;
    video.disablePictureInPicture = false;
    const play = () => void video.play().catch(() => undefined);
    if (video.readyState >= 2) play();
    else video.addEventListener("canplay", play, { once: true });
    return () => video.removeEventListener("canplay", play);
  }, [user, pip]);

  useEffect(() => {
    if (!user || phase === "ended") return;
    const session = navigator.mediaSession;
    if (!session) return;
    try {
      session.metadata = new MediaMetadata({
        title: user.displayName,
        artist: "Wipp",
        artwork: user.avatar ? [{ src: user.avatar, sizes: "512x512", type: "image/jpeg" }] : [],
      });
      session.playbackState = "playing";
      if (pip || phase === "live") {
        session.setActionHandler("enterpictureinpicture" as MediaSessionAction, async () => {
          await enterOsPip(osPipVideoRef.current);
        });
      }
    } catch {
      /* unsupported */
    }
    return () => {
      try {
        session.setActionHandler("enterpictureinpicture" as MediaSessionAction, null);
      } catch {
        /* ignore */
      }
    };
  }, [user, phase, pip]);

  useEffect(() => {
    const video = osPipVideoRef.current;
    if (!video) return;
    const onEnter = () => setOsPipOn(true);
    const onLeave = () => setOsPipOn(false);
    const onWebkit = () => {
      const mode = (video as OsPipVideo).webkitPresentationMode;
      setOsPipOn(mode === "picture-in-picture");
    };
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    video.addEventListener("webkitpresentationmodechanged", onWebkit);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
      video.removeEventListener("webkitpresentationmodechanged", onWebkit);
    };
  }, [user]);

  useEffect(() => {
    const video = osPipVideoRef.current;
    if (!video) return;
    if (phase === "ended") {
      void leaveOsPip(video);
      return;
    }
    video.disablePictureInPicture = false;
    const v = video as OsPipVideo;
    if ("autoPictureInPicture" in v) v.autoPictureInPicture = true;
    void video.play().catch(() => undefined);
  }, [pip, phase]);

  useEffect(() => {
    if (!canPip) return;
    const goBackground = () => {
      if (!useWgoStore.getState().liveCall?.pip) minimizeCall();
      void enterOsPip(osPipVideoRef.current);
    };
    const onVis = () => {
      const hidden = document.hidden || document.visibilityState === "hidden";
      if (hidden) goBackground();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", goBackground);
    document.addEventListener("freeze", goBackground as EventListener);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", goBackground);
      document.removeEventListener("freeze", goBackground as EventListener);
    };
  }, [canPip, minimizeCall]);

  function hang(duration = elapsed) {
    if (hangingRef.current) return;
    hangingRef.current = true;
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => undefined);
    }
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    void lkRef.current.disconnect();
    setPhase("ended");
    window.setTimeout(() => endCall(duration), 700);
  }

  function accept() {
    setPhase("live");
    setT0(Date.now());
  }

  function onSwipeStart(clientY: number) {
    dragStartY.current = clientY;
  }
  function onSwipeEnd(clientY: number) {
    const start = dragStartY.current;
    dragStartY.current = null;
    if (start != null && clientY - start > 72 && canPip) {
      void shrinkCall();
    }
  }

  async function shrinkCall() {
    const ok = await enterOsPip(osPipVideoRef.current);
    const v = osPipVideoRef.current as OsPipVideo | null;
    if (ok || document.pictureInPictureElement || v?.webkitPresentationMode === "picture-in-picture") {
      setOsPipOn(true);
    }
    minimizeCall();
  }

  const pipW = mode === "video" ? 132 : 220;
  const pipH = mode === "video" ? 196 : 64;

  function onPipPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-pip-hang]")) return;
    e.preventDefault();
    const node = e.currentTarget;
    const rect = node.getBoundingClientRect();
    const host = node.offsetParent?.getBoundingClientRect() ?? rect;
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      ox: rect.left - host.left,
      oy: rect.top - host.top,
      moved: false,
    };
    try {
      node.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / unsupported */
    }
  }
  function onPipPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && dx * dx + dy * dy < 64) return;
    d.moved = true;
    const host = e.currentTarget.offsetParent as HTMLElement | null;
    const hw = host?.clientWidth ?? 390;
    const hh = host?.clientHeight ?? 700;
    const x = Math.max(8, Math.min(hw - pipW - 8, d.ox + dx));
    const y = Math.max(44, Math.min(hh - pipH - 80, d.oy + dy));
    setPipPos({ x, y });
  }
  function onPipPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) expandCall();
  }

  if (!live || !user) return null;

  const callIsEphemeral = Boolean(live.ephemeral);

  const pipFile = callPipSrc(user.avatar);
  const osPipNodes = (
    <>
      <video
        ref={mixLocalRef}
        muted
        playsInline
        autoPlay
        disablePictureInPicture
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
        aria-hidden
      />
      <video
        ref={osPipVideoRef}
        src={pipFile || undefined}
        loop
        muted
        playsInline
        autoPlay
        className={
          pip
            ? "pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
            : "pointer-events-none absolute inset-0 z-[69] size-full object-cover"
        }
      />
    </>
  );

  if (pip && osPipOn && phase !== "ended") {
    return <>{osPipNodes}</>;
  }

  if (pip && phase !== "ended") {
    return (
      <>
      {osPipNodes}
      <div className="pointer-events-none absolute inset-0 z-[70]">
        <div
          className="pointer-events-auto absolute touch-none"
          style={
            pipPos
              ? { left: pipPos.x, top: pipPos.y, width: pipW, touchAction: "none" }
              : { right: 12, top: 56, width: pipW, touchAction: "none" }
          }
          onPointerDown={onPipPointerDown}
          onPointerMove={onPipPointerMove}
          onPointerUp={onPipPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <div className="relative">
          <div
            role="button"
            className="relative flex cursor-grab overflow-hidden rounded-2xl bg-navy text-left text-paper shadow-[0_12px_40px_rgba(0,0,0,0.45)] outline outline-1 outline-white/20 active:cursor-grabbing"
            style={{ width: pipW }}
            aria-label={t("returnToCall")}
          >
            {mode === "video" ? (
              <span className="relative block h-48 w-full">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <span className="absolute inset-0 bg-navy" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1.5">
                  <span className="block truncate text-[11px] font-semibold">{user.displayName}</span>
                  <span className="text-[10px] tabular-nums text-paper/70">{status}</span>
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 py-2 pr-10 pl-2">
                <Avatar user={user} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{user.displayName}</span>
                  <span className="text-[11px] tabular-nums text-accent">{status}</span>
                </span>
              </span>
            )}
          </div>
          <button
            type="button"
            data-pip-hang
            className="absolute top-1.5 right-1.5 z-10 flex size-8 items-center justify-center rounded-full bg-danger text-paper shadow-md"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              hang(elapsed);
            }}
            aria-label={t("hangup")}
          >
            <PhoneOff className="size-3.5" />
          </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {osPipNodes}
    <div
      className={cn(
        "absolute inset-0 z-[70] flex flex-col overflow-hidden text-paper",
        pipFile ? "bg-transparent" : "bg-navy",
      )}
      onPointerDown={(e) => onSwipeStart(e.clientY)}
      onPointerUp={(e) => onSwipeEnd(e.clientY)}
      onPointerCancel={() => { dragStartY.current = null; }}
    >
      {pipFile ? null : user.avatar ? (
        <img
          src={user.avatar}
          alt=""
          className={cn("absolute inset-0 size-full object-cover", phase === "live" && "wgo-remote-live")}
        />
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      {lkStatus === "connected" && mode === "video" ? (
        <video
          ref={remoteRef}
          playsInline
          autoPlay
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/90" />

      <div className="relative flex h-full flex-col">
        <StatusBar className="text-paper" />
        <div className="flex items-center justify-between px-2">
          {canPip ? (
            <button
              type="button"
              className="press flex items-center gap-1 px-3 py-2 text-paper"
              onClick={() => void shrinkCall()}
              aria-label={t("callMinimize")}
            >
              <ChevronDown className="size-6" />
              <span className="text-[13px] font-medium">{t("callMinimize")}</span>
            </button>
          ) : (
            <span className="size-11" />
          )}
          <p className="flex items-center justify-center gap-1 text-center text-[11px] font-medium tracking-wide text-paper/50 uppercase">
            <Lock className="size-3" />
            {t("e2eCall")}
          </p>
          <span className="size-11" />
        </div>
        {liveVideo ? (
          <div className="px-4 pt-1 text-center">
            <h1 className="text-[18px] font-semibold">{user.displayName}</h1>
            <p className="text-[13px] text-paper/70 tabular-nums">{status}</p>
          </div>
        ) : null}

        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {mode === "audio" || camOff || phase === "incoming" || phase === "ring" ? (
            <div className="relative">
              {(phase === "ring" || phase === "incoming") && (
                <>
                  <span className="wgo-call-ring absolute inset-[-18px] rounded-full bg-accent/25" />
                  <span
                    className="wgo-call-ring absolute inset-[-18px] rounded-full bg-accent/20"
                    style={{ animationDelay: "0.55s" }}
                  />
                </>
              )}
              <Avatar user={user} size={128} />
            </div>
          ) : null}

          {liveVideo ? null : (
            <>
              <h1 className="mt-6 text-[26px] font-semibold">{user.displayName}</h1>
              <p className="mt-1 text-[14px] text-paper/70 tabular-nums">{status}</p>
              {phase === "live" && lkStatus === "connecting" ? (
                <p className="mt-2 text-[12px] text-paper/45">{t("callLivekitConnecting")}</p>
              ) : null}
              {phase === "live" && lkStatus === "local" ? (
                <p className="mt-2 text-[12px] text-paper/45">{t("callLivekitLocal")}</p>
              ) : null}
              {phase === "live" && lkStatus === "connected" ? (
                <p className="mt-2 text-[12px] text-accent/80">{t("callLivekitConnected")}</p>
              ) : null}
              {canPip ? (
                <p className="mt-3 text-[12px] text-paper/45">{t("callPipHint")}</p>
              ) : null}
            </>
          )}
          {mediaError && phase === "live" ? (
            <p className="mt-3 max-w-[28ch] text-center text-[12px] leading-relaxed text-paper/45">
              {t("permDenied")}
            </p>
          ) : null}
        </div>

        {showSelf ? (
          <div className="absolute top-16 right-4 overflow-hidden rounded-2xl bg-ink outline outline-1 outline-white/20">
            <img src={me.avatar} alt="" className="h-36 w-24 object-cover" />
            {videoOn ? (
              <video
                ref={localRef}
                muted
                playsInline
                autoPlay
                disablePictureInPicture
                onPlaying={() => setLocalReady(true)}
                className={cn(
                  "absolute inset-0 h-36 w-24 object-cover",
                  localReady ? "opacity-100" : "opacity-0",
                )}
                style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
              />
            ) : null}
          </div>
        ) : (
          <video ref={localRef} muted playsInline autoPlay disablePictureInPicture className="hidden" />
        )}

        {phase === "incoming" ? (
          <div className="relative z-10 flex items-center justify-around px-10 pb-16">
            <button type="button" className="press flex flex-col items-center gap-2" onClick={() => hang(0)}>
              <span className="flex size-16 items-center justify-center rounded-full bg-danger">
                <PhoneOff className="size-7" />
              </span>
              <span className="text-[12px] text-paper/70">{t("declineCall")}</span>
            </button>
            <button type="button" className="press flex flex-col items-center gap-2" onClick={accept}>
              <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-fg">
                {mode === "video" ? <Video className="size-7" /> : <Phone className="size-7" />}
              </span>
              <span className="text-[12px] text-paper/70">{t("answer")}</span>
            </button>
          </div>
        ) : phase === "ended" ? (
          <p className="pb-16 text-center text-[15px] text-paper/60">{t("callEnded")}</p>
        ) : (
          <div className="relative z-10 px-6 pb-14">
            <button
              type="button"
              disabled={forcedEphemeral}
              onClick={() => setCallEphemeral(!callIsEphemeral)}
              className={cn(
                "press mb-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold",
                callIsEphemeral ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper",
                forcedEphemeral && "opacity-90",
              )}
            >
              <Timer className="size-4" />
              {callIsEphemeral ? t("ephemeralCallOn") : t("ephemeralCallOff")}
            </button>
            {callIsEphemeral ? (
              <p className="-mt-2 mb-4 text-center text-[12px] leading-snug text-paper/60">
                {forcedEphemeral ? t("ephemeralCallForced") : t("ephemeralCallHint")}
              </p>
            ) : null}
            <div className="grid grid-cols-4 gap-3">
              <CallCtrl label={t("muteMic")} active={muted} onClick={() => setMuted((v) => !v)}>
                {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </CallCtrl>
              <CallCtrl label={t("speaker")} active={speaker} onClick={() => setSpeaker((v) => !v)}>
                <Volume2 className="size-5" />
              </CallCtrl>
              <CallCtrl
                label={mode === "video" ? t("camera") : t("videoCall")}
                active={mode === "video" && !camOff}
                onClick={() => {
                  if (mode === "audio") {
                    setMode("video");
                    setCamOff(false);
                    return;
                  }
                  setCamOff((v) => !v);
                }}
              >
                {mode === "video" && !camOff ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              </CallCtrl>
              <CallCtrl
                label={t("flipCam")}
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              >
                <SwitchCamera className="size-5" />
              </CallCtrl>
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                className="press flex size-16 items-center justify-center rounded-full bg-danger text-paper"
                onClick={() => hang(elapsed)}
                aria-label={t("hangup")}
              >
                <PhoneOff className="size-7" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function CallCtrl({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="press flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          active ? "bg-paper text-navy" : "bg-paper/10 text-paper",
        )}
      >
        {children}
      </span>
      <span className="text-[10px] text-paper/60">{label}</span>
    </button>
  );
}
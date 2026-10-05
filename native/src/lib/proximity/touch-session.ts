/**
 * WIPP Touch (no Bluetooth) client: ephemeral server session + native bump detection +
 * optional UWB distance check (iPhone ↔ iPhone) + mutual confirmation.
 * The app never decides who it touched: the server pairs the sessions.
 */
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  getTouchCapabilities,
  startBumpDetection,
  uwbPrepare,
  uwbStart,
  uwbStop,
  type BumpEvent,
  type TouchCapabilities,
} from "wipp-touch-native";
import { wippApi } from "./wipp-session";

export type TouchPeerCard = { username: string; displayName: string; avatarUrl: string | null };

type ServerSession = {
  id: string;
  state: string;
  expiresAt: number;
  acceptedByMe: boolean;
  acceptedByPeer: boolean;
  peer: TouchPeerCard | null;
  uwb: { peerToken: string | null; myStatus: string | null; peerStatus: string | null; maxCm: number; timeoutMs: number } | null;
};

type StartResponse = {
  session: { id: string; state: string; expiresAt: number };
  serverNow: number;
  config: { bumpWindowMs: number; minPeakG: number; uwbMaxCm: number; uwbTimeoutMs: number; detectG?: number; maxBumpMs?: number };
};

export type TouchPhase =
  | "idle"
  | "starting"
  | "searching"
  | "candidate"
  | "waiting_peer"
  | "connected"
  | "already_connected"
  | "declined"
  | "expired"
  | "timeout"
  | "ambiguous"
  | "unavailable"
  | "too_far"
  | "offline"
  | "no_motion"
  | "failed";

const POLL_MS = 600;


const api = {
  time: () => wippApi<{ serverNow: number }>("/touch/time"),
  start: (caps: TouchCapabilities) =>
    wippApi<StartResponse>("/touch/session", { method: "POST", body: JSON.stringify({ platform: caps.platform, caps }) }),
  get: (id: string) => wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}`),
  bump: (id: string, body: object) =>
    wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/bump`, { method: "POST", body: JSON.stringify(body) }),
  uwbToken: (id: string, token: string) =>
    wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/uwb-token`, { method: "POST", body: JSON.stringify({ token }) }),
  uwbResult: (id: string, body: object) =>
    wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/uwb-result`, { method: "POST", body: JSON.stringify(body) }),
  accept: (id: string) => wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/accept`, { method: "POST", body: "{}" }),
  decline: (id: string) => wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/decline`, { method: "POST", body: "{}" }),
  cancel: (id: string, d?: object) =>
    wippApi<{ ok: boolean }>(`/touch/session/${encodeURIComponent(id)}/cancel`, { method: "POST", body: JSON.stringify({ diag: d ?? null }) }),
};

/** NTP-style offset: best of a few round trips. Returns server-time = device-time + offset. */
async function measureOffset(): Promise<{ offset: number; rtt: number }> {
  let best = { offset: 0, rtt: Number.POSITIVE_INFINITY };
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const { serverNow } = await api.time();
    const t1 = Date.now();
    const rtt = t1 - t0;
    if (rtt < best.rtt) best = { offset: serverNow - (t0 + t1) / 2, rtt };
  }
  return best;
}

function isOffline(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err);
  return /network|fetch|internet|offline|timed? ?out/i.test(msg) && !(err as { status?: number })?.status;
}

export function useTouchSession() {
  const [phase, setPhase] = useState<TouchPhase>("idle");
  const [peer, setPeer] = useState<TouchPeerCard | null>(null);
  const [bumps, setBumps] = useState(0);
  const [uwbLabel, setUwbLabel] = useState<"none" | "measuring" | "near" | "unavailable">("none");
  const sessionId = useRef<string | null>(null);
  const timers = useRef<{ poll?: ReturnType<typeof setInterval>; uwb?: ReturnType<typeof setTimeout> }>({});
  const subs = useRef<{ bump?: { remove: () => void } | null; uwb?: { remove: () => void } | null }>({});
  const clock = useRef({ offset: 0, rtt: 0 });
  const uwbState = useRef<{ posted: boolean; started: boolean; reported: boolean; best: number }>({ posted: false, started: false, reported: false, best: Infinity });
  const phaseRef = useRef<TouchPhase>("idle");
  const alive = useRef(true);
  const caps = useRef<TouchCapabilities | null>(null);
  const diag = useRef({ spikes: 0, maxPeak: 0 });

  function set(next: TouchPhase) {
    phaseRef.current = next;
    if (alive.current) setPhase(next);
  }

  function stopSensors() {
    subs.current.bump?.remove();
    subs.current.bump = null;
  }

  function stopUwb() {
    subs.current.uwb?.remove();
    subs.current.uwb = null;
    if (timers.current.uwb) clearTimeout(timers.current.uwb);
    timers.current.uwb = undefined;
    uwbStop();
  }

  function stopAll() {
    stopSensors();
    stopUwb();
    if (timers.current.poll) clearInterval(timers.current.poll);
    timers.current.poll = undefined;
  }

  async function teardown(cancelServer: boolean) {
    stopAll();
    const id = sessionId.current;
    sessionId.current = null;
    if (cancelServer && id) await api.cancel(id, diag.current).catch(() => undefined);
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const live = ["starting", "searching", "candidate", "waiting_peer"].includes(phaseRef.current);
      void teardown(live);
    };
  }, []);

  async function reportUwb(body: object) {
    const id = sessionId.current;
    if (!id || uwbState.current.reported) return;
    uwbState.current.reported = true;
    stopUwb();
    await api.uwbResult(id, body).then((r) => apply(r.session)).catch(() => undefined);
  }

  function runUwb(s: ServerSession) {
    if (!s.uwb || !caps.current?.uwb) return;
    const u = uwbState.current;
    const id = s.id;
    if (!u.posted) {
      u.posted = true;
      const token = uwbPrepare();
      if (!token) {
        setUwbLabel("unavailable");
        void reportUwb({ status: "unavailable" });
        return;
      }
      setUwbLabel("measuring");
      void api.uwbToken(id, token).catch(() => undefined);
      timers.current.uwb = setTimeout(() => {
        if (u.best !== Infinity) void reportUwb({ distanceCm: u.best });
        else {
          setUwbLabel("unavailable");
          void reportUwb({ status: "unavailable" });
        }
      }, s.uwb.timeoutMs);
    }
    if (!u.started && s.uwb.peerToken) {
      u.started = true;
      const maxCm = s.uwb.maxCm;
      let firstFarAt = 0;
      subs.current.uwb = uwbStart(
        s.uwb.peerToken,
        (cm) => {
          u.best = Math.min(u.best, cm);
          if (cm <= maxCm) {
            setUwbLabel("near");
            void reportUwb({ distanceCm: cm });
          } else if (!firstFarAt) firstFarAt = Date.now();
          else if (Date.now() - firstFarAt > 2500 && u.best > maxCm) void reportUwb({ distanceCm: u.best });
        },
        (state) => {
          if (state === "denied" || state === "error") {
            setUwbLabel("unavailable");
            void reportUwb({ status: "unavailable" });
          }
        },
      );
      if (!subs.current.uwb) {
        setUwbLabel("unavailable");
        void reportUwb({ status: "unavailable" });
      }
    }
  }

  function apply(s: ServerSession) {
    if (!alive.current || s.id !== sessionId.current) return;
    const prev = phaseRef.current;
    switch (s.state) {
      case "waiting":
      case "bumped":
        if (prev === "starting" || prev === "searching") set("searching");
        break;
      case "candidate":
        setPeer(s.peer);
        if (prev !== "candidate" && prev !== "waiting_peer") {
          stopSensors();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        }
        set(s.acceptedByMe ? "waiting_peer" : "candidate");
        runUwb(s);
        break;
      case "connected":
      case "already_connected":
        setPeer(s.peer);
        stopAll();
        if (prev !== s.state) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        set(s.state);
        break;
      case "expired":
        stopAll();
        void api.cancel(s.id, diag.current).catch(() => undefined);
        set(prev === "candidate" || prev === "waiting_peer" ? "expired" : "timeout");
        break;
      case "failed":
        stopAll();
        set(uwbState.current.best !== Infinity ? "too_far" : "failed");
        break;
      case "declined":
      case "ambiguous":
      case "unavailable":
        stopAll();
        set(s.state);
        break;
      case "cancelled":
        stopAll();
        set("failed");
        break;
    }
  }

  async function onBump(e: BumpEvent) {
    const id = sessionId.current;
    if (!id || phaseRef.current !== "searching") return;
    setBumps((n) => n + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      const r = await api.bump(id, { at: e.at + clock.current.offset, peak: e.peak, durMs: e.durMs, energy: e.energy, rtt: clock.current.rtt });
      apply(r.session);
    } catch (err) {
      if (isOffline(err)) {
        stopAll();
        set("offline");
      }
    }
  }

  async function start() {
    await teardown(true);
    setPeer(null);
    setBumps(0);
    setUwbLabel("none");
    uwbState.current = { posted: false, started: false, reported: false, best: Infinity };
    set("starting");
    diag.current = { spikes: 0, maxPeak: 0 };
    const c = getTouchCapabilities();
    caps.current = c;
    if (!c.motion) {
      set("no_motion");
      return;
    }
    try {
      clock.current = await measureOffset();
      const r = await api.start(c);
      if (!alive.current) {
        void api.cancel(r.session.id).catch(() => undefined);
        return;
      }
      sessionId.current = r.session.id;
      const minPeak = r.config.minPeakG;
      const sub = startBumpDetection(r.config.detectG ?? minPeak, r.config.maxBumpMs ?? 250, (e) => {
        diag.current.spikes += 1;
        diag.current.maxPeak = Math.max(diag.current.maxPeak, e.peak);
        if (e.peak >= minPeak) void onBump(e);
      });
      if (!sub) {
        void teardown(true);
        set("no_motion");
        return;
      }
      subs.current.bump = sub;
      set("searching");
      timers.current.poll = setInterval(() => {
        const id = sessionId.current;
        if (!id) return;
        // Refresh the clock offset if the network got slow during the attempt.
        api
          .get(id)
          .then((res) => apply(res.session))
          .catch((err) => {
            if (isOffline(err)) {
              stopAll();
              set("offline");
            } else if ((err as { status?: number }).status === 404) {
              stopAll();
              set("timeout");
            }
          });
      }, POLL_MS);
    } catch (err) {
      set(isOffline(err) ? "offline" : "failed");
    }
  }

  async function accept() {
    const id = sessionId.current;
    if (!id) return;
    set("waiting_peer");
    try {
      apply((await api.accept(id)).session);
    } catch (err) {
      set(isOffline(err) ? "offline" : "failed");
    }
  }

  async function decline() {
    const id = sessionId.current;
    stopAll();
    set("declined");
    if (id) await api.decline(id).catch(() => undefined);
    sessionId.current = null;
  }

  return { phase, peer, bumps, uwbLabel, start, accept, decline, stop: () => teardown(true) };
}

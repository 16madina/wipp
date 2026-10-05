/**
 * WIPP Touch (no Bluetooth) client: ephemeral server session + native bump detection +
 * optional UWB distance check (iPhone ↔ iPhone) + mutual confirmation.
 * The app never decides who it touched: the server pairs the sessions.
 */
import { useEffect, useRef, useState } from "react";
import { AppState, PermissionsAndroid } from "react-native";
import * as Haptics from "expo-haptics";
import {
  getTouchCapabilities,
  startBumpDetection,
  uwbPrepare,
  uwbStart,
  uwbStop,
  uwbAvailable,
  uwbPermission,
  uwbProbe,
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
  proposal?: { type: "permanent" | "ephemeral" | null; minutes: number | null; byMe: boolean } | null;
  peer: TouchPeerCard | null;
  proximity?: "verifying" | "near" | "unverified" | null;
  uwb: {
    peerToken: string | null;
    myStatus: string | null;
    peerStatus: string | null;
    maxCm: number;
    timeoutMs: number;
    role?: "controller" | "controlee";
  } | null;
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
  | "verifying"
  | "candidate"
  | "waiting_peer"
  | "choose"
  | "proposal_out"
  | "proposal_in"
  | "connected"
  | "already_connected"
  | "declined"
  | "expired"
  | "timeout"
  | "ambiguous"
  | "unavailable"
  | "too_far"
  | "offline"
  | "uwb_denied"
  | "no_motion"
  | "failed";

const POLL_MS = 500;
/** How long the screen keeps renewing its ephemeral session while waiting for a contact. */
const READY_FOR_MS = 120_000;


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
  propose: (id: string, choice: object) =>
    wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/propose`, { method: "POST", body: JSON.stringify(choice) }),
  answer: (id: string, accept: boolean) =>
    wippApi<{ session: ServerSession }>(`/touch/session/${encodeURIComponent(id)}/proposal`, { method: "POST", body: JSON.stringify({ accept }) }),
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
  const openedAt = useRef(Date.now());
  const uwbDenied = useRef(false);
  const pausedInBackground = useRef(false);
  const [proximity, setProximity] = useState<"near" | "unverified" | null>(null);
  const [proposal, setProposal] = useState<ServerSession["proposal"]>(null);

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
    // Back from iOS Settings: re-check the permission and retry right away.
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        // Back from Settings, or back from background while WIPP Touch was waiting.
        if (phaseRef.current === "uwb_denied" || pausedInBackground.current) {
          pausedInBackground.current = false;
          void start();
        }
      } else if (st === "background" && ["starting", "searching"].includes(phaseRef.current)) {
        // Sensors never run in the background: stop and invalidate the waiting session.
        pausedInBackground.current = true;
        void teardown(true);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const live = ["starting", "searching", "verifying", "candidate", "waiting_peer", "choose", "proposal_out", "proposal_in"].includes(phaseRef.current);
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
      setUwbLabel("measuring");
      void uwbPrepare(s.uwb.role ?? "controlee").then((token) => {
        if (!token) {
          setUwbLabel("unavailable");
          void reportUwb({ status: "unavailable" });
          return;
        }
        void api.uwbToken(id, token).catch(() => undefined);
      });
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
          if (state === "denied") uwbDenied.current = true;
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
        stopSensors();
        runUwb(s);
        if (!s.peer || s.proximity === "verifying") {
          // Contact matched on the server; UWB is still proving the distance. No card yet.
          set("verifying");
          break;
        }
        setPeer(s.peer);
        if (prev !== "candidate" && prev !== "waiting_peer") {
          // Distinct "WIPP found" haptic: two firm taps.
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
          setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined), 140);
        }
        setProximity(s.proximity === "near" ? "near" : "unverified");
        set(s.acceptedByMe ? "waiting_peer" : "candidate");
        break;
      case "agreed":
        // Both confirmed the person: one proposes permanent / ephemeral, the other confirms.
        setPeer(s.peer);
        setProposal(s.proposal ?? null);
        set(!s.proposal ? "choose" : s.proposal.byMe ? "proposal_out" : "proposal_in");
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
        if ((prev === "searching" || prev === "starting") && Date.now() - openedAt.current < READY_FOR_MS) {
          // Still on the screen: renew the ephemeral session silently and stay "ready".
          void start(true);
          break;
        }
        set(prev === "candidate" || prev === "waiting_peer" || prev === "verifying" ? "expired" : "timeout");
        break;
      case "failed":
        stopAll();
        set(uwbDenied.current ? "uwb_denied" : uwbState.current.posted ? "too_far" : "failed");
        break;
      case "declined":
        stopAll();
        set("declined");
        scheduleReady();
        break;
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

  function scheduleReady() {
    // "Connexion annulée" for a moment, then back to "ready" on the same screen.
    setTimeout(() => {
      if (alive.current && phaseRef.current === "declined") void start();
    }, 2500);
  }

  async function start(renew = false) {
    await teardown(true);
    setPeer(null);
    setProximity(null);
    if (!renew) {
      setBumps(0);
      openedAt.current = Date.now();
    }
    setUwbLabel("none");
    uwbState.current = { posted: false, started: false, reported: false, best: Infinity };
    if (!renew) set("starting");
    diag.current = { spikes: 0, maxPeak: 0 };
    const c = getTouchCapabilities();
    caps.current = c;
    if (!c.motion) {
      set("no_motion");
      return;
    }
    // UWB-capable iPhone whose "Nearby Interactions" permission was refused: never bypass the
    // proof silently — explain and offer Settings (re-checked each time, nothing is permanent).
    uwbDenied.current = false;
    if (c.uwb && uwbPermission() === "denied" && (await uwbProbe()) === "denied") {
      uwbDenied.current = true;
      set("uwb_denied");
      return;
    }
    if (c.platform === "android" && c.uwbCapable) {
      // Android phone with UWB: needs the "Nearby devices" (UWB_RANGING) permission.
      const perm = "android.permission.UWB_RANGING" as never;
      let granted = await PermissionsAndroid.check(perm).catch(() => false);
      if (!granted) {
        const r = await PermissionsAndroid.request(perm).catch(() => "denied");
        granted = r === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (!granted) {
        uwbDenied.current = true;
        set("uwb_denied");
        return;
      }
      // UWB switched off in Android settings → standard WIPP Touch (contact + double consent).
      const on = await uwbAvailable();
      c.uwb = on;
      c.uwbKind = on ? "android-uwb" : null;
    }
    caps.current = c;
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
      if (!renew) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
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

  async function propose(choice: { type: "permanent" } | { type: "ephemeral"; minutes: number }) {
    const id = sessionId.current;
    if (!id) return;
    try {
      apply((await api.propose(id, choice)).session);
    } catch (err) {
      set(isOffline(err) ? "offline" : "failed");
    }
  }

  async function answerProposal(accept: boolean) {
    const id = sessionId.current;
    if (!id) return;
    try {
      apply((await api.answer(id, accept)).session);
    } catch (err) {
      set(isOffline(err) ? "offline" : "failed");
    }
  }

  async function decline() {
    const id = sessionId.current;
    stopAll();
    set("declined");
    sessionId.current = null;
    if (id) await api.decline(id).catch(() => undefined);
    scheduleReady();
  }

  return { phase, peer, bumps, uwbLabel, proximity, proposal, start: () => start(), accept, decline, propose, answerProposal, stop: () => teardown(true) };
}

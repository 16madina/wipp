import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { getRelation, sendRequest } from "../connections";
import { upsertRemoteProfile } from "../public-profiles";
import { NativeProximityProvider, type BluetoothState, type PermissionState } from "./provider";
import { fetchTouchBumpConfig, createTouchShare, getTouchShareStatus, cancelTouchShare, reportTouchShock, type TouchInvite } from "./touch-api";
import { configureTouchShock, startTouchShockListen, stopTouchShockListen } from "./touch-shock";
import { calibLog } from "./logic";
import { WIPP_TOUCH_SERVICE_UUID } from "./constants";

export type TouchUiState =
  | "ready"
  | "searching"
  | "detected"
  | "confirming"
  | "request_sent"
  | "accepted"
  | "declined"
  | "expired"
  | "multiple_devices"
  | "failed";

export function useWippTouch() {
  const [state, setState] = useState<TouchUiState>("ready");
  const [invite, setInvite] = useState<TouchInvite | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [bluetooth, setBluetooth] = useState<BluetoothState>("unknown");
  const [devRssi, setDevRssi] = useState<number | null>(null);
  const providerRef = useRef<NativeProximityProvider | null>(null);
  const inviteIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmounted = useRef(false);

  useEffect(() => {
    return () => {
      unmounted.current = true;
      void teardown();
    };
  }, []);

  async function teardown() {
    stopTouchShockListen();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    const id = inviteIdRef.current;
    inviteIdRef.current = null;
    if (id) void cancelTouchShare(id).catch(() => undefined);
    await providerRef.current?.stopAdvertise();
    await providerRef.current?.stopDiscovery();
    providerRef.current = null;
  }

  function showPeerFromInvite(next: TouchInvite) {
    const r = next.receiver;
    if (!r?.username) return;
    const userId = upsertRemoteProfile({
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl ?? null,
      bio: "",
    });
    setPeerId(userId);
    setInvite(next);
    if (next.status === "expired") setState("expired");
    else setState("detected");
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const { invite: next } = await getTouchShareStatus(id);
          if (unmounted.current) return;
          setInvite(next);
          if (next.status === "expired") {
            setState("expired");
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }
          if (next.arbitration === "ambiguous") {
            setState("multiple_devices");
            return;
          }
          if (next.receiver?.username && (next.arbitration === "matched" || next.matchedProfileId)) {
            showPeerFromInvite(next);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch (err) {
          const status = (err as { status?: number }).status;
          if (status === 410) setState("expired");
        }
      })();
    }, 900);
  }

  async function startSearch() {
    setHint(null);
    setPeerId(null);
    setState("searching");
    const cfg = await fetchTouchBumpConfig();
    configureTouchShock(cfg);
    const provider = new NativeProximityProvider();
    provider.setConfig(cfg);
    providerRef.current = provider;
    provider.on((ev) => {
      if (unmounted.current) return;
      if (ev.type === "permission") setPermission(ev.state);
      if (ev.type === "bluetooth") setBluetooth(ev.state);
      if (ev.type === "candidate" && typeof __DEV__ !== "undefined" && __DEV__) setDevRssi(ev.candidate.rssi);
      if (ev.type === "multiple") setState("multiple_devices");
      if (ev.type === "timeout") {
        setState((s) => (s === "searching" ? "failed" : s));
      }
      if (ev.type === "failure") {
        if (ev.reason === "bluetooth_off") setHint("bluetooth_off");
        if (ev.reason === "bluetooth_permission") setHint("permission");
        setState((s) => (s === "accepted" || s === "request_sent" || s === "detected" ? s : "failed"));
      }
    });
    const discovered = await provider.startDiscovery("touch");
    if (!discovered.ok) {
      setHint(discovered.reason === "bluetooth_off" ? "bluetooth_off" : discovered.reason === "bluetooth_permission" ? "permission" : discovered.reason || "failed");
      setState("failed");
      return;
    }
    try {
      const { invite: created } = await createTouchShare();
      inviteIdRef.current = created.id;
      setInvite(created);
      const adv = await provider.startAdvertise(created.code, { nfc: true, serviceUuid: WIPP_TOUCH_SERVICE_UUID });
      if (!adv.ok && adv.reason === "bluetooth_off") {
        setHint("bluetooth_off");
      }
      void startTouchShockListen((at, mag) => {
        calibLog(cfg, "shock", { mag, at });
        provider.noteShock(at, mag);
        const id = inviteIdRef.current;
        if (id) void reportTouchShock(id, at).catch(() => undefined);
      });
      startPolling(created.id);
    } catch {
      setState("failed");
      setHint("session");
    }
  }

  async function retry() {
    await teardown();
    setState("ready");
    setInvite(null);
    setPeerId(null);
    setHint(null);
  }

  async function sendConnect(): Promise<"ok" | "failed"> {
    const id = peerId;
    const user = id ? (await import("../store")).useWippStore.getState().users[id] : null;
    if (!user?.username) return "failed";
    setState("confirming");
    try {
      const status = await sendRequest(user.username, "touch");
      if (status === "already_connected" || status === "accepted_existing" || status === "accepted") {
        setState("accepted");
        return "ok";
      }
      if (status === "sent" || status === "already_pending") {
        setState("request_sent");
        const raw = user.id.startsWith("srvuser:") ? user.id.slice(8) : user.id;
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          void getRelation(raw).then((rel) => {
            if (rel === "connected") {
              setState("accepted");
              if (pollRef.current) clearInterval(pollRef.current);
            }
          });
        }, 2000);
        return "ok";
      }
      if (status === "blocked" || status === "not_found") {
        setState("failed");
        return "failed";
      }
      setState("failed");
      return "failed";
    } catch {
      setState("failed");
      return "failed";
    }
  }

  async function markAccepted() {
    setState("accepted");
  }

  async function markDeclined() {
    setState("declined");
  }

  void Platform;
  void AppState;

  return {
    state,
    invite,
    peerId,
    hint,
    permission,
    bluetooth,
    devRssi,
    startSearch,
    retry,
    sendConnect,
    markAccepted,
    markDeclined,
    teardown,
  };
}

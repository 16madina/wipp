/**
 * Calls with 3+ people: raised hands, applause and the organizer's tools (mute someone, ask for the camera,
 * give the floor). Messages travel between the phones of the call over LiveKit data (topic "wipp-call").
 * The organizer is the person who started the call. The organizer can name moderators, who get the same tools
 * (except naming moderators).
 */
import { create } from "zustand";

export const CALL_TOPIC = "wipp-call";

export type CallMsg =
  | { t: "host" }
  | { t: "hand"; up: boolean }
  | { t: "clap" }
  | { t: "mute"; to: string }
  | { t: "cam-ask"; to: string }
  /** Organizer / moderator asks someone to turn their microphone back on (they choose). */
  | { t: "mic-ask"; to: string }
  | { t: "floor"; to: string }
  /** Organizer only: names (on) or removes a moderator. */
  | { t: "mod"; to: string; on: boolean }
  /** Organizer only: the full list, for people who join later. */
  | { t: "mods"; ids: string[] }
  /** Animated reaction: only its id travels (r), with a unique tag (n) and the send time (at). */
  | { t: "react"; r: string; n: string; at: number }
  /** WIPP Moment: a shared 3-second celebration. */
  | { t: "moment"; n: string; at: number };

type State = {
  /** Identity of the organizer (announced by their phone). */
  host: string | null;
  /** Moderators named by the organizer. */
  mods: string[];
  /** Identities with a raised hand, in order. */
  hands: string[];
  /** Recent applause, to show 👏 on the tiles. */
  claps: { id: string; at: number }[];
  /** Short message shown at the top of the call screen. */
  notice: { text: string; at: number } | null;
  /** The organizer asks me to turn my camera on. */
  camAsk: boolean;
  /** The organizer asks me to turn my microphone on. */
  micAsk: boolean;
  /** Sends a message to everyone in the call (set by the call overlay while connected). */
  send: ((msg: CallMsg) => void) | null;
};

export const useCallControls = create<State>(() => ({ host: null, mods: [], hands: [], claps: [], notice: null, camAsk: false, micAsk: false, send: null }));

export function resetCallControls() {
  useCallControls.setState({ host: null, mods: [], hands: [], claps: [], notice: null, camAsk: false, micAsk: false, send: null });
}

export function callNotice(text: string) {
  useCallControls.setState({ notice: { text, at: Date.now() } });
}

export function setHand(identity: string, up: boolean) {
  useCallControls.setState((s) => ({ hands: up ? (s.hands.includes(identity) ? s.hands : [...s.hands, identity]) : s.hands.filter((x) => x !== identity) }));
}

export function addClap(identity: string) {
  const now = Date.now();
  useCallControls.setState((s) => ({ claps: [...s.claps.filter((c) => now - c.at < 3000), { id: identity, at: now }] }));
}

export function sendCallMsg(msg: CallMsg) {
  useCallControls.getState().send?.(msg);
}

/** The organizer or a moderator. */
export function canModerate(identity: string | null | undefined) {
  if (!identity) return false;
  const st = useCallControls.getState();
  return st.host === identity || st.mods.includes(identity);
}

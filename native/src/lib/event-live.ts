/** WIPP online events (conference / masterclass): calls to the WIPP server. Every right is checked there. */

export type LiveInfo = {
  eventId: string;
  title: string;
  startsAt: string | null;
  visibility: "public" | "private";
  mode: "conference" | "interactive";
  state: "scheduled" | "live" | "ended" | "cancelled";
  durationMin: number;
  maxViewers: number;
  commentsOn: boolean;
  reactionsOn: boolean;
  questionsOn: boolean;
  registered: number;
  myStatus: "organizer" | "invited" | "registered" | "banned" | null;
  isOwner: boolean;
};

export type LiveToken = {
  url: string;
  token: string;
  room: string;
  identity: string;
  role: "organizer" | "speaker" | "viewer";
  ownerIdentity: string;
  settings: { commentsOn: boolean; reactionsOn: boolean; questionsOn: boolean; qaMode: boolean; mode: string };
};

async function api<T>(path: string, body?: unknown) {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<T>(path, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
}
const at = (eventId: string, action = "") => `lives/${encodeURIComponent(eventId)}${action ? `/${action}` : ""}`;

export const getLive = (eventId: string) => api<LiveInfo>(at(eventId));
export const saveLive = (eventId: string, input: { visibility: "public" | "private"; mode: "conference" | "interactive"; durationMin: number; showRegistered: boolean }) =>
  api<LiveInfo>(at(eventId), input);
export const registerLive = (eventId: string, on: boolean) => api<LiveInfo>(at(eventId, on ? "register" : "unregister"), {});
export const inviteToLive = (eventId: string, usernames: string[]) => api<{ invited: number }>(at(eventId, "invite"), { usernames });
export const newLiveLink = (eventId: string) => api<{ url: string }>(at(eventId, "link"), {});
export const revokeLiveLink = (eventId: string) => api<{ ok: boolean }>(at(eventId, "link-revoke"), {});
export const joinLiveLink = (eventId: string, k: string) => api<LiveInfo>(at(eventId, "join-link"), { k });
export const startLive = (eventId: string) => api<LiveInfo>(at(eventId, "start"), {});
export const endLive = (eventId: string) => api<LiveInfo>(at(eventId, "end"), {});
export const cancelLive = (eventId: string) => api<LiveInfo>(at(eventId, "cancel"), {});
export const liveToken = (eventId: string) => api<LiveToken>(at(eventId, "token"), {});
export const setLiveSettings = (eventId: string, input: { commentsOn?: boolean; reactionsOn?: boolean; questionsOn?: boolean; qaMode?: boolean }) =>
  api<{ commentsOn: boolean; reactionsOn: boolean; questionsOn: boolean; qaMode: boolean }>(at(eventId, "settings"), input);
export const banFromLive = (eventId: string, identity: string) => api<{ ok: boolean }>(at(eventId, "ban"), { identity });
export type LiveQuestion = {
  id: string;
  authorId: string;
  text: string;
  status: "pending" | "shown" | "done" | "ignored";
  votes: number;
  createdAt: number;
  name: string;
  username: string;
  avatar: string | null;
  myVote: boolean;
};
export type LiveQuestions = { questions: LiveQuestion[]; spotlight: LiveQuestion | null; questionsOn: boolean; qaMode: boolean; state: string; isOwner: boolean };
export const listLiveQuestions = (eventId: string) => api<LiveQuestions>(at(eventId, "questions"));
export const askLiveQuestion = (eventId: string, text: string) => api<{ id: string }>(at(eventId, "questions"), { text });
export const voteLiveQuestion = (eventId: string, questionId: string, on: boolean) =>
  api<{ votes: number; myVote: boolean }>(at(eventId, `questions/${encodeURIComponent(questionId)}/vote`), { on });
export const moderateLiveQuestion = (eventId: string, questionId: string, action: "show" | "unshow" | "done" | "ignore" | "delete" | "restore") =>
  api<{ ok: boolean; status: string }>(at(eventId, `questions/${encodeURIComponent(questionId)}/moderate`), { action });
export const postLiveComment = (eventId: string, text: string) => api<{ id: string }>(at(eventId, "comment"), { text });
export const deleteLiveComment = (eventId: string, id: string) => api<{ ok: boolean }>(at(eventId, "delete-comment"), { id });

/** « https://wippapp.com/e/{eventId}?k={token} » → { eventId, k }. */
export function parseLiveLink(raw: string) {
  const m = /^(?:https:\/\/(?:www\.)?wippapp\.com|wipp:\/)\/e\/([^/?#]+)(?:\?([^#]*))?/i.exec(raw.trim());
  if (!m) return null;
  const k = new URLSearchParams(m[2] ?? "").get("k") ?? "";
  return { eventId: decodeURIComponent(m[1]), k };
}

/** Card / sheet label for a WIPP online event. */
export function liveBadge(live: { state: string } | undefined) {
  if (!live) return null;
  if (live.state === "live") return "EN DIRECT";
  if (live.state === "ended") return "Terminé";
  if (live.state === "cancelled") return "Annulé";
  return "À venir";
}

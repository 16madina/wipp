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
  hostAbsentSince?: string | null;
  hostGraceMs?: number;
};

export type LiveToken = {
  url: string;
  token: string;
  room: string;
  identity: string;
  role: "organizer" | "speaker" | "viewer";
  ownerIdentity: string;
  pid: string;
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
export type LiveSummary = {
  eventId: string;
  title: string;
  state: string;
  isOwner: boolean;
  organizer: { name: string; username: string; avatar: string | null };
  canReview: boolean;
  myReview: { rating: number | null; text: string } | null;
  stats: { attendees: number; questions: number; reviews: number; average: number | null } | null;
};
export const liveSummary = (eventId: string) => api<LiveSummary>(at(eventId, "summary"));
export const saveLiveReview = (eventId: string, rating: number | null, text: string) => api<{ ok: boolean }>(at(eventId, "review"), { rating, text });
export type StagePerson = { pid: string; identity: string; name: string; username: string; avatar: string | null; micRevoked: boolean; camRevoked: boolean; at?: number };
export type LiveStage = {
  mode: "conference" | "interactive";
  maxSpeakers: number;
  featured: string | null;
  layout: "shared" | "dominant" | "inset";
  shareNotify?: boolean;
  ownerIdentity: string;
  speakers: StagePerson[];
  hands: StagePerson[];
  invites: StagePerson[];
  me: { onStage: boolean; handRaised: boolean; invitedAt: number | null; micRevoked: boolean; camRevoked: boolean };
  freeSeats: number;
};
export const liveStage = (eventId: string) => api<LiveStage>(at(eventId, "stage"));
type StageAction =
  | { action: "hand"; up: boolean }
  | { action: "invite"; pid: string }
  | { action: "dismiss"; pid: string }
  | { action: "answer"; accept: boolean }
  | { action: "leave"; pid?: string }
  | { action: "media"; pid: string; micRevoked?: boolean; camRevoked?: boolean }
  | { action: "feature"; identity: string | null }
  | { action: "mode"; mode: "conference" | "interactive" }
  | { action: "layout"; layout: "shared" | "dominant" | "inset" };
/** WIPP 1.1: the host tells the server he shares his screen (so it can alert him), and his alert setting. */
export const setSharingState = (eventId: string, on: boolean) => api<{ ok: boolean }>(at(eventId, "stage"), { action: "sharing", on });
export const setShareNotify = (eventId: string, on: boolean) => api<{ ok: boolean; shareNotify: boolean }>(at(eventId, "stage"), { action: "share-notify", on });
export const stageAction = (eventId: string, body: StageAction) => api<LiveStage>(at(eventId, "stage"), body);
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

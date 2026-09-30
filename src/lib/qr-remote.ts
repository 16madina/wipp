import { callServerFn } from "./server-fn";

const FN = {
  issueTempQr: "d13cd4aafe3657e56b5c69c81fcb5cdcaee0efdd8d55c9384cbe11ed354bc4ce",
  redeemTempQr: "c814828572dff208c9098494c070ceb56806531c6bc8c315ff1b753806bf15d8",
  groupInvite: "87935310d5ae7c8b4fe28501c2df5160d1bdd1974996e0900ad933064d1648fe",
} as const;

export type RemoteProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
};

export const isServerToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

export async function issueTemp(): Promise<{ token: string; expiresAt: number } | { error: string }> {
  const r = await callServerFn<{ status: string; token?: string; ttlMs?: number }>(FN.issueTempQr, {});
  if (r.status !== "issued" || !r.token) return { error: r.status };
  return { token: r.token, expiresAt: Date.now() + (r.ttlMs ?? 75_000) };
}

export async function redeemTemp(
  token: string,
): Promise<{ status: string; profile?: RemoteProfile; connected?: boolean }> {
  const r = await callServerFn<{
    status: string;
    profile?: { id: string; username: string; display_name: string; avatar_url: string | null; bio: string };
    connected?: boolean;
  }>(FN.redeemTempQr, { token });
  if (r.status !== "ok" || !r.profile) return { status: r.status };
  const p = r.profile;
  return {
    status: "ok",
    connected: Boolean(r.connected),
    profile: {
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio ?? "",
    },
  };
}

export async function groupInviteCall(token: string, join: boolean) {
  return callServerFn<{ status: string; name?: string; members?: number; chat_id?: string }>(FN.groupInvite, {
    token,
    join,
  });
}

export const GROUP_FR: Record<string, string> = {
  ok: "Invitation valide",
  joined: "Tu as rejoint le groupe",
  already_member: "Tu es déjà membre de ce groupe",
  revoked: "Invitation révoquée",
  expired: "Invitation expirée",
  full: "Invitation complète",
  refused: "Tu ne peux pas rejoindre ce groupe",
  closed: "Ce groupe n'accepte pas d'invitation",
  invalid: "Groupe introuvable",
  no_session: "Connecte-toi avec un vrai compte",
  error: "Impossible de vérifier le QR",
};

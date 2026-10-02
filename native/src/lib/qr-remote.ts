export type RemoteProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
};

export const isServerToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

export async function issueTemp(): Promise<{ token: string; expiresAt: number } | { error: string }> {
  const { wippApi } = await import("./proximity/wipp-session");
  const r = await wippApi<{ token?: string; expiresAt?: number }>("qr/temp", { method: "POST", body: "{}" });
  if (!r.token || !r.expiresAt) return { error: "invalid" };
  return { token: r.token, expiresAt: r.expiresAt };
}

export async function redeemTemp(
  token: string,
): Promise<{ status: string; profile?: RemoteProfile; connected?: boolean }> {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<{ status: string; profile?: RemoteProfile; connected?: boolean }>("qr/temp/redeem", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function groupInviteCall(token: string, join: boolean) {
  const { peekGroupInvite, joinGroupInvite } = await import("./lot7/api");
  return join ? joinGroupInvite(token) : peekGroupInvite(token);
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

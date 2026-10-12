import { tr } from "./tr";
export type RemoteProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  motto?: string | null;
};

export const isServerToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

/** Ephemeral QR (75 s, single use) offering a connection of `minutes` (server validates 15 min–30 days). */
export async function issueTemp(minutes = 1440): Promise<{ token: string; expiresAt: number; connectionMinutes: number } | { error: string }> {
  const { wippApi } = await import("./proximity/wipp-session");
  const r = await wippApi<{ token?: string; expiresAt?: number; connectionMinutes?: number }>("qr/temp", {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
  if (!r.token || !r.expiresAt) return { error: "invalid" };
  return { token: r.token, expiresAt: r.expiresAt, connectionMinutes: r.connectionMinutes ?? minutes };
}

export async function redeemTemp(
  token: string,
): Promise<{ status: string; profile?: RemoteProfile; connected?: boolean; offer?: { type: "ephemeral"; minutes: number } }> {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<{ status: string; profile?: RemoteProfile; connected?: boolean; offer?: { type: "ephemeral"; minutes: number } }>("qr/temp/redeem", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function groupInviteCall(token: string, join: boolean) {
  const { peekGroupInvite, joinGroupInvite } = await import("./lot7/api");
  return join ? joinGroupInvite(token) : peekGroupInvite(token);
}

export const GROUP_FR: Record<string, string> = {
  get ok() { return tr("Invitation valide"); },
  get joined() { return tr("Tu as rejoint le groupe"); },
  get pending() { return tr("Demande envoyée : un admin du groupe doit l’approuver"); },
  get already_member() { return tr("Tu es déjà membre de ce groupe"); },
  get revoked() { return tr("Invitation révoquée"); },
  get expired() { return tr("Invitation expirée"); },
  get full() { return tr("Invitation complète"); },
  get refused() { return tr("Tu ne peux pas rejoindre ce groupe"); },
  get closed() { return tr("Ce groupe n'accepte pas d'invitation"); },
  get invalid() { return tr("Groupe introuvable"); },
  get no_session() { return tr("Connecte-toi avec un vrai compte"); },
  get error() { return tr("Impossible de vérifier le QR"); },
};

/**
 * Gagne des récompenses : parrainage, badges, épinglage d'entreprise.
 * - Un ami compte quand il a choisi mon @pseudo comme parrain ET envoyé son premier message.
 * - 3 amis actifs → badge bleu (Ambassadeur) ; le badge doré = certifié par WIPP (admin seulement).
 * - 5 amis → code d'épinglage 7 jours ; 10 amis → code 30 jours. Un code s'utilise une fois,
 *   sur sa propre entreprise, ou s'offre à quelqu'un qui l'entre sur la sienne.
 */
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";

export const REWARD_TIERS = [
  { friends: 3, kind: "badge" as const, label: "Badge bleu Ambassadeur" },
  { friends: 5, kind: "pin" as const, days: 7, label: "Entreprise épinglée 7 jours" },
  { friends: 10, kind: "pin" as const, days: 30, label: "Entreprise épinglée 30 jours" },
];

/** A friend may enter a code during their first week only. */
const REFERRAL_WINDOW_MS = 7 * 24 * 3600_000;

function pinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `WIPP-${out.slice(0, 4)}-${out.slice(4)}`;
}

async function activeCount(profileId: string) {
  const sql = await getSql();
  const rows = await sql<{ c: number }>`
    select count(*)::int as c from wipp_profiles
    where referred_by = ${profileId} and referral_qualified_at is not null and suspended_at is null
  `;
  return Number(rows[0]?.c ?? 0);
}

/** Gives every reward the count unlocks (idempotent: unique (owner_id, tier)). */
async function grantRewards(profileId: string) {
  const sql = await getSql();
  const n = await activeCount(profileId);
  if (n >= 3) {
    await sql`update wipp_profiles set badge = 'blue' where id = ${profileId} and badge is null`;
  }
  for (const tier of REWARD_TIERS) {
    if (tier.kind !== "pin" || n < tier.friends) continue;
    await sql`
      insert into wipp_pin_rewards (id, owner_id, tier, days, code)
      values (${`pin_${randomBytes(9).toString("hex")}`}, ${profileId}, ${tier.friends}, ${tier.days}, ${pinCode()})
      on conflict (owner_id, tier) do nothing
    `;
  }
}

/** Called after each sent message: the first one makes the invitation count. Never throws. */
export async function qualifyReferral(senderId: string) {
  try {
    const sql = await getSql();
    const rows = await sql<{ referred_by: string | null }>`
      update wipp_profiles set referral_qualified_at = now()
      where id = ${senderId} and referred_by is not null and referral_qualified_at is null
      returning referred_by
    `;
    const referrer = rows[0]?.referred_by;
    if (referrer) await grantRewards(referrer);
  } catch (err) {
    console.warn("[wipp-api] referral qualify failed", err instanceof Error ? err.message : "unknown");
  }
}

export async function setMyReferrer(meId: string, raw: string) {
  const username = raw.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{2,32}$/.test(username)) throw new WippHttpError(400, "invalid_code", "Code d’invitation invalide.");
  const sql = await getSql();
  const me = await sql<{ referred_by: string | null; created_at: string }>`
    select referred_by, created_at::text from wipp_profiles where id = ${meId} limit 1
  `;
  if (!me[0]) throw new WippHttpError(404, "not_found", "Profil introuvable.");
  if (me[0].referred_by) throw new WippHttpError(409, "already_set", "Tu as déjà un parrain.");
  if (Date.now() - Date.parse(me[0].created_at) > REFERRAL_WINDOW_MS) {
    throw new WippHttpError(409, "too_late", "Le code d’invitation s’entre pendant la première semaine.");
  }
  const ref = await sql<{ id: string; referred_by: string | null }>`
    select id, referred_by from wipp_profiles
    where lower(username) = ${username} and suspended_at is null limit 1
  `;
  const referrer = ref[0];
  if (!referrer) throw new WippHttpError(404, "unknown_code", "Aucun compte WIPP avec ce pseudo.");
  if (referrer.id === meId || referrer.referred_by === meId) {
    throw new WippHttpError(400, "self", "Ce code ne peut pas être utilisé.");
  }
  await sql`update wipp_profiles set referred_by = ${referrer.id} where id = ${meId} and referred_by is null`;
  // Someone who already wrote before entering the code counts right away.
  const sent = await sql<{ c: number }>`select count(*)::int as c from wipp_messages where sender_id = ${meId} limit 1`;
  if (Number(sent[0]?.c ?? 0) > 0) await qualifyReferral(meId);
  return { ok: true };
}

export async function getMyRewards(meId: string) {
  const sql = await getSql();
  const me = await sql<{ username: string; badge: string | null; referred_by: string | null; created_at: string }>`
    select username, badge, referred_by, created_at::text from wipp_profiles where id = ${meId} limit 1
  `;
  if (!me[0]) throw new WippHttpError(404, "not_found", "Profil introuvable.");
  const friends = await sql<{ display_name: string; username: string; avatar_url: string | null; active: boolean }>`
    select display_name, username, avatar_url, referral_qualified_at is not null as active
    from wipp_profiles where referred_by = ${meId} and suspended_at is null
    order by created_at desc limit 100
  `;
  const pins = await sql<{ code: string; days: number; tier: number; redeemed_at: string | null; card_name: string | null }>`
    select r.code, r.days, r.tier, r.redeemed_at::text, bc.name as card_name
    from wipp_pin_rewards r left join wipp_business_cards bc on bc.id = r.redeemed_card_id
    where r.owner_id = ${meId} order by r.tier
  `;
  const active = friends.filter((f) => f.active).length;
  return {
    code: me[0].username,
    badge: me[0].badge === "gold" || me[0].badge === "blue" ? me[0].badge : null,
    active,
    invited: friends.length,
    canEnterCode: !me[0].referred_by && Date.now() - Date.parse(me[0].created_at) <= REFERRAL_WINDOW_MS,
    tiers: REWARD_TIERS.map((t) => ({ friends: t.friends, label: t.label, reached: active >= t.friends })),
    friends: friends.map((f) => ({ displayName: f.display_name, username: f.username, avatarUrl: f.avatar_url, active: f.active })),
    pins: pins.map((p) => ({ code: p.code, days: p.days, used: Boolean(p.redeemed_at), usedOn: p.card_name })),
  };
}

/** Applies a pin code to MY published business (mine or a gifted one). */
export async function redeemPinCode(meId: string, raw: string) {
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^WIPP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new WippHttpError(400, "invalid_code", "Code d’épinglage invalide.");
  const sql = await getSql();
  const cards = await sql<{ id: string; name: string }>`
    select id, name from wipp_business_cards where owner_profile_id = ${meId} and is_published = true limit 1
  `;
  const card = cards[0];
  if (!card) throw new WippHttpError(409, "no_business", "Publie d’abord ta page Entreprise pour l’épingler.");
  const rows = await sql<{ days: number }>`
    update wipp_pin_rewards set redeemed_card_id = ${card.id}, redeemed_by = ${meId}, redeemed_at = now()
    where code = ${code} and redeemed_at is null
    returning days
  `;
  const days = rows[0]?.days;
  if (!days) throw new WippHttpError(404, "used_or_unknown", "Code inconnu ou déjà utilisé.");
  const pinned = await sql<{ pinned_until: string }>`
    update wipp_business_cards
    set pinned_until = greatest(coalesce(pinned_until, now()), now()) + make_interval(days => ${days})
    where id = ${card.id}
    returning pinned_until::text
  `;
  return { ok: true, name: card.name, days, pinnedUntil: pinned[0]?.pinned_until ?? null };
}

/** Admin only: gold badge on / off. Off falls back to blue when the person earned it. */
export async function setCertified(adminId: string, profileId: string, on: boolean) {
  const { assertStaff, audit } = await import("@/lib/messaging/admin");
  await assertStaff(adminId, true);
  const sql = await getSql();
  if (on) {
    await sql`update wipp_profiles set badge = 'gold' where id = ${profileId}`;
  } else {
    const n = await activeCount(profileId);
    await sql`update wipp_profiles set badge = ${n >= 3 ? "blue" : null} where id = ${profileId}`;
  }
  await audit(adminId, on ? "certify" : "uncertify", profileId, {});
  return { ok: true };
}

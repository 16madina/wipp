/**
 * One phone per account (like WhatsApp). The phone in use is the last one that took the account.
 * - claim(): a phone says "I am using this account". Another phone already holds it → asks first (other_device);
 *   with force, this phone takes it and the old one stops getting calls and notifications.
 * - A phone that was replaced is told so (device_replaced) and signs out.
 * Phones of older app versions never call this, so nothing changes for them.
 */
import { getSql } from "@/lib/db";
import { WippHttpError } from "./server";

let ready: Promise<void> | null = null;
function ensureTables() {
  ready ??= (async () => {
    const sql = await getSql();
    await sql`create table if not exists wipp_active_devices (
      profile_id text primary key,
      installation_id text not null,
      platform text,
      claimed_at timestamptz not null default now()
    )`;
    await sql`create table if not exists wipp_replaced_devices (
      installation_id text not null,
      profile_id text not null,
      replaced_at timestamptz not null default now(),
      primary key (installation_id, profile_id)
    )`;
    await sql`alter table wipp_active_devices enable row level security`;
    await sql`alter table wipp_replaced_devices enable row level security`;
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export async function claimDevice(input: { profileId: string; installationId?: string; platform?: string; force?: boolean }) {
  const installationId = (input.installationId ?? "").trim().slice(0, 64);
  if (!installationId) throw new WippHttpError(400, "installation_required", "Appareil inconnu.");
  await ensureTables();
  const sql = await getSql();
  const rows = await sql<{ installation_id: string; platform: string | null; claimed_at: string }>`
    select installation_id, platform, claimed_at::text from wipp_active_devices where profile_id = ${input.profileId} limit 1`;
  const current = rows[0];
  if (current?.installation_id === installationId) return { ok: true as const };
  if (current && !input.force) {
    const replaced = await sql`select 1 from wipp_replaced_devices where installation_id = ${installationId} and profile_id = ${input.profileId} limit 1`;
    if (replaced.length) throw new WippHttpError(409, "device_replaced", "Ton compte est maintenant utilisé sur un autre téléphone.");
    throw new WippHttpError(409, "other_device", "Ton compte est déjà connecté sur un autre téléphone.");
  }
  await sql`
    insert into wipp_active_devices (profile_id, installation_id, platform, claimed_at)
    values (${input.profileId}, ${installationId}, ${(input.platform ?? "").slice(0, 16) || null}, now())
    on conflict (profile_id) do update set installation_id = excluded.installation_id, platform = excluded.platform, claimed_at = now()`;
  await sql`delete from wipp_replaced_devices where installation_id = ${installationId} and profile_id = ${input.profileId}`;
  if (current) {
    await sql`
      insert into wipp_replaced_devices (installation_id, profile_id) values (${current.installation_id}, ${input.profileId})
      on conflict do nothing`;
    // The old phone no longer rings or gets notifications for this account.
    await sql`
      update wipp_push_tokens set disabled_at = now()
      where profile_id = ${input.profileId} and installation_id is not null and installation_id <> ${installationId} and disabled_at is null`.catch(() => undefined);
  }
  return { ok: true as const, replacedOther: Boolean(current) };
}

/** False when another phone now holds this account (used before a call or a push registration). */
export async function deviceAllowed(profileId: string, installationId: string | null | undefined) {
  if (!installationId) return true;
  await ensureTables();
  const sql = await getSql();
  const rows = await sql<{ installation_id: string }>`select installation_id from wipp_active_devices where profile_id = ${profileId} limit 1`;
  return !rows[0] || rows[0].installation_id === installationId.trim().slice(0, 64);
}

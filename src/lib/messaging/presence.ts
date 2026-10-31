/**
 * Real « en ligne » (like WhatsApp): the app pings while it is open; someone is online if their last ping
 * is under 90 s old. A person can hide it (Confidentialité › En ligne): then nobody sees their online /
 * last seen, and — like WhatsApp — they no longer see other people's either.
 */
import { getSql } from "@/lib/db";

const ONLINE_MS = 40_000;
let ready: Promise<void> | null = null;
function ensure() {
  ready ??= (async () => {
    const sql = await getSql();
    await sql`create table if not exists wipp_presence (
      profile_id text primary key,
      last_active_at timestamptz not null default now(),
      hidden boolean not null default false
    )`;
    await sql`alter table wipp_presence enable row level security`;
    // Per contact: « owner » does not let « viewer » see when they are online.
    await sql`create table if not exists wipp_presence_hidden_from (
      owner_id text not null,
      viewer_id text not null,
      created_at timestamptz not null default now(),
      primary key (owner_id, viewer_id)
    )`;
    await sql`alter table wipp_presence_hidden_from enable row level security`;
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export async function pingPresence(profileId: string) {
  await ensure();
  const sql = await getSql();
  await sql`insert into wipp_presence (profile_id, last_active_at) values (${profileId}, now())
    on conflict (profile_id) do update set last_active_at = now()`;
  return { ok: true as const };
}

/** Left the app: last seen = now, offline at once. */
export async function leavePresence(profileId: string) {
  await ensure();
  const sql = await getSql();
  await sql`insert into wipp_presence (profile_id, last_active_at) values (${profileId}, now() - interval '2 minutes')
    on conflict (profile_id) do update set last_active_at = least(wipp_presence.last_active_at, now() - interval '2 minutes')`;
  return { ok: true as const };
}

export async function setPresenceHidden(profileId: string, hidden: boolean) {
  await ensure();
  const sql = await getSql();
  await sql`insert into wipp_presence (profile_id, hidden) values (${profileId}, ${hidden})
    on conflict (profile_id) do update set hidden = ${hidden}`;
  return { ok: true as const, hidden };
}

export async function myPresenceSettings(profileId: string) {
  await ensure();
  const sql = await getSql();
  const rows = await sql<{ hidden: boolean }>`select hidden from wipp_presence where profile_id = ${profileId} limit 1`;
  return { hidden: Boolean(rows[0]?.hidden) };
}

/** What I may see of these people (online now, last seen). Hidden on either side → nothing. */
export async function presenceOf(meId: string, ids: string[]) {
  await ensure();
  const clean = [...new Set(ids.filter((x) => typeof x === "string" && x && x !== meId))].slice(0, 100);
  const sql = await getSql();
  const mine = await sql<{ hidden: boolean }>`select hidden from wipp_presence where profile_id = ${meId} limit 1`;
  if (mine[0]?.hidden || !clean.length) return Object.fromEntries(clean.map((id) => [id, { online: false, lastSeen: null, hidden: true }]));
  const rows = await sql<{ profile_id: string; last_active_at: string; hidden: boolean }>`
    select p.profile_id, p.last_active_at::text,
           (p.hidden or exists (select 1 from wipp_presence_hidden_from h where h.owner_id = p.profile_id and h.viewer_id = ${meId})) as hidden
    from wipp_presence p where p.profile_id = any(${clean})`;
  const by = new Map(rows.map((r) => [r.profile_id, r]));
  return Object.fromEntries(
    clean.map((id) => {
      const r = by.get(id);
      if (!r || r.hidden) return [id, { online: false, lastSeen: null, hidden: Boolean(r?.hidden) }];
      const at = Date.parse(r.last_active_at);
      return [id, { online: Date.now() - at < ONLINE_MS, lastSeen: at, hidden: false }];
    }),
  );
}

/** Per contact: let (or not) this person see when I am online. */
export async function setHiddenFrom(ownerId: string, viewerId: string, hidden: boolean) {
  await ensure();
  const sql = await getSql();
  if (hidden) await sql`insert into wipp_presence_hidden_from (owner_id, viewer_id) values (${ownerId}, ${viewerId}) on conflict do nothing`;
  else await sql`delete from wipp_presence_hidden_from where owner_id = ${ownerId} and viewer_id = ${viewerId}`;
  return { ok: true as const, hidden };
}

export async function hiddenFromList(ownerId: string) {
  await ensure();
  const sql = await getSql();
  const rows = await sql<{ viewer_id: string }>`select viewer_id from wipp_presence_hidden_from where owner_id = ${ownerId}`;
  return rows.map((r) => r.viewer_id);
}

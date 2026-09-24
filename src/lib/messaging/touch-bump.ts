/**
 * Bump-style shock + RSSI arbitration for WIPP Touch.
 */
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError, ensureMessagingReady } from "@/lib/messaging/server";
import { getTouchBumpConfig, touchCalibLog } from "@/lib/messaging/touch-config";
import { loadInviteRow, type TouchInviteDto } from "@/lib/messaging/touch";

function uid(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export type DetectInput = {
  code: string;
  profileId: string;
  rssiSamples: number[];
  detectedAt: number;
  shockAt?: number | null;
  platform?: string;
  foreground?: boolean;
  channel?: "ble" | "nfc" | "manual" | "qr";
};

export type DetectResult = {
  state: "queued" | "waiting_shock" | "winner" | "rejected" | "ambiguous" | "bypassed";
  invite?: TouchInviteDto;
  message?: string;
  arbitration?: string;
};

/** Channels that skip shock arbitration (intentional share). */
const BYPASS = new Set(["manual", "qr", "nfc"]);

export async function reportTouchDetect(input: DetectInput): Promise<DetectResult> {
  await ensureMessagingReady();
  const cfg = await getTouchBumpConfig();
  const invite = await loadInviteRow(input.code);
  if (!invite || invite.status !== "active") {
    throw new WippHttpError(404, "not_found", "Invitation introuvable ou inactive.");
  }
  if (invite.sender.id === input.profileId) {
    throw new WippHttpError(400, "self", "C’est ton propre partage.");
  }

  const channel = input.channel || "ble";
  if (BYPASS.has(channel)) {
    return { state: "bypassed", invite };
  }

  const samples = (input.rssiSamples || []).filter((n) => Number.isFinite(n));
  const med = median(samples);
  const sql = await getSql();
  const id = uid("cand");
  await sql`
    insert into wipp_touch_candidates (
      id, invite_id, profile_id, rssi_samples, median_rssi,
      detected_at, shock_at, platform, foreground, channel
    ) values (
      ${id},
      ${invite.id},
      ${input.profileId},
      ${JSON.stringify(samples)}::jsonb,
      ${med},
      ${new Date(input.detectedAt).toISOString()},
      ${input.shockAt ? new Date(input.shockAt).toISOString() : null},
      ${input.platform || null},
      ${Boolean(input.foreground)},
      ${channel}
    )
    on conflict (invite_id, profile_id) do update set
      rssi_samples = excluded.rssi_samples,
      median_rssi = excluded.median_rssi,
      detected_at = excluded.detected_at,
      shock_at = coalesce(excluded.shock_at, wipp_touch_candidates.shock_at),
      platform = excluded.platform,
      foreground = excluded.foreground,
      channel = excluded.channel
  `;

  touchCalibLog(cfg, "candidate", {
    inviteId: invite.id,
    profileId: input.profileId,
    median: med,
    samples,
    platform: input.platform,
    foreground: input.foreground,
  });

  // Re-run arbitration if shock already happened
  const row = await sql<{
    shock_at: string | null;
    arbitration: string;
    matched_profile_id: string | null;
  }>`
    select shock_at::text, arbitration, matched_profile_id
    from wipp_touch_invites where id = ${invite.id} limit 1
  `;
  const shockAt = row[0]?.shock_at ? Date.parse(row[0].shock_at) : null;
  if (shockAt) {
    const arb = await runArbitration(invite.id, shockAt);
    if (arb.state === "matched" && arb.winnerId === input.profileId) {
      const full = await loadInviteRow(invite.id);
      return { state: "winner", invite: full || invite, arbitration: "matched" };
    }
    if (arb.state === "matched") {
      return { state: "rejected", arbitration: "matched", message: "Un autre appareil a été sélectionné." };
    }
    if (arb.state === "ambiguous") {
      return { state: "ambiguous", arbitration: "ambiguous", message: "Recollez les téléphones." };
    }
  }

  return { state: shockAt ? "queued" : "waiting_shock", arbitration: row[0]?.arbitration };
}

export async function reportTouchShock(senderId: string, inviteId: string, shockedAt: number) {
  await ensureMessagingReady();
  const cfg = await getTouchBumpConfig();
  const sql = await getSql();
  const invite = await loadInviteRow(inviteId);
  if (!invite) throw new WippHttpError(404, "not_found", "Invitation introuvable.");
  if (invite.sender.id !== senderId) throw new WippHttpError(403, "forbidden", "Pas ton partage.");
  if (invite.status !== "active") {
    throw new WippHttpError(409, "not_active", `Invitation ${invite.status}.`);
  }

  await sql`
    update wipp_touch_invites
    set shock_at = ${new Date(shockedAt).toISOString()},
        arbitration = ${"evaluating"}
    where id = ${inviteId}
  `;
  touchCalibLog(cfg, "shock", { inviteId, shockedAt });

  const arb = await runArbitration(inviteId, shockedAt);
  const fresh = await loadInviteRow(inviteId);
  return {
    invite: fresh,
    arbitration: arb.state,
    winnerId: arb.winnerId ?? null,
    message: arb.state === "ambiguous" ? "Recollez les téléphones." : undefined,
    log: arb.log,
  };
}

async function runArbitration(inviteId: string, shockAt: number) {
  const cfg = await getTouchBumpConfig();
  const sql = await getSql();
  const cands = await sql<{
    id: string;
    profile_id: string;
    median_rssi: number | null;
    rssi_samples: number[] | string;
    detected_at: string;
    shock_at: string | null;
    platform: string | null;
    foreground: boolean;
  }>`
    select id, profile_id, median_rssi, rssi_samples, detected_at::text,
           shock_at::text, platform, foreground
    from wipp_touch_candidates
    where invite_id = ${inviteId}
  `;

  type Scored = {
    profileId: string;
    median: number;
    detectedAt: number;
    platform: string;
    foreground: boolean;
    inWindow: boolean;
  };

  const scored: Scored[] = [];
  for (const c of cands) {
    let samples: number[] = [];
    if (Array.isArray(c.rssi_samples)) samples = c.rssi_samples as number[];
    else if (typeof c.rssi_samples === "string") {
      try {
        samples = JSON.parse(c.rssi_samples) as number[];
      } catch {
        samples = [];
      }
    }
    const med = c.median_rssi ?? median(samples);
    if (med == null) continue;
    const detectedAt = Date.parse(c.detected_at);
    const isIosBg = (c.platform || "").toLowerCase() === "ios" && !c.foreground;
    const before = cfg.windowBeforeMs;
    const after = isIosBg ? cfg.windowAfterIosBgMs : cfg.windowAfterMs;
    const inWindow = detectedAt >= shockAt - before && detectedAt <= shockAt + after;
    // Bonus: if B also reported a shock, require it near A's shock
    if (c.shock_at) {
      const bShock = Date.parse(c.shock_at);
      if (Math.abs(bShock - shockAt) > after) continue;
    }
    scored.push({
      profileId: c.profile_id,
      median: med,
      detectedAt,
      platform: c.platform || "unknown",
      foreground: c.foreground,
      inWindow,
    });
  }

  const eligible = scored
    .filter((s) => s.inWindow && s.median >= cfg.rssiMinDbm)
    .sort((a, b) => b.median - a.median);

  const log = {
    shockAt,
    cfg: {
      rssiMinDbm: cfg.rssiMinDbm,
      rssiGapDb: cfg.rssiGapDb,
      windowBeforeMs: cfg.windowBeforeMs,
      windowAfterMs: cfg.windowAfterMs,
    },
    candidates: scored,
    eligible: eligible.map((e) => ({ profileId: e.profileId, median: e.median })),
  };
  touchCalibLog(cfg, "arbitration", log);

  if (eligible.length === 0) {
    await sql`
      update wipp_touch_invites
      set arbitration = ${"no_match"}, arbitration_log = ${JSON.stringify(log)}::jsonb
      where id = ${inviteId}
    `;
    return { state: "no_match" as const, winnerId: null as string | null, log };
  }

  const best = eligible[0]!;
  const second = eligible[1];
  if (second && best.median - second.median < cfg.rssiGapDb) {
    await sql`
      update wipp_touch_invites
      set arbitration = ${"ambiguous"},
          matched_profile_id = null,
          arbitration_log = ${JSON.stringify(log)}::jsonb
      where id = ${inviteId}
    `;
    return { state: "ambiguous" as const, winnerId: null, log };
  }

  await sql`
    update wipp_touch_invites
    set arbitration = ${"matched"},
        matched_profile_id = ${best.profileId},
        arbitration_log = ${JSON.stringify(log)}::jsonb
    where id = ${inviteId}
  `;
  return { state: "matched" as const, winnerId: best.profileId, log };
}

/** B polls after detect — am I the winner? */
export async function getDetectStatus(profileId: string, code: string): Promise<DetectResult> {
  await ensureMessagingReady();
  const invite = await loadInviteRow(code);
  if (!invite || invite.status !== "active") {
    throw new WippHttpError(404, "not_found", "Invitation introuvable.");
  }
  const sql = await getSql();
  const row = await sql<{
    arbitration: string;
    matched_profile_id: string | null;
    shock_at: string | null;
  }>`
    select arbitration, matched_profile_id, shock_at::text
    from wipp_touch_invites where id = ${invite.id} limit 1
  `;
  const arb = row[0]?.arbitration || "waiting_shock";
  const matched = row[0]?.matched_profile_id;
  if (arb === "matched" && matched === profileId) {
    return { state: "winner", invite, arbitration: arb };
  }
  if (arb === "matched" && matched && matched !== profileId) {
    return { state: "rejected", arbitration: arb, message: "Un autre appareil a été sélectionné." };
  }
  if (arb === "ambiguous") {
    return { state: "ambiguous", arbitration: arb, message: "Recollez les téléphones." };
  }
  if (!row[0]?.shock_at) {
    return { state: "waiting_shock", arbitration: arb };
  }
  return { state: "queued", arbitration: arb };
}

/**
 * Sign-in code by Twilio Verify (WhatsApp first, SMS or voice call as fallback), for countries where
 * Firebase SMS do not arrive (Africa). Twilio makes and checks the code. Once it is right, the server
 * gives a Firebase custom token for the account linked to this phone number: the same WIPP account.
 * Secrets (server only): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID, FIREBASE_SERVICE_ACCOUNT.
 */
import { SignJWT, importPKCS8 } from "jose";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";

const TWILIO = {
  sid: process.env.TWILIO_ACCOUNT_SID || "",
  token: process.env.TWILIO_AUTH_TOKEN || "",
  service: process.env.TWILIO_VERIFY_SID || "",
};
/** Dial codes whose code comes from Twilio Verify (Africa by default). */
const PREFIXES = (process.env.OTP_PREFIXES ||
  "+225,+221,+223,+224,+226,+227,+228,+229,+237,+241,+242,+243,+235,+236,+240,+222,+220,+232,+231,+233,+234,+212,+213,+216,+250,+257,+254,+255,+256,+251,+27,+260,+263,+258,+261,+269,+230,+248,+238,+245,+239,+253,+252,+244,+264,+267,+266,+268,+265,+211,+249,+218,+20")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const LIMITS = { perPhone15min: 3, perPhoneDay: 8, perIpHour: 20 };

export type OtpChannel = "sms" | "whatsapp" | "voice";

export function otpConfig() {
  const enabled = Boolean(TWILIO.sid && TWILIO.token && TWILIO.service && process.env.FIREBASE_SERVICE_ACCOUNT);
  return { enabled, prefixes: enabled ? PREFIXES : [], whatsapp: enabled, voice: enabled };
}

function served(phone: string) {
  return PREFIXES.some((p) => phone.startsWith(p));
}

function normalize(raw: string) {
  const p = (raw || "").replace(/[\s().-]/g, "").replace(/^00/, "+");
  if (!/^\+[1-9]\d{6,14}$/.test(p)) throw new WippHttpError(400, "bad_phone", "Numéro de téléphone invalide.");
  return p;
}

async function ensureTable() {
  const sql = await getSql();
  await sql`create table if not exists wipp_otp_codes (
    id bigserial primary key,
    phone text not null,
    code_hash text,
    channel text not null,
    ip text,
    attempts int not null default 0,
    used_at timestamptz,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`;
  await sql`create index if not exists wipp_otp_codes_phone on wipp_otp_codes (phone, created_at desc)`;
  await sql`alter table wipp_otp_codes enable row level security`;
  return sql;
}

function twilioAuth() {
  return `Basic ${Buffer.from(`${TWILIO.sid}:${TWILIO.token}`).toString("base64")}`;
}

async function twilio(path: string, form: Record<string, string>) {
  const res = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO.service}/${path}`, {
    method: "POST",
    headers: { Authorization: twilioAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string; code?: number };
  return { ok: res.ok, status: res.status, json };
}

export async function sendOtp(input: { phone?: string; channel?: string; ip?: string | null }) {
  if (!otpConfig().enabled) throw new WippHttpError(503, "otp_unavailable", "Cette méthode n’est pas encore disponible.");
  const phone = normalize(input.phone ?? "");
  if (!served(phone)) throw new WippHttpError(400, "otp_country", "Utilise le code par SMS habituel pour ce pays.");
  // WhatsApp first (reaches African numbers best), SMS or a voice call when asked.
  const channel: OtpChannel = input.channel === "sms" ? "sms" : input.channel === "voice" ? "voice" : "whatsapp";
  const sql = await ensureTable();
  const counts = await sql<{ p15: number; pday: number; ip: number }>`
    select
      count(*) filter (where phone = ${phone} and created_at > now() - interval '15 minutes')::int as p15,
      count(*) filter (where phone = ${phone} and created_at > now() - interval '1 day')::int as pday,
      count(*) filter (where ip = ${input.ip ?? ""} and created_at > now() - interval '1 hour')::int as ip
    from wipp_otp_codes where created_at > now() - interval '1 day'`;
  const c = counts[0] ?? { p15: 0, pday: 0, ip: 0 };
  if (c.p15 >= LIMITS.perPhone15min || c.pday >= LIMITS.perPhoneDay || (input.ip && c.ip >= LIMITS.perIpHour)) {
    throw new WippHttpError(429, "otp_limit", "Trop de demandes de code. Réessaie dans quelques minutes.");
  }
  const r = await twilio("Verifications", { To: phone, Channel: channel === "voice" ? "call" : channel, Locale: "fr" });
  if (!r.ok) {
    console.warn("[otp] twilio send", r.status, r.json.code, r.json.message);
    throw new WippHttpError(502, "otp_send_failed", channel === "whatsapp" ? "Le code n’a pas pu être envoyé sur WhatsApp. Essaie par SMS." : "Le code n’a pas pu être envoyé. Réessaie ou choisis une autre méthode.");
  }
  await sql`insert into wipp_otp_codes (phone, channel, ip, expires_at)
    values (${phone}, ${channel}, ${input.ip ?? null}, ${new Date(Date.now() + 10 * 60_000).toISOString()})`;
  return { ok: true, channel };
}

type ServiceAccount = { client_email: string; private_key: string; project_id: string };
function serviceAccount(): ServiceAccount {
  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "") as ServiceAccount;
  } catch {
    throw new WippHttpError(503, "otp_unavailable", "Cette méthode n’est pas encore disponible.");
  }
}

let gToken: { value: string; exp: number } | null = null;
async function googleAccess(sa: ServiceAccount) {
  if (gToken && gToken.exp > Date.now() + 60_000) return gToken.value;
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new WippHttpError(502, "otp_auth_failed", "Connexion impossible pour le moment.");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  gToken = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return gToken.value;
}

/** Firebase account for this phone number: the existing one, or a new one (same as a first Firebase SMS sign-in). */
async function firebaseUidForPhone(sa: ServiceAccount, phone: string) {
  const access = await googleAccess(sa);
  const base = `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}`;
  const headers = { Authorization: `Bearer ${access}`, "Content-Type": "application/json" };
  const look = await fetch(`${base}/accounts:lookup`, { method: "POST", headers, body: JSON.stringify({ phoneNumber: [phone] }) });
  const found = (await look.json().catch(() => ({}))) as { users?: { localId: string }[] };
  if (found.users?.[0]?.localId) return found.users[0].localId;
  const made = await fetch(`${base}/accounts`, { method: "POST", headers, body: JSON.stringify({ phoneNumber: phone }) });
  const created = (await made.json().catch(() => ({}))) as { localId?: string };
  if (!created.localId) throw new WippHttpError(502, "otp_account_failed", "Connexion impossible pour le moment.");
  return created.localId;
}

async function customToken(sa: ServiceAccount, uid: string) {
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

export async function verifyOtp(input: { phone?: string; code?: string }) {
  if (!otpConfig().enabled) throw new WippHttpError(503, "otp_unavailable", "Cette méthode n’est pas encore disponible.");
  const phone = normalize(input.phone ?? "");
  const code = (input.code ?? "").replace(/\D/g, "");
  if (code.length < 4 || code.length > 10) throw new WippHttpError(400, "bad_code", "Code incorrect.");
  const r = await twilio("VerificationCheck", { To: phone, Code: code });
  if (r.status === 404) throw new WippHttpError(400, "code_expired", "Code expiré. Demande un nouveau code.");
  if (r.status === 429) throw new WippHttpError(429, "too_many_attempts", "Trop d’essais. Demande un nouveau code.");
  if (!r.ok || r.json.status !== "approved") throw new WippHttpError(400, "bad_code", "Code incorrect.");
  const sql = await ensureTable();
  await sql`update wipp_otp_codes set used_at = now() where id = (select id from wipp_otp_codes where phone = ${phone} and used_at is null order by created_at desc limit 1)`;
  const sa = serviceAccount();
  const uid = await firebaseUidForPhone(sa, phone);
  return { token: await customToken(sa, uid) };
}

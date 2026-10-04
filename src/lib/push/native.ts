/**
 * Direct call pushes, bypassing Expo:
 * - Android: FCM HTTP v1, high priority, data-only, so the app can show a full-screen ringing UI.
 * - iPhone: APNs VoIP (PushKit) so iOS wakes the app and shows the native CallKit screen.
 * Secrets come from Vercel env: FIREBASE_SERVICE_ACCOUNT, APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID.
 */
import { connect } from "node:http2";
import { SignJWT, importPKCS8 } from "jose";

const BUNDLE_ID = "com.wipp.app";

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

let fcmToken: { value: string; exp: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

async function fcmAccessToken(sa: ServiceAccount) {
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return fcmToken.value;
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
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
  if (!res.ok) throw new Error(`fcm_oauth_${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return fcmToken.value;
}

/** Returns tokens FCM says are dead. */
export async function sendFcmCall(tokens: string[], data: Record<string, string>) {
  const sa = serviceAccount();
  if (!sa || !tokens.length) return { sent: 0, invalid: [] as string[] };
  const access = await fcmAccessToken(sa);
  const invalid: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token, data, android: { priority: "HIGH", ttl: "30s" } } }),
      });
      if (res.ok) sent += 1;
      else if (res.status === 404 || res.status === 400) invalid.push(token);
    }),
  );
  return { sent, invalid };
}

let apnsJwt: { value: string; at: number } | null = null;

async function apnsAuth() {
  const p8 = process.env.APNS_KEY_P8;
  const kid = process.env.APNS_KEY_ID;
  const iss = process.env.APNS_TEAM_ID;
  if (!p8 || !kid || !iss) return null;
  // Apple wants the token refreshed at most every 20–60 minutes.
  if (apnsJwt && Date.now() - apnsJwt.at < 40 * 60_000) return apnsJwt.value;
  const key = await importPKCS8(p8.replace(/\\n/g, "\n").trim(), "ES256");
  const value = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid }).setIssuer(iss).setIssuedAt().sign(key);
  apnsJwt = { value, at: Date.now() };
  return value;
}

function apnsPost(host: string, token: string, jwt: string, body: string) {
  return new Promise<number>((resolve) => {
    const client = connect(`https://${host}`);
    client.on("error", () => resolve(0));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": `${BUNDLE_ID}.voip`,
      "apns-push-type": "voip",
      "apns-priority": "10",
      "apns-expiration": "0",
      "content-type": "application/json",
    });
    let status = 0;
    req.on("response", (h) => {
      status = Number(h[":status"]) || 0;
    });
    req.on("data", () => undefined);
    req.on("end", () => {
      client.close();
      resolve(status);
    });
    req.on("error", () => {
      client.close();
      resolve(0);
    });
    req.end(body);
  });
}

/** VoIP push; tries production then sandbox (TestFlight/App Store vs Xcode builds). */
export async function sendVoipCall(tokens: string[], payload: Record<string, unknown>) {
  const jwt = await apnsAuth();
  if (!jwt || !tokens.length) return { sent: 0, invalid: [] as string[] };
  const body = JSON.stringify(payload);
  const invalid: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      let status = await apnsPost("api.push.apple.com", token, jwt, body);
      if (status === 400 || status === 410) status = await apnsPost("api.sandbox.push.apple.com", token, jwt, body);
      if (status === 200) sent += 1;
      else if (status === 410) invalid.push(token);
    }),
  );
  return { sent, invalid };
}

/** Visible APNs notification (messages, requests). Custom data goes under "body" for expo-notifications. */
export async function sendApnsAlert(
  tokens: string[],
  msg: { title: string; body: string; data: Record<string, unknown>; collapseId?: string; sound?: boolean },
) {
  const jwt = await apnsAuth();
  if (!jwt || !tokens.length) return { sent: 0, invalid: [] as string[] };
  const payload = JSON.stringify({
    aps: { alert: { title: msg.title, body: msg.body }, sound: msg.sound === false ? undefined : "default", "mutable-content": 1 },
    body: msg.data,
    ...msg.data,
  });
  const invalid: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      let status = await apnsAlertPost("api.push.apple.com", token, jwt, payload, msg.collapseId);
      if (status === 400 || status === 410) status = await apnsAlertPost("api.sandbox.push.apple.com", token, jwt, payload, msg.collapseId);
      if (status === 200) sent += 1;
      else if (status === 410) invalid.push(token);
    }),
  );
  return { sent, invalid };
}

function apnsAlertPost(host: string, token: string, jwt: string, body: string, collapseId?: string) {
  return new Promise<number>((resolve) => {
    const client = connect(`https://${host}`);
    client.on("error", () => resolve(0));
    const headers: Record<string, string> = {
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    };
    if (collapseId) headers["apns-collapse-id"] = collapseId.slice(0, 64);
    const req = client.request(headers);
    let status = 0;
    req.on("response", (h) => {
      status = Number(h[":status"]) || 0;
    });
    req.on("data", () => undefined);
    req.on("end", () => {
      client.close();
      resolve(status);
    });
    req.on("error", () => {
      client.close();
      resolve(0);
    });
    req.end(body);
  });
}

/** Visible FCM notification on Android (messages, requests), on the given channel. */
export async function sendFcmAlert(
  tokens: string[],
  msg: { title: string; body: string; data: Record<string, unknown>; channelId: string; collapseId?: string },
) {
  const sa = serviceAccount();
  if (!sa || !tokens.length) return { sent: 0, invalid: [] as string[] };
  const access = await fcmAccessToken(sa);
  const data: Record<string, string> = { body: JSON.stringify(msg.data) };
  for (const [k, v] of Object.entries(msg.data)) if (k !== "body") data[k] = String(v ?? "");
  const invalid: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: msg.title, body: msg.body },
            data,
            android: {
              priority: "HIGH",
              notification: { channel_id: msg.channelId, sound: "default", tag: msg.collapseId?.slice(0, 64) },
            },
          },
        }),
      });
      if (res.ok) sent += 1;
      else if (res.status === 404 || res.status === 400) invalid.push(token);
    }),
  );
  return { sent, invalid };
}

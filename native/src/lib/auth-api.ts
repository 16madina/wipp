import { WIPP_WEB_ORIGIN } from "./firebase-config";
import { firebaseIdToken } from "./firebase-phone";

export type LinkedProfile = {
  id: string;
  username: string;
  displayName: string;
  phone: string;
};

export type AuthSession = { ok: true; profile: LinkedProfile };
export type AuthFail = { ok: false; error: string; noAccount?: true };
export type AuthResult = AuthSession | AuthFail;

export async function usernameAvailable(username: string): Promise<boolean> {
  const url = `${WIPP_WEB_ORIGIN}/api/wipp/auth/username?u=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as { available?: boolean; message?: string };
  if (!res.ok) throw new Error(data.message || "username_check_failed");
  return Boolean(data.available);
}

async function linkProfile(body: Record<string, unknown>): Promise<AuthResult> {
  let idToken: string | null = null;
  try {
    idToken = await firebaseIdToken();
  } catch {
    return { ok: false, error: "Réseau indisponible. Ta session téléphone reste ouverte." };
  }
  if (!idToken) return { ok: false, error: "Aucune session téléphone sur cet appareil." };
  const res = await fetch(`${WIPP_WEB_ORIGIN}/api/wipp/auth/profile`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    noAccount?: boolean;
    error?: string;
    message?: string;
    profile?: LinkedProfile;
  };
  if (data.noAccount) {
    return { ok: false, error: data.message || "Aucun compte pour ce numéro.", noAccount: true };
  }
  if (!res.ok || data.ok === false || !data.profile?.id) {
    return { ok: false, error: data.message || "Connexion impossible." };
  }
  return { ok: true, profile: data.profile };
}

export async function signupPhone(input: {
  firstName: string;
  lastName: string;
  username: string;
  country: string;
  avatar?: string;
}): Promise<AuthResult> {
  return linkProfile({
    mode: "signup",
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName,
  });
}

export async function signinOtp(): Promise<AuthResult> {
  try {
    return await linkProfile({ mode: "signin" });
  } catch {
    return { ok: false, error: "Connexion impossible." };
  }
}

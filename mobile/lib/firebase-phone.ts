import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import { apiBase, persistSessionFromServer } from './api';

export type PhoneConfirmation = FirebaseAuthTypes.ConfirmationResult;

/** Native only — Phone Auth needs a dev/production build (pas Expo Go). */
export function firebasePhoneSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function sendPhoneCode(e164: string): Promise<PhoneConfirmation> {
  const normalized = e164.trim().replace(/\s+/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Numéro invalide. Format international : +225… / +33…');
  }
  return auth().signInWithPhoneNumber(normalized);
}

export async function confirmPhoneCode(
  confirmation: PhoneConfirmation,
  code: string,
) {
  const credential = await confirmation.confirm(code.trim());
  const user = credential?.user ?? auth().currentUser;
  if (!user) throw new Error('Confirmation Firebase échouée.');
  const idToken = await user.getIdToken(true);
  return exchangeFirebaseToken(idToken);
}

export async function exchangeFirebaseToken(idToken: string) {
  const res = await fetch(`${apiBase()}/api/wipp/auth/firebase`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    profile?: { id: string; username: string; displayName: string; avatarUrl?: string | null; bio?: string };
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.token || !data.profile) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  await persistSessionFromServer({ token: data.token, profile: data.profile });
  return data.profile;
}

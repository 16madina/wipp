/**
 * Session Wipp persistante (style WhatsApp).
 * Token + profil dans SecureStore → survit aux redémarrages de l’app.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WippProfile } from './api';

const TOKEN_KEY = 'wipp-server-token';
const PROFILE_KEY = 'wipp-server-profile';

export async function getStoredToken(): Promise<string | null> {
  try {
    const secure = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secure) return secure;
  } catch {
    /* fallback */
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredProfile(): Promise<WippProfile | null> {
  try {
    const secure = await SecureStore.getItemAsync(PROFILE_KEY);
    if (secure) {
      return JSON.parse(secure) as WippProfile;
    }
  } catch {
    /* fallback */
  }
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WippProfile;
  } catch {
    return null;
  }
}

export async function persistSession(session: {
  token: string;
  profile: WippProfile;
} | null) {
  if (!session) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(PROFILE_KEY);
    } catch {
      /* ignore */
    }
    await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
    return;
  }
  const profileJson = JSON.stringify(session.profile);
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    await SecureStore.setItemAsync(PROFILE_KEY, profileJson);
  } catch {
    /* SecureStore unavailable (web) — AsyncStorage only */
  }
  await AsyncStorage.setItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem(PROFILE_KEY, profileJson);
}

export async function clearSession() {
  await persistSession(null);
}

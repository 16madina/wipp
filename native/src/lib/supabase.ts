import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./firebase-config";
import { firebaseIdToken } from "./firebase-phone";

/**
 * Supabase receives the Firebase ID token. It does not keep a Supabase Auth session.
 * Firebase refreshes that token inside firebaseIdToken().
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: async () => firebaseIdToken(),
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

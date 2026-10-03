import type { LinkedProfile } from "./auth-api";
import { currentFirebaseUser } from "./firebase-phone";
import { writeLinkedSession } from "./firebase-linked-session";
import { useWippStore } from "./store";

/** Local shell after the server linked the Firebase uid. No Supabase Auth session. */
export function enterLinkedProfile(profile: LinkedProfile, phone: string) {
  const uid = currentFirebaseUser()?.uid;
  if (uid && profile.id && profile.username) {
    void writeLinkedSession(uid, { ...profile, phone: profile.phone || phone });
  }
  const displayName = profile.displayName || "";
  const [firstName, ...rest] = displayName.split(" ");
  if (profile.username) {
    useWippStore.setState({
      serverUsername: profile.username,
      serverProfileId: profile.id,
    });
  }
  useWippStore.getState().completeSetup(
    {
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      displayName,
      ...(profile.username ? { username: profile.username } : {}),
      phone: profile.phone || phone,
    },
    true,
  );
}

/** Reopen an already authenticated Firebase user. Does not create a profile and does not reseed the inbox. */
export function restoreFirebaseSession(profile: LinkedProfile | null, phone: string) {
  if (!profile?.username) {
    useWippStore.setState({ onboarded: true, stack: [{ name: "chats" }] });
    return;
  }
  const displayName = profile.displayName || phone || "";
  const [firstName, ...rest] = displayName.split(" ");
  useWippStore.setState((s) => ({
    onboarded: true,
    stack: [{ name: "chats" }],
    serverUsername: profile.username,
    serverProfileId: profile.id,
    me: {
      ...s.me,
      firstName: firstName || s.me.firstName,
      lastName: rest.join(" ") || s.me.lastName,
      displayName: displayName || s.me.displayName,
      username: profile.username,
      phone: profile.phone || phone || s.me.phone,
      online: true,
    },
  }));
}

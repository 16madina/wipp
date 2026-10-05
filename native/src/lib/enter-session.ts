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
    // Fresh sign-in: never show the previous account's photo while ours loads.
    useWippStore.setState((s) => ({
      serverUsername: profile.username,
      serverProfileId: profile.id,
      me: { ...s.me, avatar: "" },
    }));
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

/**
 * Server confirmed the SAME account at launch: refresh names/username only. Unlike
 * enterLinkedProfile it never empties the inbox nor the photo already on screen.
 */
export function refreshLinkedProfile(profile: LinkedProfile, phone: string) {
  const st = useWippStore.getState();
  if (!profile.id || (st.serverProfileId && st.serverProfileId !== profile.id)) {
    enterLinkedProfile(profile, phone);
    return;
  }
  const uid = currentFirebaseUser()?.uid;
  if (uid && profile.username) void writeLinkedSession(uid, { ...profile, phone: profile.phone || phone });
  const displayName = profile.displayName || st.me.displayName;
  const [firstName, ...rest] = displayName.split(" ");
  useWippStore.setState((s) => ({
    serverProfileId: profile.id,
    serverUsername: profile.username || s.serverUsername,
    me: {
      ...s.me,
      displayName,
      firstName: firstName || s.me.firstName,
      lastName: rest.join(" ") || s.me.lastName,
      username: profile.username || s.me.username,
      phone: profile.phone || phone || s.me.phone,
    },
  }));
}

/** Reopen an already authenticated Firebase user. Does not create a profile and does not reseed the inbox. */
export function restoreFirebaseSession(profile: LinkedProfile | null, phone: string) {
  // Show my last known inbox right away (encrypted local snapshot), then the server refreshes it.
  if (profile?.id) {
    const pid = profile.id;
    void import("./inbox-cache").then(async ({ loadInboxSnapshot }) => {
      const snap = await loadInboxSnapshot(pid);
      const st = useWippStore.getState();
      if (!snap || st.serverProfileId !== pid || st.serverConnected) return;
      useWippStore.setState((s) => ({
        chats: snap.chats,
        messages: { ...snap.messages },
        users: { ...s.users, ...snap.users, me: { ...s.users.me, ...snap.users.me } },
        me: { ...s.me, avatar: s.me.avatar || snap.meAvatar },
      }));
    });
  }
  // Show my last known photo right away (the server copy replaces it a moment later).
  if (profile?.id) {
    const id = profile.id;
    void import("./media-url-cache").then(async ({ myCachedAvatar }) => {
      const avatar = await myCachedAvatar(id);
      if (avatar && useWippStore.getState().serverProfileId === id && !useWippStore.getState().me.avatar) {
        useWippStore.setState((s) => ({ me: { ...s.me, avatar } }));
      }
    });
  }
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
      // Another account was last used on this phone: drop its photo.
      avatar: s.serverProfileId && s.serverProfileId !== profile.id ? "" : s.me.avatar,
      firstName: firstName || s.me.firstName,
      lastName: rest.join(" ") || s.me.lastName,
      displayName: displayName || s.me.displayName,
      username: profile.username,
      phone: profile.phone || phone || s.me.phone,
      online: true,
    },
  }));
}

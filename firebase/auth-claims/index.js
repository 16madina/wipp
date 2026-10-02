/**
 * Deployed only as assignAuthenticatedRole on Firebase project wipp-61124.
 * Assigns the custom claim Supabase Third-Party Auth requires:
 * { role: "authenticated" }.
 *
 * This project path does not assume Identity Platform. Blocking auth functions
 * need Identity Platform. The supported path without it is:
 * - auth.user().onCreate for every new Firebase user
 * - one admin backfill for users created before the function existed
 *
 * Credentials stay in the Firebase/Google environment. This file does not
 * contain a service account. Do not call it from the mobile app.
 *
 * After a claim is written, the device must call getIdToken(true). The first
 * token issued at sign-up can still miss the claim, because onCreate is not
 * synchronous.
 */
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");
const functions = require("firebase-functions/v1");

initializeApp();

const CLAIM = { role: "authenticated" };

exports.assignAuthenticatedRole = functions.auth.user().onCreate(async (user) => {
  const existing = (await getAuth().getUser(user.uid)).customClaims ?? {};
  if (existing.role === "authenticated") return;
  await getAuth().setCustomUserClaims(user.uid, { ...existing, ...CLAIM });
});

/** One-time. Run with Admin credentials from a trusted machine, not from the app. */
async function backfillAuthenticatedRole() {
  const auth = getAuth();
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const claims = user.customClaims ?? {};
      if (claims.role === "authenticated") continue;
      await auth.setCustomUserClaims(user.uid, { ...claims, ...CLAIM });
    }
    pageToken = page.pageToken;
  } while (pageToken);
}

module.exports.backfillAuthenticatedRole = backfillAuthenticatedRole;

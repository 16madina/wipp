import { callServerFn } from "./server-fn";

/** IDs TanStack Start = sha256("src/lib/auth.functions.ts--<export>_createServerFn_handler") */
const FN = {
  usernameAvailable: "de5eecf4f451526b9b96a4b519047c9172b58d1f5cd236998976a27f603ed62e",
  signupPhone: "001b7e8e8fef650d1f899415330fd44254630c6b4520ff363aecb8de442bc4f2",
  signinOtp: "59a34ffe4a3490393de643be723690b17f99ec84e49ed24df799e97e2b148870",
} as const;

export type AuthSession = { ok: true; accessToken: string; refreshToken: string };
export type AuthFail = { ok: false; error: string; noAccount?: true };
export type AuthResult = AuthSession | AuthFail;

export async function usernameAvailable(username: string): Promise<boolean> {
  return callServerFn<boolean>(FN.usernameAvailable, { username });
}

export async function signupPhone(input: {
  idToken: string;
  firstName: string;
  lastName: string;
  username: string;
  country: string;
  avatar?: string;
}): Promise<AuthResult> {
  return callServerFn<AuthResult>(FN.signupPhone, input);
}

export async function signinOtp(
  input: { idToken: string } | { phone: string; code: string },
): Promise<AuthResult> {
  return callServerFn<AuthResult>(FN.signinOtp, input);
}

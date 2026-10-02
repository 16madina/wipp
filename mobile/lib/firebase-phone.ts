/**
 * Ancien chemin Firebase Phone. L'identité WIPP est l'OTP téléphone Supabase
 * dans l'application native. Ces fonctions ne contactent plus Firebase.
 */
export type PhoneConfirmation = { disabled: true };

export function firebasePhoneSupported() {
  return false;
}

export async function sendPhoneCode(_e164: string): Promise<PhoneConfirmation> {
  throw new Error("La connexion téléphone se fait par le code SMS Supabase dans l'application WIPP.");
}

export async function confirmPhoneCode(_confirmation: PhoneConfirmation, _code: string): Promise<never> {
  throw new Error("La connexion téléphone se fait par le code SMS Supabase dans l'application WIPP.");
}

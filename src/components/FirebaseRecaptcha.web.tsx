type Props = {
  onVerify: (token: string) => void;
  onLoad?: () => void;
  onError?: () => void;
  onFullChallenge?: () => void;
  [key: string]: unknown;
};

/** reCAPTCHA invisible via WebView n’existe pas sur le web : pas de bandeau d’erreur. */
export function FirebaseRecaptcha({ onLoad }: Props) {
  if (typeof onLoad === "function") queueMicrotask(onLoad);
  return null;
}

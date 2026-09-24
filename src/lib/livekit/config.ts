/** LiveKit Cloud / self-hosted env (server + optional public URL). */

export type LiveKitPublicConfig = {
  configured: boolean;
  url: string | null;
};

export function liveKitEnv() {
  const url =
    process.env.LIVEKIT_URL?.trim() ||
    process.env.VITE_LIVEKIT_URL?.trim() ||
    "";
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";
  return {
    url: url || null,
    apiKey: apiKey || null,
    apiSecret: apiSecret || null,
    configured: Boolean(url && apiKey && apiSecret),
  };
}

export function liveKitPublicConfig(): LiveKitPublicConfig {
  const { url, configured } = liveKitEnv();
  return { configured, url: configured ? url : null };
}

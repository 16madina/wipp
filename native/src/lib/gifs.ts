const KEY = "wipp-gifs-v1";
const MAX_ITEMS = 24;

export type LocalGif = { id: string; url: string; addedAt: number };

let mem: LocalGif[] = [];

export function loadGifs(): LocalGif[] {
  return [...mem];
}

export function addLocalGif(url: string): LocalGif {
  const gif: LocalGif = { id: `gif-${Date.now()}`, url, addedAt: Date.now() };
  mem = [gif, ...mem].slice(0, MAX_ITEMS);
  void KEY;
  return gif;
}

export const GIF_INTEGRATION_PENDING = "GIF PROVIDER CREDENTIAL = EXTERNAL BLOCKER";

const GIF_KEY = process.env.EXPO_PUBLIC_GIF_API_KEY?.trim() ?? "";

export function gifProviderConfigured() {
  return GIF_KEY.length > 8;
}

/** Tenor search when EXPO_PUBLIC_GIF_API_KEY is set. No key is shipped in the app. */
export async function searchGifs(query: string): Promise<LocalGif[]> {
  if (!gifProviderConfigured()) return [];
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&limit=16&key=${encodeURIComponent(GIF_KEY)}&client_key=wipp`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("gif_provider");
  const json = (await res.json()) as {
    results?: { id: string; media_formats?: { gif?: { url?: string }; tinygif?: { url?: string } } }[];
  };
  return (json.results ?? [])
    .map((row) => ({
      id: row.id,
      url: row.media_formats?.tinygif?.url || row.media_formats?.gif?.url || "",
      addedAt: Date.now(),
    }))
    .filter((row) => row.url.startsWith("https://"));
}

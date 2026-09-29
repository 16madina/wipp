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

export const GIF_INTEGRATION_PENDING = "GIF — INTEGRATION PENDING";

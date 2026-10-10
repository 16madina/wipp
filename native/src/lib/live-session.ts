/**
 * The live I am in right now. The room stays connected while this is set, whatever screen is shown:
 * full screen when the top screen is that live, a small floating window otherwise (« Réduire »).
 */
import { create } from "zustand";

type LiveSession = { eventId: string | null; open: (eventId: string) => void; clear: () => void };

export const useLiveSession = create<LiveSession>((set) => ({
  eventId: null,
  open: (eventId) => set({ eventId }),
  clear: () => set({ eventId: null }),
}));

-- A character is made either for Wippmoji stickers or for WippPop full-screen animations (cartoon, on black).
ALTER TABLE public.wippmoji_avatars ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'moji';

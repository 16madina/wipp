import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Pause, Play, Search, Volume2, VolumeX, X } from "lucide-react";
import { Btn, Chip, Header, StatusBar } from "@/components/ui";
import { MUSIC_MOODS, STORY_MUSIC, type MusicMood, type StoryMusic } from "@/lib/story-music";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

const MOOD_KEY: Record<MusicMood, "storyMusicTrending" | "storyMusicChill" | "storyMusicParty" | "storyMusicAfro" | "storyMusicLofi" | "storyMusicRnb"> = {
  trending: "storyMusicTrending",
  chill: "storyMusicChill",
  party: "storyMusicParty",
  afro: "storyMusicAfro",
  lofi: "storyMusicLofi",
  rnb: "storyMusicRnb",
};

export function useStoryAudio(
  src: string | undefined,
  opts: { paused?: boolean; muted?: boolean; loop?: boolean } = {},
) {
  const { paused = false, muted = false, loop = false } = opts;
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.preload = "auto";
    a.loop = loop;
    ref.current = a;
    return () => {
      a.pause();
      a.src = "";
      ref.current = null;
    };
  }, [src, loop]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.muted = muted;
    if (paused) {
      a.pause();
      return;
    }
    void a.play().catch(() => {});
  }, [paused, muted, src]);
}

export function StoryMusicChip({
  track,
  playing,
  muted,
  onToggleMute,
  onRemove,
}: {
  track: StoryMusic;
  playing?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onRemove?: () => void;
}) {
  const t = useT();
  return (
    <div className="flex max-w-[240px] items-center gap-2 rounded-full bg-ink/55 py-1.5 pr-1.5 pl-1.5 glass">
      <span
        className={cn("story-vinyl shrink-0", playing && !muted && "is-spinning")}
        style={{ background: track.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold leading-tight">{track.title}</p>
        <p className="truncate text-[11px] text-paper/70">{track.artist}</p>
      </div>
      {onToggleMute ? (
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          onClick={onToggleMute}
          aria-label={muted ? t("storyMusic") : t("storyRemoveMusic")}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          onClick={onRemove}
          aria-label={t("storyRemoveMusic")}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function StoryMusicButton({
  track,
  onClick,
}: {
  track: StoryMusic | null;
  onClick: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 flex h-11 w-full items-center gap-2 rounded-full bg-paper/10 px-3 text-left text-paper"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg">
        <Music className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">
          {track ? track.title : t("storyAddMusic")}
        </span>
        {track ? (
          <span className="block truncate text-[11px] text-paper/70">
            {track.artist} · {t("storyChangeMusic")}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function StoryMusicPicker({
  selectedId,
  onPick,
  onClose,
}: {
  selectedId?: string;
  onPick: (track: StoryMusic) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const [mood, setMood] = useState<MusicMood | "all">("all");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const tracks = useMemo(() => {
    const query = q.trim().toLowerCase();
    return STORY_MUSIC.filter((track) => {
      if (mood !== "all" && track.mood !== mood) return false;
      if (!query) return true;
      return `${track.title} ${track.artist}`.toLowerCase().includes(query);
    });
  }, [q, mood]);

  const preview = STORY_MUSIC.find((x) => x.id === previewId);
  useStoryAudio(preview?.src, { paused: !preview, loop: true });

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-navy text-paper">
      <StatusBar />
      <Header title={t("storyMusic")} onBack={onClose} />
      <div className="px-4 pb-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            className="h-11 w-full rounded-lg bg-paper/8 pr-3 pl-10 text-[15px] text-paper outline-none placeholder:text-paper/40"
            placeholder={t("storyMusicSearch")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
        <Chip active={mood === "all"} onClick={() => setMood("all")}>
          {t("storyMusicForYou")}
        </Chip>
        {MUSIC_MOODS.map((m) => (
          <Chip key={m} active={mood === m} onClick={() => setMood(m)}>
            {t(MOOD_KEY[m])}
          </Chip>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-2 pb-8">
        {tracks.length === 0 ? (
          <p className="px-4 pt-8 text-center text-[14px] text-paper/70">{t("storyNoMusic")}</p>
        ) : (
          tracks.map((track) => {
            const playing = previewId === track.id;
            const selected = selectedId === track.id;
            return (
              <div key={track.id} className="flex items-center gap-1 px-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
                  onClick={() => onPick(track)}
                >
                  <span
                    className={cn("story-vinyl shrink-0", playing && "is-spinning")}
                    style={{ background: track.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{track.title}</span>
                    <span className="block truncate text-[12px] text-paper/60">{track.artist}</span>
                  </span>
                  {selected ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">
                      OK
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="flex size-11 shrink-0 items-center justify-center"
                  onClick={() => setPreviewId((id) => (id === track.id ? null : track.id))}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
                </button>
              </div>
            );
          })
        )}
      </div>
      {preview ? (
        <div className="p-4 pb-8">
          <Btn className="w-full" onClick={() => onPick(preview)}>
            {t("storyAddMusic")}
          </Btn>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Flag, Volume2, VolumeX, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SmartImg } from "@/components/smart-img";
import { StoryMediaGrid, type StoryMediaPick } from "@/components/gallery";
import { ReportSheet } from "@/components/safety";
import { StoryMusicButton, StoryMusicChip, StoryMusicPicker, useStoryAudio } from "@/components/story-music";
import { Btn, Chip, Header, StatusBar } from "@/components/ui";
import { formatRelativeShort, formatRemain } from "@/lib/format";
import { useT, useWgoStore } from "@/lib/store";
import { storyViewMs } from "@/lib/story-music";
import type { StoryMusic } from "@/lib/story-music";
import { isStoryLive, STORY_TTL_24H, STORY_TTL_48H, STORY_VIDEO_MAX_MS, storyTtlMs } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StoriesScreen({ userId }: { userId: string }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const allStories = useWgoStore((s) => s.stories);
  const users = useWgoStore((s) => s.users);
  const me = useWgoStore((s) => s.me);
  const viewStory = useWgoStore((s) => s.viewStory);
  const pop = useWgoStore((s) => s.pop);
  const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
  const [i, setI] = useState(0);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [muted, setMuted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stories = useMemo(
    () =>
      allStories
        .filter((s) => s.userId === userId && isStoryLive(s, now))
        .sort((a, b) => a.createdAt - b.createdAt),
    [allStories, userId, now],
  );
  const item = stories[i];
  const user = userId === "me" ? me : users[userId];
  const mine = userId === "me";

  useEffect(() => {
    viewStory(userId);
  }, [userId, viewStory]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (i > stories.length - 1) setI(Math.max(0, stories.length - 1));
  }, [i, stories.length]);

  useEffect(() => {
    if (!item || viewsOpen || reportOpen) return;
    const id = window.setTimeout(() => {
      if (i < stories.length - 1) setI((n) => n + 1);
      else pop();
    }, storyViewMs(item));
    return () => window.clearTimeout(id);
  }, [i, item, stories.length, pop, viewsOpen, reportOpen]);

  useStoryAudio(item?.music?.src, { paused: !item?.music || viewsOpen || reportOpen, muted, loop: true });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted || Boolean(item?.music);
    if (viewsOpen) {
      video.pause();
      return;
    }
    void video.play().catch(() => {});
  }, [item, viewsOpen, muted, i]);

  if (!item || !user) {
    return (
      <div className="flex h-full flex-col bg-navy text-paper">
        <StatusBar />
        <Header title={t("stories")} onBack={pop} />
        <p className="px-6 pt-8 text-center text-[14px] text-paper/70">{t("storyExpired")}</p>
      </div>
    );
  }

  const left = formatRemain(item.createdAt + storyTtlMs(item), now);
  const viewers = item.viewers ?? [];

  return (
    <div className="relative flex h-full flex-col bg-ink text-paper">
      {item.type === "video" && item.videoUrl ? (
        <video
          ref={videoRef}
          src={item.videoUrl}
          poster={item.imageUrl}
          className="pointer-events-none absolute inset-0 size-full object-cover"
          playsInline
          autoPlay
          muted={muted || Boolean(item.music)}
        />
      ) : item.type === "image" && item.imageUrl ? (
        <SmartImg src={item.imageUrl} alt="" priority className="absolute inset-0 size-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center px-8 text-center"
          style={{ background: item.bg ?? "#0B1220" }}
        >
          <p className="text-[28px] font-semibold leading-snug">{item.text}</p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink/50" />
      <div className="relative flex h-full flex-col">
        <StatusBar />
        <div className="flex gap-1 px-3">
          {stories.map((s, idx) => (
            <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <span
                className={cn(
                  "story-bar-fill block h-full w-full origin-left bg-accent",
                  idx > i && "w-0",
                  (idx !== i || viewsOpen || reportOpen) && "![animation:none]",
                )}
                style={
                  idx === i && !viewsOpen && !reportOpen
                    ? { animationDuration: `${storyViewMs(item) / 1000}s` }
                    : { width: idx < i ? "100%" : "0%" }
                }
              />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 pt-3">
          <Avatar user={user} size={36} />
          <div className="flex-1">
            <p className="text-[14px] font-medium">{user.displayName}</p>
            <p className="text-[11px] text-paper/70">
              {formatRelativeShort(item.createdAt, lang)} · {left} {t("storyLeft")}
            </p>
          </div>
          {!mine ? (
            <button
              type="button"
              className="flex size-11 items-center justify-center"
              onClick={() => setReportOpen(true)}
              aria-label={t("report")}
            >
              <Flag className="size-5" />
            </button>
          ) : null}
          <button type="button" className="flex size-11 items-center justify-center" onClick={pop} aria-label={t("back")}>
            <X className="size-5" />
          </button>
        </div>
        {item.type === "video" && !item.music ? (
          <div className="relative z-20 px-3 pt-3">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-full bg-ink/45"
              onClick={() => setMuted((m) => !m)}
              aria-label={t("addVideoStory")}
            >
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          </div>
        ) : null}
        {item.kind === "profile" ? (
          <p className="px-4 pt-2 text-[13px] font-medium text-paper/90">{t("newPhotoStory")}</p>
        ) : null}
        {item.music ? (
          <div className="relative z-20 px-3 pt-3">
            <StoryMusicChip
              track={item.music}
              playing={!viewsOpen}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          </div>
        ) : null}
        <button
          type="button"
          className="absolute top-20 bottom-28 left-0 z-10 w-1/3"
          aria-label={t("back")}
          onClick={() => (i === 0 ? pop() : setI((n) => n - 1))}
        />
        <button
          type="button"
          className="absolute top-20 bottom-28 right-0 z-10 w-1/3"
          aria-label={t("next")}
          onClick={() => (i < stories.length - 1 ? setI((n) => n + 1) : pop())}
        />
        {mine ? (
          <div className="relative z-20 mt-auto p-4 pb-8">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/10 text-[14px] font-medium glass"
              onClick={() => setViewsOpen(true)}
            >
              <Eye className="size-4" />
              {viewers.length
                ? `${t("viewedBy")} ${viewers.length}`
                : t("noViews")}
            </button>
          </div>
        ) : (
          <div className="relative z-20 mt-auto p-4 pb-8">
            <button
              type="button"
              className="h-12 w-full rounded-full bg-white/10 text-[14px] glass"
              onClick={() => openOrCreateDm(userId)}
            >
              {t("storyReply")}
            </button>
          </div>
        )}
      </div>

      {viewsOpen ? (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label={t("back")}
            onClick={() => setViewsOpen(false)}
          />
          <div className="glass-strong relative max-h-[62vh] rounded-t-2xl px-4 pt-3 pb-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted/40" />
            <h2 className="mb-3 text-center text-[15px] font-semibold">
              {t("views")} · {viewers.length}
            </h2>
            <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
              {viewers.length === 0 ? (
                <p className="px-2 py-6 text-center text-[14px] text-muted">{t("noViews")}</p>
              ) : (
                viewers
                  .slice()
                  .sort((a, b) => b.at - a.at)
                  .map((v) => {
                    const u = v.userId === "me" ? me : users[v.userId];
                    return (
                      <div key={v.userId + v.at} className="flex items-center gap-3 py-2.5">
                        <Avatar user={u} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{u?.displayName ?? v.userId}</p>
                          <p className="text-[12px] text-muted">{formatRelativeShort(v.at, lang)}</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      ) : null}
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="story"
        targetId={item.id}
        blockUserId={mine ? undefined : userId}
        onSubmitted={pop}
      />
    </div>
  );
}

export function NewStoryScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const addStory = useWgoStore((s) => s.addStory);
  const [mode, setMode] = useState<"photo" | "video" | "text">("photo");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<StoryMediaPick | null>(null);
  const [ttlMs, setTtlMs] = useState(STORY_TTL_24H);
  const [music, setMusic] = useState<StoryMusic | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const bgs = ["#0B1220", "#151c2c", "#1a2a4a", "#3b2a12"];
  const [bg, setBg] = useState(bgs[0]);

  useStoryAudio(music?.src, { paused: !music || musicOpen, loop: true });

  const picker = musicOpen ? (
    <StoryMusicPicker
      selectedId={music?.id}
      onPick={(track) => {
        setMusic(track);
        setMusicOpen(false);
      }}
      onClose={() => setMusicOpen(false)}
    />
  ) : null;

  if (draft) {
    return (
      <div className="relative flex h-full flex-col bg-ink text-paper">
        {draft.type === "video" ? (
          <video
            src={draft.url}
            className="absolute inset-0 size-full object-cover"
            autoPlay
            loop
            playsInline
            muted={Boolean(music)}
          />
        ) : (
          <SmartImg src={draft.url} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/50" />
        <div className="relative flex h-full flex-col">
          <StatusBar />
          <Header title={t("addStory")} onBack={() => setDraft(null)} />
          {music ? (
            <div className="px-4 pt-2">
              <StoryMusicChip track={music} playing onRemove={() => setMusic(null)} />
            </div>
          ) : null}
          <div className="mt-auto p-4 pb-8">
            {draft.type === "video" ? (
              <p className="mb-3 text-center text-[12px] text-paper/70">
                {t("storyVideoMax")}
              </p>
            ) : null}
            <StoryMusicButton track={music} onClick={() => setMusicOpen(true)} />
            <StoryTtlPicker value={ttlMs} onChange={setTtlMs} />
            <Btn
              className="w-full"
              onClick={() => {
                if (draft.type === "video") {
                  addStory({
                    type: "video",
                    videoUrl: draft.url,
                    durationMs: Math.min(draft.durationMs, STORY_VIDEO_MAX_MS),
                    ttlMs,
                    music: music ?? undefined,
                  });
                } else {
                  addStory({ type: "image", imageUrl: draft.url, ttlMs, music: music ?? undefined });
                }
                pop();
              }}
            >
              {t("publish")}
            </Btn>
          </div>
        </div>
        {picker}
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col" style={mode === "text" ? { background: bg } : undefined}>
      <StatusBar />
      <Header title={t("addStory")} onBack={pop} />
      <div className="flex justify-center gap-2 px-4 pb-3">
        <Chip active={mode === "photo"} onClick={() => setMode("photo")}>
          {t("addPhotoStory")}
        </Chip>
        <Chip active={mode === "video"} onClick={() => setMode("video")}>
          {t("addVideoStory")}
        </Chip>
        <Chip active={mode === "text"} onClick={() => setMode("text")}>
          {t("storyModeText")}
        </Chip>
      </div>
      {mode === "text" ? (
        <>
          {music ? (
            <div className="px-4">
              <StoryMusicChip track={music} playing onRemove={() => setMusic(null)} />
            </div>
          ) : null}
          <textarea
            className="flex-1 resize-none bg-transparent px-6 py-8 text-center text-[28px] font-semibold text-paper outline-none placeholder:text-paper/30"
            placeholder={t("storyText")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-center gap-2 pb-4">
            {bgs.map((c) => (
              <button
                key={c}
                type="button"
                className={cn("size-8 rounded-full", bg === c && "ring-2 ring-accent")}
                style={{ background: c }}
                onClick={() => setBg(c)}
              />
            ))}
          </div>
          <div className="p-4 pb-8">
            <StoryMusicButton track={music} onClick={() => setMusicOpen(true)} />
            <StoryTtlPicker value={ttlMs} onChange={setTtlMs} />
            <Btn
              className="w-full"
              disabled={!text.trim()}
              onClick={() => {
                addStory({ type: "text", text: text.trim(), bg, ttlMs, music: music ?? undefined });
                pop();
              }}
            >
              {t("publish")}
            </Btn>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
          {mode === "video" ? (
            <p className="mb-3 text-center text-[12px] text-muted">{t("storyVideoMax")}</p>
          ) : null}
          <StoryMediaGrid kind={mode === "video" ? "video" : "image"} onPick={setDraft} />
        </div>
      )}
      {picker}
    </div>
  );
}

function StoryTtlPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (ms: number) => void;
}) {
  const t = useT();
  return (
    <div className="mb-3">
      <p className="mb-2 text-center text-[12px] font-medium text-muted">{t("storyTtl")}</p>
      <div className="flex justify-center gap-2">
        <Chip active={value === STORY_TTL_24H} onClick={() => onChange(STORY_TTL_24H)}>
          {t("story24h")}
        </Chip>
        <Chip active={value === STORY_TTL_48H} onClick={() => onChange(STORY_TTL_48H)}>
          {t("story48h")}
        </Chip>
      </div>
    </div>
  );
}

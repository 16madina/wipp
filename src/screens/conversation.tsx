import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Copy,
  Languages,
  Lock,
  Mic,
  MoreHorizontal,
  Phone,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Sticker,
  Timer,
  Trash2,
  Video,
  Eye,
} from "lucide-react";
import { Avatar, GroupAvatar } from "@/components/avatar";
import { SmartImg } from "@/components/smart-img";
import { StoryMediaGrid, type StoryMediaPick } from "@/components/gallery";
import { BlockSheet, ReportSheet, SafetyRow } from "@/components/safety";
import { WippSticker } from "@/components/wipp-sticker";
import { Header, IconBtn, Sheet, StatusBar } from "@/components/ui";
import { formatClock, formatDuration, formatLastSeen, formatRemain } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { SHOP_CAT_KEYS } from "@/lib/i18n";
import { EMOJI_CATS, isEmojiSticker, stickerIdFromEmoji } from "@/lib/emoji";
import { isStickerId, STICKER_PACKS, stickerLabel, stickersInPack, type StickerPackId } from "@/lib/stickers";
import { isChatSealed, useT, useWgoStore } from "@/lib/store";
import { DISAPPEAR_24H, DISAPPEAR_7D } from "@/lib/types";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

const REACTS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];
const EMPTY_MSGS: Message[] = [];

type StickerTab = "recent" | "emoji" | StickerPackId;

export function ConversationScreen({ chatId }: { chatId: string }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
  const messages = useWgoStore((s) => s.messages[chatId]) ?? EMPTY_MSGS;
  const users = useWgoStore((s) => s.users);
  const shops = useWgoStore((s) => s.shops);
  const typing = useWgoStore((s) => s.typing[chatId]);
  const sendMessage = useWgoStore((s) => s.sendMessage);
  const retryMessage = useWgoStore((s) => s.retryMessage);
  const startCall = useWgoStore((s) => s.startCall);
  const addReaction = useWgoStore((s) => s.addReaction);
  const deleteMessage = useWgoStore((s) => s.deleteMessage);
  const translateMessage = useWgoStore((s) => s.translateMessage);
  const markRead = useWgoStore((s) => s.markRead);
  const sealExpired = useWgoStore((s) => s.sealExpired);
  const sealChat = useWgoStore((s) => s.sealChat);
  const keepContact = useWgoStore((s) => s.keepContact);
  const showCiphertext = useWgoStore((s) => s.showCiphertext);
  const verifiedIds = useWgoStore((s) => s.verifiedIds);
  const setDisappear = useWgoStore((s) => s.setDisappear);
  const burnViewOnce = useWgoStore((s) => s.burnViewOnce);
  const recentStickerIds = useWgoStore((s) => s.recentStickerIds ?? []);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<null | { t0: number; locked: boolean }>(null);
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState<Message | null>(null);
  const [attach, setAttach] = useState(false);
  const [pickPhoto, setPickPhoto] = useState(false);
  const [pickVideo, setPickVideo] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [viewer, setViewer] = useState<Message | null>(null);
  const [pickStickers, setPickStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<StickerTab>("recent");
  const [emojiCat, setEmojiCat] = useState<(typeof EMOJI_CATS)[number]["id"]>("smileys");
  const [menu, setMenu] = useState(false);
  const [disappearOpen, setDisappearOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportMsgId, setReportMsgId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead(chatId);
    sealExpired();
  }, [chatId, markRead, sealExpired]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      sealExpired();
    }, 1000);
    return () => window.clearInterval(id);
  }, [sealExpired]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, typing]);

  useEffect(() => {
    if (!rec) return;
    const id = window.setInterval(() => setElapsed((Date.now() - rec.t0) / 1000), 200);
    return () => window.clearInterval(id);
  }, [rec]);

  if (!chat) return null;

  const peerId = chat.type === "dm" ? chat.participantIds.find((id) => id !== "me") : undefined;
  const peer = peerId ? users[peerId] : undefined;
  const shop = chat.shopId ? shops.find((s) => s.id === chat.shopId) : undefined;
  const mineShop = Boolean(shop && shop.ownerId === "me");
  const shopFace = shop
    ? { displayName: shop.name, avatar: shop.image, online: true }
    : undefined;
  const sealed = isChatSealed(chat, now);
  const ephemeral = Boolean(chat.ephemeral) && !sealed;
  const title =
    chat.type === "group"
      ? chat.name
      : sealed
        ? t("tempChatEnded")
        : ephemeral
          ? (peer?.firstName ?? t("someone"))
          : shop && !mineShop
            ? shop.name
            : peer?.displayName;
  const subtitle = sealed
    ? t("tempChatEnded")
    : ephemeral
      ? t("firstNameOnly")
      : chat.type === "group"
        ? `${chat.participantIds.length} ${t("members")}`
        : shop
          ? mineShop
            ? `${t("shopContext")} · ${shop.name}`
            : `${t("shopContext")} · ${t(SHOP_CAT_KEYS[shop.category])}`
          : formatLastSeen(peer?.lastSeen, Boolean(peer?.online), lang);

  function send() {
    const value = text.trim();
    if (!value) return;
    haptic("send");
    sendMessage(chatId, { text: value });
    setText("");
  }

  function finishVoice(cancel = false) {
    if (!rec) return;
    const dur = Math.max(1, Math.round((Date.now() - rec.t0) / 1000));
    setRec(null);
    setElapsed(0);
    if (!cancel) {
      haptic("send");
      sendMessage(chatId, { type: "voice", duration: dur, text: t("voice") });
    }
  }

  function sendSticker(id: string, label: string) {
    haptic("send");
    sendMessage(chatId, { type: "sticker", stickerId: id, text: label });
    setStickerTab("recent");
    setPickStickers(false);
  }

  function sendMedia(pick: StoryMediaPick) {
    haptic("send");
    const once = viewOnce || undefined;
    if (pick.type === "video") {
      sendMessage(chatId, {
        type: "video",
        videoUrl: pick.url,
        duration: Math.max(1, Math.round(pick.durationMs / 1000)),
        text: "",
        viewOnce: once,
      });
      setPickVideo(false);
    } else {
      sendMessage(chatId, { type: "image", imageUrl: pick.url, text: "", viewOnce: once });
      setPickPhoto(false);
    }
  }

  function closeViewer() {
    if (viewer?.viewOnce && !viewer.viewed) burnViewOnce(chatId, viewer.id);
    setViewer(null);
  }

  const unreadCount = chat.unread;
  const emojiSet = EMOJI_CATS.find((c) => c.id === emojiCat) ?? EMOJI_CATS[0];
  const trayTabs: { id: StickerTab; label: string }[] = [
    { id: "recent", label: t("recents") },
    { id: "emoji", label: t("stickerEmoji") },
    ...(Object.keys(STICKER_PACKS) as StickerPackId[]).map((id) => ({
      id,
      label: lang === "fr" ? STICKER_PACKS[id].labelFr : STICKER_PACKS[id].labelEn,
    })),
  ];

  return (
    <div className="relative flex h-full flex-col bg-transparent">
      <div className="glass sticky top-0 z-10">
        <StatusBar />
        <Header
          onBack={pop}
          title={
            <button
              type="button"
              className="flex min-w-0 items-center gap-2"
              onClick={() => {
                if (sealed || ephemeral) return;
                if (shop && !mineShop) {
                  push({ name: "shop", shopId: shop.id });
                  return;
                }
                if (chat.type === "group") push({ name: "group-info", chatId });
                else if (peerId) push({ name: "found-profile", userId: peerId });
              }}
            >
              {chat.type === "group" ? (
                <GroupAvatar
                  users={chat.participantIds.filter((id) => id !== "me").map((id) => users[id])}
                  size={32}
                  photo={chat.avatar}
                />
              ) : (
                <Avatar user={shop && !mineShop ? shopFace : peer} size={32} hidden={sealed} />
              )}
              {sealed ? null : <span className="truncate">{title}</span>}
              {!sealed && peerId && verifiedIds.includes(peerId) ? (
                <ShieldCheck className="size-3.5 shrink-0 text-accent" />
              ) : !sealed ? (
                <Lock className="size-3.5 shrink-0 text-muted" />
              ) : null}
            </button>
          }
          subtitle={subtitle}
          right={
            <>
              {peerId && !ephemeral && !sealed ? (
                <>
                  <IconBtn label={t("audioCall")} onClick={() => startCall(peerId, "audio")}>
                    <Phone className="size-5" />
                  </IconBtn>
                  <IconBtn label={t("videoCall")} onClick={() => startCall(peerId, "video")}>
                    <Video className="size-5" />
                  </IconBtn>
                </>
              ) : null}
              {!sealed ? (
                <IconBtn label="Menu" onClick={() => setMenu(true)}>
                  <MoreHorizontal className="size-5" />
                </IconBtn>
              ) : null}
            </>
          }
        />
      </div>
      {!sealed ? (
        <button
          type="button"
          onClick={() => push({ name: "e2e-info", chatId })}
          className="glass-card mx-4 mb-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-left"
        >
          <Lock className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span className="text-[12px] leading-relaxed text-muted">{t("e2eBanner")}</span>
        </button>
      ) : null}
      {!sealed && chat.disappearAfterMs ? (
        <div className="glass-card mx-4 mb-2 flex items-start gap-2 rounded-xl px-3 py-2.5">
          <Timer className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span className="text-[12px] leading-relaxed text-muted">
            {t("disappearingBanner")}{" "}
            {chat.disappearAfterMs >= 604_800_000 ? t("disappearing7d") : t("disappearing24h")}.
          </span>
        </div>
      ) : null}
      {ephemeral ? (
        <div className="mx-4 mb-2 rounded-xl bg-navy px-3 py-2.5 text-paper">
          <p className="flex items-center gap-2 text-[12px] font-medium">
            <Clock className="size-3.5 text-accent" />
            {t("tempExpires")} {chat.expiresAt ? formatRemain(chat.expiresAt, now) : "—"}
          </p>
          <p className="mt-1 text-[12px] text-paper/60">{t("tempBanner")}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="h-8 rounded-full bg-accent px-3 text-[12px] font-medium text-accent-fg"
              onClick={() => keepContact(chatId)}
            >
              {t("revealWgo")}
            </button>
            <button
              type="button"
              className="h-8 rounded-full bg-paper/10 px-3 text-[12px] font-medium text-paper"
              onClick={() => sealChat(chatId)}
            >
              {t("simulateExpire")}
            </button>
          </div>
        </div>
      ) : null}
      {sealed ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-navy text-accent">
            <Shield className="size-6" />
          </span>
          <h2 className="mt-4 text-[18px] font-semibold">{t("sealedTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{t("sealedBody")}</p>
          <p className="mt-5 text-[12px] font-medium text-muted uppercase">{t("sealedLost")}</p>
          <p className="mt-1 text-[13px] text-fg">{t("sealedLostList")}</p>
          <p className="mt-4 text-[12px] font-medium text-muted uppercase">{t("sealedKeeps")}</p>
          <p className="mt-1 text-[13px] text-muted">{t("sealedKeepsNone")}</p>
        </div>
      ) : (
        <>
          {unreadCount > 4 ? (
            <button type="button" className="hairline mx-4 mb-1 rounded-lg bg-surface px-3 py-2 text-left text-[13px]">
              {unreadCount} {t("unreadN")} · {t("summarize")}
            </button>
          ) : null}
          <div ref={scroller} className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
            {messages
              .filter((m) => !m.expiresAt || m.expiresAt > now)
              .map((m, i, list) => {
                const mine = m.fromId === "me";
                const prev = list[i - 1];
                const showName = chat.type === "group" && !mine && prev?.fromId !== m.fromId;
                const sender = !mine && shop && m.fromId === shop.ownerId ? shopFace : users[m.fromId];
                if (m.type === "system") {
                  return (
                    <p key={m.id} className="my-3 text-center text-[12px] text-muted">
                      {m.text}
                    </p>
                  );
                }
                if (m.type === "shop") {
                  const card = shops.find((s) => s.id === m.shopId) ?? shop;
                  return (
                    <div key={m.id} className="hairline mx-auto my-3 max-w-[80%] rounded-xl bg-surface p-3">
                      <p className="text-[11px] text-muted">{t("contactingShop")}</p>
                      <p className="mt-1 text-[15px] font-semibold">{card?.name ?? m.text}</p>
                      {card ? (
                        <>
                          <p className="text-[12px] text-muted">{t(SHOP_CAT_KEYS[card.category])}</p>
                          <p className="text-[12px] text-muted">
                            {card.city}, {card.country}
                          </p>
                        </>
                      ) : (
                        <p className="text-[12px] text-muted">{t("shopContext")}</p>
                      )}
                    </div>
                  );
                }
                if (m.type === "listing") {
                  return (
                    <div key={m.id} className="hairline mx-auto my-3 max-w-[80%] rounded-xl bg-surface p-2">
                      <p className="px-1 pb-1 text-[11px] text-muted">{t("talkingAbout")}</p>
                      {m.imageUrl ? (
                        <SmartImg src={m.imageUrl} alt="" className="h-28 w-full rounded-lg object-cover" />
                      ) : null}
                      <p className="px-1 pt-2 text-[14px] font-medium">{m.text}</p>
                    </div>
                  );
                }
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (mine && m.status === "failed") {
                        retryMessage(chatId, m.id);
                        return;
                      }
                      if (m.viewOnce) {
                        if (!m.viewed) setViewer(m);
                        return;
                      }
                      if (m.type === "sticker" || m.type === "video") return;
                      setActive(m);
                    }}
                    className={cn("mb-1 flex w-full", mine ? "justify-end" : "justify-start")}
                  >
                    <div className={cn("max-w-[78%] text-left", mine ? "items-end" : "items-start")}>
                      {showName ? (
                        <p className="mb-0.5 px-1 text-[11px] text-muted">{sender?.displayName}</p>
                      ) : null}
                      <div
                        className={cn(
                          m.type === "sticker" ? "bg-transparent px-0 py-0" : "rounded-2xl px-3 py-2",
                          m.type !== "sticker" &&
                            (mine ? "rounded-br-sm bg-bubble-me text-bubble-me-fg" : "rounded-bl-sm bg-bubble-them text-fg"),
                        )}
                      >
                        {m.viewOnce && !m.viewed ? (
                          <span className="flex items-center gap-2 py-1">
                            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg">
                              1
                            </span>
                            <span className="text-[14px] font-medium">{t("viewOnceOpen")}</span>
                          </span>
                        ) : m.viewOnce && m.viewed ? (
                          <span className="flex items-center gap-2 py-1 opacity-60">
                            <Eye className="size-4" />
                            <span className="text-[14px]">{t("viewOnceOpened")}</span>
                          </span>
                        ) : m.type === "image" && m.imageUrl ? (
                          <SmartImg src={m.imageUrl} alt="" className="mb-1 max-h-52 w-full rounded-lg object-cover" />
                        ) : m.type === "video" && m.videoUrl ? (
                          <span className="mb-1 block overflow-hidden rounded-lg">
                            <video
                              src={m.videoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="max-h-52 w-full bg-black object-cover"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </span>
                        ) : null}
                        {m.type === "sticker" && isStickerId(m.stickerId) ? (
                          <WippSticker
                            id={m.stickerId}
                            size={isEmojiSticker(m.stickerId) ? 72 : 148}
                            animated
                            onLongPress={() => setActive(m)}
                          />
                        ) : null}
                        {m.type === "voice" ? (
                          <div className="flex items-center gap-2">
                            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg">
                              <span className="ml-0.5 text-[11px] font-semibold">▶</span>
                            </span>
                            <span className="flex h-5 items-end gap-0.5">
                              {Array.from({ length: 16 }).map((_, b) => (
                                <span
                                  key={b}
                                  className={cn("w-0.5 rounded-full", mine ? "bg-paper/80" : "bg-fg/50")}
                                  style={{ height: 6 + ((b * 7) % 14) }}
                                />
                              ))}
                            </span>
                            <span className="text-[12px] tabular-nums opacity-80">
                              {formatDuration(m.duration ?? 0)}
                            </span>
                          </div>
                        ) : m.type === "sticker" || m.type === "image" || m.type === "video" || m.viewOnce ? null : m.encFailed ? (
                          <p className={cn("flex items-center gap-1.5 text-[13px] italic", mine ? "text-paper/70" : "text-muted")}>
                            <Lock className="size-3.5 shrink-0" />
                            {t("e2eFailed")}
                          </p>
                        ) : showCiphertext && m.enc ? (
                          <p className="break-all font-mono text-[11px] leading-relaxed opacity-80">
                            {m.enc.iv}.{m.enc.ct}
                          </p>
                        ) : (
                          <p className="text-[15px] leading-snug">{m.text ?? t("e2eLocked")}</p>
                        )}
                        {m.translated ? (
                          <p className="mt-1 border-t border-white/10 pt-1 text-[13px] opacity-80">{m.translated}</p>
                        ) : null}
                        <span
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-[11px] tabular-nums",
                            mine ? "text-paper/50" : "text-muted",
                          )}
                        >
                          {m.enc ? <Lock className="size-2.5 opacity-70" /> : null}
                          {m.expiresAt ? <Timer className="size-2.5 opacity-70" /> : null}
                          {formatClock(m.createdAt)}
                          {mine ? <ReceiptMark status={m.status} /> : null}
                        </span>
                      </div>
                      {m.reactions.length ? (
                        <div className={cn("mt-0.5 flex gap-1", mine ? "justify-end" : "justify-start")}>
                          {m.reactions.map((r) => (
                            <span key={r.userId + r.emoji} className="hairline rounded-full bg-surface px-1.5 text-[12px]">
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            {typing ? (
              <div className="mt-1 flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-bubble-them px-3 py-2 text-[13px] text-muted">···</div>
              </div>
            ) : null}
          </div>
          {rec ? (
            <div className="glass flex items-center gap-3 px-4 py-3">
              <button type="button" className="text-[13px] text-danger" onClick={() => finishVoice(true)}>
                {t("slideCancel")}
              </button>
              <span className="h-2 flex-1 rounded-full bg-danger/40" />
              <span className="text-[13px] tabular-nums">{formatDuration(elapsed)}</span>
              <button
                type="button"
                className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg"
                aria-label={t("send")}
                onClick={() => finishVoice(false)}
              >
                <Send className="size-5" />
              </button>
            </div>
          ) : (
            <div className="glass flex items-end gap-1.5 px-2 py-2 pb-5">
              <IconBtn label="Plus" onClick={() => setAttach(true)}>
                <Plus className="size-5" />
              </IconBtn>
              <IconBtn label={t("stickers")} onClick={() => setPickStickers(true)}>
                <Sticker className="size-5" />
              </IconBtn>
              {chat.disappearAfterMs ? <Timer className="mb-3 size-3.5 shrink-0 text-accent" /> : null}
              <div className="hairline flex min-h-11 flex-1 items-end rounded-xl bg-surface-2">
                <textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t("e2ePlaceholder")}
                  className="max-h-28 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none"
                />
              </div>
              {text.trim() ? (
                <button
                  type="button"
                  className="press mb-0.5 flex size-[var(--touch-min)] items-center justify-center rounded-full bg-accent text-accent-fg"
                  aria-label={t("send")}
                  onClick={send}
                >
                  <Send className="size-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="press mb-0.5 flex size-[var(--touch-min)] items-center justify-center rounded-full bg-surface-2"
                  aria-label={t("voice")}
                  onPointerDown={() => setRec({ t0: Date.now(), locked: false })}
                >
                  <Mic className="size-5" />
                </button>
              )}
            </div>
          )}
        </>
      )}
      <Sheet open={Boolean(active)} onClose={() => setActive(null)}>
        {active ? (
          <div className="grid gap-1">
            <div className="mb-2 flex justify-center gap-2">
              {REACTS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="press flex size-10 items-center justify-center rounded-full bg-surface-2 text-lg"
                  onClick={() => {
                    addReaction(chatId, active.id, e);
                    setActive(null);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="flex h-12 items-center gap-3 rounded-lg px-2"
              onClick={() => {
                if (active.text) navigator.clipboard.writeText(active.text);
                setActive(null);
              }}
            >
              <Copy className="size-4" /> {t("copyMsg")}
            </button>
            <button
              type="button"
              className="flex h-12 items-center gap-3 rounded-lg px-2"
              onClick={() => {
                translateMessage(chatId, active.id);
                setActive(null);
              }}
            >
              <Languages className="size-4" /> {t("translate")}
            </button>
            {active.enc ? (
              <button
                type="button"
                className="flex h-12 items-center gap-3 rounded-lg px-2"
                onClick={() => {
                  navigator.clipboard.writeText(`${active.enc!.iv}.${active.enc!.ct}`);
                  setActive(null);
                }}
              >
                <Lock className="size-4" /> {t("e2eCopyCipher")}
              </button>
            ) : null}
            <button
              type="button"
              className="flex h-12 items-center gap-3 rounded-lg px-2 text-danger"
              onClick={() => {
                deleteMessage(chatId, active.id);
                setActive(null);
              }}
            >
              <Trash2 className="size-4" /> {t("deleteMe")}
            </button>
            {active.fromId !== "me" ? (
              <button
                type="button"
                className="flex h-12 items-center gap-3 rounded-lg px-2"
                onClick={() => {
                  setActive(null);
                  setReportMsgId(active.id);
                }}
              >
                {t("report")}
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>
      <Sheet open={attach} onClose={() => setAttach(false)} title={t("gallery")}>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              [t("photo"), () => { setAttach(false); setPickPhoto(true); }],
              [t("video"), () => { setAttach(false); setPickVideo(true); }],
              [t("stickers"), () => { setAttach(false); setPickStickers(true); }],
              [t("location"), () => sendMessage(chatId, { text: "📍 Longueuil" })],
              [t("contact"), () => sendMessage(chatId, { text: "@maya" })],
            ] as const
          ).map(([label, fn]) => (
            <button
              key={String(label)}
              type="button"
              className="h-16 rounded-xl bg-surface-2 text-[13px] font-medium"
              onClick={() => {
                fn();
                if (label !== t("photo") && label !== t("video") && label !== t("stickers")) setAttach(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={pickPhoto} onClose={() => setPickPhoto(false)} title={t("photo")}>
        <ViewOnceRow on={viewOnce} onChange={setViewOnce} label={t("viewOnce")} hint={t("viewOnceHint")} />
        <div className="max-h-[58vh] overflow-y-auto no-scrollbar">
          <StoryMediaGrid kind="image" onPick={sendMedia} />
        </div>
      </Sheet>
      <Sheet open={pickVideo} onClose={() => setPickVideo(false)} title={t("video")}>
        <ViewOnceRow on={viewOnce} onChange={setViewOnce} label={t("viewOnce")} hint={t("viewOnceHint")} />
        <div className="max-h-[58vh] overflow-y-auto no-scrollbar">
          <StoryMediaGrid kind="video" onPick={sendMedia} />
        </div>
      </Sheet>
      <Sheet open={pickStickers} onClose={() => setPickStickers(false)} title={t("stickerPack")}>
        <div className="mb-3 flex gap-1 overflow-x-auto pb-0.5">
          {trayTabs.map((tab) => {
            const on = stickerTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "h-9 shrink-0 rounded-xl px-3 text-[12px] font-semibold",
                  on ? "bg-accent text-accent-fg" : "bg-navy/50 text-muted",
                )}
                onClick={() => setStickerTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {stickerTab === "recent" ? (
          recentStickerIds.length ? (
            <div className="grid grid-cols-4 gap-1.5 pb-2">
              {recentStickerIds.filter(isStickerId).map((id) => (
                <button
                  key={id}
                  type="button"
                  className="press flex aspect-square items-center justify-center rounded-2xl bg-navy/40"
                  aria-label={stickerLabel(id, lang)}
                  onClick={() => sendSticker(id, stickerLabel(id, lang))}
                >
                  <WippSticker id={id} size={isEmojiSticker(id) ? 40 : 64} />
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-8 text-center text-[13px] text-muted">{t("stickerRecentEmpty")}</p>
          )
        ) : stickerTab === "emoji" ? (
          <div>
            <div className="mb-2 flex gap-1 overflow-x-auto">
              {EMOJI_CATS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl text-[18px]",
                    emojiCat === cat.id ? "bg-accent/20" : "bg-navy/40",
                  )}
                  aria-label={lang === "fr" ? cat.labelFr : cat.labelEn}
                  onClick={() => setEmojiCat(cat.id)}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
            <div className="grid max-h-[46vh] grid-cols-6 gap-0.5 overflow-y-auto pb-2">
              {emojiSet.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="press flex aspect-square items-center justify-center rounded-xl text-[26px] leading-none"
                  aria-label={emoji}
                  onClick={() => sendSticker(stickerIdFromEmoji(emoji), emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5 pb-2">
              {stickersInPack(stickerTab).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="press flex aspect-square items-center justify-center rounded-2xl bg-navy/40"
                  aria-label={lang === "fr" ? s.labelFr : s.labelEn}
                  onClick={() => sendSticker(s.id, lang === "fr" ? s.labelFr : s.labelEn)}
                >
                  <WippSticker id={s.id} size={64} />
                </button>
              ))}
            </div>
            <p className="px-1 pb-1 text-center text-[12px] text-muted">{t("stickerSameVibe")}</p>
          </>
        )}
      </Sheet>
      <Sheet
        open={menu}
        onClose={() => {
          setMenu(false);
          setDisappearOpen(false);
        }}
        title={disappearOpen ? t("disappearing") : title}
      >
        {disappearOpen ? (
          <div className="grid gap-1">
            {(
              [
                [0, t("disappearingOff")],
                [DISAPPEAR_24H, t("disappearing24h")],
                [DISAPPEAR_7D, t("disappearing7d")],
              ] as const
            ).map(([ms, label]) => {
              const on = (chat.disappearAfterMs ?? 0) === ms;
              return (
                <button
                  key={label}
                  type="button"
                  className="flex h-12 items-center justify-between rounded-lg px-2 text-[15px]"
                  onClick={() => {
                    setDisappear(chatId, ms);
                    setDisappearOpen(false);
                    setMenu(false);
                  }}
                >
                  {label}
                  {on ? <span className="size-2 rounded-full bg-accent" /> : null}
                </button>
              );
            })}
            <p className="px-2 pt-2 text-[12px] leading-relaxed text-muted">{t("disappearingHint")}</p>
          </div>
        ) : (
          <div className="grid gap-1">
            <button
              type="button"
              className="flex h-12 items-center gap-3 rounded-lg px-2"
              onClick={() => {
                setMenu(false);
                push({ name: "e2e-info", chatId });
              }}
            >
              <Lock className="size-4" /> {t("e2e")}
            </button>
            {!ephemeral && !sealed ? (
              <button type="button" className="flex h-12 items-center gap-3 rounded-lg px-2" onClick={() => setDisappearOpen(true)}>
                <Timer className="size-4" /> {t("disappearing")}
                <span className="ml-auto text-[12px] text-muted">
                  {chat.disappearAfterMs
                    ? chat.disappearAfterMs >= 604_800_000
                      ? t("disappearing7d")
                      : t("disappearing24h")
                    : t("disappearingOff")}
                </span>
              </button>
            ) : null}
            {chat.type === "group" ? (
              <>
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-lg px-2"
                  onClick={() => {
                    setMenu(false);
                    push({ name: "group-info", chatId });
                  }}
                >
                  {t("groupInfo")}
                </button>
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-lg px-2"
                  onClick={() => {
                    setMenu(false);
                    push({ name: "group-qr", chatId });
                  }}
                >
                  {t("groupQr")}
                </button>
              </>
            ) : peerId && !ephemeral && !sealed && !shop ? (
              <button
                type="button"
                className="flex h-12 items-center gap-3 rounded-lg px-2"
                onClick={() => {
                  setMenu(false);
                  push({ name: "introduce", toUserId: peerId });
                }}
              >
                {t("introduce")}
              </button>
            ) : ephemeral ? (
              <>
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-lg px-2"
                  onClick={() => {
                    setMenu(false);
                    keepContact(chatId);
                  }}
                >
                  {t("revealWgo")}
                </button>
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-lg px-2 text-danger"
                  onClick={() => {
                    setMenu(false);
                    sealChat(chatId);
                  }}
                >
                  {t("simulateExpire")}
                </button>
              </>
            ) : null}
            <SafetyRow
              onReport={() => {
                setMenu(false);
                setReportOpen(true);
              }}
              onBlock={
                peerId
                  ? () => {
                      setMenu(false);
                      setBlockOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        )}
      </Sheet>
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind={chat.type === "group" ? "group" : "user"}
        targetId={chat.type === "group" ? chatId : (peerId ?? chatId)}
        blockUserId={peerId}
      />
      <ReportSheet
        open={Boolean(reportMsgId)}
        onClose={() => setReportMsgId(null)}
        kind="message"
        targetId={reportMsgId ?? chatId}
        blockUserId={peerId}
      />
      {peerId ? (
        <BlockSheet
          open={blockOpen}
          onClose={() => setBlockOpen(false)}
          userId={peerId}
          onBlocked={pop}
        />
      ) : null}
      {viewer ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-ink text-paper">
          <div className="flex items-center justify-between px-3 pt-12">
            <p className="text-[13px] font-medium text-paper/70">{t("viewOnce")}</p>
            <button type="button" className="press rounded-full px-3 py-2 text-[14px] font-semibold" onClick={closeViewer}>
              {t("done")}
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            {viewer.type === "video" && viewer.videoUrl ? (
              <video src={viewer.videoUrl} controls autoPlay playsInline className="max-h-full w-full rounded-xl bg-black" />
            ) : viewer.imageUrl ? (
              <SmartImg src={viewer.imageUrl} alt="" className="max-h-full w-full rounded-xl object-contain" />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReceiptMark({ status }: { status: Message["status"] }) {
  const t = useT();
  const receiptsOn = useWgoStore((s) => s.privacy.readReceipts !== false);
  const shown = status === "read" && !receiptsOn ? "delivered" : status;
  const label =
    shown === "sending"
      ? t("receiptSending")
      : shown === "sent"
        ? t("receiptSent")
        : shown === "delivered"
          ? t("receiptDelivered")
          : shown === "failed"
            ? t("receiptFailed")
            : t("receiptRead");
  if (shown === "failed") {
    return (
      <span className="receipt-fail" role="img" aria-label={label}>
        !
      </span>
    );
  }
  const pair = shown === "delivered" || shown === "read";
  return (
    <span className={cn("receipt", `is-${shown}`)} role="img" aria-label={label}>
      <i />
      {shown === "read" ? <b /> : null}
      {pair ? <i /> : null}
    </span>
  );
}

function ViewOnceRow({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-left"
      onClick={() => onChange(!on)}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
          on ? "bg-accent text-accent-fg" : "bg-navy text-muted",
        )}
      >
        1
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{label}</span>
        <span className="block text-[12px] leading-snug text-muted">{hint}</span>
      </span>
      <span className={cn("size-2.5 shrink-0 rounded-full", on ? "bg-accent" : "bg-hair")} />
    </button>
  );
}

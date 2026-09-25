import { useEffect, useMemo, useState } from "react";
import {
  BellOff,
  Camera,
  Clock,
  Hash,
  Lock,
  Plus,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  Users,
  UserPlus,
  MapPin,
  Music,
  Play,
} from "lucide-react";
import { Avatar, GroupAvatar } from "@/components/avatar";
import { SmartImg } from "@/components/smart-img";
import { GallerySheet } from "@/components/gallery";
import { BlockSheet, ReportSheet } from "@/components/safety";
import { WgoWordmark } from "@/components/logo";
import { Badge, Btn, Chip, Empty, Header, IconBtn, SearchField, StatusBar } from "@/components/ui";
import { formatChatTime, formatRemainShort } from "@/lib/format";
import { SHOP_CAT_KEYS } from "@/lib/i18n";
import { isChatSealed, useT, useWgoStore } from "@/lib/store";
import {
  isPrivateChat,
  isPrivateEnabled,
  lockChatPrivate,
  subscribePrivateVault,
} from "@/lib/private-vault";
import { openPrivateIfUnlocked } from "@/screens/private-chats";
import { isStoryLive } from "@/lib/types";
import type { Chat, Shop, User } from "@/lib/types";
import { cn } from "@/lib/utils";

function chatPeer(chat: Chat, users: Record<string, User>) {
  if (chat.type === "group") return undefined;
  const id = chat.participantIds.find((x) => x !== "me");
  return id ? users[id] : undefined;
}

function shopFace(shop: Shop) {
  return { displayName: shop.name, avatar: shop.image, online: true };
}

export function ChatsScreen() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const me = useWgoStore((s) => s.me);
  const users = useWgoStore((s) => s.users);
  const chats = useWgoStore((s) => s.chats);
  const shops = useWgoStore((s) => s.shops);
  const stories = useWgoStore((s) => s.stories);
  const viewed = useWgoStore((s) => s.viewedStories);
  const pending = useWgoStore(
    (s) =>
      s.requests.filter((r) => r.status === "pending").length +
      s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length,
  );
  const push = useWgoStore((s) => s.push);
  const markRead = useWgoStore((s) => s.markRead);
  const verifiedIds = useWgoStore((s) => s.verifiedIds);
  const sealExpired = useWgoStore((s) => s.sealExpired);
  const blockedIds = useWgoStore((s) => s.blockedIds);
  const reports = useWgoStore((s) => s.reports);
  const [now, setNow] = useState(Date.now());
  const [filter, setFilter] = useState<"all" | "personal" | "shops" | "groups">("all");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [, setVaultTick] = useState(0);

  useEffect(() => subscribePrivateVault(() => setVaultTick((n) => n + 1)), []);

  useEffect(() => {
    sealExpired();
    const id = window.setInterval(() => {
      setNow(Date.now());
      sealExpired();
    }, 1000);
    return () => window.clearInterval(id);
  }, [sealExpired]);

  const visible = chats
    .filter((c) => !c.archived && !c.isRequest && c.participantIds.includes("me") && !isPrivateChat(c.id))
    .filter((c) => {
      if (c.type === "dm") {
        const other = c.participantIds.find((id) => id !== "me");
        if (other && blockedIds.includes(other)) return false;
      }
      if (filter === "shops") return Boolean(c.shopId);
      if (filter === "groups") return c.type === "group";
      if (filter === "personal") return !c.shopId && c.type !== "group";
      return true;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastAt - a.lastAt);

  const storyUsers = useMemo(
    () => [
      ...new Set(
        stories
          .filter(
            (s) =>
              s.userId !== "me" &&
              isStoryLive(s, now) &&
              !blockedIds.includes(s.userId) &&
              !(reports ?? []).some(
                (r) =>
                  (r.kind === "story" && r.targetId === s.id) ||
                  (r.kind === "user" && r.targetId === s.userId),
              ),
          )
          .map((s) => s.userId),
      ),
    ],
    [stories, now, blockedIds, reports],
  );
  const myStory = stories.filter((s) => s.userId === "me" && isStoryLive(s, now)).length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-10">
        <StatusBar />
        <div className="flex items-center gap-2 px-4 pb-2">
          <span
            className="inline-flex"
            onPointerDown={() => {
              if (!isPrivateEnabled()) return;
              const haptic = window.setTimeout(() => navigator.vibrate?.(12), 2500);
              const open = window.setTimeout(() => {
                void openPrivateIfUnlocked(push);
              }, 3000);
              const up = () => {
                window.clearTimeout(haptic);
                window.clearTimeout(open);
                window.removeEventListener("pointerup", up);
                window.removeEventListener("pointercancel", up);
              };
              window.addEventListener("pointerup", up);
              window.addEventListener("pointercancel", up);
            }}
          >
            <WgoWordmark className="text-[22px]" />
          </span>
          <div className="ml-auto flex items-center">
            <IconBtn label={t("search")} onClick={() => push({ name: "global-search" })}>
              <Search className="size-5" />
            </IconBtn>
            <IconBtn label={t("newChat")} onClick={() => push({ name: "new-chat" })}>
              <Plus className="size-5" />
            </IconBtn>
            <button type="button" className="ml-1" onClick={() => push({ name: "me" })}>
              <Avatar user={me} size={32} priority />
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-3">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span className="relative">
            <button
              type="button"
              onClick={() =>
                push(myStory ? { name: "stories", userId: "me" } : { name: "new-story" })
              }
              aria-label={t("yourStory")}
            >
              <Avatar user={me} size={56} ring={myStory ? "accent" : "none"} priority />
            </button>
            <button
              type="button"
              className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg outline-2 outline-bg"
              onClick={() => push({ name: "new-story" })}
              aria-label={t("addStory")}
            >
              <Plus className="size-3" strokeWidth={3} />
            </button>
          </span>
          <span className="w-full truncate text-center text-[11px] text-muted">{t("yourStory")}</span>
        </div>
        {storyUsers.map((id) => {
          const u = users[id];
          const lastViewed = viewed[id] ?? 0;
          const unseen = stories.some(
            (s) => s.userId === id && isStoryLive(s, now) && s.createdAt > lastViewed,
          );
          const withMusic = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.music);
          const withVideo = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.type === "video");
          return (
            <button
              key={id}
              type="button"
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              onClick={() => push({ name: "stories", userId: id })}
            >
              <span className="relative">
                <Avatar user={u} size={56} ring={unseen ? "accent" : "muted"} />
                {withVideo || withMusic ? (
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg outline-2 outline-bg">
                    {withVideo ? <Play className="size-3 translate-x-px" /> : <Music className="size-3" />}
                  </span>
                ) : null}
              </span>
              <span className="w-full truncate text-center text-[11px] text-muted">
                {u?.displayName}
              </span>
            </button>
          );
        })}
      </div>
      {pending > 0 ? (
        <button
          type="button"
          onClick={() => push({ name: "requests" })}
          className="mx-4 mb-1 flex items-center gap-3 rounded-xl glass-card px-3 py-2.5"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent/20 text-accent-fg">
            <UserPlus className="size-4 text-navy" />
          </span>
          <span className="flex-1 text-left text-[14px] font-medium">{t("requests")}</span>
          <Badge>{pending}</Badge>
        </button>
      ) : null}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          {t("chatsAll")}
        </Chip>
        <Chip active={filter === "personal"} onClick={() => setFilter("personal")}>
          {t("chatsPersonal")}
        </Chip>
        <Chip active={filter === "shops"} onClick={() => setFilter("shops")}>
          {t("chatsShops")}
        </Chip>
        <Chip active={filter === "groups"} onClick={() => setFilter("groups")}>
          {t("chatsGroups")}
        </Chip>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {visible.length === 0 ? (
          <Empty
            title={filter === "groups" ? t("groupsEmpty") : t("chatsEmpty")}
            body={filter === "groups" ? t("groupsEmptySub") : t("chatsEmptySub")}
            action={
              <Btn onClick={() => push({ name: filter === "groups" ? "new-group" : "connect" })}>
                {filter === "groups" ? t("createGroup") : t("connectCta")}
              </Btn>
            }
          />
        ) : (
          visible.map((chat, i) => {
            const peer = chatPeer(chat, users);
            const shop = chat.shopId ? shops.find((s) => s.id === chat.shopId) : undefined;
            const mineShop = Boolean(shop && shop.ownerId === "me");
            const groupUsers = chat.participantIds
              .filter((id) => id !== "me")
              .map((id) => users[id]);
            const sealed = isChatSealed(chat, now);
            const ephemeral = Boolean(chat.ephemeral) && !sealed;
            const title =
              chat.type === "group"
                ? chat.name
                : sealed
                  ? t("tempChatEnded")
                  : ephemeral
                    ? peer?.firstName ?? t("someone")
                    : shop && !mineShop
                      ? shop.name
                      : peer?.displayName;
            const preview = sealed ? t("sealedKeepsNone") : chat.preview;
            const stamp =
              ephemeral && chat.expiresAt
                ? formatRemainShort(chat.expiresAt, now)
                : formatChatTime(chat.lastAt, lang);
            return (
              <div key={chat.id} className="relative">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  onClick={() => {
                    markRead(chat.id);
                    push({ name: "conversation", chatId: chat.id });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuChatId(chat.id);
                  }}
                >
                  {chat.type === "group" ? (
                    <GroupAvatar users={groupUsers} size={52} photo={chat.avatar} priority={i < 8} />
                  ) : (
                    <Avatar
                      user={shop && !mineShop ? shopFace(shop) : peer}
                      size={52}
                      hidden={sealed}
                      priority={i < 8}
                    />
                  )}
                  <span className="min-w-0 flex-1 border-b border-hair pb-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[16px] font-medium">{title}</span>
                      {shop ? (
                        <span className="shrink-0 rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-medium text-accent">
                          {t("shopContext")}
                        </span>
                      ) : null}
                      {peer && verifiedIds.includes(peer.id) ? (
                        <ShieldCheck className="size-3.5 shrink-0 text-accent" />
                      ) : !sealed ? (
                        <Lock className="size-3.5 shrink-0 text-muted" />
                      ) : null}
                      {ephemeral ? <Clock className="size-3.5 shrink-0 text-accent" /> : null}
                      {chat.muted ? <BellOff className="size-3.5 text-muted" /> : null}
                      <span
                        className={cn(
                          "ml-auto shrink-0 text-[12px] tabular-nums",
                          ephemeral ? "text-accent" : "text-muted",
                        )}
                      >
                        {stamp}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[14px]",
                          sealed ? "text-muted" : chat.unread ? "text-fg" : "text-muted",
                        )}
                      >
                        {shop && !sealed ? `${t(SHOP_CAT_KEYS[shop.category])} · ${preview}` : preview}
                      </span>
                      {!sealed && chat.unread ? <Badge>{chat.unread}</Badge> : null}
                    </span>
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
      {menuChatId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setMenuChatId(null)}>
          <div className="mb-6 w-[min(100%,360px)] overflow-hidden rounded-2xl bg-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="w-full px-4 py-4 text-left text-[16px]"
              onClick={() => {
                const id = menuChatId;
                setMenuChatId(null);
                if (!isPrivateEnabled()) {
                  window.alert("Active WIPP Privé dans Confidentialité.");
                  return;
                }
                void lockChatPrivate(id, () => Promise.resolve(window.prompt("Code WIPP Privé")));
              }}
            >
              Masquer et verrouiller
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NewChatScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const users = useWgoStore((s) => s.users);
  const blocked = useWgoStore((s) => s.blockedIds);
  const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
  const [q, setQ] = useState("");
  const contacts = Object.values(users).filter(
    (u) =>
      u.connected &&
      !blocked.includes(u.id) &&
      `${u.displayName} ${u.username}`.toLowerCase().includes(q.toLowerCase()),
  );

  const actions = [
    { icon: ScanLine, label: t("scanQr"), go: () => push({ name: "scanner" }) },
    { icon: QrCode, label: t("shareMyWgo"), go: () => push({ name: "my-qr" }) },
    { icon: Hash, label: t("liveCode"), go: () => push({ name: "live-code" }) },
    { icon: Users, label: t("createGroup"), go: () => push({ name: "new-group" }) },
    { icon: MapPin, label: t("nearbyPeople"), go: () => push({ name: "nearby" }) },
  ];

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("newChat")} onBack={pop} />
      <div className="px-4 pb-3">
        <SearchField
          placeholder={t("searchPeople")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.go}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-2">
              <a.icon className="size-5" />
            </span>
            <span className="text-[15px] font-medium">{a.label}</span>
          </button>
        ))}
        <p className="mt-4 px-4 pb-2 text-[12px] font-medium text-muted uppercase">
          {t("wgoContacts")}
        </p>
        {contacts.map((u) => (
          <button
            key={u.id}
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
            onClick={() => openOrCreateDm(u.id)}
          >
            <Avatar user={u} size={44} />
            <span>
              <span className="block text-[15px] font-medium">{u.displayName}</span>
              <span className="text-[13px] text-muted">@{u.username}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RequestsScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const requests = useWgoStore((s) => s.requests);
  const intros = useWgoStore((s) => s.intros);
  const users = useWgoStore((s) => s.users);
  const acceptRequest = useWgoStore((s) => s.acceptRequest);
  const ignoreRequest = useWgoStore((s) => s.ignoreRequest);
  const blockedIds = useWgoStore((s) => s.blockedIds);
  const pending = requests.filter((r) => r.status === "pending" && !blockedIds.includes(r.fromId));
  const pendingIntros = intros.filter((i) => i.recipientId === "me" && i.status === "pending");
  const [reportId, setReportId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("requests")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4">
        {pendingIntros.length === 0 && pending.length === 0 ? (
          <Empty title={t("noResults")} />
        ) : (
          <>
            {pendingIntros.map((intro) => {
              const from = users[intro.introducerId];
              return (
                <button
                  key={intro.id}
                  type="button"
                  className="mb-3 w-full rounded-xl bg-surface p-4 text-left hairline"
                  onClick={() => push({ name: "intro-detail", introId: intro.id })}
                >
                  <div className="flex gap-3">
                    <Avatar hidden size={48} />
                    <div className="min-w-0">
                      <p className="font-medium">{t("someone")}</p>
                      <p className="text-[13px] text-muted">{t("usernameHidden")}</p>
                      <p className="mt-2 text-[14px] text-muted">
                        {t("introBy")} {from?.displayName}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {pending.map((r) => {
              const u = users[r.fromId];
              return (
                <div key={r.id} className="mb-3 rounded-xl bg-surface p-4 hairline">
                  <div className="flex gap-3">
                    <Avatar user={u} size={48} />
                    <div className="min-w-0">
                      <p className="font-medium">{u?.displayName}</p>
                      <p className="text-[13px] text-muted">@{u?.username}</p>
                      <p className="mt-2 text-[14px] text-muted">{r.preview}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Btn className="h-10 text-[13px]" onClick={() => acceptRequest(r.id)}>
                      {t("accept")}
                    </Btn>
                    <Btn
                      variant="secondary"
                      className="h-10 text-[13px]"
                      onClick={() => ignoreRequest(r.id)}
                    >
                      {t("ignore")}
                    </Btn>
                    <Btn
                      variant="danger"
                      className="h-10 text-[13px]"
                      onClick={() => setBlockId(r.fromId)}
                    >
                      {t("block")}
                    </Btn>
                  </div>
                  <button
                    type="button"
                    className="mt-2 w-full text-center text-[13px] text-muted"
                    onClick={() => setReportId(r.fromId)}
                  >
                    {t("report")}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
      <ReportSheet
        open={Boolean(reportId)}
        onClose={() => setReportId(null)}
        kind="user"
        targetId={reportId ?? ""}
        blockUserId={reportId ?? undefined}
      />
      {blockId ? (
        <BlockSheet open onClose={() => setBlockId(null)} userId={blockId} />
      ) : null}
    </div>
  );
}

export function GlobalSearchScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const users = useWgoStore((s) => s.users);
  const chats = useWgoStore((s) => s.chats);
  const listings = useWgoStore((s) => s.listings);
  const shops = useWgoStore((s) => s.shops);
  const messages = useWgoStore((s) => s.messages);
  const blocked = useWgoStore((s) => s.blockedIds);
  const markRead = useWgoStore((s) => s.markRead);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const people = query
    ? Object.values(users).filter(
        (u) =>
          !blocked.includes(u.id) &&
          `${u.displayName} ${u.username} ${u.bio}`.toLowerCase().includes(query),
      )
    : [];
  const chatHits = query
    ? chats.filter((c) => !isPrivateChat(c.id) && (c.name ?? "").toLowerCase().includes(query))
    : [];
  const msgHits = query
    ? Object.values(messages)
        .flat()
        .filter((m) => !isPrivateChat(m.chatId) && m.text?.toLowerCase().includes(query))
        .slice(0, 8)
    : [];
  const listingHits = query
    ? listings.filter((l) => `${l.title} ${l.city}`.toLowerCase().includes(query))
    : [];
  const shopHits = query
    ? shops.filter((s) => `${s.name} ${s.handle} ${s.city} ${s.bio}`.toLowerCase().includes(query))
    : [];
  const total =
    people.length + chatHits.length + msgHits.length + listingHits.length + shopHits.length;

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("searchGlobal")} onBack={pop} />
      <div className="px-4 pb-3">
        <SearchField
          autoFocus
          placeholder={t("searchHint")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        {!query ? (
          <p className="pt-8 text-center text-[14px] text-muted">{t("searchHint")}</p>
        ) : total === 0 ? (
          <p className="pt-8 text-center text-[14px] text-muted">{t("noResults")}</p>
        ) : (
          <>
            {people.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full items-center gap-3 py-2.5 text-left"
                onClick={() => push({ name: "found-profile", userId: u.id })}
              >
                <Avatar user={u} size={40} />
                <span>
                  <span className="block text-[15px]">{u.displayName}</span>
                  <span className="text-[13px] text-muted">@{u.username}</span>
                </span>
              </button>
            ))}
            {chatHits.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full py-2.5 text-left text-[15px]"
                onClick={() => {
                  markRead(c.id);
                  push({ name: "conversation", chatId: c.id });
                }}
              >
                {c.name}
              </button>
            ))}
            {msgHits.map((m) => (
              <button
                key={m.id}
                type="button"
                className="block w-full py-2.5 text-left"
                onClick={() => {
                  markRead(m.chatId);
                  push({ name: "conversation", chatId: m.chatId });
                }}
              >
                <span className="block truncate text-[15px]">{m.text}</span>
                <span className="text-[12px] text-muted">{formatChatTime(m.createdAt, "fr")}</span>
              </button>
            ))}
            {shopHits.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex w-full items-center gap-3 py-2.5 text-left"
                onClick={() => push({ name: "shop", shopId: s.id })}
              >
                {s.image ? (
                  <SmartImg src={s.image} alt="" className="size-10 rounded-md object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-md bg-navy text-[11px] text-accent">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span>
                  <span className="block text-[15px]">{s.name}</span>
                  <span className="text-[13px] text-muted">
                    {t("shopContext")} · @{s.handle}
                  </span>
                </span>
              </button>
            ))}
            {listingHits.map((l) => (
              <button
                key={l.id}
                type="button"
                className="flex w-full items-center gap-3 py-2.5 text-left"
                onClick={() => push({ name: "listing", listingId: l.id })}
              >
                <SmartImg src={l.image} alt="" className="size-12 rounded-md object-cover" />
                <span>
                  <span className="block text-[15px]">{l.title}</span>
                  <span className="text-[13px] text-muted">{l.price}</span>
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function NewGroupScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const users = useWgoStore((s) => s.users);
  const createGroup = useWgoStore((s) => s.createGroup);
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [pick, setPick] = useState(false);
  const contacts = Object.values(users).filter((u) => u.connected);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("createGroup")} onBack={pop} />
      <p className="px-5 pb-3 text-[13px] leading-relaxed text-muted">{t("groupQrBody")}</p>
      <div className="flex flex-col items-center px-4 pb-3">
        <button
          type="button"
          className="relative"
          onClick={() => setPick(true)}
          aria-label={t("addGroupPhoto")}
        >
          {photo ? (
            <SmartImg src={photo} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-navy text-paper">
              <Camera className="size-7" />
            </span>
          )}
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg">
            <Camera className="size-3.5" />
          </span>
        </button>
        <span className="mt-2 text-[13px] font-medium text-accent">
          {photo ? t("changeGroupPhoto") : t("addGroupPhoto")}
        </span>
      </div>
      <div className="px-4">
        <SearchField
          placeholder={t("groupName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-4 flex-1 overflow-y-auto no-scrollbar">
        {contacts.map((u) => {
          const on = ids.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
              onClick={() =>
                setIds((prev) => (on ? prev.filter((x) => x !== u.id) : [...prev, u.id]))
              }
            >
              <Avatar user={u} size={40} />
              <span className="flex-1 text-[15px]">{u.displayName}</span>
              <span className={cn("size-5 rounded-full hairline", on && "bg-accent")} />
            </button>
          );
        })}
      </div>
      <div className="p-4 pb-8">
        <Btn
          className="w-full"
          disabled={!name.trim() || ids.length < 1}
          onClick={() => createGroup(name.trim(), ids, photo)}
        >
          {t("create")}
        </Btn>
      </div>
      <GallerySheet
        open={pick}
        onClose={() => setPick(false)}
        onPick={setPhoto}
        title={t("addGroupPhoto")}
      />
    </div>
  );
}

export function MyGroupsScreen() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const users = useWgoStore((s) => s.users);
  const chats = useWgoStore((s) => s.chats);
  const markRead = useWgoStore((s) => s.markRead);
  const groups = chats
    .filter((c) => c.type === "group" && c.participantIds.includes("me") && !c.archived)
    .sort((a, b) => b.lastAt - a.lastAt);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header
        title={t("myGroups")}
        onBack={pop}
        right={
          <IconBtn label={t("createGroup")} onClick={() => push({ name: "new-group" })}>
            <Plus className="size-5" />
          </IconBtn>
        }
      />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {groups.length === 0 ? (
          <Empty
            title={t("groupsEmpty")}
            body={t("groupsEmptySub")}
            action={<Btn onClick={() => push({ name: "new-group" })}>{t("createGroup")}</Btn>}
          />
        ) : (
          groups.map((chat) => {
            const faces = chat.participantIds
              .filter((id) => id !== "me")
              .map((id) => users[id]);
            return (
              <button
                key={chat.id}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                onClick={() => {
                  markRead(chat.id);
                  push({ name: "conversation", chatId: chat.id });
                }}
              >
                <GroupAvatar users={faces} size={52} photo={chat.avatar} />
                <span className="min-w-0 flex-1 border-b border-hair pb-2.5">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[16px] font-medium">{chat.name}</span>
                    <span className="ml-auto shrink-0 text-[12px] text-muted tabular-nums">
                      {formatChatTime(chat.lastAt, lang)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[14px] text-muted">
                      {chat.preview}
                    </span>
                    {chat.unread ? <Badge>{chat.unread}</Badge> : null}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


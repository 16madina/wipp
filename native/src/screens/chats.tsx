import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  BellOff,
  ChevronRight,
  Clock,
  Hash,
  Lock,
  MapPin,
  Music,
  Play,
  Plus,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react-native";
import { Avatar, GroupAvatar } from "../components/Avatar";
import { WippWordmark } from "../components/Logo";
import {
  Badge,
  Btn,
  Chip,
  Empty,
  GlassHeader,
  Header,
  IconBtn,
  PendingNote,
  Press,
  ScreenRoot,
  SearchField,
} from "../components/ui";
import { formatChatTime, formatRemainShort } from "../lib/format";
import { haptic } from "../lib/haptics";
import { SHOP_CAT_KEYS } from "../lib/i18n";
import { usePrivatePinAsk } from "../components/PrivatePinGate";
import {
  authenticatePrivate,
  isPrivateEnabled,
  lastPinWaitMs,
  lockChatPrivate,
  lockPrivateSession,
  unlockChatFromPrivate,
} from "../lib/private-vault";
import { pushProtect } from "../lib/screen-protection";
import { orderedOtherStoryUsers, storyRing, type StoryRing } from "../lib/story-status";
import { chatPeer, isChatSealed, isPrivateChat, useT, useWippStore } from "../lib/store";
import type { StoryItem } from "../lib/types";
import { isSeedDemoChat } from "../lib/seed";
import { isStoryLive, type Chat, type Shop } from "../lib/types";
import { colors, layout } from "../theme";
import { useDeviceLayout } from "../lib/device-layout";

function shopFace(shop: Shop) {
  return { displayName: shop.name, avatar: shop.image, online: true };
}

export function ChatsScreen() {
  const t = useT();
  const lang = useWippStore((s) => s.language);
  const me = useWippStore((s) => s.me);
  const users = useWippStore((s) => s.users);
  const chats = useWippStore((s) => s.chats);
  const serverConnected = useWippStore((s) => s.serverConnected);
  const shops = useWippStore((s) => s.shops);
  const storyRows = useWippStore((s) => s.stories);
  const stories = serverConnected ? storyRows.filter((story) => story.id.startsWith("sty_")) : storyRows;
  const pending = useWippStore(
    (s) =>
      s.requests.filter((r) => r.status === "pending").length +
      (s.serverConnected ? 0 : s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length),
  );
  const push = useWippStore((s) => s.push);
  const markRead = useWippStore((s) => s.markRead);
  const verifiedIds = useWippStore((s) => s.verifiedIds);
  const blockedIds = useWippStore((s) => s.blockedIds);
  const { compact, headerIcon } = useDeviceLayout();
  const [filter, setFilter] = useState<"all" | "personal" | "shops" | "groups">("all");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const now = Date.now();
  const drafts = useWippStore((s) => s.drafts);
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  const { askPin, gate } = usePrivatePinAsk();
  const hold = useRef<{ haptic?: ReturnType<typeof setTimeout>; open?: ReturnType<typeof setTimeout> }>({});
  void vaultEpoch;

  useEffect(() => {
    if (useWippStore.getState().onboarded) void useWippStore.getState().syncServerInbox();
  }, []);

  const visible = chats
    .filter((c) => !c.archived && !c.isRequest && c.participantIds.includes("me") && !isPrivateChat(c.id))
    .filter((c) => !serverConnected || !isSeedDemoChat(c.id))
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

  const shopUnread = chats
    .filter((c) => c.shopId && !c.archived && !c.isRequest && c.participantIds.includes("me") && !isPrivateChat(c.id))
    .filter((c) => !serverConnected || !isSeedDemoChat(c.id))
    .reduce((n, c) => n + (c.unread || 0), 0);

  const storyUsers = useMemo(
    () => orderedOtherStoryUsers(stories.filter((story) => !blockedIds.includes(story.userId))),
    [stories, blockedIds],
  );
  const myStory = stories.filter((s) => s.userId === "me" && isStoryLive(s, now)).length > 0;

  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
          <Pressable
            accessibilityLabel="WIPP"
            onPressIn={() => {
              if (!isPrivateEnabled()) return;
              hold.current.haptic = setTimeout(() => haptic("select"), 2500);
              hold.current.open = setTimeout(() => {
                void (async () => {
                  haptic("select");
                  const ok = await authenticatePrivate(askPin);
                  if (ok) {
                    haptic("success");
                    push({ name: "wipp-private" });
                    return;
                  }
                  if (lastPinWaitMs() > 0) {
                    haptic("error");
                    const secs = Math.max(1, Math.ceil(lastPinWaitMs() / 1000));
                    Alert.alert("WIPP", `Réessaie dans ${secs} s.`);
                  }
                })();
              }, 3000);
            }}
            onPressOut={() => {
              if (hold.current.haptic) clearTimeout(hold.current.haptic);
              if (hold.current.open) clearTimeout(hold.current.open);
              hold.current = {};
            }}
          >
            <WippWordmark size={compact ? 18 : 22} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <IconBtn size={headerIcon} label={t("search")} onPress={() => push({ name: "global-search" })}>
            <Search size={20} color={colors.fg} />
          </IconBtn>
          <IconBtn size={headerIcon} label={t("newChat")} onPress={() => push({ name: "new-chat" })}>
            <Plus size={20} color={colors.fg} />
          </IconBtn>
          <Press onPress={() => push({ name: "me" })}>
            <Avatar user={me} size={32} />
          </Press>
        </View>
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 16 }}>
          <Press accessibilityLabel={t("addStory")} onPress={() => push({ name: "new-story" })} style={{ width: 64, alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(139,147,167,0.6)", alignItems: "center", justifyContent: "center" }}>
              <Plus size={24} color={colors.muted} strokeWidth={2.5} />
            </View>
            <Text numberOfLines={1} style={{ marginTop: 6, fontSize: 11, color: colors.muted, width: "100%", textAlign: "center" }}>
              {t("storyAddShort")}
            </Text>
          </Press>
          <Press onPress={() => { if (myStory) push({ name: "stories", userId: "me" }); }} style={{ width: 64, alignItems: "center" }}>
            <Avatar user={me} size={56} ring={storyRing(stories, "me")} />
            <Text numberOfLines={1} style={{ marginTop: 6, fontSize: 11, color: colors.muted, width: "100%", textAlign: "center" }}>
              {t("yourStory")}
            </Text>
          </Press>
          {storyUsers.map((id) => {
            const u = users[id];
            const ring = storyRing(stories, id);
            const withMusic = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.music);
            const withVideo = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.type === "video");
            return (
              <Press key={id} onPress={() => push({ name: "stories", userId: id })} style={{ width: 64, alignItems: "center" }}>
                <View>
                  <Avatar user={u} size={56} ring={ring === "none" ? "muted" : ring} />
                  {withVideo || withMusic ? (
                    <View style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                      {withVideo ? <Play size={12} color={colors.accentFg} /> : <Music size={12} color={colors.accentFg} />}
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ marginTop: 6, fontSize: 11, color: colors.muted, width: "100%", textAlign: "center" }}>
                  {u?.displayName}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
        <Press onPress={() => push({ name: "requests" })} style={{ marginHorizontal: 16, height: 40, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <UserPlus size={18} color={pending > 0 ? colors.accent : colors.muted} />
          <Text style={{ fontSize: 14, color: pending > 0 ? colors.fg : colors.muted, fontFamily: pending > 0 ? "Inter_500Medium" : "Inter_400Regular" }}>{t("requests")}</Text>
          <View style={{ flex: 1 }} />
          {pending > 0 ? <Badge n={pending} /> : null}
          <ChevronRight size={16} color={colors.muted} />
        </Press>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, height: 44, alignItems: "center", gap: 8 }}>
          <Chip label={t("chatsAll")} active={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label={t("chatsPersonal")} active={filter === "personal"} onPress={() => setFilter("personal")} />
          <Chip
            label={t("chatsShops")}
            active={filter === "shops"}
            onPress={() => setFilter("shops")}
            trailing={shopUnread > 0 ? <View style={{ marginLeft: 6 }}><Badge n={shopUnread} /></View> : null}
          />
          <Chip label={t("chatsGroups")} active={filter === "groups"} onPress={() => setFilter("groups")} />
        </ScrollView>
        {visible.length === 0 ? (
          <Empty
            title={filter === "groups" ? t("groupsEmpty") : t("chatsEmpty")}
            body={filter === "groups" ? t("groupsEmptySub") : t("chatsEmptySub")}
            action={<Btn label={filter === "groups" ? t("createGroup") : t("connectCta")} onPress={() => push({ name: filter === "groups" ? "new-group" : "connect" })} />}
          />
        ) : (
          visible.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              onOpen={() => {
                markRead(chat.id);
                push({ name: "conversation", chatId: chat.id });
              }}
              onMenu={() => setMenuChatId(chat.id)}
              users={users}
              shops={shops}
              stories={stories}
              verifiedIds={verifiedIds}
              lang={lang}
              now={now}
              draft={drafts[chat.id]}
            />
          ))
        )}
      </ScrollView>
      {menuChatId ? (
        <Press
          onPress={() => setMenuChatId(null)}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          <View style={{ marginBottom: 24, marginHorizontal: 16, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface }}>
            {[
              ["Épingler", () => useWippStore.getState().pinChat(menuChatId, true)],
              ["Archiver", () => useWippStore.getState().archiveChat(menuChatId, true)],
              ["Sourdine toujours", () => useWippStore.getState().setMute(menuChatId, "always")],
              ["Sourdine 1 heure", () => useWippStore.getState().setMute(menuChatId, "1h")],
              ["Sourdine 8 heures", () => useWippStore.getState().setMute(menuChatId, "8h")],
              ["Sourdine 1 semaine", () => useWippStore.getState().setMute(menuChatId, "1w")],
              ["Réactiver les notifications", () => useWippStore.getState().setMute(menuChatId, "off")],
              ["Marquer lu / non lu", () => useWippStore.getState().toggleUnread(menuChatId)],
              ["Archives", () => push({ name: "archives" })],
              [
                "Masquer et verrouiller",
                () => {
                  const id = menuChatId;
                  if (!id) return;
                  if (!isPrivateEnabled()) {
                    Alert.alert("WIPP", "Active WIPP Privé dans Confidentialité.");
                    return;
                  }
                  Alert.alert(
                    "Masquer et verrouiller",
                    "Cette conversation disparaîtra de Chats. Elle restera uniquement dans WIPP Privé.",
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Masquer",
                        onPress: () => {
                          void lockChatPrivate(id, askPin).then((ok) => {
                            if (ok) {
                              haptic("success");
                              return;
                            }
                            if (lastPinWaitMs() > 0) {
                              haptic("error");
                              const secs = Math.max(1, Math.ceil(lastPinWaitMs() / 1000));
                              Alert.alert("WIPP", `Réessaie dans ${secs} s.`);
                            }
                          });
                        },
                      },
                    ],
                  );
                },
              ],
            ].map(([label, fn]) => (
              <Press
                key={String(label)}
                onPress={() => {
                  (fn as () => void)();
                  setMenuChatId(null);
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 14 }}
              >
                <Text style={{ fontSize: 16, color: colors.fg }}>{label as string}</Text>
              </Press>
            ))}
          </View>
        </Press>
      ) : null}
      {gate}
    </ScreenRoot>
  );
}

function ChatRow({
  chat,
  onOpen,
  onMenu,
  users,
  shops,
  stories,
  verifiedIds,
  lang,
  now,
  draft,
}: {
  chat: Chat;
  onOpen: () => void;
  onMenu: () => void;
  users: ReturnType<typeof useWippStore.getState>["users"];
  shops: Shop[];
  stories: StoryItem[];
  verifiedIds: string[];
  lang: "fr" | "en";
  now: number;
  draft?: string;
}) {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const peer = chatPeer(chat, users);
  const shop = chat.shopId ? shops.find((s) => s.id === chat.shopId) : undefined;
  const mineShop = Boolean(shop && shop.ownerId === "me");
  const personStory = Boolean(peer && chat.type !== "group" && !(shop && !mineShop));
  const ring: StoryRing = personStory && peer ? storyRing(stories, peer.id) : "none";
  const groupUsers = chat.participantIds.filter((id) => id !== "me").map((id) => users[id]);
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
  const preview = sealed ? t("sealedKeepsNone") : draft?.trim() ? `Brouillon : ${draft}` : chat.preview;
  const stamp = ephemeral && chat.expiresAt ? formatRemainShort(chat.expiresAt, now) : formatChatTime(chat.lastAt, lang);
  return (
    <View style={{ minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
      <Press
        accessibilityLabel={ring === "none" ? "Ouvrir la conversation" : "Voir la story"}
        onPress={() => {
          if (ring !== "none" && peer) push({ name: "stories", userId: peer.id });
          else onOpen();
        }}
        onLongPress={onMenu}
      >
        {chat.type === "group" ? (
          <GroupAvatar users={groupUsers} size={52} fallback={chat.avatar} />
        ) : (
          <Avatar user={shop && !mineShop ? shopFace(shop) : peer} size={52} ring={ring} />
        )}
      </Press>
      <Press onPress={onOpen} onLongPress={onMenu} style={{ flex: 1, minWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: colors.fg }}>
            {title}
          </Text>
          {shop ? (
            <View style={{ borderRadius: 999, backgroundColor: colors.navy, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: colors.accent }}>
                {mineShop ? `${shop.name} · Professionnel` : "Professionnel"}
              </Text>
            </View>
          ) : null}
          {peer && verifiedIds.includes(peer.id) ? <ShieldCheck size={14} color={colors.accent} /> : !sealed && chat.type !== "group" ? <Lock size={14} color={colors.muted} /> : null}
          {ephemeral ? <Clock size={14} color={colors.accent} /> : null}
          {chat.muted ? <BellOff size={14} color={colors.muted} /> : null}
          <Text style={{ marginLeft: "auto", fontSize: 12, color: ephemeral ? colors.accent : colors.muted }}>{stamp}</Text>
        </View>
        <View style={{ marginTop: 2, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: sealed ? colors.muted : chat.unread ? colors.fg : colors.muted }}>
            {shop && !sealed ? `${t(SHOP_CAT_KEYS[shop.category])} · ${preview}` : preview}
          </Text>
          {!sealed && chat.unread ? <Badge n={chat.unread} /> : null}
        </View>
      </Press>
    </View>
  );
}

export function NewChatScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const users = useWippStore((s) => s.users);
  const blocked = useWippStore((s) => s.blockedIds);
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const [q, setQ] = useState("");
  const contacts = Object.values(users).filter(
    (u) => u.connected && !blocked.includes(u.id) && `${u.displayName} ${u.username}`.toLowerCase().includes(q.toLowerCase()),
  );
  const actions = [
    { icon: ScanLine, label: t("scanQr"), go: () => push({ name: "scanner" }) },
    { icon: QrCode, label: t("shareMyWgo"), go: () => push({ name: "my-qr" }) },
    { icon: Hash, label: t("liveCode"), go: () => push({ name: "live-code" }) },
    { icon: Users, label: t("createGroup"), go: () => push({ name: "new-group" }) },
    { icon: MapPin, label: t("nearbyPeople"), go: () => push({ name: "nearby" }) },
  ];
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("newChat")} onBack={pop} />
      </GlassHeader>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <SearchField placeholder={t("searchPeople")} value={q} onChangeText={setQ} />
      </View>
      <ScrollView>
        {actions.map((a) => (
          <Press key={a.label} onPress={a.go} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
              <a.icon size={20} color={colors.fg} />
            </View>
            <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.fg }}>{a.label}</Text>
          </Press>
        ))}
        <Text style={{ marginTop: 16, paddingHorizontal: 16, paddingBottom: 8, fontSize: 12, fontFamily: "Inter_500Medium", color: colors.muted }}>
          {t("wgoContacts")}
        </Text>
        {contacts.map((u) => (
          <Press key={u.id} onPress={() => openOrCreateDm(u.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Avatar user={u} size={44} />
            <View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.fg }}>{u.displayName}</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>@{u.username}</Text>
            </View>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function RequestsScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const requests = useWippStore((s) => s.requests);
  const intros = useWippStore((s) => s.intros);
  const users = useWippStore((s) => s.users);
  const acceptRequest = useWippStore((s) => s.acceptRequest);
  const ignoreRequest = useWippStore((s) => s.ignoreRequest);
  const declineRequest = useWippStore((s) => s.declineRequest);
  const blockUser = useWippStore((s) => s.blockUser);
  const blockedIds = useWippStore((s) => s.blockedIds);
  const live = useWippStore((s) => s.serverConnected);
  const pending = requests.filter((r) => r.status === "pending" && !blockedIds.includes(r.fromId));
  const pendingIntros = live ? [] : intros.filter((i) => i.recipientId === "me" && i.status === "pending");
  useEffect(() => {
    if (live) void useWippStore.getState().refreshIncomingRequests();
  }, [live]);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("requests")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {!live && __DEV__ ? (
          <Press onPress={() => push({ name: "touch-incoming" })} style={{ marginBottom: 12, minHeight: 48, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.fg }}>Demande WIPP Touch reçue</Text>
            <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>Démo</Text>
            </View>
          </Press>
        ) : null}
        {pendingIntros.length === 0 && pending.length === 0 ? <Empty title={t("noResults")} /> : null}
        {pendingIntros.map((intro) => {
          const from = users[intro.introducerId];
          return (
            <Press key={intro.id} onPress={() => push({ name: "intro-detail", introId: intro.id })} style={{ marginBottom: 12, borderRadius: 12, backgroundColor: colors.surface, padding: 16 }}>
              <Text style={{ fontFamily: "Inter_500Medium", color: colors.fg }}>{t("someone")}</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{t("usernameHidden")}</Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: colors.muted }}>
                {t("introBy")} {from?.displayName}
              </Text>
            </Press>
          );
        })}
        {pending.map((r) => {
          const u = users[r.fromId];
          return (
            <View key={r.id} style={{ marginBottom: 12, borderRadius: 12, backgroundColor: colors.surface, padding: 16 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Avatar user={u} size={48} />
                <View>
                  <Text style={{ fontFamily: "Inter_500Medium", color: colors.fg }}>{u?.displayName}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>@{u?.username}</Text>
                  <Text style={{ marginTop: 8, fontSize: 14, color: colors.muted }}>{r.preview}</Text>
                </View>
              </View>
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View style={{ flexGrow: 1, minWidth: 70 }}>
                  <Btn label={t("accept")} onPress={() => acceptRequest(r.id)} style={{ height: 40 }} />
                </View>
                <View style={{ flexGrow: 1, minWidth: 70 }}>
                  <Btn label="Refuser" variant="secondary" onPress={() => declineRequest(r.id)} style={{ height: 40 }} />
                </View>
                <View style={{ flexGrow: 1, minWidth: 70 }}>
                  <Btn label={t("ignore")} variant="secondary" onPress={() => ignoreRequest(r.id)} style={{ height: 40 }} />
                </View>
                <View style={{ flexGrow: 1, minWidth: 70 }}>
                  <Btn label="Bloquer" variant="danger" onPress={() => blockUser(r.fromId)} style={{ height: 40 }} />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenRoot>
  );
}

export function GlobalSearchScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const users = useWippStore((s) => s.users);
  const chats = useWippStore((s) => s.chats);
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  void vaultEpoch;
  const people = Object.values(users).filter((u) => needle.length >= 1 && `${u.displayName} ${u.username}`.toLowerCase().includes(needle));
  const convos = chats.filter((c) => needle && !isPrivateChat(c.id) && (c.name ?? c.preview).toLowerCase().includes(needle));
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("search")} onBack={pop} />
      </GlassHeader>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <SearchField value={q} onChangeText={setQ} placeholder={t("search")} />
      </View>
      <ScrollView>
        {people.map((u) => (
          <Press key={u.id} onPress={() => push({ name: "found-profile", userId: u.id, via: "username" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Avatar user={u} size={44} />
            <View>
              <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>@{u.username}</Text>
            </View>
          </Press>
        ))}
        {convos.map((c) => (
          <Press key={c.id} onPress={() => push({ name: "conversation", chatId: c.id })} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: colors.fg }}>{c.name ?? c.preview}</Text>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function ArchivesScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const allChats = useWippStore((s) => s.chats);
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  void vaultEpoch;
  const chats = allChats.filter((c) => c.archived && !isPrivateChat(c.id));
  const users = useWippStore((s) => s.users);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Archives" onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {chats.length === 0 ? <Empty title={t("chatsEmpty")} /> : chats.map((c) => (
          <Press key={c.id} onPress={() => push({ name: "conversation", chatId: c.id })} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ color: colors.fg, fontSize: 16 }}>{c.name ?? chatPeer(c, users)?.displayName}</Text>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function MyGroupsScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const allChats = useWippStore((s) => s.chats);
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  void vaultEpoch;
  const groups = allChats.filter((c) => c.type === "group" && c.participantIds.includes("me") && !isPrivateChat(c.id));
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("statGroups")} onBack={pop} right={<IconBtn label={t("createGroup")} onPress={() => push({ name: "new-group" })}><Plus size={20} color={colors.fg} /></IconBtn>} />
      </GlassHeader>
      <ScrollView>
        {groups.map((g) => (
          <Press key={g.id} onPress={() => push({ name: "conversation", chatId: g.id })} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_500Medium" }}>{g.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{g.preview}</Text>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function ChatInfoScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWippStore((s) => s.users);
  const peer = chat ? chatPeer(chat, users) : undefined;
  const setDisappear = useWippStore((s) => s.setDisappear);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={chat?.name ?? peer?.displayName ?? ""} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        <Press onPress={() => chat?.type === "group" && push({ name: "group-info", chatId })} style={{ padding: 16 }}>
          <Text style={{ color: colors.fg }}>{chat?.type === "group" ? "Informations du groupe" : peer?.bio}</Text>
        </Press>
        <Press onPress={() => push({ name: "e2e-info", chatId })} style={{ padding: 16 }}>
          <Text style={{ color: colors.fg }}>{chat?.type === "group" ? "Groupe non chiffré de bout en bout" : "Chiffrement de bout en bout"}</Text>
        </Press>
        <Text style={{ paddingHorizontal: 16, paddingTop: 8, color: colors.muted, fontSize: 12 }}>Messages éphémères</Text>
        {[
          ["Désactivé", 0],
          ["24 heures", 86_400_000],
          ["7 jours", 7 * 86_400_000],
          ["30 jours", 30 * 86_400_000],
        ].map(([label, ms]) => (
          <Press key={String(label)} onPress={() => setDisappear(chatId, ms as number)} style={{ padding: 16 }}>
            <Text style={{ color: chat?.disappearAfterMs === ms || (!chat?.disappearAfterMs && ms === 0) ? colors.accent : colors.fg }}>{label as string}</Text>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function PrivateChatsScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const allChats = useWippStore((s) => s.chats);
  const vaultEpoch = useWippStore((s) => s.vaultEpoch);
  void vaultEpoch;
  const chats = allChats.filter((c) => isPrivateChat(c.id));
  const users = useWippStore((s) => s.users);
  const { askPin, gate } = usePrivatePinAsk();
  useEffect(() => {
    const release = pushProtect("private_chat");
    return () => {
      release();
    };
  }, []);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header
          title="WIPP Privé 🔒"
          onBack={() => {
            lockPrivateSession();
            pop();
          }}
        />
      </GlassHeader>
      <ScrollView>
        {chats.length === 0 ? (
          <Empty title="Aucune conversation privée" />
        ) : (
          chats.map((c) => (
            <Press
              key={c.id}
              onPress={() => push({ name: "conversation", chatId: c.id })}
              onLongPress={() => {
                Alert.alert("WIPP Privé", "Retirer de WIPP Privé ?", [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Retirer",
                    onPress: () => {
                      void unlockChatFromPrivate(c.id, askPin);
                    },
                  },
                ]);
              }}
              style={{ padding: 16 }}
            >
              <Text style={{ color: colors.fg }}>{chatPeer(c, users)?.displayName ?? c.name}</Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                {c.preview}
              </Text>
            </Press>
          ))
        )}
      </ScrollView>
      {gate}
    </ScreenRoot>
  );
}

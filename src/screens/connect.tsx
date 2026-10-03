import { useEffect, useState } from "react";
import { BadgeCheck, Lock, MapPin, Phone, QrCode, ScanLine, Search, Share2, Smartphone, Store, Video } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SmartImg } from "@/components/smart-img";
import { WippMark, WippWordmark } from "@/components/logo";
import { QrCard } from "@/components/qr-card";
import { BlockSheet, ReportSheet } from "@/components/safety";
import { Btn, Chip, Empty, Header, SearchField, StatusBar } from "@/components/ui";
import { NEARBY } from "@/lib/seed";
import { useT, useWgoStore } from "@/lib/store";
import type { FoundVia } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConnectHubExtras, ScanResultHint } from "./connect-extras";
import { getActiveTouchInvite } from "@/lib/messaging/touch-active";
import { acceptTouchCode, resolveTouchCode } from "@/lib/messaging/touch-client";
import { ensureServerSession, getStoredProfile, getStoredToken, searchUsers } from "@/lib/messaging/client";
import type { User } from "@/lib/types";

export function ConnectScreen() {
  const t = useT();
  const push = useWgoStore((s) => s.push);

  const cards = [
    { name: "scanner" as const, icon: ScanLine, title: t("scan"), sub: t("scanSub") },
    { name: "my-qr" as const, icon: QrCode, title: t("myQr"), sub: t("myQrSub") },
    { name: "search-user" as const, icon: Search, title: t("searchCard"), sub: t("searchCardSub") },
    { name: "nearby" as const, icon: MapPin, title: t("nearby"), sub: t("nearbySub") },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-10">
        <StatusBar />
        <div className="px-5 pt-2 pb-4">
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{t("connectTitle")}</h1>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32">
        <button
          type="button"
          onClick={() => push({ name: "wgo-touch" })}
          className="press mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-navy px-4 py-3.5 text-left text-paper ring-1 ring-accent/35"
        >
          <WippMark size={52} invert />
          <div className="flex-1">
            <p className="text-[16px] font-semibold">{t("wgoTouch")}</p>
            <p className="text-[12px] text-paper/60">{t("wgoTouchSub")}</p>
          </div>
          <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-accent-fg">
            {t("touchLive")}
          </span>
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {cards.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => push({ name: c.name })}
              className="press flex min-h-[108px] flex-col items-start rounded-2xl glass-card p-3.5 text-left"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-navy text-paper">
                <c.icon className="size-5" />
              </span>
              <span className="mt-auto pt-3 text-[15px] font-semibold">{c.title}</span>
              <span className="mt-0.5 text-[11px] leading-snug text-muted">{c.sub}</span>
            </button>
          ))}
        </div>
        <ConnectHubExtras />
      </div>
    </div>
  );
}

function profileFromServer(p: { id: string; username: string; displayName: string; avatarUrl?: string | null; bio?: string }): User {
  return {
    id: `srvuser:${p.id}`,
    username: p.username,
    firstName: p.displayName.split(" ")[0] ?? p.displayName,
    lastName: p.displayName.split(" ").slice(1).join(" "),
    displayName: p.displayName,
    avatar: p.avatarUrl || "",
    bio: p.bio || "",
    online: false,
    connected: false,
    city: "",
  };
}

function usernameFromQr(raw: string) {
  const text = raw.trim();
  const at = text.match(/(?:^|\/)@([a-z0-9._]{2,30})/i);
  if (at) return at[1]!.toLowerCase();
  if (/^@?[a-z0-9._]{2,30}$/i.test(text)) return text.replace(/^@/, "").toLowerCase();
  return null;
}

export function MyQrScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const me = useWgoStore((s) => s.me);
  const serverUsername = useWgoStore((s) => s.serverUsername);
  const [copied, setCopied] = useState(false);
  const touchInvite = getActiveTouchInvite();
  const isTouchShare = Boolean(touchInvite?.status === "active" && touchInvite.code);
  const linked = getStoredProfile();
  const username = (serverUsername || linked?.username || "").replace(/^@/, "").toLowerCase();
  const displayName = linked?.displayName || (username && username === me.username ? me.displayName : username);
  const link = isTouchShare ? touchInvite!.qrPayload.replace(/^https?:\/\//, "") : `wippapp.com/@${username}`;
  const qrValue = isTouchShare ? touchInvite!.qrPayload : `https://${link}`;
  const shareUrl = isTouchShare ? touchInvite!.qrPayload : `https://${link}`;

  async function share() {
    const payload = {
      title: "Wipp",
      text: isTouchShare ? `Code WIPP Touch ${touchInvite!.code}` : `@${username}`,
      url: shareUrl,
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(isTouchShare ? touchInvite!.code : shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      await navigator.clipboard.writeText(isTouchShare ? touchInvite!.code : shareUrl);
      setCopied(true);
    }
  }

  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header title={isTouchShare ? t("wgoTouch") : t("myQr")} onBack={pop} className="text-paper [&_button]:text-paper" />
      <div className="flex flex-1 flex-col items-center overflow-y-auto no-scrollbar px-6 pt-2 pb-10">
        <WippWordmark className="mb-4 text-[22px] text-paper" />
        {username || isTouchShare ? (
          <>
        <Avatar user={{ displayName: displayName || me.displayName, avatar: linked?.avatarUrl || me.avatar, online: me.online }} size={72} />
        <p className="mt-3 text-[20px] font-semibold">{displayName}</p>
        <p className="text-[14px] text-paper/60">@{username}</p>
        {isTouchShare ? (
          <p className="mt-2 font-mono text-[22px] font-semibold tracking-[0.2em] text-accent">{touchInvite!.code}</p>
        ) : null}
        <div className="wipp-card mt-5 rounded-2xl p-1">
          <div className="rounded-xl bg-paper p-4">
            <QrCard value={qrValue} size={220} />
          </div>
        </div>
        <p className="mt-4 max-w-[28ch] text-center text-[13px] leading-relaxed text-paper/60">
          {isTouchShare ? t("touchFail") : t("myCardHint")}
        </p>
        <p className="mt-1 text-[12px] text-paper/40">{isTouchShare ? touchInvite!.qrPayload : link}</p>
        <Btn className="mt-5 w-full" onClick={share}>
          <Share2 className="size-4" />
          {copied ? t("copied") : t("shareMyCard")}
        </Btn>
        {!isTouchShare ? (
          <Btn variant="secondary" className="mt-2 w-full" onClick={() => push({ name: "wgo-touch" })}>
            <Smartphone className="size-4" />
            {t("wgoTouch")}
          </Btn>
        ) : null}
          </>
        ) : (
          <p className="mt-8 max-w-[28ch] text-center text-[15px] leading-relaxed text-paper/80">
            {t("qrNeedsAccount")}
          </p>
        )}
      </div>
    </div>
  );
}

export function ScannerScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const replace = useWgoStore((s) => s.replace);
  const completeTouch = useWgoStore((s) => s.completeTouch);
  const redeemQr = useWgoStore((s) => s.redeemQr);
  const me = useWgoStore((s) => s.me);
  const serverUsername = useWgoStore((s) => s.serverUsername);
  const [scan, setScan] = useState<null | "once" | "group" | "shop">(null);
  const [fail, setFail] = useState<string | null>(null);
  const [touchCode, setTouchCode] = useState("");
  const [touchBusy, setTouchBusy] = useState(false);
  const [qrText, setQrText] = useState("");
  const [qrBusy, setQrBusy] = useState(false);

  async function lookupProfile(raw: string) {
    const username = usernameFromQr(raw);
    if (!username) {
      setFail(t("codeNotFound"));
      return;
    }
    const mine = (serverUsername || getStoredProfile()?.username || "").toLowerCase();
    if (mine && mine === username) {
      setFail(t("ownQr"));
      return;
    }
    if (!getStoredToken()) {
      setFail(t("connectNeedsAccount"));
      return;
    }
    setQrBusy(true);
    setFail(null);
    try {
      const hits = await searchUsers(username);
      const hit = hits.find((p) => p.username.toLowerCase() === username);
      if (!hit) {
        setFail(t("noResults"));
        return;
      }
      const user = profileFromServer(hit);
      useWgoStore.setState((st) => ({ users: { ...st.users, [user.id]: user } }));
      replace({ name: "found-profile", userId: user.id, via: "qr" });
    } catch (err) {
      setFail(err instanceof Error ? err.message : t("codeNotFound"));
    } finally {
      setQrBusy(false);
    }
  }

  async function redeemTouchCode(raw: string) {
    const code = raw
      .trim()
      .toUpperCase()
      .replace(/^.*\/T\//i, "")
      .replace(/[^A-Z0-9]/g, "");
    if (code.length < 6) {
      setFail(t("codeNotFound"));
      return;
    }
    setTouchBusy(true);
    setFail(null);
    try {
      if (!getStoredToken()) {
        await ensureServerSession({
          username: me.username || "deena",
          displayName: me.displayName,
        });
      }
      await resolveTouchCode(code, { manual: true });
      const { invite } = await acceptTouchCode(code);
      const r = invite.receiver;
      const sender = invite.sender;
      useWgoStore.setState((st) => ({
        users: {
          ...st.users,
          [sender.id]: {
            ...st.users[sender.id],
            id: sender.id,
            firstName: sender.firstName,
            lastName: "",
            displayName: sender.displayName,
            username: sender.username,
            bio: "",
            avatar: sender.avatarUrl || "/avatars/deena.jpg",
            online: true,
            city: "",
            connected: true,
          },
        },
      }));
      completeTouch(sender.id);
      replace({ name: "found-profile", userId: sender.id, via: "touch" });
      void r;
    } catch (err) {
      setFail(err instanceof Error ? err.message : t("codeNotFound"));
    } finally {
      setTouchBusy(false);
    }
  }

  useEffect(() => {
    if (!scan) return;
    const id = window.setTimeout(() => {
      if (scan === "group") {
        replace({ name: "group-invite", token: "soiree-samedi" });
        return;
      }
      const token =
        scan === "once" ? "once-lea-cafe" : scan === "shop" ? "shop-nails" : "event-soiree-sam";
      const res = redeemQr(token);
      if (!res.ok) {
        setFail(
          res.reason === "used"
            ? t("codeUsed")
            : res.reason === "expired"
              ? t("qrExpired")
              : t("codeNotFound"),
        );
        setScan(null);
      }
    }, 1100);
    return () => window.clearTimeout(id);
  }, [scan, replace, redeemQr, t]);

  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <StatusBar />
      <Header title={t("scan")} onBack={pop} className="text-paper [&_button]:text-paper" />
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <button
          type="button"
          onClick={() => {
            setFail(null);
            if (qrText.trim()) void lookupProfile(qrText);
            else setFail(t("pasteQr"));
          }}
          className="relative size-64"
          aria-label={t("scanAction")}
        >
          <span className="absolute inset-0 rounded-3xl border border-accent/40" />
          <span className="absolute top-0 left-0 h-8 w-8 rounded-tl-2xl border-t-2 border-l-2 border-accent" />
          <span className="absolute top-0 right-0 h-8 w-8 rounded-tr-2xl border-t-2 border-r-2 border-accent" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-accent" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-accent" />
          <span
            className={cn(
              "absolute inset-x-3 h-0.5 bg-accent/80",
              scan ? "top-4 animate-pulse" : "top-1/2",
            )}
          />
        </button>
        <p className="mt-6 text-[14px] text-paper/60">{t("scanHint")}</p>
        {fail ? <p className="mt-2 text-[13px] text-danger">{fail}</p> : null}
        <div className="mt-6 w-full rounded-2xl bg-paper/8 p-3 ring-1 ring-paper/10">
          <p className="mb-2 text-center text-[12px] text-paper/50">QR ou @username</p>
          <input
            value={qrText}
            onChange={(e) => setQrText(e.target.value)}
            placeholder="wippapp.com/@pseudo"
            className="h-11 w-full rounded-xl bg-ink px-3 text-center text-[15px] text-paper outline-none ring-1 ring-paper/15"
          />
          <Btn
            className="mt-2 w-full"
            disabled={qrBusy || qrText.trim().length < 2}
            onClick={() => void lookupProfile(qrText)}
          >
            {qrBusy ? "…" : t("scanProfile")}
          </Btn>
        </div>
        <div className="mt-6 w-full rounded-2xl bg-paper/8 p-3 ring-1 ring-paper/10">
          <p className="mb-2 text-center text-[12px] text-paper/50">Code WIPP Touch</p>
          <input
            value={touchCode}
            onChange={(e) => setTouchCode(e.target.value.toUpperCase())}
            placeholder="ABCD2345"
            maxLength={12}
            className="h-11 w-full rounded-xl bg-ink px-3 text-center font-mono text-[18px] tracking-[0.2em] text-paper outline-none ring-1 ring-paper/15"
          />
          <Btn
            className="mt-2 w-full"
            disabled={touchBusy || touchCode.trim().length < 6}
            onClick={() => void redeemTouchCode(touchCode)}
          >
            {touchBusy ? "…" : t("touchAllow")}
          </Btn>
        </div>
        <div className="mt-6 grid w-full gap-2">
          <Btn variant="secondary" onClick={() => { setFail(null); setScan("once"); }}>
            {t("scanOnce")}
          </Btn>
          <Btn variant="secondary" onClick={() => { setFail(null); setScan("group"); }}>
            {t("scanGroup")}
          </Btn>
          <Btn variant="secondary" onClick={() => { setFail(null); setScan("shop"); }}>
            {t("scanShop")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function SearchUserScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const users = useWgoStore((s) => s.users);
  const shops = useWgoStore((s) => s.shops);
  const blocked = useWgoStore((s) => s.blockedIds);
  const [q, setQ] = useState("");
  const query = q.replace(/^@/, "").toLowerCase();

  useEffect(() => {
    if (query.length < 2 || !getStoredToken()) return;
    const id = window.setTimeout(() => {
      void searchUsers(query)
        .then((rows) => {
          useWgoStore.setState((st) => {
            const users = { ...st.users };
            for (const row of rows) {
              const user = profileFromServer(row);
              users[user.id] = { ...users[user.id], ...user, connected: users[user.id]?.connected ?? false };
            }
            return { users };
          });
        })
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(id);
  }, [query]);
  const hits = Object.values(users).filter(
    (u) =>
      !blocked.includes(u.id) &&
      query.length > 0 &&
      (`${u.username} ${u.displayName} ${u.firstName} ${u.lastName}`.toLowerCase().includes(query)),
  );
  const shopHits = shops.filter(
    (s) =>
      query.length > 0 &&
      `${s.handle} ${s.name} ${s.city}`.toLowerCase().includes(query),
  );

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("searchCard")} onBack={pop} />
      <div className="px-4">
        <SearchField
          autoFocus
          placeholder="@username"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-2 flex-1 overflow-y-auto no-scrollbar px-4">
        {shopHits.map((s) => (
          <button
            key={s.id}
            type="button"
            className="flex w-full items-center gap-3 py-3 text-left"
            onClick={() => push({ name: "shop", shopId: s.id })}
          >
            {s.image ? (
              <SmartImg src={s.image} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-navy text-accent">
                <Store className="size-5" />
              </span>
            )}
            <span>
              <span className="block text-[16px] font-medium">{s.name}</span>
              <span className="text-[13px] text-muted">
                {t("shopContext")} · @{s.handle}
              </span>
            </span>
          </button>
        ))}
        {hits.map((u) => (
          <button
            key={u.id}
            type="button"
            className="flex w-full items-center gap-3 py-3 text-left"
            onClick={() => push({ name: "found-profile", userId: u.id, via: "username" })}
          >
            <Avatar user={u} size={48} />
            <span>
              <span className="block text-[16px] font-medium">{u.displayName}</span>
              <span className="text-[13px] text-muted">@{u.username}</span>
            </span>
          </button>
        ))}
        {query && hits.length === 0 && shopHits.length === 0 ? (
          <p className="pt-10 text-center text-[14px] text-muted">{t("noResults")}</p>
        ) : null}
      </div>
    </div>
  );
}

export function NearbyScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const nearby = useWgoStore((s) => s.nearby);
  const setNearby = useWgoStore((s) => s.setNearby);
  const users = useWgoStore((s) => s.users);
  const blocked = useWgoStore((s) => s.blockedIds);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("nearby")} onBack={pop} />
      <div className="flex gap-2 px-4">
        <Chip active={nearby === 0} onClick={() => setNearby(0)}>
          {t("invisible")}
        </Chip>
        <Chip active={nearby === 5} onClick={() => setNearby(5)}>
          {t("visible5")}
        </Chip>
        <Chip active={nearby === 15} onClick={() => setNearby(15)}>
          {t("visible15")}
        </Chip>
      </div>
      <p className="px-5 pt-3 text-[13px] text-muted">{t("nearbyHint")}</p>
      <div className="mt-3 flex-1 overflow-y-auto no-scrollbar px-4">
        {nearby === 0 ? (
          <Empty title={t("nearbyOff")} body={t("nearbyHint")} />
        ) : (
          NEARBY.filter((n) => !blocked.includes(n.id)).map((n) => {
            const u = users[n.id];
            return (
              <button
                key={n.id}
                type="button"
                className="flex w-full items-center gap-3 py-3 text-left"
                onClick={() => push({ name: "found-profile", userId: n.id, via: "nearby" })}
              >
                <Avatar user={u} size={48} />
                <span className="flex-1">
                  <span className="block text-[16px] font-medium">{u?.displayName}</span>
                  <span className="text-[13px] text-muted">@{u?.username}</span>
                </span>
                <span className="text-[12px] text-muted tabular-nums">
                  {n.meters} {t("meters")}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function FoundProfileScreen({
  userId,
  via,
}: {
  userId: string;
  via?: FoundVia;
}) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const users = useWgoStore((s) => s.users);
  const me = useWgoStore((s) => s.me);
  const sent = useWgoStore((s) => s.sentRequestIds.includes(userId));
  const blocked = useWgoStore((s) => s.blockedIds.includes(userId));
  const connectWith = useWgoStore((s) => s.connectWith);
  const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
  const startCall = useWgoStore((s) => s.startCall);
  const unblockUser = useWgoStore((s) => s.unblockUser);
  const verified = useWgoStore((s) => s.verifiedIds.includes(userId));
  const chats = useWgoStore((s) => s.chats);
  const connectNotice = useWgoStore((s) => s.connectNotice);
  const user = userId === "me" ? me : users[userId];
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  if (!user) return null;
  const connected = user.connected || userId === "me";

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("foundTitle")} onBack={pop} />
      <div className="flex flex-1 flex-col items-center px-6 pt-4">
        <Avatar user={user} size={112} />
        <h1 className="mt-4 flex items-center gap-1.5 text-[24px] font-semibold">
          {user.displayName}
          {verified ? <BadgeCheck className="size-5 text-accent" /> : null}
        </h1>
        <p className="text-[15px] text-muted">@{user.username}</p>
        {connected && userId !== "me" ? (
          <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
            <Lock className="size-3" />
            {verified ? t("e2eVerified") : t("e2eOn")}
          </p>
        ) : null}
        <ScanResultHint via={via} />
        {user.bio ? (
          <p className="mt-3 max-w-[32ch] text-center text-[14px] leading-relaxed text-muted">
            {user.bio}
          </p>
        ) : null}
        <p className="mt-2 text-[12px] text-muted">
          {user.city} · 2 {t("commonContacts")}
        </p>
        {connected && userId !== "me" ? (
          <div className="mt-6 flex items-center justify-center gap-8">
            <button
              type="button"
              className="press flex flex-col items-center gap-1.5"
              onClick={() => startCall(userId, "audio")}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-navy text-paper">
                <Phone className="size-5" />
              </span>
              <span className="text-[11px] font-medium text-muted">{t("audioCall")}</span>
            </button>
            <button
              type="button"
              className="press flex flex-col items-center gap-1.5"
              onClick={() => startCall(userId, "video")}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-navy text-paper">
                <Video className="size-5" />
              </span>
              <span className="text-[11px] font-medium text-muted">{t("videoCall")}</span>
            </button>
          </div>
        ) : null}
        {connected && userId !== "me" ? (
          <button
            type="button"
            className="mt-5 flex items-center gap-2 text-[13px] text-muted"
            onClick={() => {
              const chat = chats.find(
                (c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral,
              );
              if (chat) push({ name: "e2e-info", chatId: chat.id });
              else {
                const id = openOrCreateDm(userId);
                push({ name: "e2e-info", chatId: id });
              }
            }}
          >
            <Lock className="size-3.5" />
            {t("e2eCompare")}
          </button>
        ) : null}
        {userId !== "me" ? (
          <div className="mt-5 grid w-full gap-2">
            <Btn
              disabled={sent && !connected}
              onClick={() => {
                useWgoStore.setState({ connectNotice: "" });
                if (connected) openOrCreateDm(userId);
                else connectWith(userId);
              }}
            >
              {connected ? t("message") : sent ? t("requestSent") : t("connectWith")}
            </Btn>
            {connectNotice ? (
              <p className="text-center text-[13px] text-danger">{connectNotice}</p>
            ) : null}
            {connected ? (
              <Btn
                variant="secondary"
                onClick={() => push({ name: "introduce", toUserId: userId })}
              >
                {t("introduce")}
              </Btn>
            ) : (
              <Btn variant="secondary" onClick={() => openOrCreateDm(userId, true)}>
                {t("message")}
              </Btn>
            )}
            <Btn
              variant="ghost"
              onClick={() => setReportOpen(true)}
            >
              {t("report")}
            </Btn>
            {blocked ? (
              <Btn variant="ghost" onClick={() => unblockUser(userId)}>
                {t("unblock")}
              </Btn>
            ) : (
              <Btn variant="ghost" className="text-danger" onClick={() => setBlockOpen(true)}>
                {t("block")}
              </Btn>
            )}
          </div>
        ) : null}
      </div>
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="user"
        targetId={userId}
        blockUserId={userId}
        onSubmitted={pop}
      />
      <BlockSheet
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        userId={userId}
        onBlocked={pop}
      />
    </div>
  );
}

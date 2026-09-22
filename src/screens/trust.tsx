import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Clock,
  Copy,
  Delete,
  QrCode,
  Share2,
  Shield,
} from "lucide-react";
import { Avatar, GroupAvatar } from "@/components/avatar";
import { GallerySheet } from "@/components/gallery";
import { QrCard } from "@/components/qr-card";
import { Btn, Chip, Empty, Field, Header, Sheet, StatusBar } from "@/components/ui";
import { ReportSheet, SafetyRow } from "@/components/safety";
import { findChatByInvite, groupInviteHref, groupInviteLabel } from "@/lib/invite";
import { qrPngBlob } from "@/lib/qr";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function useNow(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function countdown(expiresAt: number, now: number) {
  const s = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function LiveCodeScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const ensureMyCode = useWgoStore((s) => s.ensureMyCode);
  const regenerateMyCode = useWgoStore((s) => s.regenerateMyCode);
  const ensurePeerCode = useWgoStore((s) => s.ensurePeerCode);
  const redeemCode = useWgoStore((s) => s.redeemCode);
  const simulateCodeEntered = useWgoStore((s) => s.simulateCodeEntered);
  const setCodeChatTtl = useWgoStore((s) => s.setCodeChatTtl);
  const codeChatTtl = useWgoStore((s) => s.codeChatTtl);
  const codes = useWgoStore((s) => s.codes);
  const [tab, setTab] = useState<"mine" | "enter">("mine");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  useEffect(() => {
    ensureMyCode();
    ensurePeerCode("lea");
  }, [ensureMyCode, ensurePeerCode]);

  const mine = codes.find((c) => c.ownerId === "me");
  const lea = codes.find((c) => c.ownerId === "lea" && c.expiresAt > now);
  const live = mine && mine.expiresAt > now;
  const remain = mine ? countdown(mine.expiresAt, now) : "0:00";

  function redeemDigits(next: string) {
    const res = redeemCode(next);
    if (!res.ok) {
      setError(
        res.reason === "expired"
          ? t("codeExpired")
          : res.reason === "own"
            ? t("codeOwn")
            : t("codeNotFound"),
      );
      setDigits("");
    }
  }

  function press(d: string) {
    setError(null);
    setDigits((prev) => {
      const next = (prev + d).slice(0, 6);
      if (next.length === 6) window.setTimeout(() => redeemDigits(next), 0);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header
        title={t("liveCode")}
        onBack={pop}
        className="text-paper [&_button]:text-paper"
      />
      <div className="flex gap-2 px-4 pb-3">
        <Chip active={tab === "mine"} onClick={() => setTab("mine")}>
          {t("myCode")}
        </Chip>
        <Chip active={tab === "enter"} onClick={() => setTab("enter")}>
          {t("enterCode")}
        </Chip>
      </div>

      {tab === "mine" ? (
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pt-2 pb-6">
          <p className="text-center text-[13px] leading-relaxed text-paper/60">{t("codeHint")}</p>
          <div className="mt-5 flex gap-2">
            {(mine?.code ?? "------").split("").map((d, i) => (
              <span
                key={i}
                className={cn(
                  "flex h-12 w-9 items-center justify-center rounded-lg bg-paper/10 text-[24px] font-semibold tabular-nums",
                  i === 3 && "ml-2",
                  !live && "opacity-30",
                )}
              >
                {live ? d : "·"}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[14px] text-accent tabular-nums">
            <Clock className="size-4" />
            {live ? `${t("codeExpires")} ${remain}` : t("codeExpired")}
          </p>
          <p className="mt-5 text-[11px] font-medium tracking-wide text-paper/50 uppercase">
            {t("chatTtl")}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {(
              [
                [15 * 60_000, "ttl15"],
                [60 * 60_000, "ttl1h"],
                [24 * 60 * 60_000, "ttl24h"],
              ] as const
            ).map(([ms, key]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCodeChatTtl(ms)}
                className={cn(
                  "press h-9 rounded-full px-3.5 text-[13px] font-medium",
                  codeChatTtl === ms
                    ? "bg-accent text-accent-fg"
                    : "bg-paper/10 text-paper",
                )}
              >
                {t(key)}
              </button>
            ))}
          </div>
          <p className="mt-3 max-w-[32ch] text-center text-[12px] leading-relaxed text-paper/50">
            {t("codeVsPerm")}
          </p>
          <Btn className="mt-4 w-full" onClick={() => regenerateMyCode()}>
            {t("regenerate")}
          </Btn>
          <Btn
            variant="ghost"
            className="mt-1 w-full text-paper"
            onClick={() => simulateCodeEntered("ines")}
          >
            {t("simulateEntered")}
          </Btn>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-6 pt-2">
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "flex h-12 w-9 items-center justify-center rounded-lg bg-paper/10 text-[22px] font-semibold tabular-nums",
                  i === 3 && "ml-2",
                )}
              >
                {digits[i] ?? ""}
              </span>
            ))}
          </div>
          {error ? (
            <p className="mb-2 text-center text-[13px] text-danger">{error}</p>
          ) : null}
          {lea ? (
            <button
              type="button"
              className="mb-3 rounded-lg bg-paper/10 px-3 py-2 text-[13px] text-paper/80"
              onClick={() => {
                setError(null);
                setDigits(lea.code);
                redeemDigits(lea.code);
              }}
            >
              {t("demoCodeLea")}
            </button>
          ) : null}
          <div className="mt-auto grid grid-cols-3 gap-2 pb-8">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
              k === "" ? (
                <span key="sp" />
              ) : (
                <button
                  key={k}
                  type="button"
                  className="press flex h-14 items-center justify-center rounded-xl bg-paper/10 text-[22px] font-medium"
                  onClick={() => {
                    if (k === "del") {
                      setDigits((d) => d.slice(0, -1));
                      setError(null);
                    } else press(k);
                  }}
                  aria-label={k === "del" ? t("back") : k}
                >
                  {k === "del" ? <Delete className="size-6" /> : k}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function OneTimeQrScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const createOneTimeQr = useWgoStore((s) => s.createOneTimeQr);
  const allQrs = useWgoStore((s) => s.oneTimeQrs);
  const now = useNow(1000);
  const [mode, setMode] = useState<"once" | "event">("once");
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState(2);
  const qrs = allQrs.filter((q) => q.ownerId === "me");
  const latest = qrs[0];

  function make() {
    createOneTimeQr({
      kind: mode,
      label: mode === "once" ? t("onceTitle") : label.trim() || t("eventTitle"),
      hours: mode === "once" ? 24 : hours,
    });
  }

  const shown = latest;
  const dead =
    shown && (shown.used || shown.expiresAt < now);

  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header
        title={t("oneTimeQr")}
        onBack={pop}
        className="text-paper [&_button]:text-paper"
      />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
        {shown ? (
          <div className="flex flex-col items-center pt-2">
            <span className="mb-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-fg">
              {shown.kind === "once" ? t("onceBadge") : shown.label}
            </span>
            <div className={cn("rounded-2xl bg-paper p-3", dead && "opacity-40")}>
              <QrCard value={`wipp.me/q/${shown.token}`} size={200} />
            </div>
            <p className="mt-3 text-center text-[13px] text-paper/60">
              {dead
                ? shown.used
                  ? t("qrBurned")
                  : t("qrExpired")
                : `${t("codeExpires")} ${countdown(shown.expiresAt, now)}`}
            </p>
            <p className="mt-2 max-w-[32ch] text-center text-[12px] leading-relaxed text-paper/50">
              {shown.kind === "once" ? t("onceBody") : t("eventBody")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 pb-3">
              <Chip active={mode === "once"} onClick={() => setMode("once")}>
                {t("onceBadge")}
              </Chip>
              <Chip active={mode === "event"} onClick={() => setMode("event")}>
                {t("eventBadge")}
              </Chip>
            </div>
            <p className="text-[13px] leading-relaxed text-paper/60">
              {mode === "once" ? t("onceBody") : t("eventBody")}
            </p>
            {mode === "event" ? (
              <div className="mt-4 space-y-3">
                <Field
                  placeholder={t("eventName")}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="bg-paper/10 text-paper placeholder:text-paper/40"
                />
                <div className="flex gap-2">
                  {[
                    [2, t("exp2h")],
                    [6, t("expTonight")],
                    [24, t("exp24h")],
                  ].map(([h, l]) => (
                    <Chip key={String(h)} active={hours === h} onClick={() => setHours(Number(h))}>
                      {String(l)}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
        <Btn className="mt-5 w-full" onClick={make}>
          {shown ? t("regenerate") : mode === "once" ? t("createOnce") : t("createEvent")}
        </Btn>
      </div>
    </div>
  );
}

export function IntroduceScreen({ toUserId }: { toUserId: string }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const users = useWgoStore((s) => s.users);
  const sendIntro = useWgoStore((s) => s.sendIntro);
  const to = users[toUserId];
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const candidates = Object.values(users).filter(
    (u) => u.connected && u.id !== toUserId,
  );

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("introduceTitle")} onBack={pop} />
      <p className="px-5 pb-3 text-[13px] leading-relaxed text-muted">
        {t("introduceSub")}
      </p>
      <p className="px-5 pb-2 text-[12px] font-medium text-muted uppercase">
        {t("pickPerson")} → {to?.displayName}
      </p>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {candidates.map((u) => {
          const on = subjectId === u.id;
          return (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
              onClick={() => setSubjectId(u.id)}
            >
              <Avatar user={u} size={44} />
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{u.displayName}</span>
                <span className="text-[13px] text-muted">@{u.username}</span>
              </span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full hairline",
                  on && "bg-accent",
                )}
              >
                {on ? <Check className="size-3 text-accent-fg" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="space-y-3 p-4 pb-8">
        <Field
          placeholder={t("introNote")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {sent ? (
          <p className="text-center text-[13px] text-muted">{t("introSent")}</p>
        ) : (
          <Btn
            className="w-full"
            disabled={!subjectId}
            onClick={() => {
              if (!subjectId) return;
              sendIntro(toUserId, subjectId, note);
              setSent(true);
              window.setTimeout(pop, 700);
            }}
          >
            {t("sendIntro")}
          </Btn>
        )}
      </div>
    </div>
  );
}

export function IntroDetailScreen({ introId }: { introId: string }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const intro = useWgoStore((s) => s.intros.find((x) => x.id === introId));
  const users = useWgoStore((s) => s.users);
  const acceptIntro = useWgoStore((s) => s.acceptIntro);
  const declineIntro = useWgoStore((s) => s.declineIntro);
  if (!intro) return null;
  const introducer = users[intro.introducerId];
  const revealed = intro.status === "accepted";
  const subject = users[intro.subjectId];

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("intros")} onBack={pop} />
      <div className="flex flex-1 flex-col items-center px-6 pt-6">
        <Avatar user={subject} size={104} hidden={!revealed} />
        <h1 className="mt-4 text-[24px] font-semibold">
          {revealed ? subject?.displayName : t("someone")}
        </h1>
        <p className="text-[14px] text-muted">
          {revealed ? `@${subject?.username}` : t("usernameHidden")}
        </p>
        <p className="mt-4 text-[14px] text-muted">
          {t("introBy")} {introducer?.displayName}
        </p>
        {intro.note ? (
          <p className="mt-3 max-w-[34ch] text-center text-[15px] leading-relaxed">
            {intro.note}
          </p>
        ) : null}
        {intro.status === "pending" ? (
          <div className="mt-8 grid w-full gap-2">
            <Btn onClick={() => acceptIntro(intro.id)}>{t("acceptIntro")}</Btn>
            <Btn
              variant="secondary"
              onClick={() => {
                declineIntro(intro.id);
                pop();
              }}
            >
              {t("decline")}
            </Btn>
          </div>
        ) : (
          <p className="mt-8 text-center text-[13px] text-muted">{t("introAccepted")}</p>
        )}
      </div>
    </div>
  );
}

export function GroupQrScreen({ chatId }: { chatId: string }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const openGroupInvite = useWgoStore((s) => s.openGroupInvite);
  const ensureGroupInvite = useWgoStore((s) => s.ensureGroupInvite);
  const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWgoStore((s) => s.users);
  const [copied, setCopied] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const hold = useRef(0);

  useEffect(() => {
    if (chat) ensureGroupInvite(chat.id);
  }, [chat, ensureGroupInvite]);

  if (!chat) return null;
  const group = chat;
  const token = group.inviteToken ?? group.id;
  const href = groupInviteHref(token);
  const label = groupInviteLabel(token);
  const members = group.participantIds.filter((id) => id !== "me").map((id) => users[id]);

  function clearHold() {
    window.clearTimeout(hold.current);
  }
  function startHold() {
    clearHold();
    hold.current = window.setTimeout(() => setAskOpen(true), 480);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(true);
    }
  }

  async function shareGroup() {
    const payload = {
      title: group.name ?? "Wipp",
      text: t("groupInviteBody"),
      url: href,
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else await copyLink();
    } catch {
      await copyLink();
    }
  }

  async function shareQr() {
    try {
      const blob = await qrPngBlob(href);
      const file = new File([blob], `${group.name ?? "wipp"}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          title: group.name ?? "Wipp",
          text: t("groupInviteBody"),
          files: [file],
        });
        return;
      }
      await shareGroup();
    } catch {
      await shareGroup();
    }
  }

  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header
        title={t("groupQr")}
        onBack={pop}
        className="text-paper [&_button]:text-paper"
      />
      <div className="flex flex-1 flex-col items-center overflow-y-auto no-scrollbar px-6 pt-2 pb-10">
        <GroupAvatar users={members} size={56} photo={chat.avatar} />
        <p className="mt-3 text-[20px] font-semibold">{chat.name}</p>
        <p className="text-[13px] text-paper/60">{t("joinByQr")}</p>
        <button
          type="button"
          className="mt-6 select-none rounded-2xl bg-paper p-4"
          aria-label={t("openInWipp")}
          onPointerDown={startHold}
          onPointerUp={clearHold}
          onPointerCancel={clearHold}
          onPointerLeave={clearHold}
          onContextMenu={(e) => {
            e.preventDefault();
            setAskOpen(true);
          }}
        >
          <QrCard value={href} size={220} />
        </button>
        <p className="mt-3 text-[12px] text-paper/40">{label}</p>
        <p className="mt-3 max-w-[32ch] text-center text-[13px] leading-relaxed text-paper/60">
          {t("holdQrHint")}
        </p>
        <p className="mt-1 max-w-[32ch] text-center text-[12px] leading-relaxed text-paper/45">
          {t("groupLinkHint")}
        </p>
        <Btn className="mt-5 w-full" onClick={() => void shareGroup()}>
          <Share2 className="size-4" />
          {t("shareGroup")}
        </Btn>
        <Btn variant="secondary" className="mt-2 w-full" onClick={() => void copyLink()}>
          <Copy className="size-4" />
          {copied ? t("copied") : t("copyLink")}
        </Btn>
        <Btn variant="ghost" className="mt-2 w-full text-paper" onClick={() => void shareQr()}>
          <QrCode className="size-4" />
          {t("shareGroupQr")}
        </Btn>
        <Btn
          variant="ghost"
          className="mt-2 text-paper"
          onClick={pop}
        >
          {t("openGroup")}
        </Btn>
      </div>
      <Sheet open={askOpen} onClose={() => setAskOpen(false)} title={t("openInWipp")}>
        <div className="flex flex-col items-center pb-2">
          <GroupAvatar users={members} size={64} photo={chat.avatar} />
          <p className="mt-3 text-[17px] font-semibold">{chat.name}</p>
          <p className="mt-2 max-w-[32ch] text-center text-[13px] leading-relaxed text-muted">
            {t("openInWippBody")}
          </p>
          <Btn
            className="mt-5 w-full"
            onClick={() => {
              setAskOpen(false);
              openGroupInvite(token);
            }}
          >
            {t("openWipp")}
          </Btn>
          <Btn variant="secondary" className="mt-2 w-full" onClick={() => setAskOpen(false)}>
            {t("cancel")}
          </Btn>
        </div>
      </Sheet>
    </div>
  );
}

export function GroupInfoScreen({ chatId }: { chatId: string }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWgoStore((s) => s.users);
  const me = useWgoStore((s) => s.me);
  const setGroupAvatar = useWgoStore((s) => s.setGroupAvatar);
  const ensureGroupInvite = useWgoStore((s) => s.ensureGroupInvite);
  const [pick, setPick] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (chat) ensureGroupInvite(chat.id);
  }, [chat, ensureGroupInvite]);

  if (!chat) return null;
  const members = chat.participantIds.map((id) => (id === "me" ? me : users[id]));
  const token = chat.inviteToken ?? chat.id;
  const href = groupInviteHref(token);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(true);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={chat.name ?? t("groupInfo")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        <div className="flex flex-col items-center px-4 pt-2 pb-4">
          <button
            type="button"
            className="relative"
            onClick={() => setPick(true)}
            aria-label={t("changeGroupPhoto")}
          >
            <GroupAvatar
              users={members.filter((u) => u && u.id !== "me")}
              size={88}
              photo={chat.avatar}
            />
            <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Camera className="size-4" />
            </span>
          </button>
          <p className="mt-2 text-[13px] font-medium text-accent">{t("changeGroupPhoto")}</p>
        </div>
        <div className="mx-4 mb-4 rounded-xl bg-surface p-4 hairline">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-accent" />
            <p className="text-[14px] font-medium">{t("joinByQr")}</p>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("noPhoneGroup")}</p>
          <p className="mt-1 text-[13px] text-muted">{t("noInviteLink")}</p>
          <p className="mt-2 break-all text-[12px] text-muted">{groupInviteLabel(token)}</p>
          <Btn className="mt-4 w-full" onClick={() => push({ name: "group-qr", chatId })}>
            <QrCode className="size-4" />
            {t("groupQr")}
          </Btn>
          <Btn variant="secondary" className="mt-2 w-full" onClick={() => void copyLink()}>
            <Copy className="size-4" />
            {copied ? t("copied") : t("copyLink")}
          </Btn>
        </div>
        <p className="px-5 pb-2 text-[12px] font-medium text-muted uppercase">
          {t("participants")} · {members.length}
        </p>
        {members.map((u) =>
          u ? (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar user={u} size={44} />
              <div>
                <p className="text-[15px] font-medium">
                  {u.id === "me" ? t("you") : u.displayName}
                </p>
                <p className="text-[13px] text-muted">@{u.username}</p>
              </div>
            </div>
          ) : null,
        )}
        <p className="px-5 pt-4 text-[12px] text-muted">{t("membersHiddenPhone")}</p>
        <div className="mt-4 px-2">
          <SafetyRow onReport={() => setReportOpen(true)} />
        </div>
      </div>
      <GallerySheet
        open={pick}
        onClose={() => setPick(false)}
        onPick={(url) => setGroupAvatar(chatId, url)}
        title={t("changeGroupPhoto")}
      />
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="group"
        targetId={chatId}
        onSubmitted={pop}
      />
    </div>
  );
}

export function GroupInviteScreen({ token }: { token: string }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const chats = useWgoStore((s) => s.chats);
  const qrs = useWgoStore((s) => s.oneTimeQrs);
  const users = useWgoStore((s) => s.users);
  const joinGroup = useWgoStore((s) => s.joinGroup);
  const replace = useWgoStore((s) => s.replace);
  const markRead = useWgoStore((s) => s.markRead);
  const chat = findChatByInvite(chats, qrs, token);
  const members = chat
    ? chat.participantIds.filter((id) => id !== "me").map((id) => users[id])
    : [];
  const already = Boolean(chat?.participantIds.includes("me"));

  if (!chat) {
    return (
      <div className="flex h-full flex-col">
        <StatusBar />
        <Header title={t("groupInviteTitle")} onBack={pop} />
        <Empty title={t("linkInvalid")} body={t("groupInviteBody")} />
      </div>
    );
  }

  function enter() {
    if (!chat) return;
    if (already) {
      replace({ name: "conversation", chatId: chat.id });
      markRead(chat.id);
      return;
    }
    joinGroup(chat.id);
  }

  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header
        title={t("groupInviteTitle")}
        onBack={pop}
        className="text-paper [&_button]:text-paper"
      />
      <div className="flex flex-1 flex-col items-center px-6 pt-6">
        <GroupAvatar users={members} size={88} photo={chat.avatar} />
        <p className="mt-4 text-[22px] font-semibold">{chat.name}</p>
        <p className="mt-1 text-[13px] text-paper/60">
          {chat.participantIds.length} {t("participants")} · {t("joinByQr")}
        </p>
        <p className="mt-4 max-w-[32ch] text-center text-[14px] leading-relaxed text-paper/70">
          {t("groupInviteBody")}
        </p>
        <Btn className="mt-8 w-full" onClick={enter}>
          {already ? t("alreadyMember") : t("joinThisGroup")}
        </Btn>
        <Btn variant="ghost" className="mt-2 w-full text-paper" onClick={pop}>
          {t("later")}
        </Btn>
      </div>
    </div>
  );
}


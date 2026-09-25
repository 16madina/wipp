import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  ChevronRight,
  FileText,
  Globe,
  Hand,
  Heart,
  HelpCircle,
  Languages,
  Lock,
  LogOut,
  MapPin,
  Megaphone,
  Moon,
  Pencil,
  QrCode,
  Settings,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Tag,
  Type,
  User,
  UserPlus,
  Vibrate,
  Volume2,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SmartImg } from "@/components/smart-img";
import { GallerySheet } from "@/components/gallery";
import { WippWordmark } from "@/components/logo";
import { Btn, Field, Header, Row, Section, StatusBar, Toggle } from "@/components/ui";
import { LEGAL_CONTACT } from "@/lib/legal";
import { shortFp } from "@/lib/crypto";
import { TAKEN_USERNAMES } from "@/lib/seed";
import { useT, useWgoStore } from "@/lib/store";
import { enablePrivateVault, isPrivateEnabled, replacePrivateCode, verifyPin } from "@/lib/private-vault";
import type { A11yPrefs, PrivacyAudience, PrivacyAudienceKey, ThemeMode } from "@/lib/types";
import { defaultA11y } from "@/lib/types";
import { announce, haptic } from "@/lib/haptics";
import { APP_HOST, cn } from "@/lib/utils";

export function MeScreen() {
  const t = useT();
  const me = useWgoStore((s) => s.me);
  const push = useWgoStore((s) => s.push);
  const theme = useWgoStore((s) => s.theme);
  const language = useWgoStore((s) => s.language);
  const changeAvatar = useWgoStore((s) => s.changeAvatar);
  const users = useWgoStore((s) => s.users);
  const chats = useWgoStore((s) => s.chats);
  const listings = useWgoStore((s) => s.listings);
  const lifestyle = useWgoStore((s) => s.lifestyle);
  const serverConnected = useWgoStore((s) => s.serverConnected);
  const serverUsername = useWgoStore((s) => s.serverUsername);
  const syncServerInbox = useWgoStore((s) => s.syncServerInbox);
  const openServerDm = useWgoStore((s) => s.openServerDm);
  const [pick, setPick] = useState(false);
  const [hint, setHint] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [peerUser, setPeerUser] = useState("lea");
  const [linkCode, setLinkCode] = useState("");
  const [linkOk, setLinkOk] = useState("");

  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(false), 2400);
    return () => window.clearTimeout(id);
  }, [hint]);

  const contacts = Object.values(users).filter((u) => u.connected).length;
  const groups = chats.filter((c) => c.type === "group" && c.participantIds.includes("me")).length;
  const myEvents = lifestyle.filter((e) => e.hostId === "me").length;
  const myListings = listings.filter((l) => l.sellerId === "me").length;
  const themeLabel = theme === "light" ? t("themeLight") : theme === "dark" ? t("themeDark") : t("themeSystem");
  const country = me.country === "CA" ? "Canada" : me.country;

  async function shareProfile() {
    const link = `https://${APP_HOST}/${me.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Wipp", text: `@${me.username}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setHint(true);
      }
    } catch {
      await navigator.clipboard.writeText(link);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md">
        <StatusBar />
        <div className="flex items-center px-4 pb-2">
          <WippWordmark className="text-[26px] text-fg" />
          <div className="ml-auto flex items-center">
            <button
              type="button"
              className="flex size-11 items-center justify-center"
              aria-label={t("myQr")}
              onClick={() => push({ name: "my-qr" })}
            >
              <QrCode className="size-5" />
            </button>
            <button
              type="button"
              className="flex size-11 items-center justify-center"
              aria-label={t("appearance")}
              onClick={() => push({ name: "appearance" })}
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">
        <div className="px-4 pt-1">
          <div className="wipp-card relative overflow-hidden rounded-2xl px-3.5 pt-3.5 pb-3 text-paper">
            <p className="font-script pointer-events-none absolute top-3 right-3 max-w-[8ch] text-right text-[22px] leading-[0.95] text-accent">
              {t("goodVibes")}
              <Heart className="ml-0.5 inline size-3 fill-accent text-accent" />
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="relative shrink-0"
                onClick={() => setPick(true)}
                aria-label={t("changePhoto")}
              >
                <span className="block rounded-full ring-2 ring-accent ring-offset-2 ring-offset-navy">
                  <Avatar user={me} size={72} />
                </span>
                <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
                  <Camera className="size-3.5" />
                </span>
              </button>
              <div className="min-w-0 flex-1 pr-[4.5rem] pt-0.5">
                <div className="flex items-center gap-1">
                  <h1 className="truncate text-[18px] font-semibold">{me.displayName}</h1>
                  <BadgeCheck className="size-4 shrink-0 fill-accent text-navy" />
                </div>
                <p className="text-[12px] text-paper/55">@{me.username}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-paper/70">
                  <MapPin className="size-3 shrink-0 text-accent" />
                  {me.city}, {country}
                </p>
              </div>
            </div>
            {me.bio ? (
              <p className="mt-2.5 text-[12px] leading-snug text-paper/80">{me.bio}</p>
            ) : null}
            {hint ? (
              <p className="mt-2 rounded-full bg-accent px-3 py-1 text-center text-[11px] font-medium text-accent-fg">
                {t("photoPublished")}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-4 divide-x divide-paper/10">
              {[
                [contacts, t("statContacts"), () => push({ name: "new-chat" })],
                [groups, t("statGroups"), () => push({ name: "my-groups" })],
                [myEvents, t("statEvents"), () => push({ name: "my-activity", kind: "events" })],
                [myListings, t("statListings"), () => push({ name: "my-activity", kind: "listings" })],
              ].map(([n, label, go]) => (
                <button
                  key={String(label)}
                  type="button"
                  className="px-1 py-1 text-center"
                  onClick={go as () => void}
                >
                  <span className="block text-[16px] font-semibold tabular-nums">{n as number}</span>
                  <span className="block text-[10px] text-paper/50">{label as string}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-paper/20 text-[11px] font-medium"
                onClick={() => push({ name: "account" })}
              >
                <Pencil className="size-3.5" />
                {t("editProfile")}
              </button>
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-paper/20 text-[11px] font-medium"
                onClick={() => push({ name: "my-qr" })}
              >
                <QrCode className="size-3.5" />
                {t("myQr")}
              </button>
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-[11px] font-semibold text-accent-fg"
                onClick={() => void shareProfile()}
              >
                <Share2 className="size-3.5" />
                {t("share")}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-3.5 ring-1 ring-hair">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  serverConnected ? "bg-emerald-400" : "bg-danger",
                )}
              />
              <p className="text-[13px] font-semibold">Serveur messagerie</p>
              <span className="ml-auto text-[11px] text-muted">
                {serverConnected ? `@${serverUsername ?? "…"}` : "hors ligne"}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">
              Comptes @username réels + chats 1:1 synchronisés. Mot de passe démo&nbsp;:
              <span className="text-fg"> wipp-demo</span>
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={serverBusy}
                className="press h-10 flex-1 rounded-full bg-accent text-[12px] font-semibold text-accent-fg disabled:opacity-50"
                onClick={() => {
                  setServerBusy(true);
                  setServerErr("");
                  setLinkOk("");
                  void syncServerInbox()
                    .then(() => {
                      const name =
                        useWgoStore.getState().serverUsername ||
                        useWgoStore.getState().me.username ||
                        "compte";
                      setLinkOk(`Serveur connecté — @${name}`);
                    })
                    .catch((e: Error) => setServerErr(e.message))
                    .finally(() => setServerBusy(false));
                }}
              >
                {serverBusy ? "…" : serverConnected ? "Actualiser" : "Connecter"}
              </button>
              <input
                value={peerUser}
                onChange={(e) => setPeerUser(e.target.value.replace(/^@/, ""))}
                placeholder="@lea"
                className="h-10 w-[38%] rounded-full bg-surface-2 px-3 text-[12px] outline-none ring-1 ring-hair"
              />
              <button
                type="button"
                disabled={serverBusy || !peerUser.trim()}
                className="press h-10 rounded-full bg-navy px-3 text-[12px] font-semibold text-paper disabled:opacity-50"
                onClick={() => {
                  setServerBusy(true);
                  setServerErr("");
                  setLinkOk("");
                  void openServerDm(peerUser.trim())
                    .then(() => setLinkOk(`Conversation ouverte avec @${peerUser.trim()}`))
                    .catch((e: Error) => setServerErr(e.message))
                    .finally(() => setServerBusy(false));
                }}
              >
                Écrire
              </button>
            </div>
            {serverErr ? (
              <p className="mt-2 text-[11px] text-danger">{serverErr}</p>
            ) : linkOk ? (
              <p className="mt-2 text-[11px] text-emerald-400">{linkOk}</p>
            ) : (
              <p className="mt-2 text-[11px] text-muted">Essaye @lea ou @samira</p>
            )}
            <div className="mt-3 border-t border-hair pt-3">
              <p className="text-[12px] font-medium">Lier le site web</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Ouvre <a className="text-accent underline" href="/connect" target="_blank" rel="noreferrer">/connect</a> sur
                un ordi, puis entre le code ici.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-EFGH"
                  className="h-10 flex-1 rounded-full bg-surface-2 px-3 text-[12px] tracking-widest outline-none ring-1 ring-hair"
                />
                <button
                  type="button"
                  disabled={serverBusy || linkCode.replace(/[^A-Z0-9]/g, "").length < 8}
                  className="press h-10 rounded-full bg-accent px-3 text-[12px] font-semibold text-accent-fg disabled:opacity-50"
                  onClick={() => {
                    setServerBusy(true);
                    setServerErr("");
                    setLinkOk("");
                    void (async () => {
                      try {
                        await syncServerInbox();
                        const { claimWebLinkCode } = await import("@/lib/messaging/client");
                        const res = await claimWebLinkCode(linkCode.replace(/[^A-Z0-9]/g, ""));
                        setLinkOk(`Web lié à @${res.profile.username}`);
                        setLinkCode("");
                      } catch (e) {
                        setServerErr(e instanceof Error ? e.message : "Échec du lien");
                      } finally {
                        setServerBusy(false);
                      }
                    })();
                  }}
                >
                  Lier
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 px-4">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-[13px] font-medium text-muted">{t("myActivity")}</h2>
            <button
              type="button"
              className="text-[12px] font-medium text-accent"
              onClick={() => push({ name: "my-activity", kind: "listings" })}
            >
              {t("seeAll")} ›
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                icon: Tag,
                color: "text-accent",
                title: t("myCard"),
                sub: t("myCardSub"),
                go: () => push({ name: "my-qr" }),
              },
              {
                icon: Megaphone,
                color: "text-tile-info",
                title: t("myListings"),
                sub: t("myListingsSub"),
                go: () => push({ name: "my-activity", kind: "listings" }),
              },
              {
                icon: CalendarDays,
                color: "text-tile-event",
                title: t("myEvents"),
                sub: t("myEventsSub"),
                go: () => push({ name: "my-activity", kind: "events" }),
              },
              {
                icon: Bookmark,
                color: "text-tile-save",
                title: t("saved"),
                sub: t("savedSub"),
                go: () => push({ name: "my-activity", kind: "saved" }),
              },
            ].map((tile) => (
              <button
                key={tile.title}
                type="button"
                onClick={tile.go}
                className="press flex min-h-[118px] flex-col rounded-2xl bg-navy/80 px-2 py-2.5 text-left ring-1 ring-hair"
              >
                <tile.icon className={cn("size-5", tile.color)} />
                <span className="mt-auto text-[11px] font-semibold leading-tight">{tile.title}</span>
                <span className="mt-0.5 flex items-center gap-0.5 text-[9px] leading-snug text-muted">
                  {tile.sub}
                  <ChevronRight className="size-2.5 shrink-0" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Section title={t("myWipp")} caps={false}>
            <Row icon={<User className="size-4" />} label={t("account")} onClick={() => push({ name: "account" })} />
            <Row icon={<Shield className="size-4" />} label={t("privacy")} onClick={() => push({ name: "privacy" })} />
            <Row icon={<Lock className="size-4" />} label={t("security")} onClick={() => push({ name: "security" })} />
          </Section>
        </div>
        <div className="mt-4">
          <Section title={t("preferences")} caps={false}>
            <Row icon={<Bell className="size-4" />} label={t("notifications")} onClick={() => push({ name: "notifications" })} />
            <Row
              icon={<Moon className="size-4" />}
              label={t("appearance")}
              value={themeLabel}
              onClick={() => push({ name: "appearance" })}
            />
            <Row
              icon={<Hand className="size-4" />}
              label={t("accessibility")}
              onClick={() => push({ name: "accessibility" })}
            />
            <Row
              icon={<Globe className="size-4" />}
              label={t("language")}
              value={language === "fr" ? t("french") : t("english")}
              onClick={() => push({ name: "appearance" })}
            />
          </Section>
        </div>
        <div className="mt-4">
          <Section title={t("devicesHelp")} caps={false}>
            <Row
              icon={<Smartphone className="size-4" />}
              label={t("devices")}
              value="1"
              onClick={() => push({ name: "security" })}
            />
            <Row icon={<HelpCircle className="size-4" />} label={t("help")} onClick={() => push({ name: "help" })} />
            <Row
              icon={<FileText className="size-4" />}
              label={t("termsOfUse")}
              onClick={() => push({ name: "legal", doc: "terms" })}
            />
            <Row
              icon={<Shield className="size-4" />}
              label={t("privacyPolicy")}
              onClick={() => push({ name: "legal", doc: "privacy" })}
            />
            <Row
              icon={<UserPlus className="size-4" />}
              label={t("invite")}
              trailing={
                <span className="flex items-center gap-1">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">
                    {t("inviteReward")}
                  </span>
                  <ChevronRight className="size-4 text-muted" />
                </span>
              }
              onClick={() => push({ name: "my-qr" })}
            />
          </Section>
        </div>

        <div className="mx-4 mt-4 mb-2 flex items-center gap-3 rounded-2xl bg-navy/80 px-4 py-3 ring-1 ring-hair">
          <WippWordmark className="text-[18px] text-fg" />
          <span className="h-6 w-px bg-hair" />
          <p className="font-script flex-1 text-[18px] text-muted">{t("footerTagline")}</p>
          <span className="text-[11px] text-muted">{t("appVersion")}</span>
        </div>
        <div className="mt-2 mb-8 px-4">
          <Btn
            variant="ghost"
            className="w-full text-danger"
            onClick={() => {
              if (window.confirm(t("signOutConfirm"))) useWgoStore.getState().signOut();
            }}
          >
            <LogOut className="size-4" />
            {t("signOut")}
          </Btn>
        </div>
      </div>

      <GallerySheet
        open={pick}
        onClose={() => setPick(false)}
        title={t("changePhoto")}
        onPick={(url) => {
          changeAvatar(url);
          setHint(true);
        }}
      />
    </div>
  );
}

export function AccountScreen() {
  const t = useT();
  const me = useWgoStore((s) => s.me);
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const updateMe = useWgoStore((s) => s.updateMe);
  const resetDemo = useWgoStore((s) => s.resetDemo);
  const changeAvatar = useWgoStore((s) => s.changeAvatar);
  const [pick, setPick] = useState(false);
  const [hint, setHint] = useState(false);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [city, setCity] = useState(me.city);
  const taken = TAKEN_USERNAMES.has(username.toLowerCase()) && username.toLowerCase() !== me.username;

  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(false), 2400);
    return () => window.clearTimeout(id);
  }, [hint]);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("editProfile")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-10">
        <button
          type="button"
          className="mx-auto mt-2 mb-5 flex flex-col items-center"
          onClick={() => setPick(true)}
          aria-label={t("changePhoto")}
        >
          <span className="relative">
            <Avatar user={{ ...me, avatar: me.avatar }} size={88} />
            <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Camera className="size-4" />
            </span>
          </span>
          <span className="mt-2 text-[13px] font-medium text-accent">{t("changePhoto")}</span>
        </button>
        {hint ? <p className="mb-3 text-center text-[13px] text-muted">{t("photoPublished")}</p> : null}
        <div className="grid gap-3">
          <Field label={t("displayName")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Field
            label={t("username")}
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 20))}
          />
          {taken ? <p className="text-[12px] text-danger">{t("usernameTaken")}</p> : null}
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted">{t("bio")}</span>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 140))}
              className="w-full rounded-md bg-surface-2 px-4 py-3 text-[15px] text-fg outline-none shadow-[var(--shadow-hairline)]"
            />
          </label>
          <Field label={t("city") ?? "Ville"} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Btn
          className="mt-5 w-full"
          disabled={taken || !displayName.trim() || username.length < 3}
          onClick={() => {
            updateMe({
              displayName: displayName.trim(),
              username: username.toLowerCase(),
              bio: bio.trim(),
              city: city.trim() || me.city,
            });
            pop();
          }}
        >
          {t("save")}
        </Btn>
        <Section>
          <Row label={t("phone")} value={`${me.phone} · ${t("youOnly")}`} />
          <Row label={t("email")} value={me.email || "—"} />
          <Row label={t("blockedList")} onClick={() => push({ name: "blocked" })} />
          <Row label={t("downloadData")} onClick={downloadMyData} />
        </Section>
        <Btn
          variant="ghost"
          className="mt-6 w-full text-danger"
          onClick={() => push({ name: "delete-account" })}
        >
          {t("deleteAccount")}
        </Btn>
        <Btn variant="ghost" className="mt-2 w-full text-muted" onClick={resetDemo}>
          {t("resetDemo")}
        </Btn>
      </div>
      <GallerySheet
        open={pick}
        onClose={() => setPick(false)}
        title={t("changePhoto")}
        onPick={(url) => {
          changeAvatar(url);
          setHint(true);
        }}
      />
    </div>
  );
}

const PRIVACY_ROWS: {
  key: PrivacyAudienceKey;
  label:
    | "whoPhoto"
    | "whoBio"
    | "whoLast"
    | "whoOnline"
    | "whoCall"
    | "whoRequest"
    | "whoGroup"
    | "whoStories"
    | "whoPhone"
    | "whoUser";
}[] = [
  { key: "photo", label: "whoPhoto" },
  { key: "bio", label: "whoBio" },
  { key: "lastSeen", label: "whoLast" },
  { key: "online", label: "whoOnline" },
  { key: "calls", label: "whoCall" },
  { key: "requests", label: "whoRequest" },
  { key: "groups", label: "whoGroup" },
  { key: "stories", label: "whoStories" },
  { key: "findByPhone", label: "whoPhone" },
  { key: "findByUsername", label: "whoUser" },
];

export function PrivacyScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const privacy = useWgoStore((s) => s.privacy);
  const setPrivacy = useWgoStore((s) => s.setPrivacy);
  const setReadReceipts = useWgoStore((s) => s.setReadReceipts);
  const setEphemeralCalls = useWgoStore((s) => s.setEphemeralCalls);
  const [open, setOpen] = useState<PrivacyAudienceKey | null>(null);
  const [wippPane, setWippPane] = useState(false);
  const [, setVaultTick] = useState(0);
  const labelFor = (v: PrivacyAudience) =>
    v === "everyone" ? t("everyone") : v === "contacts" ? t("contacts") : t("nobody");

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={wippPane ? "WIPP Privé" : t("privacy")} onBack={wippPane ? () => setWippPane(false) : pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {wippPane ? (
          <Section>
            <Row
              label={isPrivateEnabled() ? "Modifier le code" : "Créer le code"}
              onClick={() => {
                void (async () => {
                  const existed = isPrivateEnabled();
                  if (existed) {
                    const old = window.prompt("Ancien code WIPP Privé");
                    if (!old) return;
                    const checked = await verifyPin(old);
                    if (!checked.ok) {
                      const secs = Math.max(1, Math.ceil(checked.waitMs / 1000));
                      window.alert(`Code incorrect. Réessaie dans ${secs} s.`);
                      return;
                    }
                  }
                  const next = window.prompt("Nouveau code WIPP Privé (4 caractères minimum)");
                  if (!next) return;
                  const again = window.prompt("Confirmer le nouveau code");
                  if (again?.trim() !== next.trim()) {
                    window.alert("Les deux codes ne correspondent pas.");
                    return;
                  }
                  try {
                    if (existed) await replacePrivateCode(next);
                    else await enablePrivateVault(next);
                    setVaultTick((n) => n + 1);
                    window.alert(
                      existed
                        ? "Le code a été modifié. Tes conversations privées sont inchangées."
                        : "Pour ouvrir WIPP Privé, maintiens le logo WIPP pendant 3 secondes.",
                    );
                  } catch {
                    window.alert("Le code doit contenir au moins 4 caractères.");
                  }
                })();
              }}
            />
            <Row
              label="Code oublié ?"
              onClick={() =>
                window.alert(
                  "Sur le web, il n'y a pas de biométrie. Sans le code, le coffre reste scellé sur cet appareil. Aucun email, SMS ou copie serveur ne peut le récupérer.",
                )
              }
            />
          </Section>
        ) : null}
        {!wippPane ? (
        <>
        <Section>
          {PRIVACY_ROWS.map((row) => (
            <Row
              key={row.key}
              label={t(row.label)}
              value={labelFor(privacy[row.key])}
              onClick={() => setOpen(row.key)}
            />
          ))}
        </Section>
        {open ? (
          <div className="mt-4 px-4">
            <Section title={t(PRIVACY_ROWS.find((r) => r.key === open)!.label)}>
              {(["everyone", "contacts", "nobody"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className="flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]"
                  onClick={() => {
                    setPrivacy(open, v);
                    setOpen(null);
                  }}
                >
                  {labelFor(v)}
                  {privacy[open] === v ? <span className="size-2 rounded-full bg-accent" /> : null}
                </button>
              ))}
            </Section>
          </div>
        ) : null}
        <div className="mt-4">
          <Section title={t("privacy")}>
            <Row
              label="WIPP Privé"
              value={isPrivateEnabled() ? "Activé" : "Désactivé"}
              onClick={() => setWippPane(true)}
            />
            <Row
              label={t("readReceipts")}
              trailing={
                <Toggle
                  checked={privacy.readReceipts !== false}
                  onChange={setReadReceipts}
                />
              }
            />
            <Row
              label={t("ephemeralCalls")}
              trailing={
                <Toggle
                  checked={privacy.ephemeralCalls === true}
                  onChange={setEphemeralCalls}
                />
              }
            />
          </Section>
          <p className="px-6 pt-3 text-[13px] leading-relaxed text-muted">{t("readReceiptsHint")}</p>
          <p className="px-6 pt-2 text-[13px] leading-relaxed text-muted">{t("ephemeralCallsHint")}</p>
        </div>
        </>
        ) : null}
      </div>
    </div>
  );
}

export function SecurityScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const myFingerprint = useWgoStore((s) => s.myFingerprint);
  const showCiphertext = useWgoStore((s) => s.showCiphertext);
  const setShowCiphertext = useWgoStore((s) => s.setShowCiphertext);
  const rotateIdentity = useWgoStore((s) => s.rotateIdentity);
  const verifiedIds = useWgoStore((s) => s.verifiedIds);
  const users = useWgoStore((s) => s.users);
  const chats = useWgoStore((s) => s.chats);
  const keyRotatedAt = useWgoStore((s) => s.keyRotatedAt);
  const biometricsOn = useWgoStore((s) => s.biometricsOn);
  const setBiometrics = useWgoStore((s) => s.setBiometrics);
  const lockApp = useWgoStore((s) => s.lockApp);
  const [confirm, setConfirm] = useState(false);
  const verified = verifiedIds.map((id) => users[id]).filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("security")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <Section title={t("e2e")}>
          <Row icon={<Lock className="size-4" />} label={t("e2eOn")} value={t("e2eAlways")} />
          <Row label={t("e2eAlg")} />
          <Row
            label={t("e2eIdentity")}
            value={myFingerprint ? shortFp(myFingerprint) : "…"}
            onClick={() => {
              if (myFingerprint) void navigator.clipboard.writeText(myFingerprint);
            }}
          />
          <Row
            label={t("e2eShowCipher")}
            trailing={<Toggle checked={showCiphertext} onChange={setShowCiphertext} />}
          />
        </Section>
        <p className="px-6 py-3 text-[13px] leading-relaxed text-muted">{t("e2eShowCipherHint")}</p>
        {keyRotatedAt ? (
          <p className="px-6 pb-3 text-[13px] leading-relaxed text-danger">{t("e2eKeyChanged")}</p>
        ) : null}

        <Section title={t("e2eContacts")}>
          {verified.length === 0 ? (
            <p className="px-4 py-3 text-[14px] text-muted">{t("e2eNoVerified")}</p>
          ) : (
            verified.map((u) => {
              const chat = chats.find(
                (c) => c.type === "dm" && c.participantIds.includes(u.id) && !c.ephemeral,
              );
              return (
                <Row
                  key={u.id}
                  icon={<BadgeCheck className="size-4" />}
                  label={u.displayName}
                  value={`@${u.username}`}
                  onClick={() => chat && push({ name: "e2e-info", chatId: chat.id })}
                />
              );
            })
          )}
        </Section>

        <div className="h-4" />
        <Section>
          <Row label={t("e2eRotate")} danger onClick={() => setConfirm(true)} />
        </Section>
        {confirm ? (
          <div className="px-4 pt-3">
            <p className="px-1 text-[13px] leading-relaxed text-muted">{t("e2eRotateBody")}</p>
            <Btn
              variant="danger"
              className="mt-3 w-full"
              onClick={() => {
                void rotateIdentity();
                setConfirm(false);
              }}
            >
              {t("e2eRotateConfirm")}
            </Btn>
            <Btn variant="ghost" className="mt-1 w-full" onClick={() => setConfirm(false)}>
              {t("cancel")}
            </Btn>
          </div>
        ) : null}

        <div className="h-4" />
        <Section>
          <Row label={t("pinCode")} value="••••" />
          <Row
            label={t("biometrics")}
            trailing={<Toggle checked={biometricsOn} onChange={setBiometrics} />}
          />
          {biometricsOn ? (
            <Row label={t("testLock")} onClick={() => lockApp()} />
          ) : null}
          <Row label={t("twoFa")} value="On" />
          <Row label={t("sessions")} value="1" />
          <Row label={t("ephemeral")} value={t("ephemeralPerChat")} />
        </Section>
        <p className="px-6 pt-3 text-[13px] leading-relaxed text-muted">{t("biometricsHint")}</p>
        <p className="px-6 pt-2 text-[13px] leading-relaxed text-muted">{t("ephemeralPerChatHint")}</p>
        <p className="px-6 pt-4 text-[13px] leading-relaxed text-muted">{t("e2eBody")}</p>
      </div>
    </div>
  );
}

export function NotificationsScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const notifs = useWgoStore((s) => s.notifs);
  const setNotif = useWgoStore((s) => s.setNotif);
  const pushMaster = useWgoStore((s) => s.pushMaster);
  const pushGranted = useWgoStore((s) => s.pushGranted);
  const setPushMaster = useWgoStore((s) => s.setPushMaster);
  const setPushGranted = useWgoStore((s) => s.setPushGranted);
  const [denied, setDenied] = useState(false);
  const rows = [
    ["messages", t("tabChats")],
    ["requests", t("requests")],
    ["calls", t("tabCalls")],
    ["stories", t("stories")],
    ["groups", t("createGroup")],
    ["mentions", "@"],
    ["reactions", t("react")],
    ["security", t("security")],
  ] as const;

  async function toggleMaster(on: boolean) {
    if (!on) {
      setPushMaster(false);
      return;
    }
    if (typeof Notification === "undefined") {
      setPushGranted(true);
      setPushMaster(true);
      return;
    }
    const p = await Notification.requestPermission();
    const ok = p === "granted";
    setPushGranted(ok);
    setPushMaster(ok);
    setDenied(p === "denied");
    if (ok) {
      try {
        new Notification("WIPP", { body: t("pushPreview") });
      } catch {
        /* preview hosts often block the banner */
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("notifications")} onBack={pop} />
      <Section title={t("pushMaster")}>
        <Row
          label={t("pushMaster")}
          value={pushMaster ? t("pushOn") : t("pushOff")}
          trailing={<Toggle checked={pushMaster} onChange={(v) => void toggleMaster(v)} />}
        />
      </Section>
      <p className="px-6 pt-3 text-[13px] leading-relaxed text-muted">{t("pushMasterHint")}</p>
      {denied && !pushGranted ? (
        <p className="px-6 pt-2 text-[13px] text-danger">{t("pushDenied")}</p>
      ) : null}
      <div className="h-4" />
      <Section>
        {rows.map(([key, label]) => (
          <Row
            key={key}
            label={label}
            trailing={
              <Toggle
                checked={notifs[key]}
                onChange={(v) => setNotif(key, v)}
              />
            }
          />
        ))}
      </Section>
    </div>
  );
}

export function AppearanceScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const theme = useWgoStore((s) => s.theme);
  const language = useWgoStore((s) => s.language);
  const setTheme = useWgoStore((s) => s.setTheme);
  const setLanguage = useWgoStore((s) => s.setLanguage);
  const themes: { id: ThemeMode; label: string }[] = [
    { id: "light", label: t("themeLight") },
    { id: "dark", label: t("themeDark") },
    { id: "system", label: t("themeSystem") },
  ];

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("appearance")} onBack={pop} />
      <Section title={t("appearance")}>
        {themes.map((x) => (
          <button
            key={x.id}
            type="button"
            className="flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]"
            onClick={() => {
              haptic("select");
              setTheme(x.id);
            }}
          >
            {x.label}
            {theme === x.id ? <span className="size-2 rounded-full bg-accent" /> : null}
          </button>
        ))}
      </Section>
      <div className="h-4" />
      <Section title={t("language")}>
        <button
          type="button"
          className="flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]"
          onClick={() => {
            haptic("select");
            setLanguage("fr");
          }}
        >
          {t("french")}
          {language === "fr" ? <span className="size-2 rounded-full bg-accent" /> : null}
        </button>
        <button
          type="button"
          className="flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]"
          onClick={() => {
            haptic("select");
            setLanguage("en");
          }}
        >
          {t("english")}
          {language === "en" ? <span className="size-2 rounded-full bg-accent" /> : null}
        </button>
      </Section>
    </div>
  );
}

export function AccessibilityScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const a11y = useWgoStore((s) => s.a11y) ?? defaultA11y;
  const setA11y = useWgoStore((s) => s.setA11y);
  const [tested, setTested] = useState(false);

  function testHaptic() {
    if (!a11y.haptics) setA11y({ haptics: true });
    const ok = haptic("success");
    setTested(true);
    announce(ok ? t("hapticsTestDone") : t("hapticsUnavailable"));
    window.setTimeout(() => setTested(false), 2400);
  }

  const rows: {
    key: keyof A11yPrefs;
    icon: typeof Vibrate;
    label: "haptics" | "largeTouch" | "largeText" | "reduceMotion" | "stickerSound";
    hint: "hapticsHint" | "largeTouchHint" | "largeTextHint" | "reduceMotionHint" | "stickerSoundHint";
  }[] = [
    { key: "haptics", icon: Vibrate, label: "haptics", hint: "hapticsHint" },
    { key: "largeTouch", icon: Hand, label: "largeTouch", hint: "largeTouchHint" },
    { key: "largeText", icon: Type, label: "largeText", hint: "largeTextHint" },
    { key: "reduceMotion", icon: Sparkles, label: "reduceMotion", hint: "reduceMotionHint" },
    { key: "stickerSound", icon: Volume2, label: "stickerSound", hint: "stickerSoundHint" },
  ];

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("accessibility")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-navy px-4 py-4 text-paper ring-1 ring-hair">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Hand className="size-5" />
            </span>
            <div>
              <p className="text-[15px] font-semibold">{t("hapticLang")}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-paper/65">{t("accessibilityHint")}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                ["hapticTap", "tap"],
                ["hapticSend", "send"],
                ["hapticConnect", "connect"],
              ] as const
            ).map(([label, kind]) => (
              <button
                key={kind}
                type="button"
                className="press rounded-xl bg-paper/8 px-2 py-2.5 text-center ring-1 ring-paper/10"
                onClick={() => {
                  if (!a11y.haptics) setA11y({ haptics: true });
                  haptic(kind);
                }}
              >
                <span className="block text-[10px] font-medium tracking-wide text-accent uppercase">
                  {kind === "tap" ? "·" : kind === "send" ? "··" : "···"}
                </span>
                <span className="mt-1 block text-[11px] font-medium">{t(label)}</span>
              </button>
            ))}
          </div>
        </div>

        {rows.map((row) => {
          const Icon = row.icon;
          return (
          <div key={row.key} className="mb-3">
            <Section>
              <Row
                icon={<Icon className="size-4" />}
                label={t(row.label)}
                trailing={
                  <Toggle
                    checked={a11y[row.key]}
                    label={t(row.label)}
                    onChange={(v) => {
                      setA11y({ [row.key]: v });
                      if (row.key === "haptics" && v) window.setTimeout(() => haptic("success"), 0);
                    }}
                  />
                }
              />
              <p className="px-4 pb-3 text-[12px] leading-relaxed text-muted">{t(row.hint)}</p>
            </Section>
          </div>
          );
        })}

        <div className="px-4 pt-1">
          <button
            type="button"
            className="press flex h-12 min-h-[var(--touch-min)] w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-accent-fg"
            onClick={testHaptic}
          >
            <Vibrate className="size-4" />
            {t("hapticsTest")}
          </button>
          {tested ? (
            <p className="mt-2 text-center text-[12px] text-muted" role="status">
              {t("hapticsTestDone")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function HelpScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("help")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-10">
        <Languages className="mb-3 size-6 text-muted" />
        <p className="text-[15px] leading-relaxed">{t("aboutWgo")}</p>
        <p className="mt-4 text-[13px] text-muted">{APP_HOST}</p>
        <h2 className="mt-6 text-[13px] font-medium text-muted">{t("communityRules")}</h2>
        <p className="mt-2 text-[14px] leading-relaxed">{t("communityRulesBody")}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{t("reportBody")}</p>
        <h2 className="mt-6 text-[13px] font-medium text-muted">{t("agePolicy")}</h2>
        <p className="mt-2 text-[14px] leading-relaxed">{t("agePolicyBody")}</p>
        <h2 className="mt-6 text-[13px] font-medium text-muted">{t("childSafety")}</h2>
        <p className="mt-2 text-[14px] leading-relaxed">{t("childSafetyBody")}</p>
        <p className="mt-4 text-[13px] text-muted">{t("guidelinesContact")}</p>
        <button
          type="button"
          className="mt-5 text-left text-[14px] font-medium text-accent"
          onClick={() => push({ name: "legal", doc: "terms" })}
        >
          {t("termsOfUse")}
        </button>
        <button
          type="button"
          className="mt-3 block text-left text-[14px] font-medium text-accent"
          onClick={() => push({ name: "legal", doc: "privacy" })}
        >
          {t("privacyPolicy")}
        </button>
        <a
          className="mt-3 block text-[14px] font-medium text-accent"
          href={`mailto:${LEGAL_CONTACT}`}
        >
          {t("supportMail")}
        </a>
        <a
          className="mt-3 block text-[14px] font-medium text-accent"
          href="/delete-account.html"
          target="_blank"
          rel="noreferrer"
        >
          {t("webDelete")}
        </a>
      </div>
    </div>
  );
}

export function BlockedScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const users = useWgoStore((s) => s.users);
  const blockedIds = useWgoStore((s) => s.blockedIds);
  const unblockUser = useWgoStore((s) => s.unblockUser);
  const rows = blockedIds.map((id) => users[id]).filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("blockedList")} onBack={pop} />
      {rows.length === 0 ? (
        <p className="px-6 pt-8 text-center text-[14px] text-muted">{t("blockedEmpty")}</p>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {rows.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar user={u} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{u.displayName}</p>
                <p className="text-[13px] text-muted">@{u.username}</p>
              </div>
              <button
                type="button"
                className="text-[13px] font-medium text-accent"
                onClick={() => unblockUser(u.id)}
              >
                {t("unblock")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeleteAccountScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const deleteAccount = useWgoStore((s) => s.deleteAccount);
  const [word, setWord] = useState("");
  const [err, setErr] = useState(false);
  const need = t("deleteWord");

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("deleteAccount")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-2 pb-10">
        <p className="text-[15px] leading-relaxed">{t("deleteAccountBody")}</p>
        <p className="mt-4 text-[13px] text-muted">{t("deleteAccountWarn")}</p>
        <Field
          className="mt-3"
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            setErr(false);
          }}
        />
        {err ? <p className="mt-2 text-[13px] text-danger">{t("deleteNeedWord")}</p> : null}
        <Btn
          variant="danger"
          className="mt-6 w-full"
          onClick={() => {
            if (word.trim().toUpperCase() !== need) {
              setErr(true);
              return;
            }
            deleteAccount();
          }}
        >
          {t("deleteAccountCta")}
        </Btn>
      </div>
    </div>
  );
}

function downloadMyData() {
  const s = useWgoStore.getState();
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: s.me,
    privacy: s.privacy,
    blockedIds: s.blockedIds,
    shops: s.shops.filter((x) => x.ownerId === "me"),
    listings: s.listings.filter((l) => l.sellerId === "me"),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wipp-mes-donnees.json";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export function MyActivityScreen({ kind }: { kind: "listings" | "events" | "saved" }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const listings = useWgoStore((s) => s.listings);
  const lifestyle = useWgoStore((s) => s.lifestyle);
  const savedListingIds = useWgoStore((s) => s.savedListingIds) ?? [];
  const savedEventIds = useWgoStore((s) => s.savedEventIds) ?? [];

  const title =
    kind === "listings" ? t("myListings") : kind === "events" ? t("myEvents") : t("saved");

  const listingRows =
    kind === "listings"
      ? listings.filter((l) => l.sellerId === "me")
      : kind === "saved"
        ? listings.filter((l) => savedListingIds.includes(l.id))
        : [];
  const eventRows =
    kind === "events"
      ? lifestyle.filter((e) => e.hostId === "me")
      : kind === "saved"
        ? lifestyle.filter((e) => savedEventIds.includes(e.id))
        : [];

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={title} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {listingRows.length === 0 && eventRows.length === 0 ? (
          <p className="px-6 pt-8 text-center text-[14px] text-muted">
            {kind === "listings" ? t("noListings") : kind === "events" ? t("noEvents") : t("noSaved")}
          </p>
        ) : null}
        {listingRows.map((l) => (
          <button
            key={l.id}
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
            onClick={() => push({ name: "listing", listingId: l.id })}
          >
            <SmartImg src={l.image} alt="" className="size-14 rounded-xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{l.title}</span>
              <span className="block text-[13px] text-muted">
                {l.price} · {l.city}
              </span>
            </span>
          </button>
        ))}
        {eventRows.map((e) => (
          <button
            key={e.id}
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
            onClick={() => push({ name: "lifestyle", itemId: e.id })}
          >
            {e.image ? (
              <SmartImg src={e.image} alt="" className="size-14 rounded-xl object-cover" />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-xl bg-navy text-accent">
                <CalendarDays className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{e.title}</span>
              <span className="block text-[13px] text-muted">
                {e.when} · {e.place}
              </span>
            </span>
          </button>
        ))}
        {kind === "listings" ? (
          <div className="px-4 pt-4">
            <Btn variant="secondary" className="w-full" onClick={() => push({ name: "explore" })}>
              {t("hubListings")}
            </Btn>
          </div>
        ) : null}
        {kind === "events" ? (
          <div className="px-4 pt-4">
            <Btn className="w-full" onClick={() => push({ name: "create-lifestyle" })}>
              {t("createLifestyle")}
            </Btn>
          </div>
        ) : null}
      </div>
    </div>
  );
}


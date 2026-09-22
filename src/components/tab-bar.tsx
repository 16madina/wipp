import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ChevronRight,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  ScanLine,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { WippWordmark } from "@/components/logo";
import { haptic } from "@/lib/haptics";
import { useT, useWgoStore } from "@/lib/store";
import type { I18nKey } from "@/lib/i18n";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { name: "chats" | "calls" | "explore" | "me"; key: "tabChats" | "tabCalls" | "tabExplore" | "tabMe" }[] = [
  { name: "chats", key: "tabChats" },
  { name: "calls", key: "tabCalls" },
  { name: "explore", key: "tabExplore" },
  { name: "me", key: "tabMe" },
];

/** Two outline phones leaning in, with a short connection signal between them. */
function WippPhonesGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <g transform="rotate(14 17 33)" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="15" width="18" height="36" rx="4" strokeWidth="1.7" />
        <rect x="11" y="18.8" width="12" height="23.5" rx="1.3" strokeWidth="0.9" opacity="0.65" />
        <path d="M14.6 46.4h4.8" strokeWidth="1.35" />
      </g>
      <g transform="rotate(-14 47 33)" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="38" y="15" width="18" height="36" rx="4" strokeWidth="1.7" />
        <rect x="41" y="18.8" width="12" height="23.5" rx="1.3" strokeWidth="0.9" opacity="0.65" />
        <path d="M44.6 46.4h4.8" strokeWidth="1.35" />
      </g>
      <path d="M29.4 31c1.15 1.5 1.15 3.9 0 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M32.4 29c1.6 2 1.6 6 0 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M35.5 27.2c2 2.4 2 7.6 0 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

function TouchHero() {
  return (
    <div className="wipp-touch-stage" aria-hidden>
      <span className="wipp-touch-glow" />
      <span className="wipp-touch-phone is-l"><span>WIPP</span></span>
      <span className="wipp-touch-sig"><i /><i /><i /></span>
      <span className="wipp-touch-phone is-r"><span>WIPP</span></span>
    </div>
  );
}

type ConnectAction = "wgo-touch" | "scanner" | "my-qr" | "search-user" | "nearby";

export function TabBar({ active }: { active: Screen["name"] }) {
  const t = useT();
  const goTab = useWgoStore((s) => s.goTab);
  const push = useWgoStore((s) => s.push);
  const locateMe = useWgoStore((s) => s.locateMe);
  const setNearby = useWgoStore((s) => s.setNearby);
  const nearby = useWgoStore((s) => s.nearby);
  const unread = useWgoStore((s) =>
    s.chats.reduce((n, c) => n + (c.archived || c.isRequest ? 0 : c.unread), 0),
  );
  const missed = useWgoStore(
    (s) => s.calls.filter((c) => c.missed && c.at > (s.callsSeenAt ?? 0)).length,
  );
  const pending = useWgoStore(
    (s) =>
      s.requests.filter((r) => r.status === "pending").length +
      s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length,
  );

  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [inPos, setInPos] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);

  useEffect(() => {
    if (open) {
      setShown(true);
      const id = window.requestAnimationFrame(() => setInPos(true));
      return () => window.cancelAnimationFrame(id);
    }
    setInPos(false);
    const id = window.setTimeout(() => {
      setShown(false);
      setDragY(0);
    }, 280);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeSheet() {
    setOpen(false);
  }

  function tapWipp() {
    haptic("select");
    setPulse(true);
    window.setTimeout(() => setPulse(false), 520);
    setOpen((v) => !v);
  }

  function go(name: ConnectAction) {
    haptic("select");
    closeSheet();
    if (name === "nearby") {
      locateMe();
      if (nearby === 0) setNearby(5);
    }
    window.setTimeout(() => push({ name }), 160);
  }

  const alts: { id: ConnectAction; title: I18nKey; hint: I18nKey; icon: ReactNode }[] = [
    { id: "scanner", title: "wippScanCard", hint: "wippScanCardHint", icon: <ScanLine className="size-6" strokeWidth={1.8} /> },
    { id: "my-qr", title: "wippMyQrCard", hint: "wippMyQrCardHint", icon: <QrCode className="size-6" strokeWidth={1.8} /> },
    { id: "search-user", title: "wippSearchCard", hint: "wippSearchCardHint", icon: <Search className="size-6" strokeWidth={1.8} /> },
    { id: "nearby", title: "wippNearbyCard", hint: "wippNearbyCardHint", icon: <MapPin className="size-6" strokeWidth={1.8} /> },
  ];

  function onGrabPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = true;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onGrabPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }
  function onGrabPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > 72) closeSheet();
    else setDragY(0);
  }

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <div className="tab-dock">
      {shown ? (
        <div className="wipp-sheet-root" data-open={inPos ? "1" : "0"}>
          <button
            type="button"
            className="wipp-sheet-scrim"
            aria-label={t("cancel")}
            onClick={closeSheet}
          />
          <div
            className="wipp-sheet"
            style={
              dragY
                ? {
                    transform: `translateY(${dragY}px)`,
                    transition: dragging.current ? "none" : undefined,
                  }
                : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="wipp-connect-title"
          >
            <div
              className="wipp-sheet-grab"
              onPointerDown={onGrabPointerDown}
              onPointerMove={onGrabPointerMove}
              onPointerUp={onGrabPointerUp}
              onPointerCancel={onGrabPointerUp}
            >
              <div className="wipp-sheet-handle" />
            </div>
            <div className="wipp-sheet-head">
              <h2 id="wipp-connect-title" className="wipp-sheet-title">
                <WippWordmark className="wipp-sheet-mark" />
                <span className="wipp-sheet-connect">Connect</span>
              </h2>
              <p>{t("wippConnectSub")}</p>
              <button type="button" className="wipp-sheet-x" aria-label={t("cancel")} onClick={closeSheet}>
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>
            <button type="button" className="wipp-touch-card press" onClick={() => go("wgo-touch")}>
              <TouchHero />
              <span className="wipp-touch-copy">
                <span className="wipp-touch-badge">{t("wippTouchBadge")}</span>
                <span className="wipp-touch-name">{t("wippTouchCard")}</span>
                <span className="wipp-touch-hint">{t("wippTouchCardHint")}</span>
                <span className="wipp-touch-body">{t("wippTouchCardBody")}</span>
              </span>
              <span className="wipp-touch-go" aria-hidden>
                <ChevronRight className="size-4" strokeWidth={2.4} />
              </span>
            </button>
            <div className="wipp-alt-grid">
              {alts.map((c) => (
                <button key={c.id} type="button" className="wipp-alt press" onClick={() => go(c.id)}>
                  <span className="wipp-alt-ico">{c.icon}</span>
                  <span className="wipp-alt-copy">
                    <span className="wipp-alt-name">{t(c.title)}</span>
                    <span className="wipp-alt-hint">{t(c.hint)}</span>
                  </span>
                  <ChevronRight className="wipp-alt-chev" strokeWidth={2} />
                </button>
              ))}
            </div>
            <p className="wipp-sheet-foot">
              <Users className="size-4" aria-hidden />
              <span>
                {t("wippConnectFoot")} <b>{t("wippConnectFootEm")}</b>
              </span>
              <Heart className="size-4" aria-hidden />
            </p>
          </div>
        </div>
      ) : null}

      <nav className="tab-bar" aria-label="WIPP">
        {left.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            active={active === tab.name && !open}
            badge={
              tab.name === "chats" && unread + pending
                ? unread + pending
                : tab.name === "calls" && missed
                  ? missed
                  : 0
            }
            onClick={() => {
              haptic("select");
              closeSheet();
              goTab(tab.name);
            }}
            label={t(tab.key)}
          />
        ))}

        <button
          type="button"
          className={cn("wipp-fab", (open || pulse) && "is-on", pulse && "is-pulse")}
          aria-label={t("tabConnect")}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={tapWipp}
        >
          <span className="wipp-fab-halo" aria-hidden />
          <span className="wipp-fab-disc">
            <WippPhonesGlyph className="wipp-fab-glyph" />
          </span>
          <span className="wipp-fab-label">{t("tabConnect")}</span>
        </button>

        {right.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            active={active === tab.name && !open}
            badge={0}
            onClick={() => {
              haptic("select");
              closeSheet();
              goTab(tab.name);
            }}
            label={t(tab.key)}
          />
        ))}
      </nav>
    </div>
  );
}

function TabItem({
  tab,
  active,
  badge,
  onClick,
  label,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  badge: number;
  onClick: () => void;
  label: string;
}) {
  const Icon =
    tab.name === "chats" ? MessageCircle : tab.name === "calls" ? Phone : tab.name === "explore" ? Compass : User;
  return (
    <button
      type="button"
      className={cn("tab-item press", active && "is-on")}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className="tab-item-ico"
        strokeWidth={active ? 2.35 : 1.9}
        fill={active && (tab.name === "chats" || tab.name === "me") ? "currentColor" : "none"}
        fillOpacity={active && (tab.name === "chats" || tab.name === "me") ? 0.18 : 0}
      />
      <span>{label}</span>
      {badge ? <span className="tab-item-badge">{badge > 9 ? "9+" : badge}</span> : null}
    </button>
  );
}

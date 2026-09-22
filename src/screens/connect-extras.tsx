import { Hash, QrCode, Shield, UserPlus } from "lucide-react";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ConnectHubExtras() {
  const t = useT();
  const push = useWgoStore((s) => s.push);
  const pendingIntros = useWgoStore(
    (s) => s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length,
  );

  return (
    <>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => push({ name: "live-code" })}
          className="press flex min-h-[100px] flex-col items-start rounded-2xl glass-card p-3.5 text-left"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Hash className="size-5" />
          </span>
          <span className="mt-auto pt-3 text-[15px] font-semibold">{t("liveCode")}</span>
          <span className="mt-0.5 text-[11px] leading-snug text-muted">{t("liveCodeSub")}</span>
        </button>
        <button
          type="button"
          onClick={() => push({ name: "one-time-qr" })}
          className="press flex min-h-[100px] flex-col items-start rounded-2xl glass-card p-3.5 text-left"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-navy text-paper">
            <QrCode className="size-5" />
          </span>
          <span className="mt-auto pt-3 text-[15px] font-semibold">{t("oneTimeQr")}</span>
          <span className="mt-0.5 text-[11px] leading-snug text-muted">{t("oneTimeQrSub")}</span>
        </button>
      </div>
      {pendingIntros > 0 ? (
        <button
          type="button"
          onClick={() => push({ name: "requests" })}
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl glass-card p-4 text-left"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-surface-2">
            <UserPlus className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">{t("intros")}</span>
            <span className="text-[12px] text-muted">{t("usernameHidden")}</span>
          </span>
          <span className="text-[13px] font-semibold tabular-nums">{pendingIntros}</span>
        </button>
      ) : null}
    </>
  );
}

export function NoPhoneBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[11px] font-medium text-paper",
        className,
      )}
    >
      <Shield className="size-3" />
      {t("noPhoneListing")}
    </span>
  );
}

export function ScanResultHint({
  via,
}: {
  via?: "code" | "qr" | "username" | "intro" | "nearby" | "touch";
}) {
  const t = useT();
  if (!via) return null;
  const label =
    via === "code"
      ? t("foundViaCode")
      : via === "qr"
        ? t("foundViaQr")
        : via === "intro"
          ? t("foundViaIntro")
          : via === "nearby"
            ? t("foundViaNearby")
            : via === "touch"
              ? t("foundViaTouch")
              : null;
  if (!label) return null;
  return <p className="mt-2 text-[12px] text-muted">{label}</p>;
}

import { useEffect, useState } from "react";
import { Ban, Fingerprint, Flag, ScanFace } from "lucide-react";
import { Btn, Sheet } from "@/components/ui";
import type { I18nKey } from "@/lib/i18n";
import { useT, useWgoStore } from "@/lib/store";
import type { ReportKind, ReportReason, SafetyReport } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASONS: { id: ReportReason; key: I18nKey }[] = [
  { id: "spam", key: "reportSpam" },
  { id: "harass", key: "reportHarass" },
  { id: "hate", key: "reportHate" },
  { id: "fake", key: "reportFake" },
  { id: "scam", key: "reportScam" },
  { id: "sexual", key: "reportSexual" },
  { id: "underage", key: "reportUnderage" },
  { id: "other", key: "reportOther" },
];

export function flaggedIds(reports: SafetyReport[] | undefined, kind: ReportKind) {
  const set = new Set<string>();
  for (const r of reports ?? []) if (r.kind === kind) set.add(r.targetId);
  return set;
}

export function isFlagged(
  reports: SafetyReport[] | undefined,
  kind: ReportKind,
  id: string,
) {
  return Boolean(reports?.some((r) => r.kind === kind && r.targetId === id));
}

export function ReportSheet({
  open,
  onClose,
  kind,
  targetId,
  blockUserId,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  kind: ReportKind;
  targetId: string;
  blockUserId?: string;
  onSubmitted?: () => void;
}) {
  const t = useT();
  const reportTarget = useWgoStore((s) => s.reportTarget);
  const blockUser = useWgoStore((s) => s.blockUser);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason(null);
      setAlsoBlock(false);
      setDone(false);
    }
  }, [open, blockUserId]);

  return (
    <Sheet open={open} onClose={onClose} title={t("reportTitle")}>
      {done ? (
        <p className="px-2 py-6 text-center text-[15px] leading-relaxed">{t("reportThanks")}</p>
      ) : (
        <div className="grid gap-1">
          <p className="px-2 pb-2 text-[13px] leading-relaxed text-muted">{t("reportBody")}</p>
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={cn(
                "flex h-11 items-center rounded-lg px-3 text-left text-[14px]",
                reason === r.id ? "bg-accent/15 text-fg" : "",
              )}
              onClick={() => setReason(r.id)}
            >
              {t(r.key)}
            </button>
          ))}
          {reason === "underage" ? (
            <p className="px-2 pt-2 text-[12px] leading-relaxed text-muted">{t("reportUnderageHint")}</p>
          ) : null}
          {blockUserId ? (
            <label className="mt-2 flex items-center gap-3 px-2 py-2 text-[14px]">
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(e) => setAlsoBlock(e.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              {t("reportAlsoBlock")}
            </label>
          ) : null}
          <Btn
            className="mt-3 w-full"
            disabled={!reason}
            onClick={() => {
              if (!reason) return;
              reportTarget({ kind, targetId, reason });
              if (blockUserId && alsoBlock) blockUser(blockUserId);
              setDone(true);
              window.setTimeout(() => {
                onSubmitted?.();
                onClose();
              }, 1400);
            }}
          >
            {t("reportSend")}
          </Btn>
        </div>
      )}
    </Sheet>
  );
}

export function BlockSheet({
  open,
  onClose,
  userId,
  onBlocked,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onBlocked?: () => void;
}) {
  const t = useT();
  const blockUser = useWgoStore((s) => s.blockUser);
  return (
    <Sheet open={open} onClose={onClose} title={t("block")}>
      <p className="px-2 pb-4 text-[14px] leading-relaxed text-muted">{t("blockConfirm")}</p>
      <Btn
        variant="danger"
        className="w-full"
        onClick={() => {
          blockUser(userId);
          onClose();
          onBlocked?.();
        }}
      >
        {t("blockNow")}
      </Btn>
      <Btn variant="ghost" className="mt-2 w-full" onClick={onClose}>
        {t("cancel")}
      </Btn>
    </Sheet>
  );
}

export function FlagBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center text-fg"
    >
      <Flag className="size-5" />
    </button>
  );
}

export function AppLockGate() {
  const t = useT();
  const on = useWgoStore((s) => s.biometricsOn);
  const locked = useWgoStore((s) => s.appLocked);
  const unlockApp = useWgoStore((s) => s.unlockApp);
  const lockApp = useWgoStore((s) => s.lockApp);
  const [busy, setBusy] = useState(false);
  const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!on) return;
    const onVis = () => {
      if (document.hidden) lockApp();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", lockApp);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", lockApp);
    };
  }, [on, lockApp]);

  if (!on || !locked) return null;

  function unlock() {
    setBusy(true);
    window.setTimeout(() => {
      unlockApp();
      setBusy(false);
    }, 900);
  }

  return (
    <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-bg px-8 text-center">
      {android ? (
        <Fingerprint className="size-14 text-accent" />
      ) : (
        <ScanFace className="size-14 text-accent" />
      )}
      <h1 className="mt-6 text-[22px] font-semibold">{t("lockTitle")}</h1>
      <p className="mt-2 text-[14px] text-muted">{t("biometricsHint")}</p>
      <Btn className="mt-8 w-full" onClick={unlock} disabled={busy}>
        {busy ? t("biometricsUnlocking") : t("biometricsUnlock")}
      </Btn>
    </div>
  );
}

export function SafetyRow({
  onReport,
  onBlock,
}: {
  onReport: () => void;
  onBlock?: () => void;
}) {
  const t = useT();
  return (
    <div className="grid gap-1">
      <button
        type="button"
        className="flex h-12 items-center gap-3 rounded-lg px-2 text-[15px]"
        onClick={onReport}
      >
        <Flag className="size-4" /> {t("report")}
      </button>
      {onBlock ? (
        <button
          type="button"
          className="flex h-12 items-center gap-3 rounded-lg px-2 text-[15px] text-danger"
          onClick={onBlock}
        >
          <Ban className="size-4" /> {t("block")}
        </button>
      ) : null}
    </div>
  );
}

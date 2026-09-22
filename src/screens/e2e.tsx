import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Copy, Lock, Shield } from "lucide-react";
import { QrCard } from "@/components/qr-card";
import { Btn, Header, StatusBar } from "@/components/ui";
import { formatSafety, shortFp } from "@/lib/crypto";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function E2eInfoScreen({ chatId }: { chatId: string }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWgoStore((s) => s.users);
  const me = useWgoStore((s) => s.me);
  const verifiedIds = useWgoStore((s) => s.verifiedIds);
  const myFingerprint = useWgoStore((s) => s.myFingerprint);
  const toggleVerified = useWgoStore((s) => s.toggleVerified);
  const safetyNumberFor = useWgoStore((s) => s.safetyNumberFor);
  const [safety, setSafety] = useState("");
  const [copied, setCopied] = useState(false);

  const peerId = chat?.type === "dm" ? chat.participantIds.find((id) => id !== "me") : undefined;
  const peer = peerId ? users[peerId] : undefined;
  const verified = Boolean(peerId && verifiedIds.includes(peerId));
  const groups = useMemo(() => (safety.match(/.{1,5}/g) ?? []).slice(0, 12), [safety]);

  useEffect(() => {
    let live = true;
    void safetyNumberFor(chatId).then((value) => {
      if (live) setSafety(value);
    });
    return () => {
      live = false;
    };
  }, [chatId, safetyNumberFor, myFingerprint]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatSafety(safety));
    } catch {
      /* demo */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-10">
        <StatusBar />
        <Header title={t("e2eInfoTitle")} onBack={pop} />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-10">
        <div className="mt-4 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-navy text-accent">
            <Lock className="size-7" />
          </span>
          <h1 className="mt-4 max-w-[18ch] text-[22px] font-semibold tracking-tight">{t("e2eOn")}</h1>
          <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-muted">{t("e2eInfoBody")}</p>
          <p className="mt-2 text-[12px] font-medium text-accent">{t("e2eAlg")}</p>
        </div>

        <div className="mt-6 rounded-2xl glass-card p-4">
          <p className="text-[12px] font-medium tracking-wide text-muted uppercase">{t("e2eSafety")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("e2eSafetyHint")}</p>
          <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-2 font-mono text-[13px] tabular-nums tracking-wide">
            {groups.map((g, i) => (
              <span key={i} className="text-center text-fg">
                {g}
              </span>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl bg-paper p-3">
              <QrCard value={safety ? `wipp.me/e2e/${safety.slice(0, 24)}` : "wipp.me/e2e"} size={148} pad={8} />
            </div>
          </div>
          <Btn variant="secondary" className="mt-4 w-full" onClick={() => void copy()}>
            <Copy className="size-4" />
            {copied ? t("copied") : t("e2eCompare")}
          </Btn>
          {peerId ? (
            <Btn
              className="mt-2 w-full"
              variant={verified ? "navy" : "primary"}
              onClick={() => toggleVerified(peerId)}
            >
              {verified ? (
                <>
                  <BadgeCheck className="size-4" />
                  {t("e2eUnverify")}
                </>
              ) : (
                t("e2eVerify")
              )}
            </Btn>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl glass-card p-4">
          <p className="text-[12px] font-medium tracking-wide text-muted uppercase">{t("e2eHow")}</p>
          <ol className="mt-3 grid gap-3">
            {[t("e2eHow1"), t("e2eHow2"), t("e2eHow3")].map((line, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-fg">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-accent">
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 rounded-2xl glass-card px-4 py-3">
          <p className="text-[12px] text-muted">{t("e2eIdentity")}</p>
          <p className="mt-1 font-mono text-[13px] tabular-nums">{shortFp(myFingerprint)}</p>
          <p className="mt-1 text-[12px] text-muted">
            {chat?.type === "group" ? chat.name : peer?.displayName ?? me.displayName}
          </p>
        </div>

        {verified ? (
          <p className={cn("mt-4 flex items-center justify-center gap-1.5 text-[13px] text-accent")}>
            <Shield className="size-3.5" />
            {t("e2eVerified")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

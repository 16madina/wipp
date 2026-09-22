import { type ReactNode, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Globe } from "lucide-react";
import { StatusBar } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useT, useWgoStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AuthLockup({ align = "left" }: { align?: "left" | "center" }) {
  const t = useT();
  return (
    <div className={cn("flex flex-col", align === "center" ? "items-center" : "items-start")}>
      <div className="relative flex items-start">
        <svg
          viewBox="0 0 36 28"
          className="absolute -top-2 left-3 h-6 w-8 text-accent"
          aria-hidden
        >
          <rect x="0" y="8" width="18" height="14" rx="6" fill="currentColor" opacity="0.5" />
          <rect x="10" y="1" width="24" height="16" rx="7" fill="currentColor" />
          <circle cx="19" cy="9" r="1.45" fill="#0B1220" />
          <circle cx="25" cy="9" r="1.45" fill="#0B1220" />
          <circle cx="31" cy="9" r="1.45" fill="#0B1220" />
        </svg>
        <span className="bg-linear-to-b from-[#fff6d0] to-accent bg-clip-text text-[38px] leading-none font-black tracking-[-0.05em] text-transparent">
          WIPP
        </span>
        <span className="mt-0.5 ml-0.5 text-[8px] font-semibold text-accent">TM</span>
      </div>
      <p className="mt-1.5 text-[8px] font-medium tracking-[0.36em] text-accent/85 uppercase">
        {t("authTagline")}
      </p>
    </div>
  );
}

export function AuthLang() {
  const language = useWgoStore((s) => s.language);
  const setLanguage = useWgoStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-9 items-center gap-1 rounded-full px-1.5 text-[12px] font-medium text-muted"
        onClick={() => setOpen((v) => !v)}
      >
        <Globe className="size-3.5" />
        {language.toUpperCase()}
        <ChevronDown className="size-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 overflow-hidden rounded-xl bg-navy ring-1 ring-hair">
          {(["fr", "en"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              className="flex h-10 w-24 items-center justify-between px-3 text-[13px]"
              onClick={() => {
                setLanguage(l);
                setOpen(false);
              }}
            >
              {l.toUpperCase()}
              {language === l ? <Check className="size-3.5 text-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AuthShell({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack?: () => void;
}) {
  const t = useT();
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-bg">
      <div className="auth-orb" />
      <StatusBar />
      <div className="relative z-10 flex items-center justify-between px-3">
        {onBack ? (
          <button
            type="button"
            onPointerDown={() => haptic("tap")}
            onClick={onBack}
            className="flex size-[var(--touch-min)] items-center justify-center rounded-full text-fg"
            aria-label={t("back")}
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        <AuthLang />
      </div>
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
        <AuthLockup />
        {children}
      </div>
    </div>
  );
}

export function AuthSteps({ step }: { step: 1 | 2 }) {
  const t = useT();
  return (
    <div className="mb-5 flex items-center gap-2 text-[12px] font-medium">
      <StepDot n={1} active={step === 1} done={step > 1} label={t("stepAccount")} />
      <span className="mb-4 h-px w-7 bg-hair" />
      <StepDot n={2} active={step === 2} done={false} label={t("stepIdentity")} />
    </div>
  );
}

function StepDot({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
          done || active ? "bg-accent text-accent-fg" : "ring-1 ring-white/25 text-muted",
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
      </span>
      <span className={cn(active || done ? "text-accent" : "text-muted")}>{label}</span>
    </span>
  );
}

export function AuthField({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span> : null}
      <span className="relative flex h-12 items-center gap-2 rounded-2xl bg-[#12141c] px-3 ring-1 ring-white/8 focus-within:ring-accent/40">
        {icon ? <span className="text-muted">{icon}</span> : null}
        {children}
      </span>
    </label>
  );
}

export function AuthCta({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={() => {
        if (!disabled) haptic("tap");
      }}
      onClick={onClick}
      className="press mt-5 flex h-[52px] min-h-[var(--touch-min)] w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-accent-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export const COUNTRIES = [
  { id: "CA", dial: "+1", fr: "Canada", en: "Canada" },
  { id: "SN", dial: "+221", fr: "Sénégal", en: "Senegal" },
  { id: "CI", dial: "+225", fr: "Côte d’Ivoire", en: "Côte d’Ivoire" },
  { id: "ML", dial: "+223", fr: "Mali", en: "Mali" },
  { id: "GN", dial: "+224", fr: "Guinée", en: "Guinea" },
  { id: "FR", dial: "+33", fr: "France", en: "France" },
  { id: "US", dial: "+1", fr: "États-Unis", en: "United States" },
] as const;

export const AVATAR_PICKS = [
  "/avatars/deena.jpg",
  "/avatars/maya.jpg",
  "/avatars/aisha.jpg",
  "/avatars/lea.jpg",
  "/avatars/sofia.jpg",
] as const;

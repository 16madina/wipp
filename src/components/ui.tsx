import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useT } from "@/lib/store";

export function StatusBar({ className }: { className?: string }) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  );
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className={cn("flex h-12 shrink-0 items-end justify-between px-6 pb-1 text-[12px] font-medium text-fg tabular-nums", className)}>
      <span suppressHydrationWarning>{time}</span>
      <span className="flex items-center gap-1.5 opacity-80">
        <span className="inline-block h-2 w-4 rounded-[2px] bg-fg/80" />
        <span className="inline-block h-2.5 w-1.5 rounded-[1px] bg-fg" />
      </span>
    </div>
  );
}

export function Btn({
  variant = "primary",
  className,
  children,
  onPointerDown,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "navy";
}) {
  return (
    <button
      className={cn(
        "press inline-flex h-12 min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium",
        variant === "primary" && "bg-accent text-accent-fg",
        variant === "navy" && "bg-navy text-paper",
        variant === "secondary" && "glass-card text-fg",
        variant === "ghost" && "bg-transparent text-fg",
        variant === "danger" && "bg-danger/15 text-danger",
        "disabled:opacity-40",
        className,
      )}
      onPointerDown={(e) => {
        if (!e.currentTarget.disabled && e.button === 0) haptic("tap");
        onPointerDown?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  className,
  children,
  label,
  onPointerDown,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className={cn(
        "press hit inline-flex size-[var(--touch-min)] items-center justify-center rounded-full text-fg",
        className,
      )}
      onPointerDown={(e) => {
        if (!e.currentTarget.disabled && e.button === 0) haptic("tap");
        onPointerDown?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>
      ) : null}
      <input
        className={cn(
          "h-12 min-h-[var(--touch-min)] w-full rounded-md bg-surface-2 px-4 text-[15px] text-fg outline-none",
          "shadow-[var(--shadow-hairline)] placeholder:text-muted",
          "focus:ring-2 focus:ring-ring",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function SearchField({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg glass-card px-4 text-[15px] text-fg outline-none",
        "placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Header({
  title,
  onBack,
  right,
  subtitle,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("flex shrink-0 items-center gap-1 px-2", subtitle ? "min-h-14" : "h-12 min-h-12", className)}>
      {onBack ? (
        <IconBtn label={t("back")} onClick={onBack}>
          <ChevronLeft className="size-6" />
        </IconBtn>
      ) : (
        <span className="w-2" />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
        <div className="truncate text-[17px] font-semibold tracking-tight">{title}</div>
        {subtitle ? (
          <div className="truncate text-[12px] font-normal text-muted">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex items-center">{right}</div>
    </div>
  );
}

export function Row({
  icon,
  label,
  value,
  onClick,
  danger,
  trailing,
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onPointerDown={onClick ? () => haptic("tap") : undefined}
      className={cn(
        "flex min-h-[var(--touch-min)] w-full items-center gap-3 px-4 py-3 text-left",
        onClick && "press",
      )}
    >
      {icon ? (
        <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-fg">
          {icon}
        </span>
      ) : null}
      <span className={cn("flex-1 text-[15px]", danger && "text-danger")}>{label}</span>
      {value ? <span className="text-[13px] text-muted">{value}</span> : null}
      {trailing}
      {onClick && !trailing ? <ChevronRight className="size-4 text-muted" /> : null}
    </Comp>
  );
}

export function Section({
  title,
  children,
  caps = true,
}: {
  title?: string;
  children: ReactNode;
  caps?: boolean;
}) {
  return (
    <section className="px-4">
      {title ? (
        <h2
          className={cn(
            "mb-2 px-1 font-medium text-muted",
            caps ? "text-[12px] tracking-wide uppercase" : "text-[13px]",
          )}
        >
          {title}
        </h2>
      ) : null}
      <div className="overflow-hidden rounded-xl glass-card">{children}</div>
    </section>
  );
}


export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic("select");
        onChange(!checked);
      }}
      className={cn(
        "relative flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center",
      )}
    >
      <span
        className={cn(
          "relative h-7 w-11 rounded-full transition-colors duration-150",
          checked ? "bg-accent" : "bg-surface-2 hairline",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-paper transition-transform duration-150",
            checked && "translate-x-4 bg-navy",
          )}
        />
      </span>
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  const t = useT();
  const [shown, setShown] = useState(open);
  const [inPos, setInPos] = useState(open);

  useEffect(() => {
    if (open) {
      setShown(true);
      const id = window.requestAnimationFrame(() => setInPos(true));
      return () => window.cancelAnimationFrame(id);
    }
    setInPos(false);
    const t = window.setTimeout(() => setShown(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!shown) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        className={cn(
          "sheet-scrim absolute inset-0 bg-ink/50",
          inPos ? "opacity-100" : "opacity-0",
        )}
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        className={cn(
          "glass-strong sheet-panel relative rounded-t-2xl px-4 pt-3 pb-8",
          inPos ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted/40" />
        {title ? (
          <h2 className="mb-3 text-center text-[15px] font-semibold">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <p className="text-[17px] font-semibold">{title}</p>
      {body ? <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg tabular-nums">
      {children}
    </span>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium",
        active ? "bg-accent text-accent-fg" : "glass-card text-fg",
      )}
    >
      {children}
    </button>
  );
}

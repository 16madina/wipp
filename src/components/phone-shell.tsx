import { useEffect, useState, type ReactNode } from "react";
import { useWgoStore } from "@/lib/store";
import type { HapticKind } from "@/lib/haptics";
import { defaultA11y } from "@/lib/types";

function HapticFlash() {
  const [kind, setKind] = useState<HapticKind | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent<HapticKind>).detail;
      setKind(detail);
    };
    window.addEventListener("wipp-haptic", on);
    return () => window.removeEventListener("wipp-haptic", on);
  }, []);

  useEffect(() => {
    if (!kind) return;
    const id = window.setTimeout(() => setKind(null), 520);
    return () => window.clearTimeout(id);
  }, [kind]);

  if (!kind) return null;
  return (
    <div className="haptic-flash" data-kind={kind} aria-hidden>
      <span />
      <span />
      <span />
    </div>
  );
}

export function PhoneShell({ children, intro }: { children: ReactNode; intro?: boolean }) {
  const theme = useWgoStore((s) => s.theme);
  const a11y = useWgoStore((s) => s.a11y) ?? defaultA11y;
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemDark(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  return (
    <div className="phone-stage">
      <div
        className={intro ? "device is-intro" : "device"}
        data-theme={resolved}
        data-large-touch={a11y.largeTouch ? "1" : undefined}
        data-large-text={a11y.largeText ? "1" : undefined}
        data-reduce-motion={a11y.reduceMotion ? "1" : undefined}
      >
        <div className="island" />
        <div className="device-app">{children}</div>
        <HapticFlash />
        <div
          id="wipp-live"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />
        <div className="home-bar" />
      </div>
    </div>
  );
}

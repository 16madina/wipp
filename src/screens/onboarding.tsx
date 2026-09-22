import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { I18nKey } from "@/lib/i18n";
import { announce, haptic, reducedMotion } from "@/lib/haptics";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const HERO = {
  tap: { webp: "/onboarding/hero-tap.webp?v=2", jpg: "/onboarding/hero-tap.jpg?v=2", pos: "center 42%" },
  globe: { webp: "/onboarding/hero-globe.webp?v=2", jpg: "/onboarding/hero-globe.jpg?v=2", pos: "center 46%" },
  privacy: { webp: "/onboarding/hero-privacy.webp?v=2", jpg: "/onboarding/hero-privacy.jpg?v=2", pos: "center 40%" },
  together: { webp: "/onboarding/hero-together.webp?v=2", jpg: "/onboarding/hero-together.jpg?v=2", pos: "center 36%" },
} as const;

const ONB = [
  { kind: "tap" as const, title: "onb1Title", accent: "onb1Accent", body: "onb1Body" },
  { kind: "globe" as const, title: "onb3Title", accent: "onb3Accent", body: "onb3Body" },
  { kind: "privacy" as const, title: "onb2Title", accent: "onb2Accent", body: "onb2Body" },
  { kind: "together" as const, title: "onb4Title", accent: "onb4Accent", body: "onb4Body" },
] as const;

function HeroImg({
  kind,
  split,
  className,
}: {
  kind: keyof typeof HERO;
  split?: "l" | "r";
  className?: string;
}) {
  const h = HERO[kind];
  return (
    <picture>
      <source srcSet={h.webp} type="image/webp" />
      <img
        src={h.jpg}
        alt=""
        draggable={false}
        className={cn("onb-hero", split && `onb-split is-${split}`, className)}
        style={{ objectPosition: h.pos }}
      />
    </picture>
  );
}

/**
 * Hero art already includes brand, scripts, pills and cards.
 * Only keep light motion overlays here — never re-render the same copy in HTML.
 */
function SceneTap() {
  return (
    <div className="onb-scene" data-kind="tap">
      <HeroImg kind="tap" split="l" />
      <HeroImg kind="tap" split="r" />
      <span className="onb-screen-glow is-l" />
      <span className="onb-screen-glow is-r" />
      <div className="onb-flash" />
      <div className="onb-rings" aria-hidden>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function SceneGlobe() {
  return (
    <div className="onb-scene" data-kind="globe">
      <HeroImg kind="globe" className="onb-globe-spin" />
      <svg className="onb-arcs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M22 30 C 40 18, 62 18, 78 32" />
        <path d="M22 30 C 18 48, 16 62, 20 62" />
        <path d="M78 32 C 84 50, 86 64, 80 66" />
        <path d="M20 62 C 40 78, 62 78, 80 66" />
      </svg>
      <i className="onb-travel a" />
      <i className="onb-travel b" />
      <i className="onb-travel c" />
      <div className="onb-pin-drop" aria-hidden>
        <b />
        <b />
        <b />
      </div>
    </div>
  );
}

function ScenePrivacy() {
  return (
    <div className="onb-scene" data-kind="privacy">
      <HeroImg kind="privacy" className="onb-phone-tilt" />
      <div className="onb-scan" aria-hidden />
      <div className="onb-shield-glow" aria-hidden />
    </div>
  );
}

function SceneTogether() {
  return (
    <div className="onb-scene" data-kind="together">
      <HeroImg kind="together" split="l" />
      <HeroImg kind="together" split="r" />
      <div className="onb-link" aria-hidden />
      <div className="onb-pulse" aria-hidden />
      <span className="onb-msg" aria-hidden />
    </div>
  );
}

export function OnboardingScreen() {
  const t = useT();
  const replace = useWgoStore((s) => s.replace);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const startX = useRef<number | null>(null);
  const slide = ONB[Math.min(page, ONB.length - 1)];
  const last = page >= ONB.length - 1;
  const calm = reducedMotion();

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(ONB.length - 1, next));
    setDir(clamped >= page ? 1 : -1);
    setPage(clamped);
    haptic("select");
    announce(`${clamped + 1} / ${ONB.length}`);
  }
  function finish() {
    haptic("success");
    replace({ name: "signup" });
  }

  useEffect(() => {
    if (calm) return;
    if (slide.kind !== "tap" && slide.kind !== "together") return;
    const delay = slide.kind === "tap" ? 1250 : 1200;
    const id = window.setTimeout(() => haptic("connect"), delay);
    return () => window.clearTimeout(id);
  }, [slide.kind, page, calm]);

  return (
    <div
      className={cn("onb", calm && "is-calm")}
      role="group"
      aria-roledescription="carousel"
      aria-label={t("start")}
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current == null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) < 56) return;
        if (dx < 0) {
          if (last) finish();
          else goTo(page + 1);
        } else {
          goTo(page - 1);
        }
      }}
    >
      <div className="onb-stage">
        <div key={page} className="onb-stage-in" data-dir={dir === 1 ? "next" : "prev"}>
          {slide.kind === "tap" ? <SceneTap /> : null}
          {slide.kind === "globe" ? <SceneGlobe /> : null}
          {slide.kind === "privacy" ? <ScenePrivacy /> : null}
          {slide.kind === "together" ? <SceneTogether /> : null}
        </div>
      </div>

      {/* Skip only — brand/tagline already live inside hero art */}
      <header className="onb-head onb-head-minimal">
        <button
          type="button"
          className="onb-skip"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={finish}
        >
          {t("skip")}
        </button>
      </header>

      <footer className="onb-foot" onPointerDown={(e) => e.stopPropagation()}>
        <div key={`copy-${page}`} className="onb-copy" aria-live="polite">
          <h1>
            {t(slide.title as I18nKey)}{" "}
            <span>{t(slide.accent as I18nKey)}</span>
          </h1>
          <p>{t(slide.body as I18nKey)}</p>
        </div>
        <div className="onb-dots" role="tablist" aria-label={t("start")}>
          {ONB.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              onClick={() => goTo(i)}
            >
              <span className={i === page ? "is-on" : undefined} />
            </button>
          ))}
        </div>
        <div className="onb-actions">
          <button
            type="button"
            className="onb-back"
            disabled={page === 0}
            onClick={() => goTo(page - 1)}
          >
            {t("back")}
          </button>
          <button
            type="button"
            className="onb-next"
            onClick={() => {
              if (last) finish();
              else goTo(page + 1);
            }}
          >
            {last ? t("start") : t("next")}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

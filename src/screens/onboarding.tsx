import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  User,
  Users,
  Zap,
} from "lucide-react";
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

type TFn = (key: I18nKey) => string;

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

function SceneTap({ t }: { t: TFn }) {
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
      <p className="onb-script is-tl">{t("onbTapLeft")}</p>
      <p className="onb-script is-tr">{t("onbTapRight")}</p>
      <div className="onb-pills">
        <span className="onb-pill d1">
          <Zap className="size-4" strokeWidth={2.4} />
          {t("onbFast")}
        </span>
        <span className="onb-pill d2">
          <Shield className="size-4" strokeWidth={2.4} />
          {t("onbSimple")}
        </span>
        <span className="onb-pill d3">
          <Users className="size-4" strokeWidth={2.4} />
          {t("onbNoNumber")}
        </span>
      </div>
      <div className="onb-connected">
        <Check className="size-3.5" strokeWidth={3} />
        {t("onbConnected")}
      </div>
    </div>
  );
}

function SceneGlobe({ t }: { t: TFn }) {
  const cities: { key: I18nKey; cls: string }[] = [
    { key: "onbCityMtl", cls: "is-mtl" },
    { key: "onbCityAbj", cls: "is-abj" },
    { key: "onbCityPar", cls: "is-par" },
    { key: "onbCityNyc", cls: "is-nyc" },
  ];
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
      {cities.map((c) => (
        <span key={c.cls} className={cn("onb-city", c.cls)}>
          <span className="onb-city-dot" />
          <MapPin className="size-3" strokeWidth={2.6} />
          {t(c.key)}
        </span>
      ))}
      <div className="onb-pin-drop" aria-hidden>
        <b />
        <b />
        <b />
      </div>
      <p className="onb-script is-tl">{t("onbWherever")}</p>
      <p className="onb-script is-br">{t("onbWorldChat")}</p>
      <span className="onb-note">{t("onbNewMeetings")}</span>
    </div>
  );
}

function ScenePrivacy({ t }: { t: TFn }) {
  return (
    <div className="onb-scene" data-kind="privacy">
      <HeroImg kind="privacy" className="onb-phone-tilt" />
      <div className="onb-scan" aria-hidden />
      <div className="onb-shield-glow" aria-hidden />
      <div className="onb-pcards">
        <div className="onb-pcard d1">
          <span className="onb-pcard-ico">
            <User className="size-4" strokeWidth={2.3} />
          </span>
          <span>
            <b>{t("onbCardUser")}</b>
            <small>{t("onbCardUserHint")}</small>
          </span>
        </div>
        <div className="onb-pcard d2">
          <span className="onb-pcard-ico">
            <Phone className="size-4" strokeWidth={2.3} />
          </span>
          <span>
            <b>{t("onbCardPhone")}</b>
            <small>{t("onbCardPhoneHint")}</small>
          </span>
        </div>
        <div className="onb-pcard d3">
          <span className="onb-pcard-ico">
            <MapPin className="size-4" strokeWidth={2.3} />
          </span>
          <span>
            <b>{t("onbCardPlace")}</b>
            <small>{t("onbCardPlaceHint")}</small>
          </span>
        </div>
      </div>
      <p className="onb-script is-tl">{t("onbYourId")}</p>
      <p className="onb-script is-br">{t("onbPrivacyFirst")}</p>
    </div>
  );
}

function SceneTogether({ t }: { t: TFn }) {
  return (
    <div className="onb-scene" data-kind="together">
      <HeroImg kind="together" split="l" />
      <HeroImg kind="together" split="r" />
      <div className="onb-link" aria-hidden />
      <div className="onb-pulse" aria-hidden />
      <div className="onb-toast">
        <span className="onb-toast-check">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <span>
          <b>{t("onbConnOk")}</b>
          <small>{t("onbConnOkHint")}</small>
        </span>
      </div>
      <div className="onb-features">
        <span className="onb-feat d1">
          <Zap className="size-5" strokeWidth={2.2} />
          {t("onbOneTap")}
        </span>
        <span className="onb-feat d2">
          <Users className="size-5" strokeWidth={2.2} />
          {t("onbExchange")}
        </span>
        <span className="onb-feat d3">
          <MessageCircle className="size-5" strokeWidth={2.2} />
          {t("onbStartChat")}
        </span>
      </div>
      <span className="onb-msg" aria-hidden>
        <MessageCircle className="size-4" strokeWidth={2.4} />
      </span>
      <p className="onb-script is-tl">{t("onbRealMeet")}</p>
      <p className="onb-script is-tr">{t("onbJustWipp")}</p>
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
          {slide.kind === "tap" ? <SceneTap t={t} /> : null}
          {slide.kind === "globe" ? <SceneGlobe t={t} /> : null}
          {slide.kind === "privacy" ? <ScenePrivacy t={t} /> : null}
          {slide.kind === "together" ? <SceneTogether t={t} /> : null}
        </div>
      </div>

      <header className="onb-head">
        <button
          type="button"
          className="onb-skip"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={finish}
        >
          {t("skip")}
        </button>
        <img
          src="/brand/wipp-wordmark.webp"
          alt="Wipp"
          className="onb-logo"
          draggable={false}
        />
        <p className="onb-brand">{t("onbBrand")}</p>
      </header>

      <footer className="onb-foot" onPointerDown={(e) => e.stopPropagation()}>
        <div key={`copy-${page}`} className="onb-copy" aria-live="polite">
          <h1>
            {t(slide.title)}{" "}
            <span>{t(slide.accent)}</span>
          </h1>
          <p>{t(slide.body)}</p>
        </div>

        <div className="onb-dots">
          {ONB.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / ${ONB.length}`}
              aria-current={i === page ? "true" : undefined}
              onClick={() => goTo(i)}
            >
              <span className={cn(i === page && "is-on")} />
            </button>
          ))}
        </div>

        <div className="onb-actions">
          <button
            type="button"
            className="onb-back press"
            disabled={page === 0}
            onClick={() => goTo(page - 1)}
          >
            {t("back")}
          </button>
          <button
            type="button"
            className="onb-next press"
            onClick={() => (last ? finish() : goTo(page + 1))}
          >
            {last ? t("start") : t("next")}
            <ArrowRight className="size-4" strokeWidth={2.4} />
          </button>
        </div>
      </footer>
    </div>
  );
}

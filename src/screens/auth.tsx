import { useRef, useState } from "react";
import {
  ArrowRight,
  AtSign,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Compass,
  Globe,
  Lock,
  MessageCircle,
  Phone,
  User,
  Users,
} from "lucide-react";
import { GallerySheet } from "@/components/gallery";
import { SmartImg } from "@/components/smart-img";
import { StatusBar } from "@/components/ui";
import { announce, haptic } from "@/lib/haptics";
import { yearsOld } from "@/lib/legal";
import { TAKEN_USERNAMES } from "@/lib/seed";
import { useT, useWgoStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AuthCta,
  AuthField,
  AuthLang,
  AuthLockup,
  AuthShell,
  AuthSteps,
  AVATAR_PICKS,
  COUNTRIES,
} from "./auth-chrome";
import { IntroSplash } from "./intro";
import { LegalOverlay } from "./legal";
import { OnboardingScreen } from "./onboarding";

export { OnboardingScreen };

export function SplashScreen() {
  const onboarded = useWgoStore((s) => s.onboarded);
  const replace = useWgoStore((s) => s.replace);
  return (
    <IntroSplash onDone={() => replace({ name: onboarded ? "chats" : "onboarding" })} />
  );
}

export function SignupScreen() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const replace = useWgoStore((s) => s.replace);
  const saveSignup = useWgoStore((s) => s.saveSignup);
  const acceptLegal = useWgoStore((s) => s.acceptLegal);
  const [firstName, setFirst] = useState("Deena");
  const [lastName, setLast] = useState("Diallo");
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [phone, setPhone] = useState("514 555 0148");
  const [birthday, setBirthday] = useState("1999-04-12");
  const [accepted, setAccepted] = useState(false);
  const [needAccept, setNeedAccept] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  const [doc, setDoc] = useState<"privacy" | "terms" | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);

  function tryContinue() {
    const age = yearsOld(birthday);
    if (age > 0 && age < 13) {
      setTooYoung(true);
      setNeedAccept(false);
      return;
    }
    setTooYoung(false);
    if (!accepted) {
      setNeedAccept(true);
      return;
    }
    setNeedAccept(false);
    acceptLegal();
    saveSignup({
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      phone: `${country.dial} ${phone}`,
      birthday,
      country: country.id,
    });
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-bg">
      <SignupBanner />
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
        <AuthSteps step={1} />
        <div className="grid grid-cols-2 gap-2.5">
          <AuthField label={t("firstName")} icon={<User className="size-4" />}>
            <input
              className="h-full w-full bg-transparent text-[15px] outline-none"
              value={firstName}
              onChange={(e) => setFirst(e.target.value)}
            />
          </AuthField>
          <AuthField label={t("lastName")} icon={<User className="size-4" />}>
            <input
              className="h-full w-full bg-transparent text-[15px] outline-none"
              value={lastName}
              onChange={(e) => setLast(e.target.value)}
            />
          </AuthField>
        </div>
        <div className="relative mt-3">
          <AuthField label={t("country")} icon={<Globe className="size-4" />}>
            <button
              type="button"
              className="flex h-full w-full items-center justify-between text-left text-[15px]"
              onClick={() => setCountryOpen((v) => !v)}
            >
              {lang === "fr" ? country.fr : country.en}
              <ChevronDown className="size-4 text-muted" />
            </button>
          </AuthField>
          {countryOpen ? (
            <CountryMenu
              lang={lang}
              onPick={(c) => {
                setCountry(c);
                setCountryOpen(false);
              }}
            />
          ) : null}
        </div>
        <div className="relative mt-3">
          <span className="mb-1.5 block text-[12px] font-medium text-muted">{t("phone")}</span>
          <div className="flex h-12 items-center gap-1 rounded-2xl bg-[#12141c] px-2 ring-1 ring-white/8 focus-within:ring-accent/40">
            <Phone className="ml-1 size-4 shrink-0 text-muted" />
            <button
              type="button"
              className="flex h-full items-center gap-1 px-1 text-[14px] font-medium"
              onClick={() => setDialOpen((v) => !v)}
            >
              {country.dial}
              <ChevronDown className="size-3.5 text-muted" />
            </button>
            <span className="h-5 w-px bg-white/10" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {dialOpen ? (
            <CountryMenu
              lang={lang}
              showDial
              onPick={(c) => {
                setCountry(c);
                setDialOpen(false);
              }}
            />
          ) : null}
          <p className="mt-2 flex gap-1.5 text-[11px] leading-snug text-muted">
            <Lock className="mt-0.5 size-3 shrink-0 text-accent" />
            {t("phonePrivate")}
          </p>
        </div>
        <div className="relative mt-3">
          <AuthField label={t("birthday")} icon={<Calendar className="size-4" />}>
            <span className="flex-1 text-[15px]">{formatBday(birthday, lang)}</span>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </AuthField>
        </div>
        <label className="mt-4 flex items-start gap-2.5">
          <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                if (e.target.checked) setNeedAccept(false);
              }}
              className="peer absolute inset-0 opacity-0"
            />
            <span className="flex size-5 items-center justify-center rounded-md bg-paper/10 ring-1 ring-white/35 peer-checked:bg-accent peer-checked:ring-0">
              {accepted ? <Check className="size-3 text-accent-fg" strokeWidth={3} /> : null}
            </span>
          </span>
          <span className="text-[12px] leading-relaxed text-muted">
            {t("legalAcceptShort")}{" "}
            <button
              type="button"
              className="font-medium text-accent underline underline-offset-2"
              onClick={() => setDoc("terms")}
            >
              {t("termsOfUse")}
            </button>{" "}
            {t("legalAnd")}{" "}
            <button
              type="button"
              className="font-medium text-accent underline underline-offset-2"
              onClick={() => setDoc("privacy")}
            >
              {t("privacyPolicy")}
            </button>{" "}
            {t("legalOfWipp")}
          </span>
        </label>
        {needAccept ? <p className="mt-2 text-[13px] text-danger">{t("legalNeedAccept")}</p> : null}
        {tooYoung ? <p className="mt-2 text-[13px] text-danger">{t("legalTooYoung")}</p> : null}
        <AuthCta onClick={tryContinue}>
          {t("continue")}
          <ArrowRight className="size-4" />
        </AuthCta>
        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-hair" />
          <span className="text-[12px] text-muted">{t("or")}</span>
          <span className="h-px flex-1 bg-hair" />
        </div>
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-full text-[14px] ring-1 ring-hair"
          onClick={() => replace({ name: "login" })}
        >
          {t("alreadyAccount")}{" "}
          <span className="ml-1 font-semibold text-accent">{t("signIn")}</span>
        </button>
      </div>
      {doc ? <LegalOverlay doc={doc} onClose={() => setDoc(null)} /> : null}
    </div>
  );
}

function SignupBanner() {
  const t = useT();
  return (
    <div className="relative h-[300px] shrink-0 overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-accent/20 blur-3xl" />
      <SmartImg
        src="/avatars/deena.jpg"
        alt=""
        priority
        className="pointer-events-none absolute top-[-12%] right-[-14%] h-[140%] w-[82%] object-cover object-[70%_10%]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--wgo-bg)_0%,var(--wgo-bg)_26%,rgb(7_10_15/0.35)_48%,transparent_68%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(to_top,var(--wgo-bg),transparent)]" />
      <StatusBar />
      <div className="absolute top-11 right-3 z-20">
        <AuthLang />
      </div>
      <div className="relative z-10 px-5 pt-1">
        <AuthLockup />
        <h1 className="mt-6 text-[32px] leading-[1.05] font-semibold tracking-tight">
          {t("signupHeroTitle")}
          <br />
          <span className="text-accent">WIPP</span>
        </h1>
        <p className="mt-2 max-w-[19ch] text-[13px] leading-relaxed text-muted">{t("signupHeroBody")}</p>
      </div>
      <p className="font-script pointer-events-none absolute right-4 bottom-12 z-10 w-[6.6rem] -rotate-[18deg] text-right text-[21px] leading-[0.9] text-accent drop-shadow-[0_4px_12px_rgb(0_0_0/0.75)]">
        Donne-moi
        <br />
        ton WIPP ♡
      </p>
    </div>
  );
}

function CountryMenu({
  lang,
  onPick,
  showDial,
}: {
  lang: Lang;
  onPick: (c: (typeof COUNTRIES)[number]) => void;
  showDial?: boolean;
}) {
  return (
    <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl bg-navy ring-1 ring-hair">
      {COUNTRIES.map((c) => (
        <button
          key={c.id}
          type="button"
          className="flex h-11 w-full items-center justify-between px-4 text-[14px]"
          onClick={() => onPick(c)}
        >
          <span>{lang === "fr" ? c.fr : c.en}</span>
          {showDial ? <span className="text-muted">{c.dial}</span> : null}
        </button>
      ))}
    </div>
  );
}

function formatBday(iso: string, lang: Lang) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LoginScreen() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const replace = useWgoStore((s) => s.replace);
  const saveSignup = useWgoStore((s) => s.saveSignup);
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [phone, setPhone] = useState("514 555 0148");
  const [dialOpen, setDialOpen] = useState(false);
  return (
    <div className="absolute inset-0 flex flex-col bg-bg">
      <SignupBanner />
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
        <h2 className="text-[22px] font-semibold tracking-tight">{t("loginHero")}</h2>
        <p className="mt-1 text-[13px] text-muted">{t("loginSub")}</p>
        <div className="relative mt-5">
          <span className="mb-1.5 block text-[12px] font-medium text-muted">{t("phone")}</span>
          <div className="flex h-12 items-center gap-1 rounded-2xl bg-[#12141c] px-2 ring-1 ring-white/8 focus-within:ring-accent/40">
            <Phone className="ml-1 size-4 shrink-0 text-muted" />
            <button
              type="button"
              className="flex h-full items-center gap-1 px-1 text-[14px] font-medium"
              onClick={() => setDialOpen((v) => !v)}
            >
              {country.dial}
              <ChevronDown className="size-3.5 text-muted" />
            </button>
            <span className="h-5 w-px bg-white/10" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {dialOpen ? (
            <CountryMenu
              lang={lang}
              showDial
              onPick={(c) => {
                setCountry(c);
                setDialOpen(false);
              }}
            />
          ) : null}
        </div>
        <AuthCta
          onClick={() =>
            saveSignup({
              phone: `${country.dial} ${phone}`,
              country: country.id,
              firstName: "",
            })
          }
        >
          {t("continue")}
          <ArrowRight className="size-4" />
        </AuthCta>
        <button
          type="button"
          className="mx-auto mt-4 block text-[13px] text-muted"
          onClick={() => replace({ name: "signup" })}
        >
          {t("back")}
        </button>
      </div>
    </div>
  );
}

export function OtpScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const openDemo = useWgoStore((s) => s.openDemo);
  const pending = useWgoStore((s) => s.pendingSignup);
  const phone = useWgoStore((s) => s.pendingSignup.phone ?? s.me.phone);
  const isLogin = !pending.firstName;
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);

  function pass() {
    if (isLogin) openDemo();
    else push({ name: "setup" });
  }
  function submit(next: string) {
    setCode(next);
    setErr(false);
    if (next.length === 4) {
      if (next === "1234") pass();
      else setErr(true);
    }
  }

  return (
    <AuthShell onBack={pop}>
      <h1 className="mt-6 text-[28px] font-semibold tracking-tight">{t("otpHero")}</h1>
      <p className="mt-2 text-[14px] text-muted">
        {t("otpBody")} {phone}
      </p>
      <AuthSteps step={1} />
      <div className="mt-2 flex justify-between gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <input
            key={i}
            inputMode="numeric"
            maxLength={1}
            value={code[i] ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(-1);
              const chars = code.split("");
              chars[i] = v;
              submit(chars.join("").slice(0, 4));
              const next = e.currentTarget.nextElementSibling;
              if (v && next instanceof HTMLInputElement) next.focus();
            }}
            className="h-16 w-16 rounded-2xl bg-surface text-center text-[22px] font-semibold ring-1 ring-hair outline-none focus:ring-2 focus:ring-accent"
          />
        ))}
      </div>
      <p className="mt-4 text-[13px] text-muted">{t("otpHint")}</p>
      {err ? <p className="mt-2 text-[13px] text-danger">{t("otpError")}</p> : null}
      <AuthCta
        disabled={code.length !== 4}
        onClick={() => {
          if (code === "1234") pass();
          else setErr(true);
        }}
      >
        {t("continue")}
        <ArrowRight className="size-4" />
      </AuthCta>
    </AuthShell>
  );
}

const GENDERS = ["unspecified", "woman", "man", "nb"] as const;

export function SetupScreen() {
  const t = useT();
  const pending = useWgoStore((s) => s.pendingSignup);
  const me = useWgoStore((s) => s.me);
  const completeSetup = useWgoStore((s) => s.completeSetup);
  const pop = useWgoStore((s) => s.pop);
  const [displayName, setName] = useState(
    pending.displayName || `${pending.firstName ?? me.firstName} ${pending.lastName ?? ""}`.trim(),
  );
  const [username, setUser] = useState(
    (pending.firstName || me.username).toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<(typeof GENDERS)[number]>("unspecified");
  const [avatar, setAvatar] = useState(pending.avatar || me.avatar || "/avatars/deena.jpg");
  const [genderOpen, setGenderOpen] = useState(false);
  const [pick, setPick] = useState(false);
  const taken = TAKEN_USERNAMES.has(username) && username !== "deena";
  const valid = username.length >= 3 && username.length <= 20 && !taken;

  function genderLabel(g: (typeof GENDERS)[number]) {
    return t(
      g === "woman" ? "genderWoman" : g === "man" ? "genderMan" : g === "nb" ? "genderNb" : "genderUnspecified",
    );
  }

  return (
    <div className="absolute inset-0 bg-bg">
      <AuthShell onBack={pop}>
        <h1 className="mt-5 text-[28px] leading-tight font-semibold tracking-tight">
          {t("setupHeroTitle")}
          <br />
          <span className="text-fg">{t("setupHeroYou")} </span>
          <span className="text-accent">WIPP</span>
        </h1>
        <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-muted">{t("setupHeroBody")}</p>
        <AuthSteps step={2} />
        <p className="mb-3 text-[12px] font-medium text-muted">{t("profilePhoto")}</p>
        <div className="flex justify-center">
          <button
            type="button"
            className="relative"
            onClick={() => setPick(true)}
            aria-label={t("profilePhoto")}
          >
            <span className="block size-[124px] overflow-hidden rounded-full ring-2 ring-accent/80">
              <SmartImg src={avatar} alt="" priority className="size-full object-cover" />
            </span>
            <span className="absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full bg-navy text-paper ring-2 ring-bg">
              <Camera className="size-4" />
            </span>
          </button>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          {AVATAR_PICKS.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setAvatar(src)}
              className={cn("size-11 overflow-hidden rounded-full ring-2", avatar === src ? "ring-accent" : "ring-transparent")}
            >
              <SmartImg src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
          <button
            type="button"
            className="flex size-11 flex-col items-center justify-center rounded-full bg-surface text-[8px] leading-tight text-muted ring-1 ring-hair"
            onClick={() => setPick(true)}
          >
            +<span>{t("later")}</span>
          </button>
        </div>
        <div className="mt-5">
          <AuthField label={t("usernameWipp")} icon={<AtSign className="size-4" />}>
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              value={username}
              onChange={(e) => setUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            />
            {valid ? <Check className="size-4 shrink-0 text-emerald-400" /> : null}
          </AuthField>
          <p className={cn("mt-1.5 text-[11px] leading-relaxed", taken ? "text-danger" : "text-muted")}>
            {taken ? t("usernameTaken") : t("usernameHintSetup")}
          </p>
        </div>
        <AuthField className="mt-3" label={t("displayName")} icon={<User className="size-4" />}>
          <input
            className="h-full w-full bg-transparent text-[15px] outline-none"
            value={displayName}
            onChange={(e) => setName(e.target.value)}
          />
        </AuthField>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[12px] font-medium text-muted">{t("bioOptional")}</span>
          <span className="relative block">
            <textarea
              rows={2}
              maxLength={100}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="Bonne énergie, belles discussions"
              className="w-full resize-none rounded-2xl bg-surface px-10 py-3 text-[15px] outline-none ring-1 ring-hair placeholder:text-muted focus:ring-accent/50"
            />
            <User className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
            <span className="absolute right-3 bottom-2 text-[11px] text-muted">
              {bio.length}/100
            </span>
          </span>
        </label>
        <div className="relative mt-3">
          <AuthField label={t("genderOptional")} icon={<User className="size-4" />}>
            <button
              type="button"
              className="flex h-full w-full items-center justify-between text-left text-[15px]"
              onClick={() => setGenderOpen((v) => !v)}
            >
              {genderLabel(gender)}
              <ChevronDown className="size-4 text-muted" />
            </button>
          </AuthField>
          {genderOpen ? (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl bg-navy ring-1 ring-hair">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className="flex h-11 w-full items-center px-4 text-[14px]"
                  onClick={() => {
                    setGender(g);
                    setGenderOpen(false);
                  }}
                >
                  {genderLabel(g)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <AuthCta
          disabled={!valid || !displayName}
          onClick={() =>
            completeSetup({
              displayName,
              username,
              bio,
              avatar,
              gender,
              firstName: pending.firstName || displayName.split(" ")[0],
              lastName: pending.lastName || displayName.split(" ").slice(1).join(" "),
              discoverability: "everyone",
            })
          }
        >
          {t("createMyWipp")}
          <ArrowRight className="size-4" />
        </AuthCta>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface/80 px-2 py-3 ring-1 ring-hair">
          <span className="flex flex-col items-center gap-1.5 text-center">
            <MessageCircle className="size-5 text-accent" />
            <span className="text-[10px] leading-tight text-muted">{t("authFootChat")}</span>
          </span>
          <span className="flex flex-col items-center gap-1.5 text-center">
            <Users className="size-5 text-accent" />
            <span className="text-[10px] leading-tight text-muted">{t("authFootConnect")}</span>
          </span>
          <span className="flex flex-col items-center gap-1.5 text-center">
            <Compass className="size-5 text-accent" />
            <span className="text-[10px] leading-tight text-muted">{t("authFootExplore")}</span>
          </span>
        </div>
        <p className="mt-4 text-center text-[12px] text-muted">
          {t("authCloser")} <span className="text-accent">♡</span>
        </p>
      </AuthShell>
      <GallerySheet
        open={pick}
        onClose={() => setPick(false)}
        onPick={(src) => {
          setAvatar(src);
          setPick(false);
        }}
      />
    </div>
  );
}

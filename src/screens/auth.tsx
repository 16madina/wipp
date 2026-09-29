import { useEffect, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { ArrowRight, Check, ChevronDown, ChevronLeft, Pencil } from "lucide-react-native";
import { signinOtp, signupPhone, usernameAvailable } from "../lib/auth-api";
import {
  clearPending,
  getVerifiedSignup,
  pendingMode,
  pendingPhone,
  setVerifiedSignup,
  startPhoneCode,
  verifyPhoneCode,
  isTestSigninPassword,
} from "../lib/auth-flow";
import { COUNTRIES, DEFAULT_COUNTRY, countryById, flagEmoji, flagUri, type Country } from "../lib/countries";
import { enterWithSession, enterWithoutServer } from "../lib/enter-session";
import { toE164 } from "../lib/firebase-phone";
import {
  authLogin,
  authPhone,
  authProfile,
  authSms,
  authWelcome,
  brandOfficial,
  wippSrc,
} from "../lib/assets";
import { haptic } from "../lib/haptics";
import type { I18nKey } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useT, useWippStore } from "../lib/store";
import { colors } from "../theme";
import { Press, SafeTop } from "../components/ui";

const ONB: { kind: "tap" | "globe" | "privacy" | "together"; title: I18nKey; accent: I18nKey; body: I18nKey }[] = [
  { kind: "tap", title: "onb1Title", accent: "onb1Accent", body: "onb1Body" },
  { kind: "globe", title: "onb3Title", accent: "onb3Accent", body: "onb3Body" },
  { kind: "privacy", title: "onb2Title", accent: "onb2Accent", body: "onb2Body" },
  { kind: "together", title: "onb4Title", accent: "onb4Accent", body: "onb4Body" },
];

function Artwork({ source, children }: { source: number; children?: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Image
        pointerEvents="none"
        source={source}
        style={{ position: "absolute", zIndex: 0, width: "100%", height: "100%" }}
        contentFit="fill"
      />
      <View pointerEvents="box-none" style={{ flex: 1, zIndex: 1, elevation: 2 }}>
        {children}
      </View>
    </View>
  );
}

function Abs({
  t,
  l,
  h,
  w,
  children,
}: {
  t: number;
  l: number;
  h?: number;
  w: number;
  children?: ReactNode;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: `${t}%`,
        left: `${l}%`,
        height: h == null ? undefined : `${h}%`,
        width: `${w}%`,
        overflow: "visible",
      }}
    >
      {children}
    </View>
  );
}

function Flag({ id, size = 16 }: { id: string; size?: number }) {
  return (
    <View style={{ width: size * 1.5, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ position: "absolute", fontSize: size * 0.9, lineHeight: size }}>{flagEmoji(id)}</Text>
      <Image source={{ uri: flagUri(id) }} style={{ width: "100%", height: "100%", borderRadius: 2 }} contentFit="cover" />
    </View>
  );
}

function CountrySheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (country: Country) => void;
}) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => {}}
          style={{ maxHeight: "55%", backgroundColor: colors.navy, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        >
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 16, padding: 16 }}>Pays</Text>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Flag id={item.id} />
                <Text style={{ flex: 1, color: colors.fg, fontSize: 15 }}>{item.fr}</Text>
                <Text style={{ color: colors.muted, fontSize: 15 }}>{item.dial}</Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function nationalToE164(country: Country, phone: string) {
  return toE164(`${country.dial}${phone.replace(/\D/g, "").replace(/^0+/, "")}`);
}

function CheckLine({
  checked,
  onToggle,
  labelStart,
  linkA,
  onA,
  mid,
  linkB,
  onB,
  end,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  labelStart: string;
  linkA: string;
  onA: () => void;
  mid?: string;
  linkB?: string;
  onB?: () => void;
  end: string;
}) {
  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 1 }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          marginTop: 1,
          backgroundColor: checked ? colors.accent : "rgba(255,255,255,0.12)",
          borderWidth: checked ? 0 : 1.5,
          borderColor: "rgba(255,255,255,0.55)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check size={12} color={colors.accentFg} strokeWidth={3} /> : null}
      </View>
      <Text style={{ flex: 1, fontSize: 10, lineHeight: 13, color: colors.muted }}>
        {labelStart}
        <Text onPress={onA} style={{ color: colors.accent, fontFamily: "Inter_500Medium", textDecorationLine: "underline" }}>
          {linkA}
        </Text>
        {mid}
        {linkB && onB ? (
          <Text onPress={onB} style={{ color: colors.accent, fontFamily: "Inter_500Medium", textDecorationLine: "underline" }}>
            {linkB}
          </Text>
        ) : null}
        {end}
      </Text>
    </Pressable>
  );
}

function ContinueHit({
  ready,
  busy,
  label,
  onPress,
}: {
  ready: boolean;
  busy: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={busy || !ready}
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ready ? "transparent" : "#3a404c",
      }}
    >
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : ready ? null : (
        <Text style={{ color: "rgba(247,249,252,0.62)", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SplashScreen() {
  return <View style={{ flex: 1, backgroundColor: colors.introBg }} />;
}

export function OnboardingScreen() {
  const t = useT();
  const replace = useWippStore((s) => s.replace);
  const [page, setPage] = useState(0);
  const slide = ONB[page];
  const last = page >= ONB.length - 1;
  const hero = wippSrc(`/onboarding/hero-${slide.kind}.webp`) ?? wippSrc(`/onboarding/hero-${slide.kind}.jpg`);

  return (
    <View style={{ flex: 1, backgroundColor: "#070a0f" }}>
      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden" }}>
        {hero ? (
          <Image source={hero} style={{ position: "absolute", width: "124%", height: "124%", top: "-12%", left: "-12%" }} contentFit="contain" />
        ) : null}
      </View>
      <SafeTop />
      <View style={{ alignItems: "flex-end", paddingRight: 8 }}>
        <Press onPress={() => replace({ name: "welcome" })} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, fontFamily: "Inter_500Medium" }}>{t("skip")}</Text>
        </Press>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 22, paddingBottom: 22 }}>
        <Text style={{ textAlign: "center", fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.paper, lineHeight: 26 }}>
          {t(slide.title)} <Text style={{ color: colors.accent }}>{t(slide.accent)}</Text>
        </Text>
        <Text style={{ textAlign: "center", marginTop: 6, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.55)" }}>
          {t(slide.body)}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 2, marginTop: 8 }}>
          {ONB.map((_, i) => (
            <Press key={i} onPress={() => setPage(i)} style={{ width: 22, height: 36, alignItems: "center", justifyContent: "center" }}>
              <View style={{ height: 7, width: i === page ? 22 : 7, borderRadius: 99, backgroundColor: i === page ? colors.accent : "rgba(255,255,255,0.22)" }} />
            </Press>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
          <Press
            disabled={page === 0}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: "#121722", alignItems: "center", justifyContent: "center", opacity: page === 0 ? 0.38 : 1 }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{t("back")}</Text>
          </Press>
          <Press
            onPress={() => {
              haptic("select");
              if (last) replace({ name: "welcome" });
              else setPage((p) => p + 1);
            }}
            style={{ flex: 1.2, height: 48, borderRadius: 999, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
          >
            <Text style={{ color: colors.accentFg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{last ? t("start") : t("next")}</Text>
            <ArrowRight size={16} color={colors.accentFg} />
          </Press>
        </View>
      </View>
    </View>
  );
}

export function WelcomeScreen() {
  const push = useWippStore((s) => s.push);
  const replace = useWippStore((s) => s.replace);
  return (
    <Artwork source={authWelcome}>
      <Abs t={70.7} l={5} h={7} w={90}>
        <Pressable accessibilityLabel="Créer un compte" onPress={() => push({ name: "phone-entry" })} style={{ flex: 1 }} />
      </Abs>
      <Abs t={79.3} l={5} h={7} w={90}>
        <Pressable accessibilityLabel="J’ai déjà un compte" onPress={() => replace({ name: "login" })} style={{ flex: 1 }} />
      </Abs>
      <Abs t={88} l={48} h={3.5} w={35}>
        <Pressable accessibilityLabel="Conditions d’utilisation" onPress={() => push({ name: "legal", doc: "terms" })} style={{ flex: 1 }} />
      </Abs>
      <Abs t={91} l={32} h={3.5} w={43}>
        <Pressable accessibilityLabel="Politique de confidentialité" onPress={() => push({ name: "legal", doc: "privacy" })} style={{ flex: 1 }} />
      </Abs>
    </Artwork>
  );
}

export function PhoneEntryScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [menuOpen, setMenuOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [legal, setLegal] = useState(false);
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function continueWithPhone() {
    if (!legal || !adult || busy) return;
    const normalized = nationalToE164(country, phone);
    if (!normalized) {
      setError("Entre un numéro de téléphone valide.");
      return;
    }
    setBusy(true);
    const smsError = await startPhoneCode(normalized, "signup");
    setBusy(false);
    if (smsError) {
      setError(smsError);
      return;
    }
    useWippStore.setState((s) => ({ pendingSignup: { ...s.pendingSignup, phone: normalized, country: country.id, mode: "signup" } }));
    setError("");
    push({ name: "sms-reference" });
  }

  return (
    <Artwork source={authPhone}>
      <Abs t={11.5} l={4} h={6} w={12}>
        <Pressable accessibilityLabel="Retour" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Pressable>
      </Abs>
      <Abs t={59} l={10} h={5.5} w={80}>
        <Pressable
          accessibilityLabel={`Pays : ${country.fr} (${country.dial})`}
          onPress={() => setMenuOpen(true)}
          style={{ flex: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Flag id={country.id} />
          <Text style={{ flex: 1, color: colors.fg, fontSize: 15 }} numberOfLines={1}>
            {country.fr}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>{country.dial}</Text>
          <ChevronDown size={14} color={colors.muted} />
        </Pressable>
      </Abs>
      <Abs t={69.1} l={10.6} h={6} w={78.8}>
        <TextInput
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setError("");
          }}
          keyboardType="phone-pad"
          placeholder="(514) 123-4567"
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
          style={{ flex: 1, color: colors.fg, fontSize: 18, paddingHorizontal: 16, paddingVertical: 0, backgroundColor: "transparent" }}
        />
      </Abs>
      <Abs t={76.8} l={6} h={10} w={88}>
        <View pointerEvents="none" style={{ flex: 1, borderRadius: 8, backgroundColor: colors.bg }} />
      </Abs>
      <Abs t={77.6} l={8} w={84}>
        <CheckLine
          checked={legal}
          onToggle={setLegal}
          labelStart="En continuant, j’accepte les "
          linkA="conditions d’utilisation"
          onA={() => push({ name: "legal", doc: "terms" })}
          mid=" et les "
          linkB="politiques de confidentialité"
          onB={() => push({ name: "legal", doc: "privacy" })}
          end="."
        />
        <CheckLine checked={adult} onToggle={setAdult} labelStart="Je reconnais avoir " linkA="18 ans et plus" onA={() => push({ name: "legal", doc: "age" })} end="." />
      </Abs>
      {error ? (
        <Abs t={85.3} l={10} h={4} w={80}>
          <Text style={{ color: colors.danger, fontSize: 10 }}>{error}</Text>
        </Abs>
      ) : null}
      <Abs t={87.05} l={4.8} h={7} w={90.4}>
        <ContinueHit ready={legal && adult} busy={busy} label="Continuer" onPress={() => void continueWithPhone()} />
      </Abs>
      <CountrySheet open={menuOpen} onClose={() => setMenuOpen(false)} onPick={setCountry} />
    </Artwork>
  );
}

export function LoginScreen() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [menuOpen, setMenuOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [legal, setLegal] = useState(false);
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryLogin() {
    if (!legal || !adult || busy) return;
    const e164 = nationalToE164(country, phone);
    if (!e164) {
      setError("Entre un numéro de téléphone valide.");
      return;
    }
    setBusy(true);
    const smsErr = await startPhoneCode(e164, "signin");
    setBusy(false);
    if (smsErr) {
      setError(smsErr);
      return;
    }
    useWippStore.setState((s) => ({ pendingSignup: { ...s.pendingSignup, phone: e164, country: country.id, mode: "signin" } }));
    push({ name: "sms-reference" });
  }

  return (
    <Artwork source={authLogin}>
      <Abs t={61} l={6} h={6} w={88}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8 }}>
          <Pressable
            accessibilityLabel={`Pays : ${country.fr} (${country.dial})`}
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 4 }}
          >
            <Flag id={country.id} size={15} />
            <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_500Medium" }}>{country.dial}</Text>
            <ChevronDown size={14} color={colors.muted} />
          </Pressable>
          <TextInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError("");
            }}
            keyboardType="phone-pad"
            placeholder="(514) 123-4567"
            placeholderTextColor={colors.muted}
            underlineColorAndroid="transparent"
            textAlignVertical="center"
            style={{ flex: 1, height: "100%", color: colors.fg, fontSize: 16, padding: 0, margin: 0, backgroundColor: "transparent", includeFontPadding: false }}
          />
        </View>
      </Abs>
      <Abs t={67.15} l={5} h={6.5} w={90}>
        <View pointerEvents="none" style={{ flex: 1, backgroundColor: colors.bg }} />
      </Abs>
      {error ? (
        <Abs t={66.8} l={8} w={84}>
          <Text style={{ color: colors.danger, fontSize: 10 }}>{error}</Text>
        </Abs>
      ) : null}
      <Abs t={67.2} l={6} h={6.4} w={88}>
        <View style={{ flex: 1, overflow: "hidden", justifyContent: "space-between", paddingVertical: 1 }}>
          <CheckLine
            checked={legal}
            onToggle={setLegal}
            labelStart="En continuant, j’accepte les "
            linkA="conditions d’utilisation"
            onA={() => push({ name: "legal", doc: "terms" })}
            mid=" et les "
            linkB="politiques de confidentialité"
            onB={() => push({ name: "legal", doc: "privacy" })}
            end="."
          />
          <CheckLine checked={adult} onToggle={setAdult} labelStart="Je reconnais avoir " linkA="18 ans et plus" onA={() => push({ name: "legal", doc: "age" })} end="." />
        </View>
      </Abs>
      <Abs t={73.45} l={5.1} h={7.6} w={89.8}>
        <View style={{ flex: 1, borderRadius: 999, overflow: "hidden", backgroundColor: legal && adult ? "transparent" : colors.bg }}>
          <ContinueHit ready={legal && adult} busy={busy} label={t("continue")} onPress={() => void tryLogin()} />
        </View>
      </Abs>
      <Abs t={89} l={20} h={4} w={60}>
        <Pressable accessibilityLabel="Je n’ai pas encore de compte" onPress={() => push({ name: "phone-entry" })} style={{ flex: 1 }} />
      </Abs>
      <CountrySheet open={menuOpen} onClose={() => setMenuOpen(false)} onPick={setCountry} />
    </Artwork>
  );
}

export function SmsReferenceScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const pending = useWippStore((s) => s.pendingSignup);
  const phone = pendingPhone() ?? pending.phone ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [noAccount, setNoAccount] = useState<{ idToken: string; phone: string } | null>(null);
  const signin = (pendingMode() ?? pending.mode) === "signin";
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  async function validate() {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    setNoAccount(null);
    if (isTestSigninPassword(code)) {
      enterWithoutServer(phone);
      clearPending();
      setBusy(false);
      return;
    }
    if (signin) {
      const result = await verifyPhoneCode(code);
      if ("error" in result) {
        setBusy(false);
        setError(result.error);
        return;
      }
      try {
        const res = await signinOtp({ idToken: result.idToken });
        if (res.ok) {
          await enterWithSession(res.accessToken, res.refreshToken, phone);
          clearPending();
          setBusy(false);
          return;
        }
        if ("noAccount" in res && res.noAccount) {
          setBusy(false);
          setNoAccount(result);
          setError(res.error);
          return;
        }
        enterWithoutServer(phone);
        clearPending();
        setBusy(false);
        return;
      } catch {
        enterWithoutServer(phone);
        clearPending();
        setBusy(false);
        return;
      }
    }
    const result = await verifyPhoneCode(code);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    if (result.phone !== pending.phone) {
      setError("Vérification impossible. Recommence.");
      return;
    }
    setVerifiedSignup(result);
    push({ name: "profile-reference" });
  }

  async function resend() {
    if (seconds > 0 || busy || !phone) return;
    setBusy(true);
    setError("");
    const result = await startPhoneCode(phone, signin ? "signin" : "signup");
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    setCode("");
    setSeconds(45);
  }

  return (
    <Artwork source={authSms}>
      <Abs t={8} l={4} h={6} w={12}>
        <Pressable accessibilityLabel="Retour" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Pressable>
      </Abs>
      <Abs t={40} l={6} h={5.5} w={78}>
        <Pressable
          accessibilityLabel="Modifier mon numéro"
          onPress={pop}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: colors.authInput,
          }}
        >
          <Flag id={pending.country ?? "CA"} size={14} />
          <Text numberOfLines={1} style={{ flex: 1, color: colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
            {phone}
          </Text>
          <Pencil size={16} color={colors.accent} />
        </Pressable>
      </Abs>
      <Abs t={60} l={7} h={9} w={86}>
        <Pressable onPress={() => {}} style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: "13.5%", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
              <Text style={{ fontSize: 28, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{code[i] ?? ""}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          style={{ position: "absolute", opacity: 0.02, width: "100%", height: "100%", color: colors.fg }}
        />
      </Abs>
      {error ? (
        <Abs t={70} l={8} h={5} w={84}>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
          {noAccount ? (
            <Pressable
              onPress={() => {
                useWippStore.setState((s) => ({ pendingSignup: { ...s.pendingSignup, phone: noAccount.phone, mode: "signup" } }));
                setVerifiedSignup(noAccount);
                push({ name: "profile-reference" });
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 12, marginTop: 4 }}>Créer un compte</Text>
            </Pressable>
          ) : null}
        </Abs>
      ) : null}
      <Abs t={73} l={19} h={5} w={62}>
        <Pressable disabled={seconds > 0 || busy} onPress={() => void resend()} style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ textAlign: "center", color: colors.accent, fontSize: 13 }}>
            {seconds > 0 ? `Renvoyer le code dans 00:${String(seconds).padStart(2, "0")}` : "Renvoyer le code"}
          </Text>
        </Pressable>
      </Abs>
      <Abs t={79.2} l={5} h={6.7} w={90}>
        <Pressable
          accessibilityLabel="Continuer"
          disabled={busy || code.length !== 6}
          onPress={() => void validate()}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {busy ? <ActivityIndicator color={colors.accent} /> : null}
        </Pressable>
      </Abs>
      <Abs t={88} l={22} h={5} w={56}>
        <Pressable accessibilityLabel="Modifier mon numéro" onPress={pop} style={{ flex: 1 }} />
      </Abs>
    </Artwork>
  );
}

export function ProfileReferenceScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const completeSetup = useWippStore((s) => s.completeSetup);
  const country = useWippStore((s) => s.pendingSignup.country ?? "CA");
  const phone = useWippStore((s) => s.pendingSignup.phone ?? "");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [username, setUser] = useState("");
  const [availability, setAvailability] = useState<"available" | "taken" | "checking" | null>(null);
  const [checkedUsername, setCheckedUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const okUser = /^[a-z0-9_]{3,20}$/.test(username);
  const countryLabel = countryById(country);

  useEffect(() => {
    if (!okUser) return;
    let cancelled = false;
    setAvailability("checking");
    const timer = setTimeout(() => {
      void usernameAvailable(username)
        .then((available) => {
          if (!cancelled) {
            setCheckedUsername(username);
            setAvailability(available ? "available" : "taken");
          }
        })
        .catch(() => {
          if (!cancelled) setAvailability(null);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, okUser]);

  async function finish() {
    const verified = getVerifiedSignup();
    if (!verified || verified.phone !== phone) {
      setError("Code SMS expiré. Recommence la vérification.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !okUser) {
      setError("Renseigne ton prénom, ton nom et un pseudo valide.");
      return;
    }
    if (availability !== "available" || checkedUsername !== username) {
      setError("Vérifie la disponibilité du pseudo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await signupPhone({
        idToken: verified.idToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username,
        country,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const session = await supabase.auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken });
      if (session.error) {
        setError("Compte créé, mais connexion impossible. Réessaie.");
        return;
      }
      clearPending();
      completeSetup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        username,
        country,
        phone,
      });
      push({ name: "signup-celebration", username });
    } catch {
      setError("Inscription impossible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Artwork source={authProfile}>
      <Abs t={8} l={4} h={5} w={12}>
        <Pressable accessibilityLabel="Retour" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Pressable>
      </Abs>
      <Abs t={53.8} l={10.5} h={4.4} w={37}>
        <TextInput value={firstName} onChangeText={setFirst} placeholder="Prénom" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.fg, fontSize: 15, paddingHorizontal: 8, backgroundColor: colors.authInput }} />
      </Abs>
      <Abs t={53.8} l={52} h={4.4} w={37}>
        <TextInput value={lastName} onChangeText={setLast} placeholder="Nom" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.fg, fontSize: 15, paddingHorizontal: 8, backgroundColor: colors.authInput }} />
      </Abs>
      <Abs t={61.6} l={10} h={4.3} w={60}>
        <TextInput
          value={username}
          onChangeText={(v) => {
            setUser(v.toLowerCase().replace(/[^a-z0-9_]/g, ""));
            setAvailability(null);
          }}
          placeholder="@pseudo"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={{ flex: 1, color: colors.fg, fontSize: 15, paddingHorizontal: 8, backgroundColor: colors.authInput }}
        />
      </Abs>
      <Abs t={62.7} l={72} h={3} w={18}>
        <Text style={{ fontSize: 11, color: availability === "taken" ? colors.danger : colors.success }}>
          {checkedUsername === username && availability === "available" ? "✓ Disponible" : checkedUsername === username && availability === "taken" ? "Déjà utilisé" : ""}
        </Text>
      </Abs>
      <Abs t={72.1} l={11} h={4} w={78}>
        <Text style={{ color: colors.fg, fontSize: 14 }}>
          {countryLabel.fr} ({countryLabel.dial})
        </Text>
      </Abs>
      {error ? (
        <Abs t={88} l={8} h={4} w={84}>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
        </Abs>
      ) : null}
      <Abs t={89.4} l={6} h={6.1} w={88}>
        <Pressable accessibilityLabel="Continuer" disabled={busy} onPress={() => void finish()} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {busy ? <ActivityIndicator color={colors.accent} /> : null}
        </Pressable>
      </Abs>
    </Artwork>
  );
}

export function SignupCelebrationScreen({ username }: { username: string }) {
  const pop = useWippStore((s) => s.pop);
  useEffect(() => {
    const id = setTimeout(pop, 3300);
    return () => clearTimeout(id);
  }, [pop]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Image source={brandOfficial} style={{ height: 96, width: 220 }} contentFit="contain" />
      <View style={{ marginTop: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Check size={32} color={colors.accentFg} strokeWidth={3} />
      </View>
      <Text style={{ marginTop: 32, fontSize: 29, fontFamily: "Inter_600SemiBold", color: colors.fg, textAlign: "center" }}>Bienvenue sur WIPP ✨</Text>
      <Text style={{ marginTop: 12, fontSize: 19, fontFamily: "Inter_500Medium", color: colors.accent }}>@{username}</Text>
      <Text style={{ marginTop: 8, fontSize: 17, color: colors.fg }}>Ton WIPP est prêt.</Text>
      <Text style={{ position: "absolute", bottom: "18%", fontSize: 16, fontFamily: "Inter_500Medium", color: colors.muted }}>Connecte ta vie.</Text>
    </View>
  );
}

export function OtpScreen() {
  return <SmsReferenceScreen />;
}

export function SetupScreen() {
  return <ProfileReferenceScreen />;
}

export function SignupScreen() {
  return <PhoneEntryScreen />;
}

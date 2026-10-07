import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Animated, FlatList, InputAccessoryView, Keyboard, Modal, Platform, Pressable, Text, TextInput, useWindowDimensions, View, type KeyboardEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Camera, Check, ChevronDown, ChevronLeft, Pencil } from "lucide-react-native";
import { signinOtp, signupPhone, usernameAvailable } from "../lib/auth-api";
import {
  clearPending,
  getVerifiedSignup,
  pendingMode,
  pendingPhone,
  setVerifiedSignup,
  startFreshSignup,
  startPhoneCode,
  toE164,
  verifyPhoneCode,
} from "../lib/auth-flow";
import { COUNTRIES, DEFAULT_COUNTRY, countryById, flagEmoji, flagUri, type Country } from "../lib/countries";
import { enterLinkedProfile } from "../lib/enter-session";
import {
  authLogin,
  authPhone,
  authProfileBg,
  authSms,
  authWelcome,
  brandOfficial,
  logoGold,
  wippSrc,
} from "../lib/assets";
import { haptic } from "../lib/haptics";
import type { I18nKey } from "../lib/i18n";
import { useT, useWippStore } from "../lib/store";
import { palettes } from "../theme";

/** Écran immersif (photo, vidéo, caméra ou appel) : toujours en couleurs sombres, quel que soit le thème. */
const colors = palettes.dark;
import { Press, SafeTop } from "../components/ui";

const ONB: { kind: "tap" | "globe" | "privacy" | "together"; title: I18nKey; accent: I18nKey; body: I18nKey }[] = [
  { kind: "tap", title: "onb1Title", accent: "onb1Accent", body: "onb1Body" },
  { kind: "globe", title: "onb3Title", accent: "onb3Accent", body: "onb3Body" },
  { kind: "privacy", title: "onb2Title", accent: "onb2Accent", body: "onb2Body" },
  { kind: "together", title: "onb4Title", accent: "onb4Accent", body: "onb4Body" },
];

type Measurable = { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void };

function Artwork({ source, children, fit = "fill", imageTop = 0 }: { source: number; fit?: "fill" | "cover"; imageTop?: number; children?: ReactNode | ((reveal: (target: Measurable | null) => void) => ReactNode) }) {
  const insets = useSafeAreaInsets();
  const active = useRef<Measurable | null>(null);
  const keyboardTop = useRef<number | null>(null);
  const currentShift = useRef(0);
  const translateY = useRef(new Animated.Value(0)).current;

  // Layout of each field measured once, at rest (never mid-animation): re-measuring while the
  // screen slides gave a wrong position each time the keyboard height changed a little
  // (QuickType bar, « Code de Messages »…), so the form bounced up and down.
  const baseOf = useRef(new Map<Measurable, { top: number; bottom: number }>());

  const animateTo = useCallback((next: number, duration = 220) => {
    if (Math.abs(next - currentShift.current) < 2) return;
    currentShift.current = next;
    Animated.timing(translateY, {
      toValue: next,
      duration,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const applyShift = useCallback((base: { top: number; bottom: number }, duration: number) => {
    const top = keyboardTop.current;
    if (top == null) return;
    const gap = 12;
    const requiredShift = Math.min(0, top - gap - base.bottom);
    const safeShift = Math.max(requiredShift, insets.top + gap - base.top);
    animateTo(safeShift, duration);
  }, [animateTo, insets.top]);

  const revealActive = useCallback((duration = 220) => {
    const target = active.current;
    if (!target || keyboardTop.current == null) return;
    const known = baseOf.current.get(target);
    if (known) {
      applyShift(known, duration);
      return;
    }
    // Stop any slide first, so the measure and the real offset match.
    translateY.stopAnimation((live) => {
      currentShift.current = live;
      target.measureInWindow((_x, y, _width, height) => {
        const base = { top: y - live, bottom: y - live + height };
        baseOf.current.set(target, base);
        applyShift(base, duration);
      });
    });
  }, [applyShift, translateY]);

  useEffect(() => {
    const onFrame = (event: KeyboardEvent) => {
      const next = event.endCoordinates.screenY;
      if (keyboardTop.current != null && Math.abs(next - keyboardTop.current) < 1) return;
      keyboardTop.current = next;
      requestAnimationFrame(() => revealActive(event.duration || 220));
    };
    const onHide = (event: KeyboardEvent) => {
      keyboardTop.current = null;
      animateTo(0, event.duration || 220);
    };
    const frameEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const frameSub = Keyboard.addListener(frameEvent, onFrame);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      frameSub.remove();
      hideSub.remove();
    };
  }, [animateTo, revealActive]);

  const reveal = useCallback((target: Measurable | null) => {
    if (active.current === target && keyboardTop.current != null) return;
    active.current = target;
    requestAnimationFrame(() => revealActive());
  }, [revealActive]);

  return (
    <View style={{ flex: 1, backgroundColor: imageTop ? "#000" : colors.bg }}>
      <Image
        pointerEvents="none"
        source={source}
        style={{ position: "absolute", zIndex: 0, top: imageTop, left: 0, right: 0, bottom: 0 }}
        contentFit={fit}
      />
      <Animated.View style={{ flex: 1, zIndex: 1, elevation: 2, transform: [{ translateY }] }}>
        {Platform.OS === "web" ? (
          // On web, the wrapping Pressable fires after a click inside a TextInput and blurs it.
          <View style={{ flex: 1 }}>{typeof children === "function" ? children(reveal) : children}</View>
        ) : (
          <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1 }}>
            {typeof children === "function" ? children(reveal) : children}
          </Pressable>
        )}
      </Animated.View>
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
  let digits = phone.replace(/\D/g, "");
  const dialDigits = country.dial.replace(/\D/g, "");
  if (digits.startsWith(`00${dialDigits}`)) digits = digits.slice(2 + dialDigits.length);
  else if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 6) digits = digits.slice(dialDigits.length);
  // Côte d'Ivoire : les 10 chiffres gardent le 0. +225 07… et non +225 7…
  if (country.id === "CI") {
    if (digits.length === 9 && !digits.startsWith("0")) digits = `0${digits}`;
  } else {
    digits = digits.replace(/^0+/, "");
  }
  return toE164(`${country.dial}${digits}`);
}

/** "+15145550101" -> "+1 (514) 555-0101", "+2250700000000" -> "+225 07 00 00 00 00". */
function prettyPhone(e164: string) {
  const nanp = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (nanp) return `+1 (${nanp[1]}) ${nanp[2]}-${nanp[3]}`;
  const ci = /^\+225(\d{10})$/.exec(e164);
  if (ci) return `+225 ${ci[1].replace(/(\d{2})(?=\d)/g, "$1 ")}`;
  return e164;
}

function phonePlaceholder(country: Country) {
  // Zeros only: a real-looking number made people type it as is.
  if (country.id === "CI") return "00 00 00 00 00";
  if (country.dial === "+1") return "(000) 000-0000";
  return "000 000 0000";
}

/** Keep every auth action reachable while an iOS keyboard is open. */
function KeyboardDone({ nativeID }: { nativeID: string }) {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={{ height: 46, paddingHorizontal: 16, backgroundColor: "#171A22", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.14)", alignItems: "flex-end", justifyContent: "center" }}>
        <Pressable accessibilityLabel="Fermer le clavier" onPress={() => Keyboard.dismiss()} hitSlop={12}>
          <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Terminé</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
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

// Browsers draw an orange focus ring around inputs on web: the field border is enough.
const noWebOutline = (Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {}) as object;

function ContinueHit({
  ready,
  busy,
  label,
  onPress,
  solid,
}: {
  ready: boolean;
  busy: boolean;
  label: string;
  onPress: () => void;
  /** Draw the yellow button (backgrounds without a baked-in button). */
  solid?: boolean;
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
        backgroundColor: ready ? (solid ? colors.accent : "transparent") : "#3a404c",
      }}
    >
      {busy ? (
        <ActivityIndicator color={solid ? "#0b1220" : colors.accent} />
      ) : ready ? (
        solid ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: "#0b1220", fontSize: 17, fontFamily: "Inter_700Bold" }}>{label}</Text>
            <ArrowRight size={20} color="#0b1220" />
          </View>
        ) : null
      ) : (
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
        <Pressable
          accessibilityLabel="Créer un compte"
          onPress={() => {
            void startFreshSignup().then(() => push({ name: "phone-entry" }));
          }}
          style={{ flex: 1 }}
        />
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
  const phoneBlockRef = useRef<View>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const phoneAccessoryId = "wipp-phone-entry-keyboard";

  async function continueWithPhone() {
    Keyboard.dismiss();
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
      {(reveal) => <>
      {/* The background is decor only (title included): logo and form are drawn here. */}
      <Abs t={4.5} l={32} h={7} w={36}>
        <Image source={logoGold} style={{ width: "100%", height: "100%" }} contentFit="contain" />
      </Abs>
      <Abs t={63.5} l={3} h={34.5} w={94}>
        <View pointerEvents="none" style={{ flex: 1, borderRadius: 24, backgroundColor: "rgba(5,8,18,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }} />
      </Abs>
      <Abs t={6} l={4} h={6} w={12}>
        <Pressable accessibilityLabel="Retour" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Pressable>
      </Abs>
      <Abs t={65} l={7} h={9.5} w={86}>
        <View ref={phoneBlockRef} style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 7 }}>Numéro de téléphone</Text>
          <View style={{ flex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.48)", backgroundColor: "rgba(9,15,28,0.94)" }}>
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
              onFocus={() => {
                setPhoneFocused(true);
                reveal(phoneBlockRef.current);
              }}
              onBlur={() => setPhoneFocused(false)}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setError("");
              }}
              keyboardType="phone-pad"
              inputAccessoryViewID={Platform.OS === "ios" ? phoneAccessoryId : undefined}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder={phoneFocused ? "" : phonePlaceholder(country)}
              placeholderTextColor={colors.muted}
              underlineColorAndroid="transparent"
              textAlignVertical="center"
              style={{ flex: 1, height: "100%", color: colors.fg, fontSize: 16, padding: 0, margin: 0, backgroundColor: "transparent", includeFontPadding: false, ...noWebOutline }}
            />
          </View>
        </View>
      </Abs>
      <Abs t={76.3} l={8} w={84}>
        <View style={{ gap: 10 }}>
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
      {error ? (
        <Abs t={85.3} l={10} h={4} w={80}>
          <Text style={{ color: colors.danger, fontSize: 10 }}>{error}</Text>
        </Abs>
      ) : null}
      <Abs t={87.05} l={4.8} h={7} w={90.4}>
        <ContinueHit ready={legal && adult} busy={busy} label="Continuer" onPress={() => void continueWithPhone()} solid />
      </Abs>
      <CountrySheet open={menuOpen} onClose={() => setMenuOpen(false)} onPick={setCountry} />
      <KeyboardDone nativeID={phoneAccessoryId} />
      </>}
    </Artwork>
  );
}

export function LoginScreen() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const pop = useWippStore((s) => s.pop);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [menuOpen, setMenuOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const phoneBlockRef = useRef<View>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const phoneAccessoryId = "wipp-login-keyboard";

  async function tryLogin() {
    Keyboard.dismiss();
    if (busy) return;
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
      {(reveal) => <>
      {/* The background is decor only: everything else is drawn here. */}
      <Abs t={0} l={0} h={100} w={100}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(2,5,14,0.82)", "rgba(2,5,14,0.45)", "rgba(2,5,14,0)"]}
          locations={[0, 0.55, 0.85]}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.3 }}
          style={{ flex: 1 }}
        />
      </Abs>
      <Abs t={6} l={4} h={6} w={12}>
        <Pressable accessibilityLabel="Retour" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Pressable>
      </Abs>
      <Abs t={11} l={6} w={84}>
        <Image source={logoGold} style={{ width: 120, height: 52 }} contentFit="contain" contentPosition="left" />
        <Text style={{ marginTop: 6, color: colors.accent, fontSize: 10, letterSpacing: 2, fontFamily: "Inter_600SemiBold" }}>DISCUTE · PARTAGE · DÉCOUVRE</Text>
        <Text style={{ marginTop: 20, textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 6, color: colors.fg, fontSize: 34, lineHeight: 38, fontFamily: "Inter_700Bold" }}>
          Content{"\n"}de te <Text style={{ color: colors.accent }}>revoir</Text> 👋
        </Text>
        <Text style={{ marginTop: 10, textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 6, color: "rgba(247,249,252,0.85)", fontSize: 17, fontFamily: "Inter_500Medium" }}>Retrouve ton WIPP</Text>
        <Text style={{ marginTop: 10, textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 6, color: "rgba(247,249,252,0.82)", fontSize: 13, lineHeight: 19, maxWidth: 230 }}>
          Entre le numéro associé à ton compte. Nous t’enverrons un code par SMS pour vérifier que c’est bien toi.
        </Text>
      </Abs>
      <Abs t={58} l={3} h={29} w={94}>
        <View pointerEvents="none" style={{ flex: 1, borderRadius: 24, backgroundColor: "rgba(5,8,18,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }} />
      </Abs>
      <Abs t={59.5} l={7} h={9.5} w={86}>
        <View ref={phoneBlockRef} style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 7 }}>Numéro de téléphone</Text>
          <View style={{ flex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.48)", backgroundColor: "rgba(9,15,28,0.94)" }}>
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
              onFocus={() => {
                setPhoneFocused(true);
                reveal(phoneBlockRef.current);
              }}
              onBlur={() => setPhoneFocused(false)}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setError("");
              }}
              keyboardType="phone-pad"
              inputAccessoryViewID={Platform.OS === "ios" ? phoneAccessoryId : undefined}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder={phoneFocused ? "" : phonePlaceholder(country)}
              placeholderTextColor={colors.muted}
              underlineColorAndroid="transparent"
              textAlignVertical="center"
              style={{ flex: 1, height: "100%", color: colors.fg, fontSize: 16, padding: 0, margin: 0, backgroundColor: "transparent", includeFontPadding: false, ...noWebOutline }}
            />
          </View>
        </View>
      </Abs>
      {error ? (
        <Abs t={69.6} l={8} w={84}>
          <Text style={{ color: colors.danger, fontSize: 11 }}>{error}</Text>
        </Abs>
      ) : null}
      <Abs t={72} l={6} h={7} w={88}>
        <ContinueHit ready={phone.replace(/\D/g, "").length >= 6} busy={busy} label={t("continue")} onPress={() => void tryLogin()} solid />
      </Abs>
      {/* Consent was given at sign-up: a passive reminder is enough here. */}
      <Abs t={80.3} l={8} w={84}>
        <Text style={{ color: "rgba(247,249,252,0.6)", fontSize: 11, lineHeight: 16, textAlign: "center" }}>
          En continuant, tu acceptes les{" "}
          <Text onPress={() => push({ name: "legal", doc: "terms" })} style={{ color: colors.accent, textDecorationLine: "underline" }}>Conditions d’utilisation</Text>
          {" "}et la{" "}
          <Text onPress={() => push({ name: "legal", doc: "privacy" })} style={{ color: colors.accent, textDecorationLine: "underline" }}>Politique de confidentialité</Text>.
        </Text>
      </Abs>
      <Abs t={90} l={10} h={6} w={80}>
        <Pressable
          accessibilityLabel="Je n’ai pas encore de compte"
          onPress={() => {
            void startFreshSignup().then(() => push({ name: "phone-entry" }));
          }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 6, color: colors.accent, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Je n’ai pas encore de compte</Text>
        </Pressable>
      </Abs>
      <CountrySheet open={menuOpen} onClose={() => setMenuOpen(false)} onPick={setCountry} />
      <KeyboardDone nativeID={phoneAccessoryId} />
      </>}
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
  const [noAccount, setNoAccount] = useState<{ phone: string } | null>(null);
  const otpBlockRef = useRef<View>(null);
  const codeAccessoryId = "wipp-sms-code-keyboard";
  const signin = (pendingMode() ?? pending.mode) === "signin";
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  async function validate() {
    Keyboard.dismiss();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    setNoAccount(null);
    if (signin) {
      const result = await verifyPhoneCode(code);
      if ("error" in result) {
        setBusy(false);
        setError(result.error);
        return;
      }
      try {
        const res = await signinOtp();
        if (res.ok) {
          enterLinkedProfile(res.profile, phone);
          clearPending();
          setBusy(false);
          return;
        }
        if ("noAccount" in res && res.noAccount) {
          setBusy(false);
          setNoAccount({ phone });
          setError(res.error);
          return;
        }
        setError("error" in res ? res.error : "Connexion impossible.");
        setBusy(false);
        return;
      } catch {
        setError("Connexion impossible. Réessaie quand le réseau revient.");
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
    // « Créer un compte » with a number that already has one: open that account
    // instead of asking for a new profile (the server would ignore it anyway).
    setBusy(true);
    try {
      const existing = await signinOtp();
      if (existing.ok) {
        clearPending();
        enterLinkedProfile(existing.profile, phone);
        Alert.alert(
          "Bon retour !",
          `Ce numéro a déjà un compte WIPP${existing.profile.username ? ` (@${existing.profile.username})` : ""}. On t’a connecté·e à ce compte.`,
        );
        return;
      }
    } catch {
      /* network: the profile step still links an existing number at the end */
    } finally {
      setBusy(false);
    }
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
      {(reveal) => <>
      {/* The background is decor only: everything else is drawn here. */}
      <Abs t={0} l={0} h={100} w={100}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(2,5,14,0.8)", "rgba(2,5,14,0.35)", "rgba(2,5,14,0)"]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.2, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Abs>
      <Abs t={6} l={4} h={6} w={12}>
        <Pressable accessibilityLabel="Retour" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.fg} />
        </Pressable>
      </Abs>
      <Abs t={4.5} l={32} h={7} w={36}>
        <Image source={logoGold} style={{ width: "100%", height: "100%" }} contentFit="contain" />
      </Abs>
      <Abs t={15} l={6} w={88}>
        <Text style={{ textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 6, color: colors.fg, fontSize: 32, lineHeight: 36, fontFamily: "Inter_700Bold" }}>
          Vérifie ton <Text style={{ color: colors.accent }}>numéro</Text>
        </Text>
        <Text style={{ marginTop: 10, textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 6, color: "rgba(247,249,252,0.85)", fontSize: 15, lineHeight: 21 }}>
          Nous t’avons envoyé un code par SMS au
        </Text>
        <Pressable
          accessibilityLabel="Modifier mon numéro"
          onPress={pop}
          style={{ marginTop: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 46, borderRadius: 14, backgroundColor: "rgba(5,8,18,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}
        >
          <Flag id={pending.country ?? "CA"} size={16} />
          <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{prettyPhone(phone)}</Text>
          <Pencil size={16} color={colors.accent} />
        </Pressable>
      </Abs>
      <Abs t={66} l={3} h={32.5} w={94}>
        <View pointerEvents="none" style={{ flex: 1, borderRadius: 24, backgroundColor: "rgba(5,8,18,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }} />
      </Abs>
      <Abs t={67.8} l={7} h={7.2} w={86}>
        <View ref={otpBlockRef} style={{ flex: 1 }}>
          <Pressable onPress={() => {}} style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={{ width: "13.5%", alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.32)", backgroundColor: "rgba(9,15,28,0.9)" }}>
                <Text style={{ fontSize: 28, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{code[i] ?? ""}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            onFocus={() => reveal(otpBlockRef.current)}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            keyboardType="number-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? codeAccessoryId : undefined}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            maxLength={6}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            style={{ position: "absolute", opacity: 0.02, width: "100%", height: "100%", color: colors.fg, ...noWebOutline }}
          />
        </View>
      </Abs>
      {error ? (
        <Abs t={75.8} l={8} w={84}>
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
      <Abs t={78} l={8} h={5} w={84}>
        <Pressable disabled={seconds > 0 || busy} onPress={() => void resend()} style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ textAlign: "center", color: "rgba(247,249,252,0.6)", fontSize: 12 }}>Tu n’as pas reçu le code ?</Text>
          <Text style={{ marginTop: 3, textAlign: "center", color: seconds > 0 ? "rgba(255,216,77,0.6)" : colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
            {seconds > 0 ? `Renvoyer le code dans 00:${String(seconds).padStart(2, "0")}` : "Renvoyer le code"}
          </Text>
        </Pressable>
      </Abs>
      <Abs t={84} l={6} h={6.6} w={88}>
        <ContinueHit ready={code.length === 6} busy={busy} label="Continuer" onPress={() => void validate()} solid />
      </Abs>
      <Abs t={91.5} l={20} h={5} w={60}>
        <Pressable accessibilityLabel="Modifier mon numéro" onPress={pop} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Modifier mon numéro</Text>
        </Pressable>
      </Abs>
      <KeyboardDone nativeID={codeAccessoryId} />
      </>}
    </Artwork>
  );
}

export function ProfileReferenceScreen() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const country = useWippStore((s) => s.pendingSignup.country ?? "CA");
  const phone = useWippStore((s) => s.pendingSignup.phone ?? "");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [username, setUser] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [availability, setAvailability] = useState<"available" | "taken" | "checking" | "error" | null>(null);
  const [checkedUsername, setCheckedUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const firstNameBlockRef = useRef<View>(null);
  const lastNameBlockRef = useRef<View>(null);
  const usernameBlockRef = useRef<View>(null);
  const profileAccessoryId = "wipp-profile-keyboard";
  const insets = useSafeAreaInsets();
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
          if (!cancelled) {
            setCheckedUsername(username);
            setAvailability("error");
          }
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, okUser]);

  async function choosePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorise l’accès aux photos pour choisir ta photo de profil.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const uri = res.assets?.[0]?.uri;
    if (!res.canceled && uri) setPhotoUri(uri);
  }

  async function finish() {
    Keyboard.dismiss();
    const verified = getVerifiedSignup();
    if (!verified || verified.phone !== phone) {
      setError("Code SMS expiré. Recommence la vérification.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !okUser) {
      setError("Renseigne ton prénom, ton nom et un pseudo valide.");
      return;
    }
    setBusy(true);
    setError("");
    // Always ask the server again right before creating: someone may have taken it meanwhile.
    try {
      const free = await usernameAvailable(username);
      setCheckedUsername(username);
      setAvailability(free ? "available" : "taken");
      if (!free) {
        setError(`@${username} est déjà utilisé. Choisis un autre pseudo.`);
        setBusy(false);
        return;
      }
    } catch {
      setError("Impossible de vérifier le pseudo. Vérifie ta connexion et réessaie.");
      setBusy(false);
      return;
    }
    try {
      const result = await signupPhone({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username,
        country,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const wantedName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").toLowerCase();
      const gotName = (result.profile.displayName || "").replace(/\s+/g, " ").trim().toLowerCase();
      const gotUser = (result.profile.username || "").toLowerCase();
      if (gotUser !== username.toLowerCase() || (gotName && gotName !== wantedName)) {
        setError("Ce numéro a déjà un compte WIPP. Pour une autre personne, entre un autre numéro. Pour revenir sur celui-ci, choisis « J’ai déjà un compte ».");
        const { signOutFirebase } = await import("../lib/firebase-phone");
        const { clearLinkedSession } = await import("../lib/firebase-linked-session");
        await signOutFirebase().catch(() => undefined);
        await clearLinkedSession().catch(() => undefined);
        return;
      }
      clearPending();
      useWippStore.setState((s) => ({ pendingSignup: { country: s.pendingSignup.country } }));
      enterLinkedProfile(result.profile, phone);
      if (photoUri) {
        useWippStore.getState().changeAvatar(photoUri);
        void import("../lib/profile-photo").then(({ saveProfilePhotoFromUri }) =>
          saveProfilePhotoFromUri(photoUri).catch(() => undefined),
        );
      }
      push({ name: "signup-celebration", username: result.profile.username || username });
    } catch {
      setError("Inscription impossible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const status =
    username.length > 0 && !okUser
      ? { text: "3 à 20 caractères (a-z, 0-9, _)", color: colors.muted }
      : availability === "checking"
        ? { text: "Vérification…", color: colors.muted }
        : checkedUsername === username && availability === "available"
          ? { text: "✓ Disponible", color: colors.success }
          : checkedUsername === username && availability === "taken"
            ? { text: "Déjà utilisé", color: colors.danger }
            : checkedUsername === username && availability === "error"
              ? { text: "Vérification impossible", color: colors.danger }
              : null;
  // The background is drawn "cover": find where the mascot's feet land on this screen,
  // so the form starts right under them (image 941×1670, feet at ~38.5 % of its height).
  const win = useWindowDimensions();
  // The picture starts under the status bar, so the clock never covers the WIPP sign.
  const boxH = win.height - insets.top;
  const imgH = Math.max((win.width / 941) * 1670, boxH);
  const feetY = insets.top + (boxH - imgH) / 2 + imgH * 0.385;
  const field = { height: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,216,77,0.28)", backgroundColor: "rgba(0,0,0,0.38)", paddingHorizontal: 12, justifyContent: "center" as const };
  const input = { flex: 1, color: colors.fg, fontSize: 15, ...noWebOutline };
  const label = { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 5 };

  return (
    <Artwork source={authProfileBg} fit="cover" imageTop={insets.top}>
      {(reveal) => <>
      {/* Thin arrow in the corner, clear of the WIPP sign (no dark disc over the picture). */}
      <View style={{ position: "absolute", top: insets.top, left: 0 }}>
        <Pressable accessibilityLabel="Retour" hitSlop={10} onPress={pop} style={{ marginLeft: 4, marginTop: 2, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,216,77,0.45)" }}>
          <ChevronLeft size={22} color="#fff" strokeWidth={3} />
        </Pressable>
      </View>
      {/* No card: the form sits in the empty space of the picture, under the mascot. */}
      <View style={{ position: "absolute", left: 0, right: 0, top: feetY + 10, bottom: Math.max(insets.bottom, 14), paddingHorizontal: 22 }}>
        <Text style={{ color: colors.fg, fontSize: 22, fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
          Complète ton <Text style={{ color: colors.accent }}>profil</Text>
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12, marginBottom: 12 }}>
          <Pressable accessibilityLabel="Photo de profil" onPress={() => void choosePhoto()} style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: colors.accent, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.38)" }}>
            {photoUri ? <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Camera size={30} color={colors.accent} />}
          </Pressable>
          <Pressable accessibilityLabel="Choisir une photo" onPress={() => void choosePhoto()}>
            <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{photoUri ? "Changer la photo" : "Ajouter une photo"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 1 }}>Facultatif · visible par tes contacts</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={label}>Prénom</Text>
            <View ref={firstNameBlockRef} style={field}>
              <TextInput onFocus={() => reveal(firstNameBlockRef.current)} value={firstName} onChangeText={setFirst} inputAccessoryViewID={Platform.OS === "ios" ? profileAccessoryId : undefined} placeholder="Prénom" placeholderTextColor={colors.muted} autoCapitalize="words" textContentType="givenName" style={input} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={label}>Nom</Text>
            <View ref={lastNameBlockRef} style={field}>
              <TextInput onFocus={() => reveal(lastNameBlockRef.current)} value={lastName} onChangeText={setLast} inputAccessoryViewID={Platform.OS === "ios" ? profileAccessoryId : undefined} placeholder="Nom" placeholderTextColor={colors.muted} autoCapitalize="words" textContentType="familyName" style={input} />
            </View>
          </View>
        </View>

        <Text style={[label, { marginTop: 12 }]}>Ton WIPP · c’est ainsi qu’on te trouvera</Text>
        <View ref={usernameBlockRef} style={[field, { flexDirection: "row", alignItems: "center" }]}>
          <Text style={{ color: colors.accent, fontSize: 15, marginRight: 2 }}>@</Text>
          <TextInput
            onFocus={() => reveal(usernameBlockRef.current)}
            value={username}
            onChangeText={(v) => {
              setUser(v.toLowerCase().replace(/[^a-z0-9_]/g, ""));
              setAvailability(null);
            }}
            placeholder="pseudo"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            inputAccessoryViewID={Platform.OS === "ios" ? profileAccessoryId : undefined}
            style={input}
          />
          {status ? <Text style={{ marginLeft: 8, fontSize: 12, fontFamily: "Inter_600SemiBold", color: status.color }}>{status.text}</Text> : null}
        </View>

        <View style={[field, { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 10 }]}>
          <Text style={{ fontSize: 18 }}>{flagEmoji(countryLabel.id)}</Text>
          <Text style={{ color: colors.fg, fontSize: 15 }}>
            {countryLabel.fr} ({countryLabel.dial})
          </Text>
        </View>

        {error ? <Text style={{ marginTop: 8, color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

        {/* Small gap only: the button stays close to the country box (extra space goes below). */}
        <View style={{ flexGrow: 1, minHeight: 14, maxHeight: 24 }} />
        <Pressable
          accessibilityLabel="Continuer"
          disabled={busy}
          onPress={() => void finish()}
          style={{ height: 52, borderRadius: 26, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? <ActivityIndicator color={colors.accentFg} /> : <Text style={{ color: colors.accentFg, fontSize: 17, fontFamily: "Inter_700Bold" }}>Continuer</Text>}
          {busy ? null : <ArrowRight size={20} color={colors.accentFg} />}
        </Pressable>
      </View>
      <KeyboardDone nativeID={profileAccessoryId} />
      </>}
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

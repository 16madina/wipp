import { useEffect, useState } from "react";
import { Linking, Platform, Text, View, ScrollView } from "react-native";
import { Image } from "expo-image";
import { MapPin, QrCode, ScanLine, Search, Hash } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { LiveScanner } from "../components/LiveScanner";
import { WippMark, WippWordmark, TouchHero } from "../components/Logo";
import { QrCard } from "../components/QrCard";
import { Btn, Chip, Empty, GlassHeader, Header, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { getRelation, sendRequest, type Relation } from "../lib/connections";
import { openWippLink } from "../lib/deep-links";
import { findPublicByUsername, searchPublicProfiles, upsertRemoteProfile } from "../lib/public-profiles";
import { profileQr, tempQr } from "../lib/qr-payload";
import { issueTemp } from "../lib/qr-remote";
import { useTouchSession } from "../lib/proximity/touch-session";
import { ConnectionChoicePicker } from "../components/ConnectionChoice";
import { Sheet } from "../components/card-editor-parts";
import { answerTempQrOffer, durationLabel } from "../lib/connections";
import { TouchStage } from "../components/TouchStage";
import { applyNearbyMode } from "../lib/proximity/nearby-visibility";
import { startNearbyScan, stopNearbyScan } from "../lib/proximity/nearby-scan";
import { getLastTouchMatch } from "../lib/proximity/match-bus";
import { rejectTouchCode } from "../lib/proximity/touch-api";
import { shareWippPublic } from "../lib/share-public";
import { signinOtp } from "../lib/auth-api";
import { useT, useWippStore } from "../lib/store";
import type { ConnectionChoice, FoundVia, NearbyMode } from "../lib/types";
import { colors, layout, accentA, fgA, whiteA } from "../theme";

export function ConnectScreen() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  // Percent of the column, not of the window: on web the app column is narrower than the window.
  const cardW = "48.5%" as const;
  const cards = [
    { name: "scanner" as const, icon: ScanLine, title: t("scan"), sub: t("scanSub") },
    { name: "my-qr" as const, icon: QrCode, title: t("myQr"), sub: t("myQrSub") },
    { name: "search-user" as const, icon: Search, title: t("searchCard"), sub: t("searchCardSub") },
    { name: "nearby" as const, icon: MapPin, title: t("nearby"), sub: t("nearbySub") },
  ];
  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, justifyContent: "center", paddingHorizontal: 20 }}>
          <Text numberOfLines={1} style={{ fontSize: 24, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
            {t("connectTitle")}
          </Text>
        </View>
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Press
          onPress={() => push({ name: "wgo-touch" })}
          style={{
            marginHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 16,
            backgroundColor: colors.navy,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: accentA(0.35),
          }}
        >
          <WippMark size={52} invert />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{t("wgoTouch")}</Text>
            <Text style={{ fontSize: 12, color: fgA(0.6) }}>{t("wgoTouchSub")}</Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accentFg }}>{t("touchLive")}</Text>
          </View>
        </Press>
        <View style={{ marginTop: 12, paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {cards.map((c) => (
            <Press
              key={c.name}
              onPress={() => push({ name: c.name })}
              style={{ width: cardW, minHeight: 108, borderRadius: 16, backgroundColor: colors.glassCard, padding: 14 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
                <c.icon size={20} color={colors.paper} />
              </View>
              <Text style={{ marginTop: 16, fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{c.title}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{c.sub}</Text>
            </Press>
          ))}
        </View>
        <View style={{ marginTop: 12, paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Press
            onPress={() => push({ name: "live-code" })}
            style={{ width: cardW, minHeight: 100, borderRadius: 16, backgroundColor: colors.glassCard, padding: 14 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Hash size={20} color={colors.accentFg} />
            </View>
            <Text style={{ marginTop: 12, fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{t("liveCode")}</Text>
            <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{t("liveCodeSub")}</Text>
          </Press>
          <Press
            onPress={() => push({ name: "one-time-qr" })}
            style={{ width: cardW, minHeight: 100, borderRadius: 16, backgroundColor: colors.glassCard, padding: 14 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
              <QrCode size={20} color={colors.paper} />
            </View>
            <Text style={{ marginTop: 12, fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{t("oneTimeQr")}</Text>
            <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{t("oneTimeQrSub")}</Text>
          </Press>
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

export function MyQrScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const me = useWippStore((s) => s.me);
  const username = useWippStore((s) => s.serverUsername);
  const [usernameState, setUsernameState] = useState<"loading" | "ready" | "missing">(username ? "ready" : "loading");
  useEffect(() => {
    if (username) {
      setUsernameState("ready");
      return;
    }
    let cancelled = false;
    void signinOtp().then((res) => {
      if (cancelled) return;
      if (!res.ok || !res.profile.username) {
        setUsernameState("missing");
        return;
      }
      const displayName = res.profile.displayName || "";
      const [firstName, ...rest] = displayName.split(" ");
      useWippStore.setState((s) => ({
        serverUsername: res.profile.username,
        serverProfileId: res.profile.id,
        me: {
          ...s.me,
          username: res.profile.username,
          displayName: displayName || s.me.displayName,
          firstName: firstName || s.me.firstName,
          lastName: rest.join(" ") || s.me.lastName,
        },
      }));
      setUsernameState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [username]);
  const [copied, setCopied] = useState(false);
  const [temp, setTemp] = useState<{ token: string; expiresAt: number; connectionMinutes?: number } | null>(null);
  // Ephemeral QR: first choose how long the CONNECTION will last (the QR itself lives 75 s).
  const [durationOpen, setDurationOpen] = useState(false);
  const [tempChoice, setTempChoice] = useState<ConnectionChoice | null>({ type: "ephemeral", minutes: 1440 });
  const [expired, setExpired] = useState(false);
  const [tempErr, setTempErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!temp) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= temp.expiresAt) {
        setTemp(null);
        setExpired(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [temp]);
  async function renewTemp() {
    setExpired(false);
    setTemp(null);
    try {
      const r = await issueTemp(tempChoice?.type === "ephemeral" ? tempChoice.minutes : 1440);
      if ("error" in r) {
        setTempErr(r.error === "no_session" ? "Connecte-toi avec un vrai compte pour un QR temporaire." : "QR temporaire indisponible, réessaie.");
      } else {
        setTempErr(null);
        setTemp(r);
        setNow(Date.now());
      }
    } catch {
      setTempErr("QR temporaire indisponible, réessaie.");
    }
  }
  const left = temp ? Math.max(0, Math.ceil((temp.expiresAt - now) / 1000)) : 0;
  const qrValue = temp ? tempQr(temp.token) : username ? profileQr(username) : "";
  const link = qrValue.replace(/^https?:\/\//, "").replace(/\/t\/.{8}.*/, "/t/…");
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <GlassHeader>
        <Header title={t("myQr")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ alignItems: "center", paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 }}>
        <WippWordmark size={22} color={colors.paper} />
        <View style={{ marginTop: 16 }}>
          <Avatar user={me} size={72} />
        </View>
        <Text style={{ marginTop: 12, fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{me.displayName}</Text>
        <Text style={{ fontSize: 14, color: fgA(0.6) }}>
          {username ? `@${username}` : usernameState === "loading" ? "Chargement du @username…" : "Compte serveur introuvable"}
        </Text>
        {expired ? (
          <View style={{ marginTop: 20, width: "100%", alignItems: "center" }}>
            <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold" }}>QR expiré</Text>
            <Btn label="Générer un nouveau QR" onPress={() => setDurationOpen(true)} style={{ marginTop: 12, alignSelf: "stretch" }} />
          </View>
        ) : qrValue ? (
          <View style={{ marginTop: 20 }}>
            <QrCard value={qrValue} size={220} />
          </View>
        ) : (
          <Text style={{ marginTop: 20, textAlign: "center", color: colors.danger, maxWidth: 280 }}>
            {usernameState === "loading"
              ? "Je récupère le vrai @username du compte."
              : "Ce téléphone n'est pas lié à un compte WIPP. Déconnecte-toi, puis entre avec le numéro du compte à tester."}
          </Text>
        )}
        {tempErr && !temp ? <Text style={{ marginTop: 12, color: colors.danger }}>{tempErr}</Text> : null}
        {temp ? (
          <Text style={{ marginTop: 12, fontFamily: "Inter_500Medium", color: colors.accent }}>
            Expire dans {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
          </Text>
        ) : null}
        <Text style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: fgA(0.6), maxWidth: 280 }}>
          {temp
            ? `QR éphémère · usage unique. La connexion durera ${durationLabel(temp.connectionMinutes ?? 1440)}.`
            : "Ce QR ne contient ni ton numéro, ni ton e-mail."}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: fgA(0.4) }}>{link}</Text>
        <View style={{ width: "100%", marginTop: 20 }}>
          <Btn
            label={copied ? t("copied") : "Partager mon WIPP"}
            disabled={!username}
            onPress={() => {
              if (!username) return;
              void shareWippPublic(`@${username} https://wippapp.com/@${username}`);
              setCopied(true);
            }}
          />
        </View>
        <View style={{ width: "100%", marginTop: 8, flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Btn label="Enregistrer" variant="secondary" disabled={!qrValue} onPress={() => { if (qrValue) void shareWippPublic(qrValue); }} />
          </View>
          <View style={{ flex: 1 }}>
            <Btn
              label={temp ? "QR permanent" : "QR éphémère"}
              variant="secondary"
              onPress={() => (temp ? setTemp(null) : setDurationOpen(true))}
            />
          </View>
        </View>
        <View style={{ width: "100%", marginTop: 8 }}>
          <Btn label={t("wgoTouch")} variant="secondary" onPress={() => push({ name: "wgo-touch" })} />
        </View>
      </ScrollView>
      <Sheet open={durationOpen} title="QR éphémère" onClose={() => setDurationOpen(false)}>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
          La personne qui scanne pourra accepter une connexion éphémère. Le QR, lui, n’est valable que 75 secondes et une seule fois.
        </Text>
        <ConnectionChoicePicker value={tempChoice} onChange={setTempChoice} ephemeralOnly />
        <Btn
          label="Générer le QR"
          disabled={!tempChoice}
          style={{ marginTop: 16 }}
          onPress={() => {
            setDurationOpen(false);
            void renewTemp();
          }}
        />
      </Sheet>
    </View>
  );
}

export function ScannerScreen({ error }: { error?: string }) {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const replace = useWippStore((s) => s.replace);
  const [q, setQ] = useState("");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("scan")} onBack={pop} />
      </GlassHeader>
      <LiveScanner
        initialError={error}
        onFallback={(to) => replace({ name: to === "search" ? "search-user" : "my-qr" })}
      />
      <Text style={{ marginTop: 8, textAlign: "center", color: fgA(0.6) }}>{t("scanSub")}</Text>
      {__DEV__ ? (
        <View style={{ padding: 16 }}>
          <SearchField value={q} onChangeText={setQ} placeholder="https://wippapp.com/@username" />
          <Btn
            label="Résoudre (DEV)"
            onPress={() => void openWippLink(q, "replace")}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}
    </ScreenRoot>
  );
}

export function SearchUserScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const serverConnected = useWippStore((s) => s.serverConnected);
  const blocked = useWippStore((s) => s.blockedIds);
  const users = useWippStore((s) => s.users);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<string[]>([]);
  const needle = q.replace(/^@/, "").toLowerCase().trim();
  useEffect(() => {
    if (needle.length < 2) {
      setHits([]);
      return;
    }
    const tmr = setTimeout(() => {
      void (async () => {
        try {
          const found = await searchPublicProfiles(needle);
          const myId = useWippStore.getState().serverProfileId;
          const ids: string[] = [];
          for (const p of found) {
            if (myId && p.id === myId) continue; // never list myself
            ids.push(upsertRemoteProfile(p, false));
          }
          setHits(ids.filter((id) => !blocked.includes(id)));
        } catch {
          if (!serverConnected) {
            setHits(
              Object.values(useWippStore.getState().users)
                .filter(Boolean)
                .filter((u) => u.username.includes(needle) || u.displayName.toLowerCase().includes(needle))
                .map((u) => u.id),
            );
          }
        }
      })();
    }, 280);
    return () => clearTimeout(tmr);
  }, [needle, blocked, serverConnected]);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("searchCard")} onBack={pop} />
      </GlassHeader>
      <View style={{ paddingHorizontal: 16 }}>
        <SearchField value={q} onChangeText={setQ} placeholder="@username" />
      </View>
      <ScrollView>
        {hits.map((id) => {
          const u = users[id];
          if (!u) return null;
          return (
            <Press key={id} onPress={() => push({ name: "found-profile", userId: id, via: "username" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
              <Avatar user={u} size={48} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
                <Text numberOfLines={1} style={{ color: colors.muted }}>@{u.username}</Text>
              </View>
            </Press>
          );
        })}
        {needle.length >= 2 && hits.length === 0 ? <Empty title={t("noResults")} /> : null}
      </ScrollView>
    </ScreenRoot>
  );
}

export function NearbyScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const users = useWippStore((s) => s.users);
  const nearby = useWippStore((s) => s.nearby);
  const setNearby = useWippStore((s) => s.setNearby);
  const connectWith = useWippStore((s) => s.connectWith);
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const push = useWippStore((s) => s.push);
  const visible = nearby !== 0;
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [scanHint, setScanHint] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await startNearbyScan((ids) => {
        if (alive) setFoundIds(ids);
      });
      if (!alive) return;
      if (!res.ok) {
        setScanHint(
          res.reason === "bluetooth_off" ? t("touchNeedBt") : res.reason === "bluetooth_permission" ? t("touchPermTitle") : null,
        );
      }
    })();
    return () => {
      alive = false;
      void stopNearbyScan();
    };
  }, [t]);
  const found = foundIds.map((id) => users[id]).filter(Boolean);
  const modes: { v: NearbyMode; label: string }[] = [
    { v: 15, label: "15 min" },
    { v: 60, label: "60 min" },
    { v: -1, label: "Jusqu’à désactivation" },
    { v: 0, label: "Invisible" },
  ];
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Personnes à proximité" onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>Uniquement avec consentement. Jamais de distance ni de numéro.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {modes.map((m) => (
            <Chip
              key={String(m.v)}
              label={m.label}
              active={nearby === m.v}
              onPress={() => {
                setNearby(m.v);
                void applyNearbyMode(m.v);
              }}
            />
          ))}
        </View>
        {scanHint ? <Text style={{ color: colors.accent, marginBottom: 12 }}>{scanHint}</Text> : null}
        {!visible ? (
          <Empty title="Tu es invisible" body="Choisis une durée pour apparaître." />
        ) : found.length === 0 ? (
          <Empty title={t("nearbyPeople")} body={t("nearbyHint")} />
        ) : (
          found.map((u) => (
            <View key={u.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Press onPress={() => push({ name: "found-profile", userId: u.id, via: "nearby" })} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar user={u} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>@{u.username}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{t("nearby")}</Text>
                </View>
              </Press>
              <Btn
                label={u.connected ? t("message") : t("connectWith")}
                onPress={() => {
                  if (u.connected) openOrCreateDm(u.id);
                  else {
                    connectWith(u.id, "nearby");
                    push({ name: "found-profile", userId: u.id, via: "nearby" });
                  }
                }}
                style={{ height: 36, paddingHorizontal: 12 }}
              />
            </View>
          ))
        )}
      </ScrollView>
    </ScreenRoot>
  );
}

export function FoundProfileScreen({
  userId,
  via,
  offerToken,
  offerMinutes,
}: {
  userId: string;
  via?: FoundVia;
  /** Set when reached by scanning an ephemeral QR: the owner offers an ephemeral connection. */
  offerToken?: string;
  offerMinutes?: number;
}) {
  const [offer, setOffer] = useState<"open" | "busy" | "accepted" | "declined" | "error">(offerToken ? "open" : "declined");
  const [offerUntil, setOfferUntil] = useState<number | null>(null);
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const user = useWippStore((s) => s.users[userId]);
  const sent = useWippStore((s) => s.sentRequestIds.includes(userId));
  const blocked = useWippStore((s) => s.blockedIds.includes(userId));
  const connectWith = useWippStore((s) => s.connectWith);
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const blockUser = useWippStore((s) => s.blockUser);
  const src = wippSrc(user?.avatar);
  const [relation, setRelation] = useState<Relation>(user?.connected ? "connected" : sent ? "pending_out" : "none");
  useEffect(() => {
    const raw = userId.startsWith("srvuser:") ? userId.slice(8) : userId;
    if (!raw.startsWith("p_") && !userId.startsWith("srvuser:")) return;
    let stop = false;
    const check = () =>
      void getRelation(raw).then((r) => {
        if (stop) return;
        setRelation(r);
        if (r === "connected") {
          useWippStore.setState((s) => ({
            users: { ...s.users, ...(s.users[userId] ? { [userId]: { ...s.users[userId], connected: true } } : {}) },
          }));
        }
      });
    check();
    // While a request is pending, notice the acceptance without reopening the profile.
    const tick = setInterval(check, 5_000);
    return () => {
      stop = true;
      clearInterval(tick);
    };
  }, [userId]);
  const viaLabel =
    via === "code"
      ? t("foundViaCode")
      : via === "qr"
        ? t("foundViaQr")
        : via === "intro"
          ? t("foundViaIntro")
          : via === "nearby"
            ? t("foundViaNearby")
            : via === "touch"
              ? t("foundViaTouch")
              : null;
  if (!user) {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header title="" onBack={pop} />
        </GlassHeader>
        <Empty title="Profil introuvable" />
      </ScreenRoot>
    );
  }
  const connected = relation === "connected" || user.connected;
  const pending = relation === "pending_out" || (sent && !connected);
  const cta = blocked ? "Bloqué" : connected ? t("message") : pending ? t("requestSent") : t("connectWith");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("foundTitle")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24 }}>
        {src ? <Image source={src} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Avatar user={user} size={96} />}
        <Text style={{ marginTop: 12, fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{user.displayName}</Text>
        <Text style={{ color: colors.muted }}>@{user.username}</Text>
        {user.motto ? (
          <Text style={{ marginTop: 8, fontFamily: "DancingScript_600SemiBold", fontSize: 22, color: colors.accent, textAlign: "center", transform: [{ rotate: "-3deg" }] }}>{user.motto}</Text>
        ) : null}
        {viaLabel ? <Text style={{ marginTop: 8, fontSize: 12, color: colors.accent }}>{viaLabel}</Text> : null}
        <Text style={{ marginTop: 12, textAlign: "center", color: colors.muted }}>{user.bio}</Text>
        {offerToken && offer !== "declined" ? (
          <View style={{ width: "100%", marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.accent, gap: 10 }}>
            {offer === "accepted" ? (
              <>
                <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" }}>WIPP connecté ✓</Text>
                <Text style={{ color: colors.muted, textAlign: "center" }}>
                  ⏳ Contact éphémère{offerUntil ? ` jusqu’au ${new Date(offerUntil).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : ""}
                </Text>
                <Btn label={t("message")} onPress={() => openOrCreateDm(user.id)} />
              </>
            ) : (
              <>
                <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" }}>
                  {user.displayName.split(" ")[0]} souhaite créer une connexion éphémère avec vous
                </Text>
                <Text style={{ color: colors.accent, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>⏳ Durée : {durationLabel(offerMinutes ?? 1440)}</Text>
                {offer === "error" ? <Text style={{ color: colors.danger, textAlign: "center" }}>Cette offre n’est plus valable.</Text> : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Btn
                    label="Refuser"
                    variant="secondary"
                    style={{ flex: 1 }}
                    disabled={offer === "busy"}
                    onPress={() => {
                      setOffer("declined");
                      void answerTempQrOffer(offerToken, false).catch(() => undefined);
                    }}
                  />
                  <Btn
                    label={offer === "busy" ? "…" : "Accepter"}
                    style={{ flex: 1 }}
                    disabled={offer === "busy" || offer === "error"}
                    onPress={() => {
                      setOffer("busy");
                      void answerTempQrOffer(offerToken, true)
                        .then((r) => {
                          if (r.status === "connected" || r.status === "already_connected") {
                            setOfferUntil(r.expiresAt ?? null);
                            setOffer("accepted");
                            setRelation("connected");
                            void useWippStore.getState().refreshConnections();
                          } else setOffer("error");
                        })
                        .catch(() => setOffer("error"));
                    }}
                  />
                </View>
              </>
            )}
          </View>
        ) : null}
        {offerToken && offer !== "declined" ? null : (
        <View style={{ width: "100%", marginTop: 24, gap: 8 }}>
            <Btn
              disabled={(pending && !connected) || blocked || relation === "self"}
              label={cta}
              onPress={() => (connected ? openOrCreateDm(user.id) : connectWith(user.id, via))}
            />
            {!connected && !blocked ? (
              <Btn label="Bloquer" variant="danger" onPress={() => { blockUser(user.id); pop(); }} />
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenRoot>
  );
}

const TOUCH_COPY = {
  fr: {
    title: "Rapprochez vos téléphones",
    sub: "Connectez-vous sans partager votre numéro.",
    active: "WIPP Touch actif",
    ready: "Prêt à détecter un WIPP Touch",
    waitingContact: "En attente d’un contact…",
    verifying: "Vérification de proximité…",
    found: "WIPP Touch détecté",
    start: "Commencer",
    searching: "Recherche d’un WIPP à proximité…",
    searchingSub: "Un seul contact suffit : l’un des deux téléphones vient toucher l’autre.",
    felt: "Contact détecté",
    ask: (n: string) => `Se connecter avec ${n} ?`,
    connect: "Se connecter",
    refuse: "Annuler",
    waiting: "En attente de l’autre personne…",
    connected: "WIPP connecté",
    connectedSub: "Aucun numéro n’a été partagé.",
    already: "Vous êtes déjà connectés sur WIPP.",
    message: "Envoyer un message",
    declined: "Connexion annulée",
    expired: "Session expirée",
    timeout: "Personne détectée.",
    ambiguous: "Plusieurs WIPP détectés",
    unavailable: "Connexion impossible.",
    tooFar: "Proximité non confirmée",
    offline: "Connexion Internet requise pour WIPP Touch.",
    noMotion: "Les capteurs de mouvement ne sont pas disponibles sur cet appareil.",
    uwbDenied: "Interactions à proximité désactivées",
    uwbDeniedBody: "WIPP Touch utilise les interactions à proximité de votre iPhone pour confirmer que les deux téléphones sont réellement proches.",
    uwbHow: "Réglages → WIPP → Interactions à proximité",
    openSettings: "Activer dans Réglages",
    uwbDeniedAndroid: "Autorisation de proximité désactivée",
    uwbDeniedBodyAndroid: "WIPP Touch utilise l’autorisation « Appareils à proximité » de votre téléphone pour confirmer que les deux téléphones sont réellement proches.",
    uwbHowAndroid: "Paramètres → Applications → WIPP → Autorisations → Appareils à proximité",
    openSettingsAndroid: "Activer dans les réglages",
    failed: "WIPP Touch n’a pas pu démarrer.",
    retry: "Réessayer",
    scanQr: "Scanner un QR",
    useQr: "Utiliser le QR WIPP",
    showQr: "Afficher mon QR",
    uwbMeasuring: "Vérification de la distance…",
    uwbNear: "Proximité confirmée",
    back: "Retour",
  },
  en: {
    title: "Bring your phones together",
    sub: "Connect without sharing your number.",
    active: "WIPP Touch active",
    ready: "Ready to detect a WIPP Touch",
    waitingContact: "Waiting for a contact…",
    verifying: "Checking proximity…",
    found: "WIPP Touch detected",
    start: "Start",
    searching: "Looking for a WIPP nearby…",
    searchingSub: "One contact is enough: one phone taps the other.",
    felt: "Contact detected",
    ask: (n: string) => `Connect with ${n}?`,
    connect: "Connect",
    refuse: "Cancel",
    waiting: "Waiting for the other person…",
    connected: "WIPP connected",
    connectedSub: "No phone number was shared.",
    already: "You’re already connected on WIPP.",
    message: "Send a message",
    declined: "Connection cancelled",
    expired: "Session expired",
    timeout: "Nobody detected.",
    ambiguous: "Several WIPPs detected",
    unavailable: "Connection not possible.",
    tooFar: "Proximity not confirmed",
    offline: "WIPP Touch needs an Internet connection.",
    noMotion: "Motion sensors aren’t available on this device.",
    uwbDenied: "Nearby Interactions turned off",
    uwbDeniedBody: "WIPP Touch uses your iPhone’s Nearby Interactions to confirm both phones are really close.",
    uwbHow: "Settings → WIPP → Nearby Interactions",
    openSettings: "Turn on in Settings",
    uwbDeniedAndroid: "Nearby permission turned off",
    uwbDeniedBodyAndroid: "WIPP Touch uses your phone’s “Nearby devices” permission to confirm both phones are really close.",
    uwbHowAndroid: "Settings → Apps → WIPP → Permissions → Nearby devices",
    openSettingsAndroid: "Turn on in settings",
    failed: "WIPP Touch couldn’t start.",
    retry: "Try again",
    scanQr: "Scan a QR",
    useQr: "Use the WIPP QR",
    showQr: "Show my QR",
    uwbMeasuring: "Checking distance…",
    uwbNear: "Proximity confirmed",
    back: "Back",
  },
};

export function WgoTouchScreen({ adopt }: { adopt?: string } = {}) {
  const t = useT();
  const c = TOUCH_COPY[t("all") === "All" ? "en" : "fr"];
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const me = useWippStore((s) => s.me);
  const users = useWippStore((s) => s.users);
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const touch = useTouchSession();
  const [touchChoice, setTouchChoice] = useState<ConnectionChoice | null>({ type: "permanent" });
  const [peerId, setPeerId] = useState<string | null>(null);

  // Start right away: the screen IS the "ready to touch" state.
  // Opened by a bump felt while WIPP was simply open: follow that already-paired session instead.
  useEffect(() => {
    void (adopt ? touch.adopt(adopt) : touch.start());
  }, [adopt]);

  // Resolve the public card into a local profile (avatar signing, DM) — public data only.
  useEffect(() => {
    const p = touch.peer;
    if (!p) {
      setPeerId(null);
      return;
    }
    let off = false;
    void findPublicByUsername(p.username).then((found) => {
      if (off) return;
      const connected = touch.phase === "connected" || touch.phase === "already_connected";
      setPeerId(
        upsertRemoteProfile(found ?? { id: `touch:${p.username}`, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, bio: "" }, connected || undefined),
      );
    });
    return () => {
      off = true;
    };
  }, [touch.peer?.username, touch.phase]);

  const peerUser = peerId ? users[peerId] : undefined;
  const ph = touch.phase;
  const searching = ph === "starting" || ph === "searching";
  const matched = ph === "candidate" || ph === "waiting_peer" || ph === "choose" || ph === "proposal_out" || ph === "proposal_in";
  const done = ph === "connected" || ph === "already_connected";
  const failure: Record<string, string> = {
    declined: c.declined,
    expired: c.expired,
    timeout: c.timeout,
    ambiguous: c.ambiguous,
    unavailable: c.unavailable,
    too_far: c.tooFar,
    offline: c.offline,
    no_motion: c.noMotion,
    uwb_denied: Platform.OS === "android" ? c.uwbDeniedAndroid : c.uwbDenied,
    failed: c.failed,
  };
  const failText = failure[ph];
  const qrFirst = ph === "ambiguous" || ph === "timeout" || ph === "too_far" || ph === "no_motion" || ph === "failed" || ph === "expired";
  const name = peerUser?.displayName || touch.peer?.displayName || "";
  const handle = touch.peer?.username ? `@${touch.peer.username}` : "";

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("wgoTouch")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {matched || done ? (
          <View style={{ alignItems: "center" }}>
            <View style={{ padding: 4, borderRadius: 999, borderWidth: 2, borderColor: colors.accent }}>
              {peerUser ? <Avatar user={peerUser} size={96} /> : <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: whiteA(0.08) }} />}
            </View>
            <Text style={{ marginTop: 14, fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg, textAlign: "center" }}>{name}</Text>
            <Text style={{ marginTop: 2, color: colors.accent, fontFamily: "Inter_500Medium" }}>{handle}</Text>
            {!done ? (
              <Text style={{ marginTop: 10, fontSize: 12, color: colors.muted, letterSpacing: 0.4 }}>
                {c.found}
              </Text>
            ) : null}
            {!done && touch.proximity === "near" ? (
              <Text style={{ marginTop: 4, fontSize: 13, color: colors.accent, fontFamily: "Inter_600SemiBold" }}>✓ {c.uwbNear}</Text>
            ) : null}
            {done ? (
              <>
                <Text style={{ marginTop: 22, fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
                  {ph === "connected" ? `${c.connected} ✓` : `Vous êtes déjà amis avec ${name.split(" ")[0] || handle} 🤝`}
                </Text>
                {ph === "connected" ? <Text style={{ marginTop: 6, color: colors.muted }}>{c.connectedSub}</Text> : null}
                {ph === "already_connected" ? <Text style={{ marginTop: 6, color: colors.muted, textAlign: "center" }}>Vous êtes déjà connectés sur WIPP.</Text> : null}
              </>
            ) : (
              <>
                <Text style={{ marginTop: 22, fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.fg, textAlign: "center" }}>
                  {ph === "waiting_peer"
                    ? c.waiting
                    : ph === "choose"
                      ? "Comment voulez-vous vous connecter ?"
                      : ph === "proposal_out"
                        ? "En attente de la réponse…"
                        : ph === "proposal_in"
                          ? `${name.split(" ")[0] || handle} souhaite se connecter avec vous`
                          : c.ask(name.split(" ")[0] || handle)}
                </Text>
                {(ph === "proposal_out" || ph === "proposal_in") && touch.proposal ? (
                  <Text style={{ marginTop: 8, color: colors.accent, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
                    {touch.proposal.type === "ephemeral"
                      ? `⏳ Contact éphémère · Durée : ${durationLabel(touch.proposal.minutes ?? 60)}`
                      : "♾️ Contact permanent"}
                  </Text>
                ) : null}
                {touch.uwbLabel === "measuring" ? <Text style={{ marginTop: 6, color: colors.muted }}>{c.uwbMeasuring}</Text> : null}
                {touch.uwbLabel === "near" ? <Text style={{ marginTop: 6, color: colors.accent }}>{c.uwbNear}</Text> : null}
              </>
            )}
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <TouchStage mode={ph === "verifying" ? "match" : "search"} pulseKey={touch.bumps} />
            {searching || ph === "verifying" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: accentA(0.12) }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
                <Text style={{ color: colors.accent, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{c.active}</Text>
              </View>
            ) : null}
            <Text style={{ marginTop: 14, fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg, textAlign: "center" }}>
              {failText ?? (ph === "verifying" ? c.verifying : searching ? c.title : c.title)}
            </Text>
            <Text style={{ marginTop: 8, textAlign: "center", color: colors.muted, maxWidth: 300 }}>
              {ph === "uwb_denied" ? (Platform.OS === "android" ? `${c.uwbDeniedBodyAndroid}\n\n${c.uwbHowAndroid}` : `${c.uwbDeniedBody}\n\n${c.uwbHow}`) : failText ? "" : ph === "verifying" ? c.felt : searching ? (touch.bumps ? c.felt : `${c.ready} · ${c.waitingContact}`) : c.sub}
            </Text>
            {searching && !touch.bumps ? <Text style={{ marginTop: 4, textAlign: "center", color: colors.muted, fontSize: 13, maxWidth: 300 }}>{c.searchingSub}</Text> : null}
          </View>
        )}

        <View style={{ width: "100%", marginTop: 32, gap: 10 }}>
          {ph === "candidate" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn label={c.refuse} variant="secondary" style={{ flex: 1 }} onPress={() => void touch.decline()} />
              <Btn label={c.connect} style={{ flex: 1 }} onPress={() => void touch.accept()} />
            </View>
          ) : null}
          {ph === "waiting_peer" ? <Btn label={c.refuse} variant="secondary" onPress={() => void touch.decline()} /> : null}
          {ph === "choose" ? (
            <>
              <ConnectionChoicePicker value={touchChoice} onChange={setTouchChoice} />
              <Btn label="Proposer" disabled={!touchChoice} onPress={() => touchChoice && void touch.propose(touchChoice)} />
              <Btn label={c.refuse} variant="secondary" onPress={() => void touch.decline()} />
            </>
          ) : null}
          {ph === "proposal_out" ? <Btn label={c.refuse} variant="secondary" onPress={() => void touch.decline()} /> : null}
          {ph === "proposal_in" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn label="Refuser" variant="secondary" style={{ flex: 1 }} onPress={() => void touch.answerProposal(false)} />
              <Btn label="Accepter" style={{ flex: 1 }} onPress={() => void touch.answerProposal(true)} />
            </View>
          ) : null}
          {done && peerId ? <Btn label={c.message} onPress={() => openOrCreateDm(peerId)} /> : null}
          {done && peerId ? <Btn label={t("viewProfile")} variant="secondary" onPress={() => push({ name: "found-profile", userId: peerId, via: "touch" })} /> : null}
          {ph === "already_connected" ? <Btn label="Recommencer" variant="ghost" onPress={() => void touch.start()} /> : null}
          {ph === "uwb_denied" ? (
            <>
              <Btn label={Platform.OS === "android" ? c.openSettingsAndroid : c.openSettings} onPress={() => void Promise.resolve(Linking.openSettings?.()).catch(() => undefined)} />
              <Btn label={c.useQr} variant="secondary" onPress={() => push({ name: "scanner" })} />
            </>
          ) : null}
          {failText && ph !== "offline" && ph !== "uwb_denied" ? (
            qrFirst ? (
              <>
                <Btn label={c.useQr} onPress={() => push({ name: "scanner" })} />
                <Btn label={c.retry} variant="secondary" onPress={() => void touch.start()} />
              </>
            ) : (
              <>
                <Btn label={c.retry} onPress={() => void touch.start()} />
                <Btn label={c.scanQr} variant="secondary" onPress={() => push({ name: "scanner" })} />
              </>
            )
          ) : null}
          {ph === "offline" ? (
            <>
              <Btn label={c.retry} onPress={() => void touch.start()} />
              <Btn label={c.back} variant="secondary" onPress={pop} />
            </>
          ) : null}
          {searching ? (
            <>
              <Btn label={c.scanQr} variant="secondary" onPress={() => push({ name: "scanner" })} />
              <Btn label={c.showQr} variant="ghost" onPress={() => push({ name: "my-qr" })} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

export function TouchIncomingScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const match = getLastTouchMatch();
  const users = useWippStore((s) => s.users);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!match) return;
    setUserId(
      upsertRemoteProfile({
        id: match.senderId,
        username: match.senderUsername,
        displayName: match.senderName,
        avatarUrl: null,
        bio: "",
      }),
    );
  }, [match]);
  const user = userId ? users[userId] : undefined;
  const demo = !match && __DEV__ ? Object.values(users)[0] : undefined;
  const shown = user ?? demo;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="WIPP Touch" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 24, alignItems: "center" }}>
        {__DEV__ && !match ? (
          <View style={{ borderRadius: 999, backgroundColor: whiteA(0.1), paddingHorizontal: 8, paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: colors.muted }}>Démo</Text>
          </View>
        ) : null}
        {shown ? <Avatar user={shown} size={72} /> : null}
        <Text style={{ marginTop: 12, fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{shown?.displayName}</Text>
        <Text style={{ color: colors.muted }}>{t("touchWantsShare")}</Text>
        <View style={{ width: "100%", marginTop: 24, gap: 8 }}>
          <Btn
            label={t("connectWith")}
            onPress={() => {
              if (shown?.username) void sendRequest(shown.username, "touch");
              if (userId) push({ name: "found-profile", userId, via: "touch" });
            }}
          />
          <Btn
            label={t("touchRefuse")}
            variant="secondary"
            onPress={() => {
              if (match?.code) void rejectTouchCode(match.code).catch(() => undefined);
              pop();
            }}
          />
        </View>
      </View>
    </ScreenRoot>
  );
}

export function QrProfileScreen({ handoffKey }: { handoffKey: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    void (async () => {
      const { findPublicByUsername, upsertRemoteProfile } = await import("../lib/public-profiles");
      const p = await findPublicByUsername(handoffKey);
      if (!p) {
        setMissing(true);
        return;
      }
      setUserId(upsertRemoteProfile(p, false));
    })();
  }, [handoffKey]);
  if (missing) {
    return (
      <ScreenRoot>
        <Empty title="Profil introuvable" />
      </ScreenRoot>
    );
  }
  if (!userId) return <ScreenRoot><View /></ScreenRoot>;
  return <FoundProfileScreen userId={userId} via="qr" />;
}

export function QrGroupScreen({ handoffKey }: { handoffKey: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Groupe" onBack={pop} />
      </GlassHeader>
      <Text style={{ paddingHorizontal: 16, color: colors.muted, fontSize: 13 }}>
        Les groupes restent partiels dans cette version. Le QR a bien été reconnu.
      </Text>
      <Btn label="Ouvrir l’invitation" onPress={() => push({ name: "group-invite", token: handoffKey })} style={{ margin: 16 }} />
    </ScreenRoot>
  );
}

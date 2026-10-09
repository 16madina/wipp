/**
 * Étape C — la scène du direct : grille des intervenants (1 à 4), invitation à monter,
 * panneau « Demandes de parole » de l'organisateur. Les droits sont donnés / repris par le serveur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Hand, Maximize2, Mic, MicOff, Minimize2, MoreHorizontal, UserMinus, Video, VideoOff, X } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { errorText } from "../lib/error-fr";
import type { LiveStage, StagePerson } from "../lib/event-live";

const GOLD = "#d4a017";
const RTCView = Platform.OS === "web" ? View : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc")).RTCView;

export type StageTile = { identity: string; pid?: string; name: string; avatar?: string; url: string | null; mirror: boolean; micOn: boolean; speaking: boolean; organizer: boolean; local?: boolean };

export function useLiveStage(eventId: string) {
  const [stage, setStage] = useState<LiveStage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reload = useCallback(async () => {
    try {
      const { liveStage } = await import("../lib/event-live");
      setStage(await liveStage(eventId));
    } catch {
      /* offline: the next signal or reconnection reloads */
    }
  }, [eventId]);
  const soon = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void reload();
    }, 400);
  }, [reload]);
  useEffect(() => {
    void reload();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reload]);
  return { stage, setStage, reload, soon };
}

/** 1 = full screen · 2 = split · 3 = one wide + two · 4 = 2 × 2 · featured = big + thumbnails. */
export type StageLayout = "shared" | "dominant" | "inset";
type Rect = { t: StageTile; x: number; y: number; w: number; h: number; small?: boolean; top?: boolean; menuLeft?: boolean };

/** Height of the stage when several people are on it: big videos first, comments get what is left. */
export function stageHeight(winH: number, controlsH: number) {
  return Math.round(Math.min(winH * 0.6, winH - controlsH - 130));
}

/**
 * Where each video goes (WIPP's own scene, see the reference images):
 * 2 = split in half · shared = host left + guests stacked / 2×2 · dominant = host full + row of squares at
 * the bottom · inset = host full + floating block of squares top right. « Mettre en avant » = dominant with
 * the featured person big.
 */
function layoutRects(tiles: StageTile[], featured: string | null, layout: StageLayout, W: number, S: number, topSafe: number) {
  const n = tiles.length;
  const host = tiles.find((t) => t.organizer) ?? tiles[0];
  const big = (featured && tiles.find((t) => t.identity === featured)) || host;
  const others = tiles.filter((t) => t !== big);
  const rects: Rect[] = [];
  let logo: { x: number; y: number } | null = null;
  const mode: StageLayout | "split" = featured && n > 1 ? "dominant" : n === 2 ? "split" : layout;
  if (mode === "split") {
    rects.push({ t: big, x: 0, y: 0, w: W / 2, h: S, top: true }, { t: others[0], x: W / 2, y: 0, w: W / 2, h: S, top: true });
    logo = { x: W / 2, y: S / 2 };
  } else if (mode === "shared") {
    if (n === 3) {
      rects.push({ t: big, x: 0, y: 0, w: W / 2, h: S, top: true });
      rects.push({ t: others[0], x: W / 2, y: 0, w: W / 2, h: S / 2, top: true }, { t: others[1], x: W / 2, y: S / 2, w: W / 2, h: S / 2 });
      logo = { x: W / 2, y: S / 2 };
    } else {
      const all = [big, ...others].slice(0, 4);
      // Bottom-left video: its ⋯ goes top-left so it never touches the centre logo.
      all.forEach((t, i) => rects.push({ t, x: (i % 2) * (W / 2), y: Math.floor(i / 2) * (S / 2), w: W / 2, h: S / 2, top: i < 2, menuLeft: i === 2 }));
      logo = { x: W / 2, y: S / 2 };
    }
  } else {
    rects.push({ t: big, x: 0, y: 0, w: W, h: S, top: true });
    const gap = 10;
    if (mode === "dominant") {
      // A row of squares at the bottom of the host's video, the logo in the middle of the row.
      const logoW = 44;
      const q = Math.min((W - 24 - logoW - gap * others.length) / Math.max(2, others.length), S * 0.3, 120);
      const rowW = q * others.length + gap * others.length + logoW;
      let x = (W - rowW) / 2;
      const y = S - q - 12;
      const left = Math.ceil(others.length / 2);
      others.forEach((t, i) => {
        if (i === left) {
          logo = { x: x + logoW / 2 - gap / 2, y: y + q / 2 };
          x += logoW;
        }
        rects.push({ t, x, y, w: q, h: q, small: true });
        x += q + gap;
      });
      if (!logo) logo = { x: x + logoW / 2 - gap / 2, y: y + q / 2 };
    } else {
      // A floating block of squares at the top right of the host's video, the logo at its centre.
      const q = Math.min(W * 0.26, S * 0.3, 118);
      const cols = 2;
      const x0 = W - cols * q - gap - 12;
      const y0 = topSafe + 8;
      others.forEach((t, i) => rects.push({ t, x: x0 + (i % cols) * (q + gap), y: y0 + Math.floor(i / cols) * (q + gap), w: q, h: q, small: true }));
      const rows = Math.ceil(others.length / cols);
      logo = rows > 1 ? { x: x0 + q + gap / 2, y: y0 + q + gap / 2 } : { x: x0 + q + gap / 2, y: y0 + q };
    }
  }
  return { rects, logo, bigIdentity: big.identity };
}

const stageLogo = require("../../assets/brand/stage-logo.png");

/** One person: full screen (unchanged). Several: the WIPP scene, height S, under the top bar. */
export function StageGrid({
  tiles,
  featured,
  layout,
  width,
  stageH,
  topSafe,
  onMenu,
}: {
  tiles: StageTile[];
  featured: string | null;
  layout: StageLayout;
  width: number;
  stageH: number;
  topSafe: number;
  onMenu?: (t: StageTile) => void;
}) {
  if (!tiles.length) return null;
  if (tiles.length === 1) {
    return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Tile t={tiles[0]} style={{ flex: 1 }} label={false} />
      </View>
    );
  }
  const { rects, logo, bigIdentity } = layoutRects(tiles, featured, layout, width, stageH, topSafe);
  const line = 1; // very thin separators
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height: stageH, backgroundColor: "#000" }}>
      {rects.map((r) => {
        const inset = r.small ? 0 : line / 2;
        return (
          <Tile
            key={r.t.identity}
            t={r.t}
            small={r.small}
            menuTop={r.top && !r.small ? topSafe + 50 : 6}
            menuLeft={r.menuLeft}
            labelLeft={logo && Math.abs(r.x - logo.x) < 2 && Math.abs(r.y + r.h - logo.y) < 2 ? 30 : 6}
            labelLift={r.t.identity === bigIdentity && rects.some((x) => x.small && x.y > stageH / 2) ? Math.min(stageH * 0.3, 120) + 16 : 0}
            style={{
              position: "absolute",
              left: r.x + inset,
              top: r.y + inset,
              width: r.w - inset * 2,
              height: r.h - inset * 2,
              ...(r.small ? { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(212,160,23,0.55)" } : {}),
            }}
            onMenu={onMenu}
          />
        );
      })}
      {logo ? (
        <View pointerEvents="none" style={{ position: "absolute", left: logo.x - 21, top: logo.y - 21, width: 42, height: 42, borderRadius: 21, overflow: "hidden", borderWidth: 1.5, borderColor: GOLD, backgroundColor: "#000" }}>
          <Image source={stageLogo} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>
      ) : null}
    </View>
  );
}

function Tile({ t, style, small, label = true, onMenu, menuTop = 6, labelLift = 0, menuLeft, labelLeft = 6 }: { t: StageTile; style: object; small?: boolean; label?: boolean; onMenu?: (t: StageTile) => void; menuTop?: number; labelLift?: number; menuLeft?: boolean; labelLeft?: number }) {
  // The organizer's own video has no menu (he controls himself with the bar).
  const menu = onMenu && !t.organizer && !t.local;
  return (
    <View style={[{ backgroundColor: "#0b0f1a" }, style]}>
      {t.url ? (
        <RTCView streamURL={t.url} style={{ flex: 1 }} objectFit="cover" mirror={t.mirror} zOrder={small ? 1 : 0} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#111727" }}>
          <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={small ? 40 : 64} />
          {!small ? <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.55)", fontSize: 11 }}>Caméra éteinte</Text> : null}
        </View>
      )}
      {/* Who is speaking: a discreet gold frame (drawn over the video so the size never jumps). */}
      {t.speaking ? <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: small ? 14 : 0, borderWidth: 2, borderColor: GOLD }} /> : null}
      {label ? (
        <View style={{ position: "absolute", left: labelLeft, right: 6, bottom: 6 + labelLift, flexDirection: "row", alignItems: "center" }}>
          <View style={{ flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 3, paddingRight: 8, paddingVertical: 3, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.62)" }}>
            {!small ? <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={20} /> : null}
            {t.micOn ? <Mic size={12} color="#fff" /> : <MicOff size={12} color="#ff6b6b" />}
            <Text numberOfLines={1} style={{ flexShrink: 1, color: "#fff", fontSize: small ? 10 : 12, fontFamily: "Inter_600SemiBold" }}>{t.name}</Text>
            {t.organizer && !small ? (
              <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, backgroundColor: GOLD }}>
                <Text style={{ color: "#0b1220", fontSize: 9, fontFamily: "Inter_700Bold" }}>HOST</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      {menu ? (
        <Press
          accessibilityLabel={`Options pour ${t.name}`}
          onPress={() => onMenu!(t)}
          hitSlop={10}
          style={{ position: "absolute", ...(menuLeft ? { left: 6 } : { right: 6 }), top: menuTop, width: small ? 30 : 36, height: small ? 30 : 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(212,160,23,0.7)", alignItems: "center", justifyContent: "center" }}
        >
          <MoreHorizontal size={small ? 15 : 18} color="#fff" />
        </Press>
      ) : null}
    </View>
  );
}

/** « L'organisateur t'invite à prendre la parole. » — expires after 60 s. */
export function StageInviteCard({ invitedAt, onJoin, onRefuse }: { invitedAt: number; onJoin: () => void; onRefuse: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, 60 - Math.floor((Date.now() - invitedAt) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, 60 - Math.floor((Date.now() - invitedAt) / 1000))), 1000);
    return () => clearInterval(id);
  }, [invitedAt]);
  if (left <= 0) return null;
  return (
    <View style={{ position: "absolute", left: 18, right: 18, top: "34%", padding: 18, borderRadius: 20, backgroundColor: "rgba(6,10,24,0.94)", borderWidth: 1, borderColor: "rgba(212,160,23,0.8)" }}>
      <View style={{ alignSelf: "center", width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(212,160,23,0.18)", alignItems: "center", justifyContent: "center" }}>
        <Mic size={22} color={GOLD} />
      </View>
      <Text style={{ marginTop: 10, color: "#fff", fontSize: 17, textAlign: "center", fontFamily: "Inter_700Bold" }}>L’organisateur t’invite à prendre la parole.</Text>
      <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center" }}>Tu choisiras ensuite d’activer ton micro et ta caméra. ({left} s)</Text>
      <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
        <Press onPress={onRefuse} style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Refuser</Text>
        </Press>
        <Press onPress={onJoin} style={{ flex: 1.3, height: 46, borderRadius: 23, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#0b1220", fontFamily: "Inter_700Bold" }}>Rejoindre</Text>
        </Press>
      </View>
    </View>
  );
}

/** Organizer: raised hands, pending invitations, people on stage. Slides up; the video stays visible. */
export function StageSheet({
  eventId,
  stage,
  onClose,
  onChanged,
  onInviteSomeone,
}: {
  eventId: string;
  stage: LiveStage | null;
  onClose: () => void;
  onChanged: (s: LiveStage) => void;
  onInviteSomeone: () => void;
}) {
  const insets = useSafeAreaInsets();
  async function act(body: Parameters<typeof import("../lib/event-live").stageAction>[1]) {
    try {
      const { stageAction } = await import("../lib/event-live");
      onChanged(await stageAction(eventId, body));
    } catch (err) {
      Alert.alert("Scène", errorText(err, "Action impossible."));
    }
  }
  const seats = stage ? stage.maxSpeakers - stage.freeSeats : 1;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Press accessibilityLabel="Fermer" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)" }} />
      <View style={{ maxHeight: "68%", paddingHorizontal: 18, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 14), borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: "rgba(9,12,24,0.97)", borderTopWidth: 1, borderColor: "rgba(212,160,23,0.35)" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" }}>Scène · {seats}/{stage?.maxSpeakers ?? 4}</Text>
          <Press accessibilityLabel="Fermer" onPress={onClose} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <X size={20} color="#fff" />
          </Press>
        </View>
        {stage?.speakers.length ? (
          <Press
            onPress={() =>
              Alert.alert("Revenir au mode Conférence", "Tous les intervenants redescendront parmi les spectateurs. Leur micro et leur caméra seront coupés.", [
                { text: "Annuler", style: "cancel" },
                { text: "Revenir au mode Conférence", style: "destructive", onPress: () => void act({ action: "mode", mode: "conference" }) },
              ])
            }
            style={{ marginTop: 12, height: 46, borderRadius: 14, backgroundColor: "rgba(229,56,59,0.15)", borderWidth: 1, borderColor: "#e5383b", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#ff6b6b", fontFamily: "Inter_700Bold" }}>Revenir au mode Conférence</Text>
          </Press>
        ) : null}
        <ScrollView>
          <Section title={`Demandes de parole (${stage?.hands.length ?? 0})`}>
            {!stage?.hands.length ? <Empty text="Aucune main levée." /> : null}
            {stage?.hands.map((p) => (
              <Row key={p.pid} p={p} sub={p.at ? `✋ ${hhmm(p.at)}` : undefined}>
                <Small label="Refuser" onPress={() => void act({ action: "dismiss", pid: p.pid })} />
                <Small label="Accepter" gold disabled={!stage.freeSeats} onPress={() => void act({ action: "invite", pid: p.pid })} />
              </Row>
            ))}
          </Section>
          {stage?.invites.length ? (
            <Section title="Invitations en attente">
              {stage.invites.map((p) => (
                <Row key={p.pid} p={p} sub="Invitation envoyée…">
                  <Small label="Annuler" onPress={() => void act({ action: "dismiss", pid: p.pid })} />
                </Row>
              ))}
            </Section>
          ) : null}
          <Section title="Sur scène">
            {!stage?.speakers.length ? <Empty text="Tu es seul(e) sur scène." /> : null}
            {stage?.speakers.map((p) => {
              const isFeatured = stage.featured === p.identity;
              return (
                <View key={p.pid} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}>
                  <Row p={p} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    <Icon label={isFeatured ? "Grille" : "En avant"} onPress={() => void act({ action: "feature", identity: isFeatured ? null : p.identity })}>
                      {isFeatured ? <Minimize2 size={14} color="#fff" /> : <Maximize2 size={14} color="#fff" />}
                    </Icon>
                    <Icon label={p.micRevoked ? "Rendre le micro" : "Couper le micro"} onPress={() => void act({ action: "media", pid: p.pid, micRevoked: !p.micRevoked })}>
                      {p.micRevoked ? <MicOff size={14} color="#ff6b6b" /> : <Mic size={14} color="#fff" />}
                    </Icon>
                    <Icon label={p.camRevoked ? "Rendre la caméra" : "Couper la caméra"} onPress={() => void act({ action: "media", pid: p.pid, camRevoked: !p.camRevoked })}>
                      {p.camRevoked ? <VideoOff size={14} color="#ff6b6b" /> : <Video size={14} color="#fff" />}
                    </Icon>
                    <Icon label="Retirer" onPress={() => void act({ action: "leave", pid: p.pid })}>
                      <UserMinus size={14} color="#ff6b6b" />
                    </Icon>
                  </View>
                </View>
              );
            })}
            {stage?.featured ? (
              <Press onPress={() => void act({ action: "feature", identity: null })} style={{ marginTop: 8, alignSelf: "flex-start" }}>
                <Text style={{ color: GOLD, fontSize: 13 }}>Revenir à la grille</Text>
              </Press>
            ) : null}
          </Section>
          <Press onPress={onInviteSomeone} disabled={!stage?.freeSeats} style={{ marginTop: 14, height: 44, borderRadius: 14, borderWidth: 1, borderColor: GOLD, alignItems: "center", justifyContent: "center", opacity: stage?.freeSeats ? 1 : 0.4 }}>
            <Text style={{ color: GOLD, fontFamily: "Inter_600SemiBold" }}>{stage?.freeSeats ? "Inviter un participant" : "La scène est complète"}</Text>
          </Press>

        </ScrollView>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}
function Empty({ text }: { text: string }) {
  return <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, paddingVertical: 4 }}>{text}</Text>;
}
function Row({ p, sub, children }: { p: StagePerson; sub?: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
      <Avatar user={{ displayName: p.name, avatar: p.avatar ?? undefined }} size={36} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{p.name}</Text>
        <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>@{p.username}{sub ? ` · ${sub}` : ""}</Text>
      </View>
      {children}
    </View>
  );
}
function Small({ label, onPress, gold, disabled }: { label: string; onPress: () => void; gold?: boolean; disabled?: boolean }) {
  return (
    <Press disabled={disabled} onPress={onPress} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: gold ? GOLD : "rgba(255,255,255,0.12)", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ color: gold ? "#0b1220" : "#fff", fontSize: 12, fontFamily: gold ? "Inter_700Bold" : "Inter_600SemiBold" }}>{label}</Text>
    </Press>
  );
}
function Icon({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Press accessibilityLabel={label} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)" }}>
      {children}
      <Text style={{ color: "#fff", fontSize: 11 }}>{label}</Text>
    </Press>
  );
}
function hhmm(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export { Hand };

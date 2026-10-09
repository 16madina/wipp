/**
 * Étape C — la scène du direct : grille des intervenants (1 à 4), invitation à monter,
 * panneau « Demandes de parole » de l'organisateur. Les droits sont donnés / repris par le serveur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Hand, Maximize2, Mic, MicOff, Minimize2, UserMinus, Video, VideoOff, X } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { errorText } from "../lib/error-fr";
import type { LiveStage, StagePerson } from "../lib/event-live";

const GOLD = "#d4a017";
const RTCView = Platform.OS === "web" ? View : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc")).RTCView;

export type StageTile = { identity: string; name: string; avatar?: string; url: string | null; mirror: boolean; micOn: boolean; speaking: boolean; organizer: boolean };

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
export function StageGrid({ tiles, featured, topInset }: { tiles: StageTile[]; featured: string | null; topInset: number }) {
  if (!tiles.length) return null;
  const big = featured ? tiles.find((t) => t.identity === featured) : undefined;
  if (big && tiles.length > 1) {
    const minis = tiles.filter((t) => t !== big);
    return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Tile t={big} style={{ flex: 1 }} />
        <View style={{ position: "absolute", top: topInset + 100, right: 10, gap: 8 }}>
          {minis.map((t) => (
            <Tile key={t.identity} t={t} style={{ width: 92, height: 124, borderRadius: 12, overflow: "hidden" }} small />
          ))}
        </View>
      </View>
    );
  }
  const n = tiles.length;
  const rows: StageTile[][] = n === 1 ? [tiles] : n === 2 ? [[tiles[0]], [tiles[1]]] : n === 3 ? [[tiles[0]], [tiles[1], tiles[2]]] : [tiles.slice(0, 2), tiles.slice(2, 4)];
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, gap: n > 1 ? 2 : 0, backgroundColor: "#000" }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flex: 1, flexDirection: "row", gap: 2 }}>
          {row.map((t) => (
            <Tile key={t.identity} t={t} style={{ flex: 1 }} label={n > 1} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Tile({ t, style, small, label = true }: { t: StageTile; style: object; small?: boolean; label?: boolean }) {
  return (
    <View style={[{ backgroundColor: "#0b0f1a", borderWidth: t.speaking ? 2 : 0, borderColor: GOLD }, style]}>
      {t.url ? (
        <RTCView streamURL={t.url} style={{ flex: 1 }} objectFit="cover" mirror={t.mirror} zOrder={small ? 1 : 0} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={small ? 40 : 72} />
          {!small ? <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Caméra éteinte</Text> : null}
        </View>
      )}
      {label ? (
        <View style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.55)", maxWidth: "90%" }}>
          {t.micOn ? <Mic size={11} color="#fff" /> : <MicOff size={11} color="#ff6b6b" />}
          <Text numberOfLines={1} style={{ color: "#fff", fontSize: small ? 10 : 12, fontFamily: "Inter_600SemiBold" }}>
            {t.name}
            {t.organizer && !small ? " · organisateur" : ""}
          </Text>
        </View>
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
          {stage?.mode === "interactive" ? (
            <Press onPress={() => void act({ action: "mode", mode: "conference" })} style={{ marginTop: 10, alignSelf: "center", padding: 8 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Revenir au mode Conférence (tout le monde redescend)</Text>
            </Press>
          ) : null}
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

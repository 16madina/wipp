import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Share, Text, TextInput, View } from "react-native";
import { Link2, Lock, Radio, UserPlus, Users } from "lucide-react-native";
import { Btn, Press } from "./ui";
import { errorText } from "../lib/error-fr";
import { useWippStore } from "../lib/store";
import { colors, accentA, whiteA } from "../theme";
import type { LiveInfo } from "../lib/event-live";

/**
 * Event sheet block for a WIPP online event: register, join the live, and the organizer's tools
 * (start, invite, link, cancel). The server checks every action.
 */
export function EventLiveActions({ eventId, startsAt }: { eventId: string; startsAt?: string }) {
  const push = useWippStore((s) => s.push);
  const [live, setLive] = useState<LiveInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [names, setNames] = useState("");

  const load = useCallback(async () => {
    try {
      const { getLive } = await import("../lib/event-live");
      setLive(await getLive(eventId));
      setError("");
    } catch (err) {
      setError(errorText(err, "Direct indisponible."));
    }
  }, [eventId]);
  useEffect(() => {
    void load();
    // While waiting for the start, check every 20 s so « Rejoindre le direct » appears by itself.
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  async function run<T>(fn: () => Promise<T>, after?: (r: T) => void) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      after?.(r);
      await load();
      // Keep the events list in step (badge, registered count).
      const { fetchEvents } = await import("../lib/lot7/api");
      useWippStore.setState({ lifestyle: await fetchEvents(useWippStore.getState().serverProfileId) });
    } catch (err) {
      Alert.alert("Événement", errorText(err, "Action impossible."));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Text style={{ marginTop: 16, color: colors.muted }}>{error}</Text>;
  if (!live) return <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />;

  const soon = startsAt ? Date.parse(startsAt) - Date.now() < 15 * 60_000 : true;
  const closed = live.state === "ended" || live.state === "cancelled";

  return (
    <View style={{ marginTop: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: accentA(0.08), borderWidth: 1, borderColor: accentA(0.3) }}>
        {live.visibility === "private" ? <Lock size={18} color={colors.accent} /> : <Radio size={18} color={colors.accent} />}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>
            En ligne sur WIPP · {live.state === "live" ? "EN DIRECT" : live.state === "ended" ? "Terminé" : live.state === "cancelled" ? "Annulé" : "À venir"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            {live.visibility === "private" ? "Sur invitation" : "Public"} · {live.durationMin} min · gratuit · {live.registered} inscrit{live.registered > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {live.isOwner ? (
        <>
          {live.state === "live" ? (
            <Btn label="Rejoindre mon direct" onPress={() => push({ name: "event-live", eventId })} />
          ) : !closed ? (
            <Btn
              label={busy ? "…" : "Démarrer le direct"}
              onPress={() => {
                const go = () => void run(async () => (await import("../lib/event-live")).startLive(eventId), () => push({ name: "event-live", eventId }));
                if (soon) go();
                else
                  Alert.alert("Démarrer maintenant ?", "L’heure prévue n’est pas encore arrivée. Les inscrits seront prévenus que c’est en direct.", [
                    { text: "Annuler", style: "cancel" },
                    { text: "Démarrer", onPress: go },
                  ]);
              }}
            />
          ) : null}
          {!closed ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Press onPress={() => setInviteOpen((v) => !v)} style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: whiteA(0.15), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <UserPlus size={16} color={colors.fg} />
                <Text style={{ color: colors.fg, fontSize: 13 }}>Inviter</Text>
              </Press>
              <Press
                onPress={() =>
                  void run(async () => (await import("../lib/event-live")).newLiveLink(eventId), (r) => {
                    void Share.share({ message: `Rejoins mon événement en ligne sur WIPP : ${r.url}` });
                  })
                }
                style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: whiteA(0.15), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Link2 size={16} color={colors.fg} />
                <Text style={{ color: colors.fg, fontSize: 13 }}>Lien d’invitation</Text>
              </Press>
            </View>
          ) : null}
          {inviteOpen ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={names}
                onChangeText={setNames}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="@pseudo1 @pseudo2 …"
                placeholderTextColor={colors.muted}
                style={{ minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: whiteA(0.15), color: colors.fg, paddingHorizontal: 12 }}
              />
              <Btn
                label="Envoyer les invitations"
                onPress={() => {
                  const list = names.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
                  if (!list.length) return;
                  void run(async () => (await import("../lib/event-live")).inviteToLive(eventId, list), (r) => {
                    setNames("");
                    setInviteOpen(false);
                    Alert.alert("Invitations", r.invited ? `${r.invited} invitation${r.invited > 1 ? "s" : ""} envoyée${r.invited > 1 ? "s" : ""}.` : "Aucun nouveau compte trouvé avec ces pseudos.");
                  });
                }}
              />
              <Text style={{ color: colors.muted, fontSize: 11 }}>Un nouveau lien d’invitation désactive l’ancien.</Text>
            </View>
          ) : null}
          {live.state === "scheduled" ? (
            <Press
              onPress={() =>
                Alert.alert("Annuler l’événement", "Les inscrits ne pourront plus rejoindre le direct.", [
                  { text: "Retour", style: "cancel" },
                  { text: "Annuler l’événement", style: "destructive", onPress: () => void run(async () => (await import("../lib/event-live")).cancelLive(eventId)) },
                ])
              }
              style={{ alignSelf: "center", padding: 8 }}
            >
              <Text style={{ color: colors.danger, fontSize: 13 }}>Annuler l’événement</Text>
            </Press>
          ) : null}
        </>
      ) : closed ? (
        <Text style={{ color: colors.muted, textAlign: "center" }}>{live.state === "ended" ? "Ce direct est terminé. Il n’y a pas de rediffusion." : "Cet événement a été annulé."}</Text>
      ) : live.myStatus === "banned" ? (
        <Text style={{ color: colors.muted, textAlign: "center" }}>L’organisateur t’a retiré(e) de cet événement.</Text>
      ) : (
        <>
          {live.state === "live" ? <Btn label="Rejoindre le direct" onPress={() => push({ name: "event-live", eventId })} /> : null}
          {live.myStatus === "registered" ? (
            <Btn label={busy ? "…" : "✓ Inscrit(e) · Se désinscrire"} variant="secondary" onPress={() => void run(async () => (await import("../lib/event-live")).registerLive(eventId, false))} />
          ) : (
            <Btn label={busy ? "…" : live.myStatus === "invited" ? "Accepter l’invitation" : "S’inscrire"} variant={live.state === "live" ? "secondary" : undefined} onPress={() => void run(async () => (await import("../lib/event-live")).registerLive(eventId, true))} />
          )}
          {live.state === "scheduled" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <Users size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>Le bouton « Rejoindre le direct » apparaît quand l’organisateur démarre.</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * Étape B — questions-réponses de la salle WIPP en direct.
 * The server keeps the list, the votes and the question on screen; the room only shows them.
 * Live updates: the server sends « q » (list changed) and « spot » (card) through LiveKit; we refetch.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, EyeOff, HelpCircle, MoreHorizontal, ThumbsUp, X } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { errorText } from "../lib/error-fr";
import { palettes } from "../theme";
import type { LiveQuestion, LiveQuestions } from "../lib/event-live";

const colors = palettes.dark;
const GOLD = "#d4a017";

export function useLiveQuestions(eventId: string) {
  const [data, setData] = useState<LiveQuestions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reload = useCallback(async () => {
    try {
      const { listLiveQuestions } = await import("../lib/event-live");
      setData(await listLiveQuestions(eventId));
    } catch {
      /* offline: the next signal or reconnection reloads */
    }
  }, [eventId]);
  /** Many votes at once: one reload every 600 ms at most. */
  const soon = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void reload();
    }, 600);
  }, [reload]);
  useEffect(() => {
    void reload();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reload]);
  return { data, setData, reload, soon };
}

/** The question shown on the video, same for everyone (kept by the server). */
export function SpotlightCard({
  q,
  top,
  organizer,
  onDone,
  onHide,
  onNext,
}: {
  q: LiveQuestion;
  top: number;
  organizer: boolean;
  onDone: () => void;
  onHide: () => void;
  onNext: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [q.id]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top,
        left: 14,
        right: 14,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
      }}
    >
      <View style={{ padding: 14, borderRadius: 18, backgroundColor: "rgba(6,10,24,0.82)", borderWidth: 1, borderColor: "rgba(212,160,23,0.75)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <HelpCircle size={15} color={GOLD} />
          <Text style={{ color: GOLD, fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_700Bold" }}>QUESTION DU PUBLIC</Text>
        </View>
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Avatar user={{ displayName: q.name, avatar: q.avatar ?? undefined }} size={26} />
          <Text numberOfLines={1} style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
            {q.name} · @{q.username}
          </Text>
        </View>
        <Text style={{ marginTop: 8, color: "#fff", fontSize: 16, lineHeight: 22, fontFamily: "Inter_600SemiBold" }}>« {q.text} »</Text>
        {organizer ? (
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            <CardBtn label="Traitée" onPress={onDone} icon={<Check size={14} color="#0b1220" />} primary />
            <CardBtn label="Masquer" onPress={onHide} icon={<EyeOff size={14} color="#fff" />} />
            <CardBtn label="Suivante" onPress={onNext} icon={<ChevronRight size={14} color="#fff" />} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function CardBtn({ label, onPress, icon, primary }: { label: string; onPress: () => void; icon: React.ReactNode; primary?: boolean }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: primary ? GOLD : "rgba(255,255,255,0.12)" }}>
      {icon}
      <Text style={{ color: primary ? "#0b1220" : "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </Press>
  );
}

type Filter = "pending" | "done" | "all";

/** « Questions du public » — slides up from the bottom; the video stays visible above. */
export function QuestionsSheet({
  eventId,
  data,
  organizer,
  onClose,
  onChanged,
  onReport,
  focusAsk,
}: {
  eventId: string;
  data: LiveQuestions | null;
  organizer: boolean;
  onClose: () => void;
  onChanged: () => void;
  onReport: (q: LiveQuestion) => void;
  focusAsk?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [filter, setFilter] = useState<Filter>("pending");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const list = useMemo(() => {
    const all = data?.questions ?? [];
    const shown = organizer
      ? all.filter((q) => (filter === "all" ? true : filter === "done" ? q.status === "done" : q.status === "pending" || q.status === "shown"))
      : all;
    return [...shown].sort((a, b) => (sort === "popular" ? b.votes - a.votes || b.createdAt - a.createdAt : b.createdAt - a.createdAt));
  }, [data, sort, filter, organizer]);
  const counts = useMemo(() => {
    const all = data?.questions ?? [];
    return {
      pending: all.filter((q) => q.status === "pending" || q.status === "shown").length,
      done: all.filter((q) => q.status === "done").length,
      all: all.length,
    };
  }, [data]);

  async function ask() {
    const text = draft.trim();
    if (text.length < 3 || sending) return;
    setSending(true);
    try {
      const { askLiveQuestion } = await import("../lib/event-live");
      await askLiveQuestion(eventId, text);
      setDraft("");
      setSent(true);
      setTimeout(() => setSent(false), 2200);
      onChanged();
    } catch (err) {
      Alert.alert("Question", errorText(err, "Question non envoyée."));
    } finally {
      setSending(false);
    }
  }

  async function vote(q: LiveQuestion) {
    try {
      const { voteLiveQuestion } = await import("../lib/event-live");
      await voteLiveQuestion(eventId, q.id, !q.myVote);
      onChanged();
    } catch (err) {
      Alert.alert("Question", errorText(err, "Vote impossible."));
    }
  }

  async function moderate(q: LiveQuestion, action: "show" | "unshow" | "done" | "ignore" | "delete" | "restore") {
    try {
      const { moderateLiveQuestion } = await import("../lib/event-live");
      await moderateLiveQuestion(eventId, q.id, action);
      onChanged();
    } catch (err) {
      Alert.alert("Question", errorText(err, "Action impossible."));
    }
  }

  function more(q: LiveQuestion) {
    if (!organizer) {
      Alert.alert(q.name, q.text, [{ text: "Signaler", onPress: () => onReport(q) }, { text: "Annuler", style: "cancel" }]);
      return;
    }
    Alert.alert(q.name, q.text, [
      q.status === "done" || q.status === "ignored"
        ? { text: "Remettre en attente", onPress: () => void moderate(q, "restore") }
        : { text: "Marquer comme traitée", onPress: () => void moderate(q, "done") },
      ...(q.status === "ignored" ? [] : [{ text: "Ignorer (masquer au public)", onPress: () => void moderate(q, "ignore") }]),
      {
        text: "Supprimer (abusive)",
        style: "destructive" as const,
        onPress: () =>
          Alert.alert("Supprimer la question", "Elle disparaîtra pour tout le monde.", [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: "destructive", onPress: () => void moderate(q, "delete") },
          ]),
      },
      { text: "Signaler l’auteur", onPress: () => onReport(q) },
      { text: "Annuler", style: "cancel" as const },
    ]);
  }

  const open = Boolean(data?.questionsOn) || organizer;
  const ended = data && data.state !== "live";

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Press accessibilityLabel="Fermer les questions" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)" }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View
          style={{
            maxHeight: 520,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            backgroundColor: "rgba(9,12,24,0.97)",
            borderTopWidth: 1,
            borderColor: "rgba(212,160,23,0.35)",
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18 }}>
            <Text style={{ flex: 1, color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" }}>
              Questions du public{data ? ` (${counts.all})` : ""}
            </Text>
            <Press accessibilityLabel="Fermer" onPress={onClose} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color="#fff" />
            </Press>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 18, marginTop: 8 }}>
            {organizer
              ? ([["pending", `En attente ${counts.pending}`], ["done", `Traitées ${counts.done}`], ["all", "Toutes"]] as const).map(([id, label]) => (
                  <Chip key={id} label={label} on={filter === id} onPress={() => setFilter(id)} />
                ))
              : null}
            {([["popular", "Populaires"], ["recent", "Récentes"]] as const).map(([id, label]) => (
              <Chip key={id} label={label} on={sort === id} onPress={() => setSort(id)} subtle />
            ))}
          </View>
          {!data ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={GOLD} />
          ) : (
            <FlatList
              style={{ marginTop: 8 }}
              data={list}
              keyExtractor={(q) => q.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", paddingVertical: 22, paddingHorizontal: 24 }}>
                  {organizer ? "Aucune question pour le moment." : "Aucune question pour le moment. Sois la première personne à en poser une !"}
                </Text>
              }
              renderItem={({ item: q }) => (
                <View style={{ marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: 14, backgroundColor: q.status === "shown" ? "rgba(212,160,23,0.14)" : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: q.status === "shown" ? "rgba(212,160,23,0.6)" : "transparent" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Avatar user={{ displayName: q.name, avatar: q.avatar ?? undefined }} size={26} />
                    <Text numberOfLines={1} style={{ flex: 1, color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                      {q.name} · @{q.username} · {ago(q.createdAt)}
                    </Text>
                    <StatusChip status={q.status} />
                    <Press accessibilityLabel="Plus" onPress={() => more(q)} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                      <MoreHorizontal size={16} color="rgba(255,255,255,0.6)" />
                    </Press>
                  </View>
                  <Text style={{ marginTop: 6, color: "#fff", fontSize: 15, lineHeight: 20 }}>{q.text}</Text>
                  <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Press
                      accessibilityLabel={q.myVote ? "Retirer mon vote" : "Soutenir cette question"}
                      disabled={Boolean(ended)}
                      onPress={() => void vote(q)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: q.myVote ? "rgba(212,160,23,0.22)" : "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: q.myVote ? GOLD : "transparent" }}
                    >
                      <ThumbsUp size={14} color={q.myVote ? GOLD : "#fff"} fill={q.myVote ? GOLD : "transparent"} />
                      <Text style={{ color: q.myVote ? GOLD : "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{q.votes}</Text>
                    </Press>
                    <View style={{ flex: 1 }} />
                    {organizer && q.status !== "done" && q.status !== "ignored" ? (
                      q.status === "shown" ? (
                        <Press onPress={() => void moderate(q, "unshow")} style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1, borderColor: GOLD, justifyContent: "center" }}>
                          <Text style={{ color: GOLD, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Retirer de l’écran</Text>
                        </Press>
                      ) : (
                        <Press onPress={() => void moderate(q, "show")} style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: GOLD, justifyContent: "center" }}>
                          <Text style={{ color: "#0b1220", fontSize: 12, fontFamily: "Inter_700Bold" }}>Afficher à l’écran</Text>
                        </Press>
                      )
                    ) : null}
                  </View>
                </View>
              )}
            />
          )}
          {/* Ask — viewers (and the organizer can test it) */}
          {organizer ? null : ended ? (
            <Text style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", paddingTop: 10 }}>Le direct est terminé : plus de questions ni de votes.</Text>
          ) : open ? (
            <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
              {sent ? <Text style={{ color: GOLD, fontSize: 12, marginBottom: 6, textAlign: "center" }}>✓ Question envoyée</Text> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderRadius: 22, paddingLeft: 16, paddingRight: 6, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(212,160,23,0.35)" }}>
                <TextInput
                  value={draft}
                  onChangeText={(v) => setDraft(v.slice(0, 300))}
                  autoFocus={focusAsk}
                  placeholder="Poser une question…"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  style={{ flex: 1, color: "#fff", fontSize: 14, paddingVertical: 10, maxHeight: 90 }}
                />
                <Press disabled={sending || draft.trim().length < 3} onPress={() => void ask()} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: GOLD, justifyContent: "center", opacity: sending || draft.trim().length < 3 ? 0.5 : 1 }}>
                  <Text style={{ color: "#0b1220", fontFamily: "Inter_700Bold", fontSize: 13 }}>Envoyer</Text>
                </Press>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 4, textAlign: "right" }}>{draft.length}/300</Text>
            </View>
          ) : (
            <Text style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", paddingTop: 10 }}>Les questions sont fermées pour le moment.</Text>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Chip({ label, on, onPress, subtle }: { label: string; on: boolean; onPress: () => void; subtle?: boolean }) {
  return (
    <Press onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? (subtle ? "rgba(212,160,23,0.18)" : GOLD) : "rgba(255,255,255,0.08)", borderWidth: subtle && on ? 1 : 0, borderColor: GOLD }}>
      <Text style={{ color: on ? (subtle ? GOLD : "#0b1220") : "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </Press>
  );
}

function StatusChip({ status }: { status: LiveQuestion["status"] }) {
  const label = status === "shown" ? "À l’écran" : status === "done" ? "Traitée" : status === "ignored" ? "Masquée" : "En attente";
  const color = status === "shown" ? GOLD : status === "done" ? "#4ade80" : "rgba(255,255,255,0.55)";
  return <Text style={{ color, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>{label}</Text>;
}

function ago(ms: number) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  return m < 1 ? "à l’instant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`;
}

void colors;

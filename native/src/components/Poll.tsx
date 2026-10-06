import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { BarChart3, Check, Plus, X } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Btn, Press, Toggle } from "./ui";
import { Sheet } from "./card-editor-parts";
import { colors } from "../theme";
import { useWippStore } from "../lib/store";
import type { Message, User } from "../lib/types";

export const POLL_MAX_OPTIONS = 12;

/** « Créer un sondage » : question, 2 à 12 choix, plusieurs réponses ou une seule. */
export function CreatePollSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (poll: NonNullable<Message["poll"]>) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multi, setMulti] = useState(false);
  const filled = options.map((o) => o.trim()).filter(Boolean);
  const dupes = new Set(filled.map((o) => o.toLowerCase())).size !== filled.length;
  const ready = question.trim().length > 0 && filled.length >= 2 && !dupes;

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setMulti(false);
  };

  const input = { height: 46, borderRadius: 12, paddingHorizontal: 14, color: colors.fg, backgroundColor: colors.surface2, fontSize: 15 } as const;

  return (
    <Sheet open={open} title="Créer un sondage" onClose={onClose}>
      <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Question</Text>
        <TextInput value={question} onChangeText={(v) => setQuestion(v.slice(0, 300))} placeholder="Pose ta question…" placeholderTextColor={colors.muted} style={input} />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 16, marginBottom: 6 }}>Choix</Text>
        <View style={{ gap: 8 }}>
          {options.map((o, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={o}
                onChangeText={(v) => setOptions((prev) => prev.map((x, j) => (j === i ? v.slice(0, 100) : x)))}
                placeholder={`Choix ${i + 1}`}
                placeholderTextColor={colors.muted}
                style={[input, { flex: 1 }]}
              />
              {options.length > 2 ? (
                <Press accessibilityLabel={`Retirer le choix ${i + 1}`} onPress={() => setOptions((prev) => prev.filter((_, j) => j !== i))} style={{ padding: 6 }}>
                  <X size={18} color={colors.muted} />
                </Press>
              ) : null}
            </View>
          ))}
        </View>
        {options.length < POLL_MAX_OPTIONS ? (
          <Press onPress={() => setOptions((prev) => [...prev, ""])} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 }}>
            <Plus size={18} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Ajouter un choix</Text>
          </Press>
        ) : null}
        {dupes ? <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 6 }}>Deux choix sont identiques.</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.fg, fontSize: 15 }}>Plusieurs réponses</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Chacun peut cocher plusieurs choix.</Text>
          </View>
          <Toggle value={multi} onChange={setMulti} />
        </View>
        <View style={{ marginTop: 8 }}>
          <Btn
            label="Envoyer le sondage"
            disabled={!ready}
            onPress={() => {
              onSend({ question: question.trim(), options: filled, multi });
              reset();
            }}
          />
        </View>
      </ScrollView>
    </Sheet>
  );
}

function tally(m: Message) {
  const counts = (m.poll?.options ?? []).map(() => 0);
  for (const v of m.pollVotes ?? []) for (const i of v.options) if (i >= 0 && i < counts.length) counts[i] += 1;
  return counts;
}

/** Poll inside a message bubble: tap a choice to vote, bars fill live, « Voir les votes » lists who chose what. */
export function PollBubble({ chatId, m, users, onMe, fg, muted, accent }: { chatId: string; m: Message; users: Record<string, User>; onMe: boolean; fg: string; muted: string; accent: string }) {
  const [details, setDetails] = useState(false);
  const poll = m.poll;
  if (!poll) return null;
  const counts = tally(m);
  const voters = (m.pollVotes ?? []).length;
  const mine = new Set((m.pollVotes ?? []).find((v) => v.userId === "me")?.options ?? []);
  const max = Math.max(1, ...counts);
  const canVote = chatId.startsWith("srv:") && !m.id.startsWith("local") && m.status !== "sending" && m.status !== "failed";

  const vote = (i: number) => {
    if (!canVote) return;
    const next = poll.multi ? (mine.has(i) ? [...mine].filter((x) => x !== i) : [...mine, i]) : mine.has(i) ? [] : [i];
    const before = m.pollVotes ?? [];
    const after = [...before.filter((v) => v.userId !== "me"), ...(next.length ? [{ userId: "me", options: next.sort((a, b) => a - b) }] : [])];
    const patch = (votes: Message["pollVotes"]) =>
      useWippStore.setState((s) => ({
        messages: { ...s.messages, [chatId]: (s.messages[chatId] ?? []).map((x) => (x.id === m.id ? { ...x, pollVotes: votes } : x)) },
      }));
    patch(after);
    void import("../lib/lot7/api")
      .then(({ votePoll }) => votePoll(m.id, next))
      .catch(() => {
        patch(before);
        Alert.alert("Sondage", "Ton vote n’a pas pu être enregistré.");
      });
  };

  const name = (id: string) => (id === "me" ? "Toi" : users[id]?.displayName || (users[id]?.username ? `@${users[id]!.username}` : "Membre"));

  return (
    <View style={{ minWidth: 230, paddingVertical: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BarChart3 size={14} color={accent} />
        <Text style={{ fontSize: 11, color: muted }}>{poll.multi ? "Sondage · plusieurs réponses" : "Sondage"}</Text>
      </View>
      <Text style={{ marginTop: 4, fontSize: 16, fontFamily: "Inter_600SemiBold", color: fg }}>{poll.question}</Text>
      <View style={{ marginTop: 10, gap: 10 }}>
        {poll.options.map((o, i) => {
          const on = mine.has(i);
          return (
            <Press key={i} onPress={() => vote(i)} accessibilityLabel={`${o}, ${counts[i]} vote${counts[i] > 1 ? "s" : ""}${on ? ", ton choix" : ""}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: poll.multi ? 6 : 11,
                    borderWidth: 2,
                    borderColor: on ? accent : muted,
                    backgroundColor: on ? accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {on ? <Check size={13} color={onMe ? "#000" : colors.accentFg} strokeWidth={3} /> : null}
                </View>
                <Text style={{ flex: 1, fontSize: 15, color: fg }}>{o}</Text>
                <Text style={{ fontSize: 13, color: muted, fontFamily: "Inter_600SemiBold" }}>{counts[i]}</Text>
              </View>
              <View style={{ marginTop: 6, marginLeft: 32, height: 5, borderRadius: 3, backgroundColor: onMe ? "rgba(0,0,0,0.12)" : colors.surface2, overflow: "hidden" }}>
                <View style={{ width: `${Math.round((counts[i] / max) * 100)}%`, height: 5, borderRadius: 3, backgroundColor: accent }} />
              </View>
            </Press>
          );
        })}
      </View>
      <Press onPress={() => setDetails(true)} style={{ marginTop: 12, alignItems: "center", paddingVertical: 6 }}>
        <Text style={{ fontSize: 13, color: accent, fontFamily: "Inter_600SemiBold" }}>
          {voters ? `Voir les votes · ${voters} participant${voters > 1 ? "s" : ""}` : "Aucun vote pour l’instant"}
        </Text>
      </Press>
      <Sheet open={details} title={poll.question} onClose={() => setDetails(false)}>
        <ScrollView style={{ maxHeight: 480 }}>
          {poll.options.map((o, i) => {
            const who = (m.pollVotes ?? []).filter((v) => v.options.includes(i));
            return (
              <View key={i} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{o}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{counts[i]} vote{counts[i] > 1 ? "s" : ""}</Text>
                </View>
                {who.length ? (
                  who.map((v) => (
                    <View key={v.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 }}>
                      <Avatar user={v.userId === "me" ? useWippStore.getState().me : users[v.userId] ?? { displayName: "?" }} size={30} />
                      <Text style={{ color: colors.fg, fontSize: 14 }}>{name(v.userId)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Personne</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

/**
 * « La conférence est terminée » — shown to everyone when the organizer ends the live.
 * Participants: optional 1–5 stars and comment (one review each, editable). Organizer: the numbers, no form.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCheck, Star } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { errorText } from "../lib/error-fr";
import type { LiveSummary } from "../lib/event-live";

const GOLD = "#e3c068";
const CARD = "#1f2638";

export function LiveEndScreen({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [sum, setSum] = useState<LiveSummary | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void import("../lib/event-live")
      .then(({ liveSummary }) => liveSummary(eventId))
      .then((s) => {
        setSum(s);
        if (s.myReview) {
          setRating(s.myReview.rating);
          setText(s.myReview.text);
        }
      })
      .catch(() => setSum(null));
  }, [eventId]);

  async function send() {
    if (busy || (rating == null && !text.trim())) return;
    setBusy(true);
    try {
      const { saveLiveReview } = await import("../lib/event-live");
      await saveLiveReview(eventId, rating, text);
      setSent(true);
    } catch (err) {
      Alert.alert("Avis", errorText(err, "Avis non envoyé."));
    } finally {
      setBusy(false);
    }
  }

  const can = rating != null || text.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#111725" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 36, paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: "#262d42", alignItems: "center", justifyContent: "center" }}>
            <CheckCheck size={28} color={GOLD} />
          </View>
          <Text style={{ marginTop: 18, color: "#fff", fontSize: 24, textAlign: "center", fontFamily: "Inter_700Bold" }}>
            {sum?.isOwner ? "Ta conférence est terminée" : "La conférence est terminée"}
          </Text>
          <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.7)", textAlign: "center", fontSize: 15 }}>
            {sum?.isOwner ? "Bravo, et merci d’avoir animé ce direct !" : "Merci d’avoir participé !"}
          </Text>

          {!sum ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={GOLD} />
          ) : (
            <View style={{ marginTop: 22, borderRadius: 18, backgroundColor: CARD, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar user={{ displayName: sum.organizer.name, avatar: sum.organizer.avatar ?? undefined }} size={46} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" }}>{sum.title}</Text>
                  <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>Animée par {sum.organizer.name}</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 14 }} />

              {sum.isOwner && sum.stats ? (
                <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                  <Stat value={String(sum.stats.attendees)} label={sum.stats.attendees > 1 ? "participants" : "participant"} />
                  <Stat value={String(sum.stats.questions)} label={sum.stats.questions > 1 ? "questions" : "question"} />
                  <Stat value={sum.stats.average != null ? `${sum.stats.average} ★` : "—"} label={`${sum.stats.reviews} avis`} />
                </View>
              ) : sum.canReview ? (
                sent ? (
                  <Text style={{ color: GOLD, textAlign: "center", paddingVertical: 12, fontFamily: "Inter_600SemiBold" }}>✓ Merci pour ton avis !</Text>
                ) : (
                  <>
                    <Text style={{ color: "#fff", textAlign: "center", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Qu’as-tu pensé de cette conférence ?</Text>
                    <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 10 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Press key={n} accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""}`} onPress={() => setRating(rating === n ? null : n)} style={{ padding: 2 }}>
                          <Star size={30} color={rating && n <= rating ? GOLD : "rgba(255,255,255,0.45)"} fill={rating && n <= rating ? GOLD : "transparent"} />
                        </Press>
                      ))}
                    </View>
                    <TextInput
                      value={text}
                      onChangeText={(v) => setText(v.slice(0, 500))}
                      placeholder="Laisse un commentaire à l’organisateur…"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      multiline
                      style={{ marginTop: 12, minHeight: 84, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", color: "#fff", padding: 12, fontSize: 15, textAlignVertical: "top" }}
                    />
                    <Press disabled={!can || busy} onPress={() => void send()} style={{ marginTop: 10, height: 48, borderRadius: 24, backgroundColor: can ? "#3a4258" : "#2a3142", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: can ? "#fff" : "rgba(255,255,255,0.45)", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{busy ? "Envoi…" : sum.myReview ? "Modifier mon avis" : "Envoyer mon avis"}</Text>
                    </Press>
                    <Press onPress={onBack} style={{ alignSelf: "center", padding: 10 }}>
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Passer</Text>
                    </Press>
                  </>
                )
              ) : (
                <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", fontSize: 13 }}>Il n’y a pas de rediffusion. À bientôt sur WIPP !</Text>
              )}
            </View>
          )}

          <Press onPress={onBack} style={{ marginTop: 18, height: 54, borderRadius: 16, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#111725", fontSize: 16, fontFamily: "Inter_700Bold" }}>Retour aux événements</Text>
          </Press>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: GOLD, fontSize: 22, fontFamily: "Inter_700Bold" }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

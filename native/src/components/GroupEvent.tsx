import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { CalendarDays, Clock, MapPin } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Btn, Press } from "./ui";
import { Sheet } from "./card-editor-parts";
import { CalendarSheet, TimeSheet, dayLabel, hhmm } from "./event-parts";
import { colors } from "../theme";
import { useWippStore } from "../lib/store";
import type { Message, User } from "../lib/types";

type Rsvp = "going" | "maybe" | "no";
const MONTHS_SHORT = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const LABELS: Record<Rsvp, string> = { going: "J’y vais", maybe: "Peut-être", no: "Non" };

const at = (day: Date, t: string) => {
  const d = new Date(day);
  const [h, m] = t.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const t24 = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** « Créer un événement » : titre, date, heure de début (et de fin), lieu, description. */
export function CreateEventSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (ev: NonNullable<Message["groupEvent"]>) => void }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState<Date | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [picker, setPicker] = useState<"day" | "time" | null>(null);

  const startsAt = day && start ? at(day, start) : null;
  const endsAt = day && start && end ? at(day, end) : null;
  const past = Boolean(startsAt && startsAt.getTime() < Date.now() - 60_000);
  const ready = title.trim().length > 0 && Boolean(startsAt) && !past;

  const reset = () => {
    setTitle("");
    setDay(null);
    setStart("");
    setEnd("");
    setPlace("");
    setDescription("");
  };

  const input = { minHeight: 46, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.fg, backgroundColor: colors.surface2, fontSize: 15 } as const;
  const pickRow = (Icon: typeof Clock, text: string, empty: boolean, onPress: () => void) => (
    <Press onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 10, ...input }}>
      <Icon size={18} color={colors.accent} />
      <Text style={{ color: empty ? colors.muted : colors.fg, fontSize: 15 }}>{text}</Text>
    </Press>
  );

  return (
    <Sheet open={open} title="Créer un événement" onClose={onClose}>
      <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 120))} placeholder="Nom de l’événement" placeholderTextColor={colors.muted} style={input} />
          {pickRow(CalendarDays, day ? dayLabel(day) : "Choisir la date", !day, () => setPicker("day"))}
          {pickRow(Clock, start ? (end ? `${start.replace(":", "h")} – ${end.replace(":", "h")}` : `À ${start.replace(":", "h")}`) : "Choisir l’heure", !start, () => (day ? setPicker("time") : setPicker("day")))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, ...input, paddingVertical: 0 }}>
            <MapPin size={18} color={colors.accent} />
            <TextInput value={place} onChangeText={(v) => setPlace(v.slice(0, 200))} placeholder="Lieu (facultatif)" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.fg, fontSize: 15, paddingVertical: 12 }} />
          </View>
          <TextInput
            value={description}
            onChangeText={(v) => setDescription(v.slice(0, 1000))}
            placeholder="Description (facultatif)"
            placeholderTextColor={colors.muted}
            multiline
            style={[input, { minHeight: 80, textAlignVertical: "top" }]}
          />
        </View>
        {past ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>Choisis une date et une heure à venir.</Text> : null}
        <View style={{ marginTop: 14 }}>
          <Btn
            label="Envoyer l’événement"
            disabled={!ready}
            onPress={() => {
              if (!startsAt) return;
              onSend({
                title: title.trim(),
                startsAt: startsAt.getTime(),
                endsAt: endsAt && endsAt > startsAt ? endsAt.getTime() : undefined,
                place: place.trim() || undefined,
                description: description.trim() || undefined,
              });
              reset();
            }}
          />
        </View>
      </ScrollView>
      {/* Rendered inside the sheet so iOS can stack them on top of it. */}
      <CalendarSheet
        open={picker === "day"}
        value={day}
        onClose={() => setPicker(null)}
        onPick={(d) => {
          setDay(d);
          setPicker("time");
        }}
      />
      <TimeSheet
        open={picker === "time"}
        start={start || (startsAt ? t24(startsAt) : "19:00")}
        end={end}
        title="Heure de l’événement"
        onClose={() => setPicker(null)}
        onSave={(a, b) => {
          setStart(a);
          setEnd(b && b > a ? b : "");
          setPicker(null);
        }}
      />
    </Sheet>
  );
}

/** Event inside a message bubble: date badge, details, « J’y vais / Peut-être / Non », who answered what. */
export function EventBubble({ chatId, m, users, onMe, fg, muted, accent }: { chatId: string; m: Message; users: Record<string, User>; onMe: boolean; fg: string; muted: string; accent: string }) {
  const [details, setDetails] = useState(false);
  const ev = m.groupEvent;
  if (!ev) return null;
  const start = new Date(ev.startsAt);
  const end = ev.endsAt ? new Date(ev.endsAt) : null;
  const finished = (ev.endsAt ?? ev.startsAt + 3 * 3_600_000) < Date.now();
  const rsvps = m.rsvps ?? [];
  const mine = rsvps.find((r) => r.userId === "me")?.status;
  const count = (s: Rsvp) => rsvps.filter((r) => r.status === s).length;
  const canAnswer = chatId.startsWith("srv:") && m.status !== "sending" && m.status !== "failed" && !finished;

  const answer = (s: Rsvp) => {
    if (!canAnswer) return;
    const next = mine === s ? null : s;
    const before = rsvps;
    const after = [...before.filter((r) => r.userId !== "me"), ...(next ? [{ userId: "me", status: next }] : [])];
    const patch = (list: Message["rsvps"]) =>
      useWippStore.setState((st) => ({
        messages: { ...st.messages, [chatId]: (st.messages[chatId] ?? []).map((x) => (x.id === m.id ? { ...x, rsvps: list } : x)) },
      }));
    patch(after);
    void import("../lib/lot7/api")
      .then(({ rsvpEvent }) => rsvpEvent(m.id, next))
      .catch(() => {
        patch(before);
        Alert.alert("Événement", "Ta réponse n’a pas pu être enregistrée.");
      });
  };

  const name = (id: string) => (id === "me" ? "Toi" : users[id]?.displayName || (users[id]?.username ? `@${users[id]!.username}` : "Membre"));
  const when = `${DAYS[start.getDay()]} ${dayLabel(start)} · ${hhmm(start)}${end ? ` – ${hhmm(end)}` : ""}`;

  return (
    <View style={{ minWidth: 240, paddingVertical: 2 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 52, borderRadius: 12, overflow: "hidden", backgroundColor: onMe ? "rgba(0,0,0,0.18)" : colors.surface2, alignItems: "center" }}>
          <View style={{ alignSelf: "stretch", backgroundColor: accent, paddingVertical: 2, alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: onMe ? "#000" : colors.accentFg, fontFamily: "Inter_700Bold" }}>{MONTHS_SHORT[start.getMonth()]}</Text>
          </View>
          <Text style={{ fontSize: 22, color: fg, fontFamily: "Inter_700Bold", paddingVertical: 4 }}>{start.getDate()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: muted }}>{finished ? "Événement terminé" : "Événement"}</Text>
          <Text style={{ fontSize: 16, color: fg, fontFamily: "Inter_600SemiBold" }}>{ev.title}</Text>
          <Text style={{ marginTop: 2, fontSize: 13, color: muted }}>{when}</Text>
          {ev.place ? (
            <View style={{ marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MapPin size={12} color={muted} />
              <Text style={{ flex: 1, fontSize: 13, color: muted }}>{ev.place}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {ev.description ? <Text style={{ marginTop: 8, fontSize: 14, color: fg }}>{ev.description}</Text> : null}
      <View style={{ marginTop: 12, flexDirection: "row", gap: 6, opacity: canAnswer ? 1 : 0.55 }}>
        {(["going", "maybe", "no"] as Rsvp[]).map((s) => {
          const on = mine === s;
          return (
            <Press
              key={s}
              disabled={!canAnswer}
              onPress={() => answer(s)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: on ? accent : onMe ? "rgba(0,0,0,0.14)" : colors.surface2 }}
            >
              <Text style={{ fontSize: 13, color: on ? (onMe ? "#000" : colors.accentFg) : fg, fontFamily: "Inter_600SemiBold" }}>{LABELS[s]}</Text>
              <Text style={{ fontSize: 11, color: on ? (onMe ? "#000" : colors.accentFg) : muted }}>{count(s)}</Text>
            </Press>
          );
        })}
      </View>
      <Press onPress={() => setDetails(true)} style={{ marginTop: 10, alignItems: "center", paddingVertical: 4 }}>
        <Text style={{ fontSize: 13, color: accent, fontFamily: "Inter_600SemiBold" }}>{rsvps.length ? `Voir les réponses · ${rsvps.length}` : "Aucune réponse pour l’instant"}</Text>
      </Press>
      <Sheet open={details} title={ev.title} onClose={() => setDetails(false)}>
        <ScrollView style={{ maxHeight: 480 }}>
          {(["going", "maybe", "no"] as Rsvp[]).map((s) => {
            const who = rsvps.filter((r) => r.status === s);
            return (
              <View key={s} style={{ marginBottom: 14 }}>
                <Text style={{ color: s === "going" ? colors.accent : colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 }}>
                  {LABELS[s]} · {who.length}
                </Text>
                {who.length ? (
                  who.map((r) => (
                    <View key={r.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 }}>
                      <Avatar user={r.userId === "me" ? useWippStore.getState().me : users[r.userId] ?? { displayName: "?" }} size={30} />
                      <Text style={{ color: colors.fg, fontSize: 14 }}>{name(r.userId)}</Text>
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

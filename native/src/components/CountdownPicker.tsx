import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { countdownChoices, type SurpriseOptions } from "../lib/surprise";
import { colors } from "../theme";
import { Press } from "./ui";
import { tr } from "../lib/tr";

type Value = NonNullable<SurpriseOptions["countdown"]>;

const DAYS = 14;
const MINUTES = [0, 15, 30, 45];
const two = (n: number) => String(n).padStart(2, "0");

function dayStart(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
const dayLabel = (offset: number) =>
  offset === 0 ? "Aujourd’hui" : offset === 1 ? "Demain" : dayStart(offset).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function Chip({ label, on, onPress, wide }: { label: string; on: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Press
      onPress={onPress}
      style={{
        minWidth: wide ? 0 : 52,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? "#485160" : "#303746",
        borderWidth: 1,
        borderColor: on ? colors.surpriseGold : colors.hair,
      }}
    >
      <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{label}</Text>
    </Press>
  );
}

/** When the locked parcel opens: a short wait, tonight at midnight, or a day and a time. */
export function CountdownPicker({ value, onChange }: { value: Value; onChange: (value: Value) => void }) {
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(() => Math.min(23, new Date().getHours() + 1));
  const [minute, setMinute] = useState(0);
  const midnight = dayStart(1).getTime();
  const custom = Boolean(value.at) && value.at !== midnight;

  function pick(nextDay: number, nextHour: number, nextMinute: number) {
    setDay(nextDay);
    setHour(nextHour);
    setMinute(nextMinute);
    const at = dayStart(nextDay);
    at.setHours(nextHour, nextMinute, 0, 0);
    onChange({ seconds: Math.max(60, Math.round((at.getTime() - Date.now()) / 1000)), at: at.getTime() });
  }

  const past = Boolean(value.at) && value.at! <= Date.now() + 30_000;
  const when = value.at
    ? new Date(value.at).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <View>
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.fg, marginBottom: 4 }}>{tr("Quand le paquet s’ouvre")}</Text>
      <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>{tr("Il reste verrouillé jusque-là, puis la personne le touche pour l’ouvrir.")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {countdownChoices.map((choice) => (
          <Chip key={choice.seconds} wide label={tr("Dans {0}", choice.label)} on={!value.at && value.seconds === choice.seconds} onPress={() => onChange({ seconds: choice.seconds })} />
        ))}
        <Chip wide label={tr("Ce soir à minuit")} on={value.at === midnight} onPress={() => onChange({ seconds: Math.max(60, Math.round((midnight - Date.now()) / 1000)), at: midnight })} />
      </View>

      <Text style={{ marginTop: 18, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.fg, marginBottom: 8 }}>{tr("Ou choisis le jour et l’heure")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {Array.from({ length: DAYS }, (_, offset) => (
          <Chip key={offset} wide label={dayLabel(offset)} on={custom && day === offset} onPress={() => pick(offset, hour, minute)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginTop: 8 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <Chip key={h} label={`${two(h)} h`} on={custom && hour === h} onPress={() => pick(day, h, minute)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {MINUTES.map((m) => (
          <Chip key={m} label={`:${two(m)}`} on={custom && minute === m} onPress={() => pick(day, hour, m)} />
        ))}
      </View>

      {when ? (
        <Text style={{ marginTop: 14, fontSize: 13, color: past ? "#FF8A8A" : colors.surpriseBright }}>
          {past ? tr("Cette heure est déjà passée : choisis un moment plus tard.") : tr("S’ouvrira {0}.", when)}
        </Text>
      ) : null}
    </View>
  );
}

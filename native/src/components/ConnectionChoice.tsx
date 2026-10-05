import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Press } from "./ui";
import { colors } from "../theme";
import { durationLabel } from "../lib/connections";
import type { ConnectionChoice } from "../lib/types";

/** 15 min, 1 h, 24 h, 7 jours — the server re-validates everything (15 min … 30 jours). */
export const PRESETS = [15, 60, 1440, 10080] as const;
const MIN = 15;
const MAX = 30 * 24 * 60;
const UNITS = [
  { id: "min", label: "minutes", factor: 1 },
  { id: "h", label: "heures", factor: 60 },
  { id: "d", label: "jours", factor: 1440 },
] as const;

/**
 * ♾️ Permanent / ⏳ Éphémère + duration. `ephemeralOnly` hides the type row (ephemeral QR).
 * Calls onChange with a valid choice, or null while the custom duration is out of bounds.
 */
export function ConnectionChoicePicker({
  value,
  onChange,
  ephemeralOnly,
}: {
  value: ConnectionChoice | null;
  onChange: (c: ConnectionChoice | null) => void;
  ephemeralOnly?: boolean;
}) {
  const type = ephemeralOnly ? "ephemeral" : value?.type ?? "permanent";
  const minutes = value?.type === "ephemeral" ? value.minutes : 1440;
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("3");
  const [unit, setUnit] = useState<(typeof UNITS)[number]["id"]>("d");

  function setCustomValue(a: string, u: (typeof UNITS)[number]["id"]) {
    const n = Math.round(Number(a.replace(",", ".")) * (UNITS.find((x) => x.id === u)?.factor ?? 1));
    onChange(Number.isFinite(n) && n >= MIN && n <= MAX ? { type: "ephemeral", minutes: n } : null);
  }

  const chip = (active: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: active ? colors.accent : colors.navy,
    borderWidth: 1,
    borderColor: active ? colors.accent : colors.hair,
  });

  return (
    <View style={{ gap: 12 }}>
      {!ephemeralOnly ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(
            [
              ["permanent", "♾️", "Permanent", "Sans date de fin"],
              ["ephemeral", "⏳", "Éphémère", "Pour une durée choisie"],
            ] as const
          ).map(([id, icon, title, sub]) => (
            <Press
              key={id}
              onPress={() => onChange(id === "permanent" ? { type: "permanent" } : { type: "ephemeral", minutes })}
              style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: type === id ? "rgba(255,216,77,0.14)" : colors.navy, borderWidth: 1, borderColor: type === id ? colors.accent : colors.hair }}
            >
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <Text style={{ marginTop: 4, color: colors.fg, fontFamily: "Inter_700Bold" }}>{title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{sub}</Text>
            </Press>
          ))}
        </View>
      ) : null}
      {type === "ephemeral" ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Combien de temps souhaitez-vous rester connectés ?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {PRESETS.map((m) => (
              <Press
                key={m}
                onPress={() => {
                  setCustom(false);
                  onChange({ type: "ephemeral", minutes: m });
                }}
                style={chip(!custom && minutes === m)}
              >
                <Text style={{ color: !custom && minutes === m ? colors.accentFg : colors.fg, fontFamily: "Inter_600SemiBold" }}>{durationLabel(m)}</Text>
              </Press>
            ))}
            <Press
              onPress={() => {
                setCustom(true);
                setCustomValue(amount, unit);
              }}
              style={chip(custom)}
            >
              <Text style={{ color: custom ? colors.accentFg : colors.fg, fontFamily: "Inter_600SemiBold" }}>Personnalisé</Text>
            </Press>
          </View>
          {custom ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={amount}
                  onChangeText={(v) => {
                    const clean = v.replace(/[^\d.,]/g, "").slice(0, 5);
                    setAmount(clean);
                    setCustomValue(clean, unit);
                  }}
                  keyboardType="numeric"
                  style={{ width: 72, height: 44, borderRadius: 12, backgroundColor: colors.navy, color: colors.fg, textAlign: "center", fontSize: 16 }}
                />
                {UNITS.map((u) => (
                  <Press
                    key={u.id}
                    onPress={() => {
                      setUnit(u.id);
                      setCustomValue(amount, u.id);
                    }}
                    style={{ ...chip(unit === u.id), paddingHorizontal: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ color: unit === u.id ? colors.accentFg : colors.fg, fontSize: 13 }}>{u.label}</Text>
                  </Press>
                ))}
              </View>
              <Text style={{ color: value ? colors.muted : colors.danger, fontSize: 12 }}>
                {value?.type === "ephemeral" ? `Durée : ${durationLabel(value.minutes)}` : "Entre 15 minutes et 30 jours."}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function choiceLabel(c: ConnectionChoice) {
  return c.type === "permanent" ? "♾️ Contact permanent" : `⏳ Contact éphémère · ${durationLabel(c.minutes)}`;
}

import { useEffect, useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight, Clock, Heart, MapPin } from "lucide-react-native";
import { Press } from "./ui";
import { colors } from "../theme";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
const WEEK = ["L", "M", "M", "J", "V", "S", "D"];

export function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export function dayLabel(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Press onPress={onClose} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Press onPress={() => undefined} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 30 }}>
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 12 }} />
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 17, marginBottom: 12 }}>{title}</Text>
          {children}
        </Press>
      </Press>
    </Modal>
  );
}

/** Month calendar: past days are disabled. */
export function CalendarSheet({ open, value, onClose, onPick }: { open: boolean; value: Date | null; onClose: () => void; onPick: (d: Date) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(() => new Date((value ?? today).getFullYear(), (value ?? today).getMonth(), 1));
  useEffect(() => {
    if (open) setMonth(new Date((value ?? today).getFullYear(), (value ?? today).getMonth(), 1));
    // Reset to the selected month each time the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const first = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
  return (
    <BottomSheet open={open} title="Date de l’événement" onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Press disabled={!canPrev} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ padding: 8, opacity: canPrev ? 1 : 0.3 }}>
          <ChevronLeft size={22} color={colors.fg} />
        </Press>
        <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
        <Press onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ padding: 8 }}>
          <ChevronRight size={22} color={colors.fg} />
        </Press>
      </View>
      <View style={{ flexDirection: "row" }}>
        {WEEK.map((w, i) => (
          <Text key={`${w}${i}`} style={{ flex: 1, textAlign: "center", color: colors.muted, fontSize: 12, marginBottom: 6 }}>{w}</Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const date = new Date(month.getFullYear(), month.getMonth(), d);
          const past = date < today;
          const sel = value && date.toDateString() === value.toDateString();
          return (
            <Press key={d} disabled={past} onPress={() => onPick(date)} style={{ width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.accent : "transparent", borderWidth: date.getTime() === today.getTime() && !sel ? 1 : 0, borderColor: colors.accent }}>
                <Text style={{ color: sel ? colors.accentFg : past ? "rgba(249,250,251,0.25)" : colors.fg, fontFamily: sel ? "Inter_700Bold" : undefined }}>{d}</Text>
              </View>
            </Press>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const TIMES = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);

/** Start time and optional end time, by quarter hour. */
export function TimeSheet({ open, start, end, single, title = "Heure", onClose, onSave }: { open: boolean; start: string; end: string; single?: boolean; title?: string; onClose: () => void; onSave: (start: string, end: string) => void }) {
  const [a, setA] = useState(start || "20:00");
  const [b, setB] = useState(end);
  useEffect(() => {
    if (open) {
      setA(start || "20:00");
      setB(end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const ROW = 38;
  const column = (value: string, set: (v: string) => void, allowNone: boolean) => (
    <View style={{ height: ROW * 5, borderRadius: 12, overflow: "hidden", backgroundColor: colors.navy }}>
      <ScrollView
        nestedScrollEnabled
        ref={(r) => {
          const idx = value ? TIMES.indexOf(value) + (allowNone ? 1 : 0) : 0;
          if (r) requestAnimationFrame(() => r.scrollTo({ y: Math.max(0, idx - 2) * ROW, animated: false }));
        }}
      >
        {(allowNone ? ["", ...TIMES] : TIMES).map((t) => (
          <Press key={t || "none"} onPress={() => set(t)} style={{ height: ROW, alignItems: "center", justifyContent: "center", backgroundColor: value === t ? "rgba(255,216,77,0.18)" : "transparent" }}>
            <Text style={{ color: value === t ? colors.accent : colors.fg, fontSize: 16, fontFamily: value === t ? "Inter_600SemiBold" : undefined }}>{t || "Pas de fin"}</Text>
          </Press>
        ))}
      </ScrollView>
    </View>
  );
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>{single ? "Heure de publication" : "Début"}</Text>
          {column(a, setA, false)}
        </View>
        {single ? null : (
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Fin (facultative)</Text>
            {column(b, setB, true)}
          </View>
        )}
      </View>
      <Press onPress={() => onSave(a, b)} style={{ marginTop: 16, height: 50, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold", fontSize: 16 }}>Valider</Text>
      </Press>
    </BottomSheet>
  );
}

/** Explorer event card: big photo, date badge, price badge, time and city. */
export function EventCard({
  title,
  subtitle,
  image,
  starts,
  ends,
  city,
  online,
  priceLabel,
  saved,
  onPress,
  onSave,
}: {
  title: string;
  subtitle?: string;
  image?: { uri: string } | number | null;
  starts?: Date | null;
  ends?: Date | null;
  city: string;
  online?: boolean;
  priceLabel: string;
  saved?: boolean;
  onPress: () => void;
  onSave?: () => void;
}) {
  return (
    <Press onPress={onPress} style={{ height: 200, marginBottom: 14, borderRadius: 18, overflow: "hidden", backgroundColor: colors.navy, borderWidth: 1, borderColor: "rgba(255,216,77,0.25)" }}>
      {image ? <Image source={image} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : null}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "75%", backgroundColor: "rgba(0,0,0,0.45)" }} />
      {starts ? (
        <View style={{ position: "absolute", top: 0, left: 0, paddingHorizontal: 14, paddingVertical: 8, borderBottomRightRadius: 16, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center" }}>
          <Text style={{ color: colors.fg, fontSize: 26, lineHeight: 28, fontFamily: "Inter_800ExtraBold" }}>{starts.getDate()}</Text>
          <Text style={{ color: colors.accent, fontSize: 13, fontFamily: "Inter_700Bold" }}>{MONTHS_SHORT[starts.getMonth()]}</Text>
        </View>
      ) : null}
      <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accent }}>
          <Text style={{ color: colors.accentFg, fontSize: 13, fontFamily: "Inter_700Bold" }}>{priceLabel}</Text>
        </View>
        {onSave ? (
          <Press accessibilityLabel="Enregistrer" onPress={onSave} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color={saved ? colors.accent : colors.fg} fill={saved ? colors.accent : "transparent"} />
          </Press>
        ) : null}
      </View>
      <View style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
        <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 19, fontFamily: "Inter_800ExtraBold", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={{ marginTop: 2, color: "rgba(249,250,251,0.8)", fontSize: 13 }}>{subtitle}</Text> : null}
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 14 }}>
          {starts ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Clock size={14} color={colors.accent} />
              <Text style={{ color: colors.fg, fontSize: 12 }}>{hhmm(starts)}{ends ? ` - ${hhmm(ends)}` : ""}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
            <MapPin size={14} color={colors.accent} />
            <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 12 }}>{online ? "En ligne" : city || "Lieu à préciser"}</Text>
          </View>
        </View>
      </View>
    </Press>
  );
}

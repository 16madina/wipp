import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Check, ChevronDown, Clock, MapPin, Search } from "lucide-react-native";
import { Press } from "./ui";
import { colors } from "../theme";
import { flagUri, type Country } from "../lib/countries";
import { WORLD_COUNTRIES } from "../lib/countries-world";

// Browsers add an orange focus ring to inputs on web; the field background is enough.
const noOutline = (Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {}) as object;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function FlagImage({ id, size = 18 }: { id: string; size?: number }) {
  return <Image source={{ uri: flagUri(id) }} style={{ width: size * 1.4, height: size, borderRadius: 3 }} contentFit="cover" />;
}

/** Tappable field that looks like the other inputs (label + value + chevron). */
export function SelectField({ label, value, placeholder, left, onPress }: { label: string; value?: string | null; placeholder: string; left?: React.ReactNode; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={{ borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
        {left}
        <Text numberOfLines={1} style={{ flex: 1, color: value ? colors.fg : colors.muted, fontSize: 15 }}>{value || placeholder}</Text>
        <ChevronDown size={18} color={colors.muted} />
      </View>
    </Press>
  );
}

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      {/* The sheet rises above the keyboard so the field being typed in stays visible. */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Press onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Press onPress={() => undefined} style={{ maxHeight: "82%", backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 28 }}>
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 12 }} />
          <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 }}>{title}</Text>
          {children}
        </Press>
      </Press>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 12, height: 44, marginBottom: 8 }}>
      <Search size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} autoCorrect={false} style={{ flex: 1, color: colors.fg, fontSize: 15, ...noOutline }} />
    </View>
  );
}

/** Every country of the world, with flags and search. */
export function WorldCountrySheet({ open, selectedId, onClose, onPick }: { open: boolean; selectedId?: string; onClose: () => void; onPick: (c: Country) => void }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return WORLD_COUNTRIES;
    return WORLD_COUNTRIES.filter((c) => norm(c.fr).includes(n) || norm(c.en).includes(n) || c.dial.includes(n));
  }, [q]);
  return (
    <Sheet open={open} title="Choisir un pays" onClose={onClose}>
      <SearchBox value={q} onChange={setQ} placeholder="Rechercher un pays ou un indicatif" />
      <ScrollView keyboardShouldPersistTaps="handled">
        {rows.map((c) => (
          <Press
            key={c.id}
            onPress={() => {
              onPick(c);
              setQ("");
              onClose();
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 }}
          >
            <FlagImage id={c.id} />
            <Text style={{ flex: 1, color: colors.fg, fontSize: 15 }}>{c.fr}</Text>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{c.dial}</Text>
            {c.id === selectedId ? <Check size={18} color={colors.accent} /> : null}
          </Press>
        ))}
      </ScrollView>
    </Sheet>
  );
}

/** Searchable category list; "Autre" lets the owner type their own. */
export function CategorySheet({ open, categories, selected, onClose, onPick }: { open: boolean; categories: readonly string[]; selected: string; onClose: () => void; onPick: (c: string) => void }) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");
  const rows = useMemo(() => {
    const n = norm(q.trim());
    return n ? categories.filter((c) => norm(c).includes(n)) : categories;
  }, [q, categories]);
  const pick = (c: string) => {
    onPick(c);
    setQ("");
    setCustom("");
    onClose();
  };
  return (
    <Sheet open={open} title="Catégorie de ton activité" onClose={onClose}>
      <SearchBox value={q} onChange={setQ} placeholder="Rechercher (ex. coiffure, traiteur…)" />
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 }}>
          {rows.filter((c) => c !== "Autre").map((c) => (
            <Press key={c} onPress={() => pick(c)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: selected === c ? colors.accent : colors.navy }}>
              <Text style={{ color: selected === c ? colors.accentFg : colors.fg, fontSize: 14 }}>{c}</Text>
            </Press>
          ))}
        </View>
        <Text style={{ marginTop: 12, color: colors.muted, fontSize: 12 }}>Tu ne trouves pas ? Écris ta catégorie :</Text>
        <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder="Ex. Location de voitures"
            placeholderTextColor={colors.muted}
            maxLength={60}
            style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 12, color: colors.fg, fontSize: 15, ...noOutline }}
          />
          <Press disabled={!custom.trim()} onPress={() => pick(custom.trim())} style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: custom.trim() ? colors.accent : colors.navy, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: custom.trim() ? colors.accentFg : colors.muted, fontFamily: "Inter_600SemiBold" }}>OK</Text>
          </Press>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/** "Lun–Ven" for consecutive days, "Lun, Mer, Ven" otherwise. */
function daysLabel(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "Tous les jours";
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) return `${DAYS[sorted[0]]}–${DAYS[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAYS[d]).join(", ");
}

/** Pick opening days and hours; stored as text like "Lun–Ven · 09:00–18:00". */
export function HoursSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (value: string | null) => void }) {
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("18:00");
  const [lines, setLines] = useState<string[]>([]);
  const current = days.length ? `${daysLabel(days)} · ${from}–${to}` : "";
  const toggle = (d: number) => setDays((x) => (x.includes(d) ? x.filter((v) => v !== d) : [...x, d]));
  const ROW = 36;
  const column = (value: string, set: (v: string) => void) => (
    <View style={{ height: ROW * 5, borderRadius: 12, overflow: "hidden", backgroundColor: colors.navy }}>
    <ScrollView
      nestedScrollEnabled
      // Open on the selected time (contentOffset is ignored on web).
      ref={(r) => {
        if (r) requestAnimationFrame(() => r.scrollTo({ y: Math.max(0, TIMES.indexOf(value) - 2) * ROW, animated: false }));
      }}
    >
      {TIMES.map((t) => (
        <Press key={t} onPress={() => set(t)} style={{ height: ROW, alignItems: "center", justifyContent: "center", backgroundColor: value === t ? "rgba(255,216,77,0.18)" : "transparent" }}>
          <Text style={{ color: value === t ? colors.accent : colors.fg, fontSize: 16, fontFamily: value === t ? "Inter_600SemiBold" : undefined }}>{t}</Text>
        </Press>
      ))}
    </ScrollView>
    </View>
  );
  return (
    <Sheet open={open} title="Horaires d’ouverture" onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>Jours</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {DAYS.map((d, i) => (
            <Press key={d} onPress={() => toggle(i)} style={{ flex: 1, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: days.includes(i) ? colors.accent : colors.navy }}>
              <Text style={{ color: days.includes(i) ? colors.accentFg : colors.fg, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{d}</Text>
            </Press>
          ))}
        </View>
        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Ouverture</Text>
            {column(from, setFrom)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Fermeture</Text>
            {column(to, setTo)}
          </View>
        </View>
        <Press
          disabled={!current}
          onPress={() => setLines((l) => [...l, current])}
          style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,216,77,0.5)" }}
        >
          <Clock size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>Ajouter « {current || "choisis des jours"} »</Text>
        </Press>
        {lines.length ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            {lines.map((l, i) => (
              <View key={`${l}-${i}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: colors.fg }}>{l}</Text>
                <Press onPress={() => setLines((x) => x.filter((_, j) => j !== i))}>
                  <Text style={{ color: colors.muted }}>Retirer</Text>
                </Press>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ marginTop: 10, color: colors.muted, fontSize: 12 }}>Horaires différents le week-end ? Ajoute une ligne par groupe de jours.</Text>
        )}
        <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
          <Press onPress={() => { onSave(null); onClose(); }} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.fg }}>Effacer</Text>
          </Press>
          <Press
            onPress={() => {
              const all = lines.length ? lines : current ? [current] : [];
              onSave(all.length ? all.join(" ; ") : null);
              setLines([]);
              onClose();
            }}
            style={{ flex: 2, height: 48, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold" }}>Valider</Text>
          </Press>
        </View>
      </ScrollView>
    </Sheet>
  );
}

/** Phone input with the selected country's calling code as a fixed prefix. */
export function DialPhoneField({ country, value, onChange }: { country: Country; value: string; onChange: (full: string | null) => void }) {
  const local = value.startsWith(country.dial) ? value.slice(country.dial.length).trim() : value.replace(/^\+\d+\s*/, "");
  return (
    <View style={{ borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>Téléphone professionnel (facultatif)</Text>
      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <FlagImage id={country.id} size={16} />
        <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{country.dial}</Text>
        <TextInput
          value={local}
          onChangeText={(v) => {
            const digits = v.replace(/[^\d ]/g, "");
            onChange(digits.trim() ? `${country.dial} ${digits.trim()}` : null);
          }}
          keyboardType="phone-pad"
          placeholder="Numéro de la boutique"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.fg, fontSize: 15, padding: 0, ...noOutline }}
        />
      </View>
    </View>
  );
}

type AddressHit = { id: string; line: string; detail: string; city: string; lat?: number; lng?: number };

/** OpenStreetMap address search (Photon): free, worldwide, filtered to the chosen country. */
async function searchAddresses(q: string, countryId: string, signal: AbortSignal): Promise<AddressHit[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15&lang=fr`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: { geometry?: { coordinates?: [number, number] }; properties: Record<string, string | undefined> }[] };
  const seen = new Set<string>();
  const out: AddressHit[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    if ((p.countrycode ?? "").toUpperCase() !== countryId) continue;
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const line = p.name && p.name !== p.street ? (street ? `${p.name}, ${street}` : p.name) : street || p.name || "";
    const city = p.city || p.town || p.village || p.county || "";
    const detail = [p.district || p.locality, city, p.postcode].filter(Boolean).join(", ");
    const key = `${line}|${detail}`;
    if (!line || seen.has(key)) continue;
    seen.add(key);
    const c = f.geometry?.coordinates;
    out.push({ id: key, line, detail, city, lat: c?.[1], lng: c?.[0] });
    if (out.length >= 6) break;
  }
  return out;
}

/** Address input with suggestions as you type; picking one also fills the city. */
export function AddressField({
  country,
  value,
  onChange,
  onPickCity,
  onPickCoords,
}: {
  country: Country;
  value: string;
  onChange: (v: string | null) => void;
  onPickCity: (city: string) => void;
  onPickCoords?: (lat: number, lng: number) => void;
}) {
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    const q = value.trim();
    if (!focused || picked || q.length < 3) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      setLoading(true);
      void searchAddresses(q, country.id, ctrl.signal)
        .then(setHits)
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [value, country.id, focused, picked]);
  return (
    <View>
      <View style={{ borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 12, color: colors.muted }}>Adresse (facultative)</Text>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MapPin size={16} color={colors.accent} />
          <TextInput
            value={value}
            onChangeText={(v) => {
              setPicked(false);
              onChange(v || null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Commence à taper l’adresse"
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            style={{ flex: 1, color: colors.fg, fontSize: 15, padding: 0, ...noOutline }}
          />
          {loading ? <ActivityIndicator size="small" color={colors.muted} /> : null}
        </View>
      </View>
      {hits.length ? (
        <View style={{ marginTop: 6, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          {hits.map((h, i) => (
            <Press
              key={h.id}
              onPress={() => {
                onChange(h.line);
                if (h.city) onPickCity(h.city);
                if (h.lat != null && h.lng != null) onPickCoords?.(h.lat, h.lng);
                setPicked(true);
                setHits([]);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: "rgba(255,255,255,0.06)" }}
            >
              <MapPin size={16} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 14 }}>{h.line}</Text>
                {h.detail ? <Text numberOfLines={1} style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>{h.detail}</Text> : null}
              </View>
            </Press>
          ))}
          <Text style={{ paddingHorizontal: 14, paddingVertical: 6, color: "rgba(249,250,251,0.35)", fontSize: 10 }}>© OpenStreetMap</Text>
        </View>
      ) : null}
    </View>
  );
}

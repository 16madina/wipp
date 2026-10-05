import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Navigation, Phone, Search } from "lucide-react-native";
import { Btn, Chip, Empty, GlassHeader, Header, Press, ScreenRoot, SearchField } from "../components/ui";
import { getMyPosition, kmBetween, kmLabel, osmTile, type LatLng } from "../lib/geo";
import { wippApi } from "../lib/proximity/wipp-session";
import { useWippStore } from "../lib/store";
import { colors } from "../theme";

/** Same shape as the server (src/lib/pharmacy/places.ts). */
export type PharmacyPlace = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  openNow: boolean | null;
  open24h: boolean;
  nextCloseTime: string | null;
  nextOpenTime: string | null;
  weekdayText: string[];
  website: string | null;
  mapsUri: string | null;
  utcOffsetMinutes?: number | null;
};

type DutyPharmacy = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  dutyUntil: string | null;
  source: string;
};

type Tab = "open" | "duty" | "all";
type Load =
  | { state: "locating" | "loading" }
  | { state: "denied" }
  | { state: "error"; message: string; notConfigured?: boolean }
  | { state: "ready"; places: PharmacyPlace[] };

// Session cache: the user standing still does not trigger new Google calls on re-render / revisit.
let lastResult: { at: number; key: string; places: PharmacyPlace[]; origin: LatLng | null } | null = null;
const CACHE_MS = 10 * 60_000;

/** Time in the PHARMACY's local time (its UTC offset from Google), not the phone's. */
function hhmm(iso: string | null, offsetMin?: number | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (typeof offsetMin !== "number") return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const local = new Date(d.getTime() + offsetMin * 60_000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

function statusOf(p: PharmacyPlace): { label: string; tone: "open" | "closed" | "unknown"; detail: string | null } {
  if (p.open24h) return { label: "Ouverte 24 h/24", tone: "open", detail: null };
  const close = hhmm(p.nextCloseTime, p.utcOffsetMinutes);
  const open = hhmm(p.nextOpenTime, p.utcOffsetMinutes);
  if (p.openNow === true) return { label: "Ouverte maintenant", tone: "open", detail: close ? `Ferme à ${close}` : null };
  if (p.openNow === false) return { label: "Fermée", tone: "closed", detail: open ? `Ouvre à ${open}` : null };
  // Unknown hours are never shown as "closed".
  return { label: "Horaires non communiqués", tone: "unknown", detail: null };
}

function openDirections(lat: number, lng: number, name: string, placeId?: string) {
  const label = encodeURIComponent(name);
  const url =
    Platform.OS === "ios"
      ? `maps://?daddr=${lat},${lng}&q=${label}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${placeId ? `&destination_place_id=${placeId}` : ""}`;
  void Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
}

function call(phone: string) {
  void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`).catch(() => undefined);
}

/** OpenStreetMap mini-map with the user (blue) and pharmacies (gold), like the rest of WIPP. */
function PharmacyMap({ origin, places, onPick }: { origin: LatLng; places: PharmacyPlace[]; onPick: (p: PharmacyPlace) => void }) {
  const zoom = 14;
  const T = 120;
  const W = 5;
  const H = 3;
  const base = osmTile(origin, zoom);
  const toPx = (p: LatLng) => {
    const t = osmTile(p, zoom);
    return { x: (t.x + t.fx - (base.x + base.fx)) * T, y: (t.y + t.fy - (base.y + base.fy)) * T };
  };
  return (
    <View style={{ height: 190, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, marginTop: 12 }}>
      <View style={{ position: "absolute", left: "50%", top: 95, width: T * W, height: T * H, marginLeft: -(2 * T + base.fx * T), marginTop: -(T + base.fy * T) }}>
        {[-1, 0, 1].map((dy) =>
          [-2, -1, 0, 1, 2].map((dx) => (
            <Image
              key={`${dx}${dy}`}
              source={{ uri: `https://tile.openstreetmap.org/${zoom}/${base.x + dx}/${base.y + dy}.png` }}
              style={{ position: "absolute", left: (dx + 2) * T, top: (dy + 1) * T, width: T, height: T, opacity: 0.85 }}
            />
          )),
        )}
      </View>
      {places.slice(0, 15).map((p) => {
        const { x, y } = toPx({ lat: p.lat, lng: p.lng });
        if (Math.abs(x) > 260 || Math.abs(y) > 100) return null;
        return (
          <Press key={p.id} onPress={() => onPick(p)} accessibilityLabel={p.name} style={{ position: "absolute", left: "50%", top: 95, marginLeft: x - 13, marginTop: y - 26 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}>
              <Text style={{ fontSize: 12 }}>💊</Text>
            </View>
          </Press>
        );
      })}
      <View style={{ position: "absolute", left: "50%", top: 95, marginLeft: -8, marginTop: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2F80ED", borderWidth: 3, borderColor: "#fff" }} />
      <Text style={{ position: "absolute", right: 6, bottom: 4, color: "rgba(0,0,0,0.6)", fontSize: 9 }}>© OpenStreetMap</Text>
    </View>
  );
}

function PharmacyCard({ p, origin, duty }: { p: PharmacyPlace; origin: LatLng | null; duty?: DutyPharmacy }) {
  const st = statusOf(p);
  const km = origin ? kmBetween(origin, { lat: p.lat, lng: p.lng }) : null;
  const toneColor = st.tone === "open" ? "#3DDC84" : st.tone === "closed" ? colors.danger : colors.muted;
  return (
    <View style={{ borderRadius: 16, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.hair, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontFamily: "Inter_700Bold" }} numberOfLines={2}>
          {p.name}
        </Text>
        {duty ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,216,77,0.16)" }}>
            <Text style={{ color: colors.accent, fontSize: 11, fontFamily: "Inter_700Bold" }}>🌙 DE GARDE</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: toneColor, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
        {st.tone === "open" ? "🟢 " : st.tone === "closed" ? "🔴 " : "🕐 "}
        {st.label}
        {st.detail ? <Text style={{ color: colors.muted, fontFamily: "Inter_400Regular" }}>{`  ·  ${st.detail}`}</Text> : null}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={2}>
        {km != null ? `📍 ${kmLabel(km)}${p.address ? `  ·  ${p.address}` : ""}` : `📍 ${p.address ?? ""}`}
      </Text>
      {duty ? <Text style={{ color: colors.muted, fontSize: 12 }}>Source vérifiée : {duty.source}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
        <Press onPress={() => openDirections(p.lat, p.lng, p.name, p.id)} style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 40, borderRadius: 12, backgroundColor: colors.accent }}>
          <Navigation size={16} color={colors.accentFg} />
          <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold" }}>Itinéraire</Text>
        </Press>
        {p.phone ? (
          <Press onPress={() => call(p.phone!)} style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.hair }}>
            <Phone size={16} color={colors.fg} />
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Appeler</Text>
          </Press>
        ) : null}
      </View>
    </View>
  );
}

export function PharmaciesScreen() {
  const pop = useWippStore((s) => s.pop);
  const [tab, setTab] = useState<Tab>("open");
  const [origin, setOrigin] = useState<LatLng | null>(lastResult?.origin ?? null);
  // A city search centres the map but distances are only shown from the user's real position.
  const [fromGps, setFromGps] = useState(Boolean(lastResult?.origin));
  const [load, setLoad] = useState<Load>(lastResult ? { state: "ready", places: lastResult.places } : { state: "locating" });
  const [duty, setDuty] = useState<{ loading: boolean; available: boolean; source: string | null; list: DutyPharmacy[] } | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  async function fetchNear(pos: LatLng, force = false) {
    const key = `${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}`;
    if (!force && lastResult && lastResult.key === key && Date.now() - lastResult.at < CACHE_MS) {
      setLoad({ state: "ready", places: lastResult.places });
      return;
    }
    setLoad({ state: "loading" });
    try {
      const r = await wippApi<{ places: PharmacyPlace[] }>(`/places/pharmacies?lat=${pos.lat}&lng=${pos.lng}&lang=fr`);
      lastResult = { at: Date.now(), key, places: r.places, origin: pos };
      setLoad({ state: "ready", places: r.places });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setLoad({ state: "error", message: e.message || "Erreur", notConfigured: e.code === "places_not_configured" });
    }
  }

  async function locate(force = false) {
    setLoad({ state: "locating" });
    const pos = await getMyPosition();
    if (!pos) {
      setLoad({ state: "denied" });
      return;
    }
    setOrigin(pos);
    setFromGps(true);
    await fetchNear(pos, force);
  }

  async function searchText() {
    const q = query.trim();
    if (q.length < 2) return;
    setLoad({ state: "loading" });
    try {
      const r = await wippApi<{ places: PharmacyPlace[] }>(`/places/pharmacies?q=${encodeURIComponent(q)}&lang=fr`);
      const first = r.places[0];
      if (first) setOrigin({ lat: first.lat, lng: first.lng });
      setFromGps(false);
      setLoad({ state: "ready", places: r.places });
    } catch (err) {
      setLoad({ state: "error", message: (err as Error).message || "Erreur" });
    }
  }

  useEffect(() => {
    if (!lastResult || Date.now() - lastResult.at > CACHE_MS) void locate();
  }, []);

  useEffect(() => {
    if (tab !== "duty" || !origin || duty) return;
    setDuty({ loading: true, available: false, source: null, list: [] });
    void wippApi<{ available: boolean; source: string | null; pharmacies: DutyPharmacy[] }>(`/places/pharmacies/duty?lat=${origin.lat}&lng=${origin.lng}&lang=fr`)
      .then((r) => setDuty({ loading: false, available: r.available, source: r.source, list: r.pharmacies }))
      .catch(() => setDuty({ loading: false, available: false, source: null, list: [] }));
  }, [tab, origin, duty]);

  const places = load.state === "ready" ? load.places : [];
  const sorted = useMemo(
    () => (origin ? [...places].sort((a, b) => kmBetween(origin, a) - kmBetween(origin, b)) : places),
    [places, origin],
  );
  const openList = sorted.filter((p) => p.open24h || p.openNow === true);
  const shown = tab === "open" ? openList : sorted;
  const ordered = picked ? [...shown.filter((p) => p.id === picked), ...shown.filter((p) => p.id !== picked)] : shown;

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="💊 Pharmacies" onBack={pop} />
      </GlassHeader>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip label="🟢 Ouvertes maintenant" active={tab === "open"} onPress={() => setTab("open")} />
          <Chip label="🌙 De garde" active={tab === "duty"} onPress={() => setTab("duty")} />
          <Chip label="Toutes" active={tab === "all"} onPress={() => setTab("all")} />
        </View>

        {load.state === "locating" || load.state === "loading" ? (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>
            {load.state === "locating" ? "Recherche de ta position…" : "Recherche des pharmacies proches…"}
          </Text>
        ) : null}

        {load.state === "denied" ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Empty title="Position non disponible" />
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 19 }}>
              WIPP utilise votre position pour trouver les pharmacies ouvertes près de vous. Autorise la localisation, ou cherche une ville ou une adresse.
            </Text>
            <Btn label="Autoriser la localisation" onPress={() => void Promise.resolve(Linking.openSettings?.()).catch(() => undefined)} />
            <Btn label="Réessayer" variant="secondary" onPress={() => void locate(true)} />
          </View>
        ) : null}

        {load.state === "denied" || load.state === "ready" ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <SearchField value={query} onChangeText={setQuery} placeholder="Ville ou adresse" onSubmitEditing={() => void searchText()} />
            </View>
            <Press onPress={() => void searchText()} accessibilityLabel="Chercher" style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
              <Search size={18} color={colors.fg} />
            </Press>
          </View>
        ) : null}

        {load.state === "error" ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Empty title={load.notConfigured ? "Bientôt disponible" : "Impossible de charger les pharmacies"} />
            <Text style={{ color: colors.muted, textAlign: "center" }}>{load.message}</Text>
            <Btn label="Réessayer" onPress={() => void locate(true)} />
          </View>
        ) : null}

        {load.state === "ready" && tab !== "duty" && origin && sorted.length ? (
          <PharmacyMap
            origin={origin}
            places={shown}
            onPick={(p) => {
              setPicked(p.id);
              scroll.current?.scrollTo({ y: 260, animated: true });
            }}
          />
        ) : null}

        {load.state === "ready" && tab === "duty" ? (
          duty?.loading ? (
            <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>Recherche des pharmacies de garde…</Text>
          ) : duty?.available && duty.list.length ? (
            duty.list.map((d) =>
              d.lat != null && d.lng != null ? (
                <PharmacyCard
                  key={d.id}
                  origin={origin}
                  duty={d}
                  p={{ id: d.id, name: d.name, address: d.address, lat: d.lat, lng: d.lng, phone: d.phone, openNow: null, open24h: false, nextCloseTime: d.dutyUntil, nextOpenTime: null, weekdayText: [], website: null, mapsUri: null }}
                />
              ) : null,
            )
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Empty title="🌙 Pharmacies de garde" />
              <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 19 }}>
                {duty?.available
                  ? "Aucune pharmacie de garde n’est publiée par la source officielle pour cette zone en ce moment."
                  : "Les données officielles de pharmacies de garde ne sont pas encore disponibles pour cette zone."}
              </Text>
              <Btn label="Voir les pharmacies ouvertes maintenant" onPress={() => setTab("open")} />
            </View>
          )
        ) : null}

        {load.state === "ready" && tab !== "duty" ? (
          ordered.length ? (
            ordered.map((p) => <PharmacyCard key={p.id} p={p} origin={fromGps ? origin : null} />)
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Empty title={tab === "open" ? "Aucune pharmacie ouverte trouvée" : "Aucune pharmacie trouvée"} />
              {tab === "open" && sorted.length ? <Btn label="Voir toutes les pharmacies proches" variant="secondary" onPress={() => setTab("all")} /> : null}
            </View>
          )
        ) : null}

        {load.state === "ready" ? (
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Horaires fournis par Google. « Ouverte » ne signifie pas « de garde ».
          </Text>
        ) : null}
      </ScrollView>
    </ScreenRoot>
  );
}


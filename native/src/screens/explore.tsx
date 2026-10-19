import { PharmacyResults } from "./pharmacies";
import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, Alert, AppState, Linking, Platform, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Brush, CakeSlice, Coffee, Flower2, Scissors, Shirt, Utensils, Wrench, Calendar, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, Clock, Cross, Heart, MapPin, MessageCircle, MoreHorizontal, Navigation, Pencil, Phone, Pin, Plus, Search, Share2, ShieldAlert, Star, Store, Tag, Eye } from "lucide-react-native";
import { EventCard } from "../components/event-parts";
import { Avatar } from "../components/Avatar";
import { listingCatLabel } from "../lib/listing-cats";
import { kmBetween, kmLabel, osmTile } from "../lib/geo";
import { Btn, Chip, Empty, GlassHeader, Header, IconBtn, PendingNote, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { useDeviceLayout } from "../lib/device-layout";
import { formatMeters, metersBetween } from "../lib/format";
import { SHOP_CAT_KEYS } from "../lib/i18n";
import { useT, useWippStore } from "../lib/store";
import { liveBadge } from "../lib/event-live";
import { EventLiveActions } from "../components/EventLiveActions";
import { cardToShop, listPublicBusinessCards, withSignedCardMedia } from "../lib/business-card";
import { REPORT_REASONS, submitContentReport } from "../lib/safety";
import type { Listing, Shop, ShopCategory } from "../lib/types";
import { colors, layout, accentA, fgA, whiteA } from "../theme";
import { errorText } from "../lib/error-fr";
import { tr } from "../lib/tr";

const CATS = ["all", "auto", "realty", "electronics", "fashion", "home", "jobs", "leisure", "goods"] as const;
/** My real position (asked once); no distance is shown until it is known. */
let GEO: { lat: number; lng: number } | null = null;
void import("../lib/geo").then(({ myPositionOnce }) => myPositionOnce()).then((p) => {
  if (p) GEO = p;
});
/** Items without coordinates (0,0) have an unknown distance, not 8 000 km. */
function knownMeters(p: { lat?: number; lng?: number }) {
  return GEO && p.lat && p.lng ? metersBetween(GEO, { lat: p.lat, lng: p.lng }) : null;
}
type Hub = "home" | "listings" | "utilities" | "shops" | "lifestyle";

const HUB_BACKGROUNDS = {
  listings: require("../../assets/wipp/media/apt.jpg"),
  // Services = pharmacies for now.
  utilities: require("../../assets/wipp/media/pharmacies-hub.jpg"),
  shops: require("../../assets/wipp/media/shop-chen-hero.jpg"),
  lifestyle: require("../../assets/wipp/media/soccer.jpg"),
} as const;

const CONDITION_LABEL: Record<NonNullable<Listing["condition"]>, string> = {
  get new() { return tr("Neuf"); },
  get like_new() { return tr("Comme neuf"); },
  get good() { return tr("Bon état"); },
  get used() { return tr("Usagé"); },
};

function listingPriceText(listing: Listing) {
  const raw = listing.price.trim();
  const negotiable = Boolean(listing.negotiable);
  if (/^gratuit/i.test(raw)) return negotiable ? tr("Gratuit · négociable") : tr("Gratuit");
  if (raw === "Échange") return tr("Échange");
  const money = listing.currency && raw && !raw.includes(listing.currency) ? `${raw} ${listing.currency}` : raw;
  if (!money) return negotiable ? tr("Prix négociable") : tr("Prix à préciser");
  return negotiable && !/négociable/i.test(money) ? tr("{0} · négociable", money) : money;
}

function isUpcomingEvent(item: { startsAt?: string; endsAt?: string; live?: { state: string } }) {
  // A WIPP live: listed while on air, or not yet started (up to 12 h after its planned start).
  if (item.live) {
    if (item.live.state === "live") return true;
    if (item.live.state !== "scheduled") return false;
    return (Date.parse(item.startsAt ?? "") || 0) > Date.now() - 12 * 3600_000;
  }
  const end = item.endsAt ? Date.parse(item.endsAt) : Number.NaN;
  const start = item.startsAt ? Date.parse(item.startsAt) : Number.NaN;
  const deadline = Number.isNaN(end) ? start : end;
  if (Number.isNaN(deadline)) return true;
  return deadline >= Date.now() - 60_000;
}

function eventAccessText(item: { isFree?: boolean; price?: string; currency?: string }) {
  if (item.isFree === false) return [item.price, item.currency].filter(Boolean).join(" ") || tr("Payant");
  return tr("Gratuit");
}

function shopCatLabel(cat: ShopCategory, t: ReturnType<typeof useT>) {
  return t(SHOP_CAT_KEYS[cat]);
}

export function ExploreScreen() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const [hub, setHub] = useState<Hub>("home");
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [q, setQ] = useState("");
  const query = q.trim();
  const searching = query.length >= 2;
  useEffect(() => {
    if (hub !== "shops") return;
    void (async () => {
      try {
        const cards = await listPublicBusinessCards();
        const mapped = (await Promise.all(cards.map((card) => withSignedCardMedia(card)))).map((c) => cardToShop(c));
        useWippStore.setState((s) => ({
          shops: [...s.shops.filter((x) => !x.id.startsWith("business:")), ...mapped],
        }));
      } catch {
        /* offline */
      }
    })();
  }, [hub]);
  const tabbed = hub === "home" || hub === "shops" || hub === "lifestyle" || hub === "utilities";
  const destTitle = tabbed
    ? t("exploreTitle")
    : hub === "listings"
      ? t("hubListings")
      : t("exploreTitle");
  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
          {!tabbed && !searching ? (
            <IconBtn label={t("back")} onPress={() => setHub("home")}>
              <ChevronLeft size={24} color={colors.fg} />
            </IconBtn>
          ) : (
            <View style={{ width: 8 }} />
          )}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
            {searching ? t("exploreTitle") : destTitle}
          </Text>
          {hub === "listings" && !searching ? (
            <IconBtn label={tr("Créer une annonce")} onPress={() => push({ name: "create-listing" })}>
              <Plus size={24} color={colors.fg} />
            </IconBtn>
          ) : hub === "lifestyle" && !searching ? (
            <IconBtn label={t("createLifestyle")} onPress={() => push({ name: "create-lifestyle" })}>
              <Plus size={24} color={colors.fg} />
            </IconBtn>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
          <SearchField placeholder={hub === "shops" ? tr("Rechercher une entreprise ...") : t("exploreAsk")} value={q} onChangeText={setQ} />
        </View>
        {!searching && tabbed ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
            {([
              ["home", tr("Tous")],
              ["shops", tr("Entreprises")],
              ["lifestyle", tr("Événements")],
              ["utilities", tr("Services")],
            ] as const).map(([id, label]) => (
              <Chip key={id} label={label} active={hub === id} onPress={() => setHub(id)} />
            ))}
          </ScrollView>
        ) : null}
        {hub === "listings" && !searching ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
            {CATS.map((c) => (
              <Chip key={c} label={c === "all" ? t("all") : listingCatLabel(c)} active={cat === c} onPress={() => setCat(c)} />
            ))}
          </ScrollView>
        ) : null}
        {searching && hub === "shops" ? <ShopSearch q={query} /> : null}
        {searching && hub !== "shops" ? <ExploreSearch q={query} /> : null}
        {!searching && hub === "home" ? <ExploreHome go={setHub} /> : null}
        {!searching && hub === "listings" ? <ListingsPane cat={cat} /> : null}
        {!searching && hub === "utilities" ? <UtilitiesPane /> : null}
        {!searching && hub === "shops" ? <ShopsPane /> : null}
        {!searching && hub === "lifestyle" ? <LifestylePane /> : null}
      </ScrollView>
    </ScreenRoot>
  );
}

/**
 * Public business pages, fresh from the server. Replaces every cached « business: » page (a renamed
 * page kept its old name on the Explorer home), but keeps the pages of open business chats.
 */
async function refreshBusinessShops() {
  const cards = await listPublicBusinessCards();
  const mapped = (await Promise.all(cards.map((card) => withSignedCardMedia(card)))).map((c) => cardToShop(c));
  useWippStore.setState((s) => {
    const fresh = new Set(mapped.map((x) => x.id));
    const inChats = new Set(s.chats.map((c) => c.shopId).filter(Boolean));
    return {
      shops: [
        ...s.shops.filter((x) => !x.id.startsWith("business:") || (!fresh.has(x.id) && inChats.has(x.id))),
        ...mapped,
      ],
    };
  });
}

function ExploreHome({ go }: { go: (h: Hub) => void }) {
  useEffect(() => {
    void refreshBusinessShops().catch(() => undefined);
  }, []);
  const t = useT();
  const lang = useWippStore((s) => s.language);
  const listings = useWippStore((s) => s.listings);
  const allShops = useWippStore((s) => s.shops);
  const realShops = allShops.filter((s) => s.id.startsWith("business:"));
  const serverConnected = useWippStore((s) => (s.serverConnected || Boolean(s.serverProfileId)));
  const shops = serverConnected ? realShops : realShops.length ? realShops : allShops;
  const events = useWippStore((s) => s.lifestyle);
  const pharmacies = useWippStore((s) => s.pharmacies);
  const push = useWippStore((s) => s.push);
  const near = [
    ...shops.map((s) => ({
      key: `s-${s.id}`,
      meters: knownMeters(s),
      city: s.city,
      title: s.name,
      // A real card keeps the exact category its owner picked (e.g. « Mode & accessoires »).
      sub: s.id.startsWith("business:") && s.tags?.[0] ? s.tags[0] : shopCatLabel(s.category, t),
      image: s.image,
      onPress: () =>
        push(
          s.id.startsWith("business:")
            ? { name: "business-card-view" as const, publicId: s.handle }
            : { name: "shop" as const, shopId: s.id },
        ),
    })),
    ...events.map((e) => ({
      key: `e-${e.id}`,
      meters: knownMeters(e),
      city: (e as { city?: string }).city,
      title: e.title,
      sub: t("hubEvents"),
      image: e.image,
      onPress: () => push({ name: "lifestyle" as const, itemId: e.id }),
    })),
    ...pharmacies.filter((p) => p.onDuty).map((p) => ({
      key: `p-${p.id}`,
      meters: knownMeters(p),
      city: (p as { city?: string }).city,
      title: p.name,
      sub: t("onDuty"),
      image: "",
      onPress: () => push({ name: "pharmacy" as const, pharmacyId: p.id }),
    })),
  ]
    .sort((a, b) => (a.meters ?? Number.MAX_SAFE_INTEGER) - (b.meters ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 6);
  const hubs = [
    { icon: Tag, title: t("hubListings"), sub: t("hubListingsSub"), kind: "listings" as const, go: () => go("listings") },
    { icon: Cross, title: t("hubServices"), sub: t("hubServicesSub"), kind: "utilities" as const, go: () => go("utilities") },
    { icon: Store, title: t("hubShops"), sub: t("hubShopsSub"), kind: "shops" as const, go: () => go("shops") },
    { icon: Calendar, title: t("hubEvents"), sub: t("hubEventsSub"), kind: "lifestyle" as const, go: () => go("lifestyle") },
  ];
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}>{t("exploreSplit")}</Text>
      <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {hubs.map((h) => (
          <Press key={h.title} onPress={h.go} style={{ width: "48.5%", minHeight: 100, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, padding: 14, borderWidth: 1, borderColor: colors.hair }}>
            {HUB_BACKGROUNDS[h.kind] ? (
              <Image source={HUB_BACKGROUNDS[h.kind]} contentFit="cover" style={{ position: "absolute", inset: 0, opacity: 0.32 }} />
            ) : (
              <View pointerEvents="none" style={{ position: "absolute", right: -10, top: -6, bottom: -6, justifyContent: "center", opacity: 0.55 }}>
                <Cross size={96} color="#1fbf6a" fill="#1fbf6a" strokeWidth={1} />
              </View>
            )}
            <View style={{ position: "absolute", inset: 0, backgroundColor: colors.imageVeil }} />
            <View style={{ zIndex: 1 }}>
              <h.icon size={20} color={colors.accent} />
              <Text style={{ marginTop: 16, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{h.title}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{h.sub}</Text>
            </View>
          </Press>
        ))}
      </View>
      <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.muted }}>{t("nearYou")}</Text>
        <Press onPress={() => go("shops")}>
          <Text style={{ fontSize: 12, color: colors.accent }}>{t("seeAll")} ›</Text>
        </Press>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
        {near.map((row) => {
          const src = wippSrc(row.image);
          return (
            <Press key={row.key} onPress={row.onPress} style={{ width: 144, borderRadius: 16, overflow: "hidden", backgroundColor: colors.glassCard }}>
              {src ? <Image source={src} style={{ height: 80, width: 144 }} contentFit="cover" /> : <View style={{ height: 80, backgroundColor: colors.navy }} />}
              <View style={{ padding: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{row.title}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: colors.muted }}>{[row.meters != null ? formatMeters(row.meters, lang) : row.city, row.sub].filter(Boolean).join(" · ")}</Text>
              </View>
            </Press>
          );
        })}
      </ScrollView>
      <Text style={{ marginTop: 8, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.muted }}>{tr("Populaire")}</Text>
      {listings.slice(0, 3).map((l) => (
        <ListingRow key={l.id} listing={l} />
      ))}
    </View>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const push = useWippStore((s) => s.push);
  const src = wippSrc(listing.image);
  return (
    <Press onPress={() => push({ name: "listing", listingId: listing.id })} style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}>
      {src ? <Image source={src} style={{ width: 72, height: 72, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.navy }} />}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.fg, fontFamily: "Inter_500Medium", fontSize: 15 }}>{listing.title}</Text>
          {listing.boosted ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: accentA(0.15) }}>
              <Pin size={10} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>{tr("En avant")}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: colors.accent, marginTop: 2 }}>{listingPriceText(listing)}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {[listing.city, listing.distance].filter(Boolean).join(" · ")}
          {listing.views ? tr(" · {0} vue{1}", listing.views, listing.views > 1 ? "s" : "") : ""}
          {listing.publishAt && listing.publishAt > Date.now() ? tr(" · programmée") : ""}
        </Text>
      </View>
    </Press>
  );
}

function ExploreSearch({ q }: { q: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; city: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      try {
        const me = useWippStore.getState().serverProfileId;
        const { fetchListings, fetchEvents } = await import("../lib/lot7/api");
        const [cards, nextListings, nextEvents] = await Promise.all([
          listPublicBusinessCards(q),
          fetchListings(me, q),
          fetchEvents(me, q),
        ]);
        if (cancel) return;
        const needle = fold(q);
        const signed = await Promise.all(cards.map((card) => withSignedCardMedia(card)));
        const shopHits = signed
          .filter((card) => fold(`${card.name} ${card.category} ${card.description} ${card.city}`).includes(needle))
          .map((card) => cardToShop(card));
        const eventHits = nextEvents.filter((item) => isUpcomingEvent(item));
        setListings(nextListings);
        setShops(shopHits);
        setEvents(eventHits.map((item) => ({ id: item.id, title: item.title, city: item.city })));
        useWippStore.setState((s) => ({
          listings: nextListings,
          lifestyle: nextEvents,
          shops: [...s.shops.filter((shop) => !shop.id.startsWith("business:") && !shopHits.some((hit) => hit.id === shop.id)), ...shopHits],
        }));
        setError("");
      } catch (err) {
        if (!cancel) setError(errorText(err, tr("Recherche impossible.")));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [q]);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {loading ? <Empty title={tr("Recherche…")} /> : null}
      {error ? <Empty title={error} /> : null}
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
      {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
      {events.map((e) => (
        <Press key={e.id} onPress={() => useWippStore.getState().push({ name: "lifestyle", itemId: e.id })} style={{ paddingVertical: 10 }}>
          <Text style={{ color: colors.fg }}>{e.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{e.city}</Text>
        </Press>
      ))}
      {!loading && !error && listings.length + shops.length + events.length === 0 ? <Empty title={tr("Aucun résultat")} /> : null}
    </View>
  );
}

function ListingsPane({ cat }: { cat: (typeof CATS)[number] }) {
  const push = useWippStore((s) => s.push);
  const allListings = useWippStore((s) => s.listings);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const { fetchListings } = await import("../lib/lot7/api");
        const rows = await fetchListings(useWippStore.getState().serverProfileId);
        if (!cancel) {
          useWippStore.setState({ listings: rows });
          setLoadError("");
        }
      } catch (err) {
        if (!cancel) setLoadError(errorText(err, tr("Impossible de charger les annonces.")));
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);
  const listings = allListings.filter((l) => cat === "all" || l.category === cat);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {loadError ? <Empty title={loadError} /> : null}
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
      {!loadError && listings.length === 0 ? (
        <View>
          <Empty title={tr("Aucune annonce pour le moment")} />
          <Btn label={tr("Créer une annonce")} onPress={() => push({ name: "create-listing" })} />
        </View>
      ) : null}
    </View>
  );
}

function UtilitiesPane() {
  const [pharmaMode, setPharmaMode] = useState<"open" | "h24" | null>(null);
  const pharmacies = useWippStore((s) => s.pharmacies);
  const serverConnected = useWippStore((s) => (s.serverConnected || Boolean(s.serverProfileId)));
  const push = useWippStore((s) => s.push);
  const [services, setServices] = useState<{ id: string; name: string; address: string; city: string; phone: string; category: string }[]>([]);
  const shown = serverConnected ? [] : pharmacies;
  useEffect(() => {
    if (!serverConnected) return;
    void import("../lib/lot7/api")
      .then(({ fetchServices }) => fetchServices(""))
      .then((rows) => setServices(rows ?? []))
      .catch(() => setServices([]));
  }, [serverConnected]);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Service categories, same tiles as the Explorer hubs (Pharmacies first; vets etc. later). */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, marginBottom: 12, zIndex: 10 }}>
        <View style={{ width: "48.5%", zIndex: 10 }}>
          <Press
            onPress={() => setPharmaMode((m) => (m ? null : "open"))}
            accessibilityLabel={tr("Pharmacies")}
            style={{ minHeight: 100, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, padding: 14, borderWidth: 1, borderColor: pharmaMode ? colors.accent : colors.hair }}
          >
            <Image source={HUB_BACKGROUNDS.utilities} contentFit="cover" style={{ position: "absolute", inset: 0, opacity: 0.32 }} />
            <View style={{ position: "absolute", inset: 0, backgroundColor: colors.imageVeil }} />
            <View style={{ zIndex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Cross size={20} color={colors.accent} />
                <ChevronDown size={16} color={colors.muted} style={{ transform: [{ rotate: pharmaMode ? "180deg" : "0deg" }] }} />
              </View>
              <Text style={{ marginTop: 16, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{tr("Pharmacies")}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: pharmaMode ? colors.accent : colors.muted }}>
                {pharmaMode === "open" ? tr("Ouvertes maintenant") : pharmaMode === "h24" ? tr("Ouvertes 24 h/24") : tr("Ouvertes autour de vous")}
              </Text>
            </View>
          </Press>
        </View>
      </View>
      {pharmaMode ? (
        <View style={{ marginBottom: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label={tr("🟢 Ouvertes maintenant")} active={pharmaMode === "open"} onPress={() => setPharmaMode("open")} />
            <Chip label={tr("🕐 Ouvertes 24 h/24")} active={pharmaMode === "h24"} onPress={() => setPharmaMode("h24")} />
          </View>
          <PharmacyResults mode={pharmaMode} />
        </View>
      ) : null}
      {serverConnected && services.length === 0 && shown.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 12 }}>{tr("D’autres services utiles arrivent bientôt.")}</Text>
      ) : null}
      {services.map((p) => (
        <View key={p.id} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{p.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{tr(p.category)} · {p.city}{p.address ? ` · ${p.address}` : ""}</Text>
        </View>
      ))}
      {shown.map((p) => (
        <Press key={p.id} onPress={() => push({ name: "pharmacy", pharmacyId: p.id })} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{p.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{p.address}{p.onDuty ? tr(" · De garde") : ""}</Text>
        </Press>
      ))}
    </View>
  );
}

function fold(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function ShopSearch({ q }: { q: string }) {
  const [hits, setHits] = useState<Shop[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      try {
        const cards = await listPublicBusinessCards(q);
        if (cancel) return;
        const needle = fold(q);
        const signed = await Promise.all(cards.map((card) => withSignedCardMedia(card)));
        const next = signed
          .filter((card) => fold(`${card.name} ${card.category} ${card.description} ${card.city}`).includes(needle))
          .map((card) => cardToShop(card));
        setHits(next);
        useWippStore.setState((s) => ({
          shops: [...s.shops.filter((shop) => !next.some((hit) => hit.id === shop.id)), ...next],
        }));
        setError("");
      } catch (err) {
        if (!cancel) setError(errorText(err, tr("Recherche impossible.")));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [q]);
  const [kind, setKind] = useState<"all" | "shops" | "users" | "groups">("shops");
  const users = useWippStore((s) => s.users);
  const serverConnected = useWippStore((s) => (s.serverConnected || Boolean(s.serverProfileId)));
  const chats = useWippStore((s) => s.chats);
  const needle = fold(q);
  const people = useMemo(
    () =>
      Object.values(users).filter(
        (u) => Boolean(u) && (!serverConnected || u.id.startsWith("srvuser:")) && fold(`${u.displayName} ${u.username}`).includes(needle),
      ),
    [users, needle, serverConnected],
  );
  const groups = useMemo(
    () => chats.filter((c) => c.type === "group" && fold(c.name || "").includes(needle)),
    [chats, needle],
  );
  const showShops = kind === "all" || kind === "shops";
  const showPeople = kind === "all" || kind === "users";
  const showGroups = kind === "all" || kind === "groups";
  const empty = !loading && !error && ((showShops ? hits.length : 0) + (showPeople ? people.length : 0) + (showGroups ? groups.length : 0)) === 0;
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {([
          ["all", tr("Tout")],
          ["shops", tr("Entreprises")],
          ["users", tr("Utilisateurs")],
          ["groups", tr("Groupes")],
        ] as const).map(([id, label]) => (
          <Chip key={id} label={label} active={kind === id} onPress={() => setKind(id)} />
        ))}
      </ScrollView>
      {loading ? <Empty title={tr("Recherche…")} /> : null}
      {error ? <Empty title={error} /> : null}
      {showShops ? hits.map((s) => <ShopRow key={s.id} shop={s} />) : null}
      {showPeople
        ? people.map((u) => (
            <Press key={u.id} onPress={() => useWippStore.getState().push({ name: "found-profile", userId: u.id })} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "center" }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy }} />
              <View>
                <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>@{u.username}</Text>
              </View>
            </Press>
          ))
        : null}
      {showGroups
        ? groups.map((c) => (
            <Press key={c.id} onPress={() => useWippStore.getState().push({ name: "conversation", chatId: c.id })} style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{c.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Groupe")}</Text>
            </Press>
          ))
        : null}
      {empty ? <Empty title={tr("Aucun résultat")} /> : null}
    </View>
  );
}

function shopPlace(shop: Shop, t: ReturnType<typeof useT>) {
  const bits = [shop.tags?.[0] || shopCatLabel(shop.category, t), shop.city].filter(Boolean);
  if (GEO && shop.lat && shop.lng) bits.push(formatMeters(metersBetween(GEO, { lat: shop.lat, lng: shop.lng }), "fr"));
  return bits.join(" · ");
}

function ShopRow({ shop }: { shop: Shop }) {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const saved = useWippStore((s) => s.saves.some((item) => item.kind === "business" && (item.id === shop.handle || item.id === shop.id)));
  const src = shop.image?.startsWith("http") ? { uri: shop.image } : wippSrc(shop.image);
  const publicId = shop.id.startsWith("business:") ? shop.handle : shop.id;
  return (
    <Press
      onPress={() => push(shop.id.startsWith("business:") ? { name: "business-card-view", publicId } : { name: "shop", shopId: shop.id })}
      style={{ flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "center" }}
    >
      {src ? <Image source={src} style={{ width: 72, height: 72, borderRadius: 14 }} contentFit="cover" /> : <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: colors.navy }} />}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{shop.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{shopPlace(shop, t)}</Text>
      </View>
      <Press
        accessibilityLabel={saved ? tr("Retirer des favoris") : tr("Ajouter aux favoris")}
        onPress={() => {
          void import("../lib/lot7/api").then(async ({ toggleSave }) => {
            const id = shop.handle || shop.id;
            await toggleSave("business", id, !saved);
            useWippStore.setState((s) => ({
              saves: saved ? s.saves.filter((x) => !(x.kind === "business" && x.id === id)) : [...s.saves, { kind: "business", id }],
            }));
          }).catch((err) => Alert.alert(tr("Favoris"), errorText(err, tr("Enregistrement impossible."))));
        }}
      >
        <Heart size={18} color={saved ? colors.accent : colors.muted} fill={saved ? colors.accent : "transparent"} />
      </Press>
    </Press>
  );
}

const CATEGORY_TILES: { id: ShopCategory | "mode"; label: string; Icon: typeof Store }[] = [
  { id: "nails", get label() { return tr("Onglerie"); }, Icon: Brush },
  { id: "hair", get label() { return tr("Coiffure"); }, Icon: Scissors },
  { id: "beauty", get label() { return tr("Beauté"); }, Icon: Flower2 },
  { id: "restaurant", get label() { return tr("Restaurant"); }, Icon: Utensils },
  { id: "mode", get label() { return tr("Mode"); }, Icon: Shirt },
  { id: "bakery", get label() { return tr("Pâtisserie"); }, Icon: CakeSlice },
  { id: "cafe", get label() { return tr("Café"); }, Icon: Coffee },
  { id: "services", get label() { return tr("Services"); }, Icon: Wrench },
];

/** WIPP's own picture per category (assets/categories/…). Missing ones show the gold icon. */
const CATEGORY_ART: Partial<Record<ShopCategory | "mode", number>> = {
  nails: require("../../assets/categories/nails.jpg"),
  hair: require("../../assets/categories/hair.jpg"),
  beauty: require("../../assets/categories/beauty.jpg"),
  restaurant: require("../../assets/categories/restaurant.jpg"),
  mode: require("../../assets/categories/mode.jpg"),
  bakery: require("../../assets/categories/bakery.jpg"),
  cafe: require("../../assets/categories/cafe.jpg"),
  services: require("../../assets/categories/services.jpg"),
};

function ShopsPane() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const [cat, setCat] = useState<ShopCategory | "all" | "mode">("all");
  const allBusinessShops = useWippStore((s) => s.shops);
  const shops = useMemo(
    () => allBusinessShops.filter((x) => x.id.startsWith("business:")),
    [allBusinessShops],
  );
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        await refreshBusinessShops();
        setLoadError("");
      } catch (err) {
        setLoadError(errorText(err, tr("Impossible de charger les entreprises.")));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  const shown = shops.filter((s) => {
    if (cat === "all") return true;
    if (cat === "mode") return /mode|fashion|vêtement|vetement|chaussure|bijou|montre|accessoire/i.test(`${s.name} ${s.tags?.join(" ") ?? ""} ${s.bio}`);
    return s.category === cat;
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  // Category tiles use WIPP's own visuals (CATEGORY_ART), never a business's photo.
  const shortcuts = CATEGORY_TILES;
  function coverFor(id: ShopCategory | "mode") {
    return CATEGORY_ART[id] ?? null;
  }
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 18 }}>
        {shortcuts.map((item) => {
          const src = coverFor(item.id);
          return (
            <Press key={item.id} onPress={() => setCat(cat === item.id ? "all" : item.id)} style={{ width: 72, alignItems: "center" }}>
              {src ? (
                <Image source={src} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: cat === item.id ? 2 : 0, borderColor: colors.accent }} contentFit="cover" />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", borderWidth: cat === item.id ? 2 : 1, borderColor: cat === item.id ? colors.accent : colors.hair }}>
                  <item.Icon size={26} color={colors.accent} />
                </View>
              )}
              <Text numberOfLines={1} style={{ marginTop: 6, color: colors.fg, fontSize: 12 }}>{item.label}</Text>
            </Press>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>{tr("Entreprises à proximité")}</Text>
        <Press onPress={() => setCat("all")}><Text style={{ color: colors.accent }}>{tr("Voir tout ›")}</Text></Press>
      </View>
      {!loaded ? <Empty title={tr("Chargement…")} /> : null}
      {loadError ? <Empty title={loadError} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {shown.slice(0, 8).map((s) => {
          const src = s.image?.startsWith("http") ? { uri: s.image } : wippSrc(s.image);
          return (
            <Press key={s.id} onPress={() => push(s.id.startsWith("business:") ? { name: "business-card-view", publicId: s.handle } : { name: "shop", shopId: s.id })} style={{ width: 168 }}>
              {src ? <Image source={src} style={{ width: 168, height: 112, borderRadius: 16 }} contentFit="cover" /> : <View style={{ width: 168, height: 112, borderRadius: 16, backgroundColor: colors.navy }} />}
              {s.pinned ? (
                <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Pin size={11} color={colors.accent} />
                  <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{tr("Épinglé")}</Text>
                </View>
              ) : null}
              <Text numberOfLines={1} style={{ marginTop: 8, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{s.name}</Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{shopPlace(s, t)}</Text>
            </Press>
          );
        })}
      </ScrollView>
      <Text style={{ marginTop: 22, marginBottom: 10, paddingHorizontal: 16, color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>{tr("Catégories populaires")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {shortcuts.map((item) => {
          const src = coverFor(item.id);
          return (
            <Press key={`pop-${item.id}`} onPress={() => setCat(item.id)} style={{ width: 150, height: 96, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, justifyContent: "flex-end" }}>
              {src ? (
                <Image source={src} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
              ) : (
                <View style={{ position: "absolute", top: 12, right: 12, opacity: 0.9 }}>
                  <item.Icon size={30} color={colors.accent} />
                </View>
              )}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, backgroundColor: src ? "rgba(0,0,0,0.35)" : "transparent" }} />
              <Text style={{ padding: 12, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{item.label}</Text>
            </Press>
          );
        })}
      </ScrollView>
      {loaded && !loadError && shown.length === 0 ? <Empty title={tr("Aucune entreprise pour le moment")} /> : null}
      <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
        <Btn label={tr("Créer mon entreprise")} onPress={() => push({ name: "business-card" })} />
      </View>
    </View>
  );
}

const EVENT_FILTERS = ["Tous", "Musique", "Soirée", "Affaires", "Sport", "Culture", "Food", "Communauté"];
const EVENT_WHERE = [["all", "Tous"], ["place", "En présentiel"], ["online", "En ligne"]] as const;

function LifestylePane() {
  const lifestyle = useWippStore((s) => s.lifestyle);
  const myCity = useWippStore((s) => (s.me.city || "").split(",")[0].trim());
  const saves = useWippStore((s) => s.saves);
  const push = useWippStore((s) => s.push);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  const [where, setWhere] = useState<(typeof EVENT_WHERE)[number][0]>("all");
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    void import("../lib/geo").then(({ myPositionOnce }) => myPositionOnce()).then((p) => p && setMyPos(p));
  }, []);
  const items = useMemo(() => {
    const needle = fold(q.trim());
    const near = fold(myCity);
    return lifestyle
      // A WIPP live stays listed while it is on air, even past its start time.
      // A WIPP live stays listed until the organizer starts and ends it (a start time already passed
      // — e.g. created late — must not hide it), and for up to 12 h after its planned start.
      .filter(isUpcomingEvent)
      .filter((e) => where === "all" || (where === "online" ? e.isOnline || Boolean(e.live) : !e.isOnline && !e.live))
      .filter((e) => cat === "Tous" || fold(e.category ?? "") === fold(cat))
      .filter((e) => !needle || fold(`${e.title} ${e.city} ${e.place} ${e.category ?? ""} ${e.details ?? ""} ${e.note}`).includes(needle))
      // Nearest first when both have a position, else my city first, then soonest first.
      .sort((x, y) => {
        if (myPos && x.lat && y.lat && !x.isOnline && !y.isOnline) {
          const dx = kmBetween(myPos, { lat: x.lat, lng: x.lng });
          const dy = kmBetween(myPos, { lat: y.lat, lng: y.lng });
          if (Math.abs(dx - dy) > 1) return dx - dy;
        }
        const nx = near && fold(x.city) === near ? 0 : 1;
        const ny = near && fold(y.city) === near ? 0 : 1;
        if (nx !== ny) return nx - ny;
        return (Date.parse(x.startsAt ?? "") || Infinity) - (Date.parse(y.startsAt ?? "") || Infinity);
      });
  }, [lifestyle, q, cat, where, myCity, myPos]);
  useEffect(() => {
    let cancel = false;
    const load = async () => {
      try {
        const { fetchEvents } = await import("../lib/lot7/api");
        const rows = await fetchEvents(useWippStore.getState().serverProfileId);
        if (!cancel) {
          useWippStore.setState({ lifestyle: rows });
          setLoadError("");
        }
      } catch (err) {
        if (!cancel) setLoadError(errorText(err, tr("Impossible de charger les événements.")));
      }
    };
    void load();
    // Keep counts and « EN DIRECT » fresh: every 30 s while the list is open, and when WIPP comes back.
    const tick = setInterval(() => void load(), 30_000);
    const sub = AppState.addEventListener("change", (st) => st === "active" && void load());
    return () => {
      cancel = true;
      clearInterval(tick);
      sub.remove();
    };
  }, []);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 28, fontFamily: "Inter_800ExtraBold" }}>{tr("Événements")}</Text>
          <Text style={{ marginTop: 2, color: fgA(0.7), fontSize: 13 }}>{tr("Découvre, participe et vis des expériences sur WIPP.")}</Text>
        </View>
        <Press accessibilityLabel={tr("Créer un événement")} onPress={() => push({ name: "create-lifestyle" })} style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <CalendarPlus size={24} color={colors.accent} />
        </Press>
      </View>
      <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 999, paddingHorizontal: 16, backgroundColor: colors.navy, borderWidth: 1, borderColor: whiteA(0.08) }}>
        <Search size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={tr("Rechercher un événement, une ville…")}
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.fg, fontSize: 15, ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {}) } as object}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {EVENT_FILTERS.map((c) => (
          <Press key={c} onPress={() => setCat(c)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: cat === c ? colors.accent : "transparent", borderWidth: 1, borderColor: cat === c ? colors.accent : whiteA(0.18) }}>
            <Text style={{ color: cat === c ? colors.accentFg : colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{tr(c)}</Text>
          </Press>
        ))}
      </ScrollView>
      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        {EVENT_WHERE.map(([id, label]) => (
          <Press key={id} onPress={() => setWhere(id)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: where === id ? accentA(0.18) : "transparent", borderWidth: 1, borderColor: where === id ? colors.accent : whiteA(0.12) }}>
            <Text style={{ color: where === id ? colors.accent : colors.muted, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{tr(label)}</Text>
          </Press>
        ))}
      </View>
      <View style={{ marginTop: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MapPin size={18} color={colors.accent} />
        <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{q || cat !== "Tous" ? tr("Résultats") : myCity ? tr("Événements près de toi") : tr("À venir")}</Text>
      </View>
      {loadError ? <Empty title={loadError} /> : null}
      {!loadError && items.length === 0 ? (
        <View>
          <Empty title={q || cat !== "Tous" ? tr("Aucun événement trouvé") : tr("Aucun événement à venir")} />
          <Btn label={tr("Créer un événement")} onPress={() => push({ name: "create-lifestyle" })} />
        </View>
      ) : null}
      {items.map((e) => {
        const src = e.image ? (e.image.startsWith("http") ? { uri: e.image } : wippSrc(e.image)) : null;
        const start = e.startsAt ? new Date(e.startsAt) : null;
        const end = e.endsAt ? new Date(e.endsAt) : null;
        const saved = saves.some((x) => x.kind === "event" && x.id === e.id);
        return (
          <EventCard
            key={e.id}
            title={e.title}
            subtitle={(e.details || e.note || e.place || "").split("\n")[0]}
            image={src}
            starts={start && !Number.isNaN(start.getTime()) ? start : null}
            ends={end && !Number.isNaN(end.getTime()) ? end : null}
            city={e.city}
            online={e.isOnline}
            live={e.live ? liveBadge(e.live) : null}
            priceLabel={eventAccessText(e).toUpperCase()}
            interested={
              e.live
                ? e.live.registered != null
                  ? { count: e.live.registered, avatars: e.live.registeredAvatars, label: e.live.registered > 1 ? tr("{0} inscrits", e.live.registered) : tr("{0} inscrit", e.live.registered) }
                  : undefined
                : { count: e.interestedCount ?? 0, avatars: e.interestedAvatars ?? [] }
            }
            distance={myPos && e.lat && !e.isOnline ? kmLabel(kmBetween(myPos, { lat: e.lat, lng: e.lng })) : undefined}
            saved={saved}
            onPress={() => push({ name: "lifestyle", itemId: e.id })}
            onSave={() => {
              void import("../lib/lot7/api").then(async ({ toggleSave }) => {
                await toggleSave("event", e.id, !saved);
                useWippStore.setState((s) => ({
                  saves: saved ? s.saves.filter((x) => !(x.kind === "event" && x.id === e.id)) : [...s.saves, { kind: "event", id: e.id }],
                }));
              });
            }}
          />
        );
      })}
    </View>
  );
}

export function ListingScreen({ listingId }: { listingId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const listing = useWippStore((s) => s.listings.find((l) => l.id === listingId));
  const all = useWippStore((s) => s.listings);
  const seller = useWippStore((s) => (listing ? s.users[listing.sellerId] : undefined));
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const saved = useWippStore((s) => s.saves.some((item) => item.kind === "listing" && item.id === listingId));
  const [index, setIndex] = useState(0);
  const { width } = useDeviceLayout();
  const [stats, setStats] = useState<import("../lib/lot7/api").ListingStats | null>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const mine = Boolean(listing) && (listing!.sellerId === "me" || listing!.sellerId === useWippStore.getState().serverProfileId);
  useEffect(() => {
    if (!listingId) return;
    let off = false;
    void import("../lib/lot7/api").then(async ({ viewListing, listingStats }) => {
      if (!mine) await viewListing(listingId);
      const st = await listingStats(listingId).catch(() => null);
      if (!off) setStats(st);
    });
    void import("../lib/geo").then(({ myPositionOnce }) => myPositionOnce()).then((p) => {
      if (!off && p) setMyPos(p);
    });
    return () => {
      off = true;
    };
  }, [listingId, mine]);
  if (!listing) return <Missing onBack={pop} />;
  const pics = (listing.photos?.length ? listing.photos : listing.image ? [listing.image] : []).map((u) => (u.startsWith("http") ? { uri: u } : wippSrc(u)));
  const similar = all.filter((l) => l.id !== listing.id && l.category === listing.category).slice(0, 8);
  const ago = listing.createdAt ? timeAgo(listing.createdAt) : "";
  const openOptions = () => {
              if (mine) {
                Alert.alert(tr("Annonce"), undefined, [
                  { text: tr("Modifier"), onPress: () => push({ name: "create-listing", listingId: listing.id }) },
                  {
                    text: tr("Supprimer l’annonce"),
                    style: "destructive",
                    onPress: () => {
                      void import("../lib/lot7/api").then(async ({ removeListing }) => {
                        await removeListing(listing.id);
                        useWippStore.setState((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
                        pop();
                      });
                    },
                  },
                  { text: tr("Annuler"), style: "cancel" },
                ]);
                return;
              }
              Alert.alert(tr("Annonce"), undefined, [
                {
                  text: tr("Signaler l’annonce"),
                  onPress: () => {
                    Alert.alert(tr("Signaler l’annonce"), undefined, [
                      ...REPORT_REASONS.map((reason) => ({
                        text: tr(reason),
                        onPress: () => {
                          void submitContentReport({
                            contentType: "listing",
                            contentId: listing.id,
                            targetProfileId: listing.sellerId,
                            reason,
                          }).then(
                            () => Alert.alert(tr("Signalement"), tr("Signalement envoyé.")),
                            (err) => Alert.alert(tr("Signalement"), errorText(err, tr("Signalement impossible."))),
                          );
                        },
                      })),
                      { text: tr("Annuler"), style: "cancel" as const },
                    ]);
                  },
                },
                {
                  text: tr("Masquer l’annonce"),
                  onPress: () => {
                    useWippStore.setState((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
                    pop();
                  },
                },
                {
                  text: tr("Bloquer cet utilisateur"),
                  style: "destructive",
                  onPress: () => {
                    Alert.alert(tr("Bloquer"), tr("Bloquer cette personne ?"), [
                      { text: tr("Annuler"), style: "cancel" },
                      {
                        text: tr("Bloquer"),
                        style: "destructive",
                        onPress: () => {
                          useWippStore.getState().blockUser(listing.sellerId);
                          pop();
                        },
                      },
                    ]);
                  },
                },
                { text: tr("Annuler"), style: "cancel" },
              ]);
            };
  const toggleSaved = () => {
    const on = saved;
    void import("../lib/lot7/api").then(async ({ toggleSave }) => {
      try {
        await toggleSave("listing", listing.id, !on);
        useWippStore.setState((s) => ({
          saves: on ? s.saves.filter((x) => !(x.kind === "listing" && x.id === listing.id)) : [...s.saves, { kind: "listing", id: listing.id }],
        }));
      } catch (err) {
        Alert.alert(tr("Enregistrés"), errorText(err, tr("Enregistrement impossible.")));
      }
    });
  };
  const contact = (text?: string) => {
    if (!seller) return;
    openOrCreateDm(seller.id);
    // "Faire une offre": open the chat with a ready-to-complete message.
    const top = useWippStore.getState().stack.at(-1);
    if (text && top?.name === "conversation") useWippStore.getState().setDraftFor(top.chatId, text);
  };
  const card = { marginHorizontal: 14, marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: whiteA(0.06) };
  const action = (on: boolean) => ({ flex: 1, minHeight: 52, borderRadius: 14, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, backgroundColor: on ? colors.accent : "transparent", borderWidth: 1, borderColor: on ? colors.accent : whiteA(0.18) });
  const specs = [
    [tr("Catégorie"), listingCatLabel(listing.category)],
    [tr("État"), listing.condition ? CONDITION_LABEL[listing.condition] : ""],
    [tr("Prix"), listingPriceText(listing)],
    [tr("Ville"), [listing.city, listing.country].filter(Boolean).join(", ")],
    [tr("Contact"), listing.contactPhone ? tr("Téléphone ou chat") : tr("Chat WIPP")],
  ].filter(([, v]) => v);
  return (
    <ScreenRoot>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ height: 300, backgroundColor: colors.navy }}>
          {pics.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))}>
              {pics.map((src, i) => (
                <Image key={i} source={src} style={{ width, height: 300 }} contentFit="cover" />
              ))}
            </ScrollView>
          ) : null}
          <View style={{ position: "absolute", top: 44, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" }}>
            <Press accessibilityLabel={tr("Retour")} onPress={pop} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color="#fff" />
            </Press>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Press accessibilityLabel={tr("Partager")} onPress={() => void Share.share({ message: tr("{0} · {1} sur WIPP", listing.title, listingPriceText(listing)) })} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                <Share2 size={20} color="#fff" />
              </Press>
              {mine ? null : (
                <Press accessibilityLabel={tr("Enregistrer")} onPress={toggleSaved} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                  <Heart size={20} color={saved ? colors.accent : "#fff"} fill={saved ? colors.accent : "transparent"} />
                </Press>
              )}
            </View>
          </View>
          {pics.length > 1 ? (
            <View style={{ position: "absolute", right: 14, bottom: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)" }}>
              <Text style={{ color: "#fff", fontSize: 12 }}>{index + 1}/{pics.length}</Text>
            </View>
          ) : null}
        </View>
        {pics.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingTop: 10 }}>
            {pics.map((src, i) => (
              <Image key={i} source={src} style={{ width: 62, height: 62, borderRadius: 10, borderWidth: i === index ? 2 : 0, borderColor: colors.accent }} contentFit="cover" />
            ))}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
          <Text style={{ color: colors.fg, fontSize: 24, fontFamily: "Inter_800ExtraBold" }}>{listing.title}</Text>
          <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: colors.accent, fontSize: 26, fontFamily: "Inter_800ExtraBold" }}>{listingPriceText(listing).replace(/ · négociable$/, "")}</Text>
            {listing.negotiable ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.accent }}>
                <Text style={{ color: colors.accent, fontSize: 12 }}>{tr("Négociable")}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Tag size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>{listingCatLabel(listing.category)}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <MapPin size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>{[listing.area, listing.city].filter(Boolean).join(", ") || tr("Ville à préciser")}</Text>
            </View>
            {myPos && listing.lat != null && listing.lng != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Navigation size={14} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 12 }}>{kmLabel(kmBetween(myPos, { lat: listing.lat, lng: listing.lng }))}</Text>
              </View>
            ) : null}
            {ago ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Clock size={14} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 12 }}>{listing.publishAt && listing.publishAt > Date.now() ? tr("Programmée {0}", ago.replace("il y a", "dans")) : tr("Publié {0}", ago)}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Eye size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>{stats?.views ?? listing.views ?? 0} {tr("vue")}{(stats?.views ?? listing.views ?? 0) > 1 ? "s" : ""}</Text>
            </View>
            {listing.boosted ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: accentA(0.15) }}>
                <Pin size={12} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{tr("En avant")}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {seller && !mine ? (
          <View style={[card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <Avatar user={seller} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{seller.displayName}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {tr("Membre WIPP")}{stats?.memberSince ? tr(" depuis {0}", new Date(stats.memberSince).getFullYear()) : ""}
              </Text>
              <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <StarsInput value={stats?.myRating ?? 0} average={stats?.rating ?? null} onRate={(n) => {
                  void import("../lib/lot7/api").then(async ({ rateSeller, listingStats }) => {
                    try {
                      await rateSeller(listing.sellerId, n);
                      setStats(await listingStats(listing.id));
                    } catch (err) {
                      Alert.alert(tr("Note"), errorText(err, tr("Note impossible.")));
                    }
                  });
                }} />
                <Text style={{ color: colors.fg, fontSize: 12 }}>
                  {stats?.rating != null ? `${String(stats.rating).replace(".", ",")} (${stats.ratingCount})` : tr("Pas encore noté")}
                  {stats ? tr(" · {0} annonce{1}", stats.sellerListings, stats.sellerListings > 1 ? "s" : "") : ""}
                </Text>
              </View>
            </View>
            <Press onPress={() => push({ name: "found-profile", userId: seller.id, via: "username" })} style={{ paddingHorizontal: 12, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.accent, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{tr("Voir le profil")}</Text>
              <ChevronRight size={14} color={colors.accent} />
            </Press>
          </View>
        ) : null}

        {mine ? (
          <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 14, marginTop: 12 }}>
            <Press onPress={() => push({ name: "create-listing", listingId: listing.id })} style={action(true)}>
              <Pencil size={18} color={colors.accentFg} />
              <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold" }}>{tr("Modifier")}</Text>
            </Press>
            <Press onPress={openOptions} style={action(false)}>
              <MoreHorizontal size={18} color={colors.fg} />
              <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{tr("Supprimer…")}</Text>
            </Press>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 14, marginTop: 12 }}>
            <Press onPress={() => contact()} style={[action(true), { flexBasis: "47%" }]}>
              <MessageCircle size={18} color={colors.accentFg} />
              <View>
                <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold" }}>{tr("Chat WIPP")}</Text>
                <Text style={{ color: colors.accentFg, fontSize: 11 }}>{tr("Réponse rapide")}</Text>
              </View>
            </Press>
            {listing.contactPhone ? (
              <Press onPress={() => void Linking.openURL(`tel:${listing.contactPhone!.replace(/\s/g, "")}`)} style={[action(false), { flexBasis: "47%" }]}>
                <Phone size={18} color={colors.fg} />
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{tr("Appeler")}</Text>
              </Press>
            ) : null}
            {/^gratuit|^échange/i.test(listing.price.trim()) ? null : (
              <Press onPress={() => contact(tr("Bonjour ! Ton annonce « {0} » m’intéresse. Je te propose : ", listing.title))} style={[action(false), { flexBasis: "47%" }]}>
                <Tag size={18} color={colors.fg} />
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{tr("Faire une offre")}</Text>
              </Press>
            )}
            <Press onPress={toggleSaved} style={[action(false), { flexBasis: "47%" }]}>
              <Heart size={18} color={saved ? colors.accent : colors.fg} fill={saved ? colors.accent : "transparent"} />
              <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{saved ? tr("Enregistré") : tr("Enregistrer")}</Text>
            </Press>
          </View>
        )}

        <View style={card}>
          <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold" }}>{tr("Description")}</Text>
          <Text style={{ marginTop: 8, color: fgA(0.85), lineHeight: 21 }}>{listing.description || tr("Pas de description.")}</Text>
          <View style={{ marginTop: 14, borderRadius: 12, backgroundColor: whiteA(0.04), padding: 12, gap: 8 }}>
            {specs.map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row" }}>
                <Text style={{ width: 90, color: colors.muted, fontSize: 13 }}>{k}</Text>
                <Text style={{ flex: 1, color: colors.fg, fontSize: 13 }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={card}>
          <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10 }}>{tr("Lieu")}</Text>
          {listing.lat != null && listing.lng != null ? <MiniMap lat={listing.lat} lng={listing.lng} /> : null}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MapPin size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{[listing.area, listing.city].filter(Boolean).join(", ") || tr("À préciser par message")}</Text>
              {myPos && listing.lat != null && listing.lng != null ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>{kmLabel(kmBetween(myPos, { lat: listing.lat, lng: listing.lng }))} {tr("de ta position")}</Text>
              ) : listing.country ? <Text style={{ color: colors.muted, fontSize: 12 }}>{listing.country}</Text> : null}
            </View>
          </View>
          {listing.lat != null && listing.lng != null ? (
            <Press
              onPress={() => {
                const q = encodeURIComponent([listing.area, listing.city].filter(Boolean).join(", "));
                const url = Platform.OS === "ios" ? `http://maps.apple.com/?ll=${listing.lat},${listing.lng}&q=${q}` : `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`;
                void Linking.openURL(url);
              }}
              style={{ marginTop: 12, height: 46, borderRadius: 999, borderWidth: 1, borderColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Navigation size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>{tr("Voir sur la carte")}</Text>
            </Press>
          ) : null}
        </View>

        {mine ? null : (
          <Press onPress={openOptions} style={[card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <ShieldAlert size={20} color={colors.fg} />
            <Text style={{ flex: 1, color: colors.fg }}>{tr("Signaler ou masquer cette annonce")}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Press>
        )}

        {similar.length ? (
          <View style={{ marginTop: 18 }}>
            <Text style={{ paddingHorizontal: 18, color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10 }}>{tr("Annonces similaires")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 14 }}>
              {similar.map((l) => {
                const src = l.image ? (l.image.startsWith("http") ? { uri: l.image } : wippSrc(l.image)) : null;
                return (
                  <Press key={l.id} onPress={() => push({ name: "listing", listingId: l.id })} style={{ width: 150, borderRadius: 14, overflow: "hidden", backgroundColor: colors.card }}>
                    {src ? <Image source={src} style={{ width: 150, height: 110 }} contentFit="cover" /> : <View style={{ width: 150, height: 110, backgroundColor: colors.navy }} />}
                    <View style={{ padding: 10 }}>
                      <Text numberOfLines={2} style={{ color: colors.fg, fontSize: 13 }}>{l.title}</Text>
                      <Text style={{ marginTop: 4, color: colors.accent, fontFamily: "Inter_700Bold" }}>{listingPriceText(l)}</Text>
                    </View>
                  </Press>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </ScreenRoot>
  );
}

/** 5 stars: shows the average, tap to give your own rating. */
function StarsInput({ value, average, onRate }: { value: number; average: number | null; onRate: (n: number) => void }) {
  const shown = value || Math.round(average ?? 0);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Press key={n} accessibilityLabel={tr("Noter {0} sur 5", n)} onPress={() => onRate(n)} style={{ padding: 2 }}>
          <Star size={14} color={colors.accent} fill={n <= shown ? colors.accent : "transparent"} />
        </Press>
      ))}
    </View>
  );
}

/** Static OpenStreetMap mini-map (5×3 tiles) with a pin; no native map module needed. */
function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const { zoom, x, y, fx, fy } = osmTile({ lat, lng }, 14);
  const T = 120;
  return (
    <View style={{ height: 150, borderRadius: 14, overflow: "hidden", backgroundColor: colors.navy }}>
      <View style={{ position: "absolute", left: "50%", top: 75, width: T * 5, height: T * 3, marginLeft: -(2 * T + fx * T), marginTop: -(T + fy * T) }}>
        {[-1, 0, 1].map((dy) =>
          [-2, -1, 0, 1, 2].map((dx) => (
            <Image
              key={`${dx}${dy}`}
              source={{ uri: `https://tile.openstreetmap.org/${zoom}/${x + dx}/${y + dy}.png` }}
              style={{ position: "absolute", left: (dx + 2) * T, top: (dy + 1) * T, width: T, height: T, opacity: 0.85 }}
            />
          )),
        )}
      </View>
      <View style={{ position: "absolute", left: "50%", top: 75, marginLeft: -14, marginTop: -30 }}>
        <MapPin size={28} color={colors.accent} fill={accentA(0.35)} />
      </View>
      <Text style={{ position: "absolute", right: 6, bottom: 4, color: "rgba(0,0,0,0.6)", fontSize: 9 }}>{tr("© OpenStreetMap")}</Text>
    </View>
  );
}

/** "il y a 3 heures" style label. */
function timeAgo(ms: number) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 3600) return tr("il y a {0} min", Math.max(1, Math.round(s / 60)));
  if (s < 86400) return tr("il y a {0} h", Math.round(s / 3600));
  const d = Math.round(s / 86400);
  return d < 30 ? (d > 1 ? tr("il y a {0} jours", d) : tr("il y a 1 jour")) : tr("le {0}", new Date(ms).toLocaleDateString("fr-CA"));
}

export function PharmacyScreen({ pharmacyId }: { pharmacyId: string }) {
  const pop = useWippStore((s) => s.pop);
  const p = useWippStore((s) => s.pharmacies.find((x) => x.id === pharmacyId));
  if (!p) return <Missing onBack={pop} />;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={p.name} onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.fg }}>{p.address}</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>{p.city} · {p.chain}</Text>
        <Text style={{ color: colors.accent, marginTop: 8 }}>{p.onDuty ? tr("De garde jusqu’à {0}", p.until) : p.phone}</Text>
      </View>
    </ScreenRoot>
  );
}

export function ShopScreen({ shopId }: { shopId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const shop = useWippStore((s) => s.shops.find((s) => s.id === shopId));
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const src = wippSrc(shop?.image);
  if (!shop) return <Missing onBack={pop} />;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={shop.name} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {src ? <Image source={src} style={{ height: 180, width: "100%" }} contentFit="cover" /> : null}
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.muted }}>@{shop.handle} · {shop.city}</Text>
          <Text style={{ marginTop: 8, color: colors.fg }}>{shop.bio}</Text>
          <Text style={{ marginTop: 8, color: colors.muted }}>{shop.hours}</Text>
          <Btn
            label={tr("Écrire sur WIPP")}
            onPress={() => {
              if (shop.id.startsWith("business:")) {
                void useWippStore.getState().openBusinessChat(shop.handle).catch((err) => {
                  Alert.alert(tr("Message"), errorText(err, tr("Conversation impossible")));
                });
                return;
              }
              openOrCreateDm(shop.ownerId);
            }}
            style={{ marginTop: 20 }}
          />
          <Btn
            label={tr("Carte professionnelle")}
            variant="secondary"
            onPress={() => push({ name: "business-card-view", publicId: shop.id.startsWith("business:") ? shop.handle : shop.id })}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

export function LifestyleScreen({ itemId }: { itemId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const item = useWippStore((s) => s.lifestyle.find((x) => x.id === itemId));
  const serverProfileId = useWippStore((s) => s.serverProfileId);
  const saved = useWippStore((s) => s.saves.some((entry) => entry.kind === "event" && entry.id === itemId));
  const src = wippSrc(item?.image);
  // Opened from a notification or an invitation link: load the events first.
  const [loading, setLoading] = useState(!item);
  useEffect(() => {
    if (item) return;
    void import("../lib/lot7/api")
      .then(async ({ fetchEvents }) => useWippStore.setState({ lifestyle: await fetchEvents(useWippStore.getState().serverProfileId) }))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [itemId]);
  if (!item) return loading ? <ScreenRoot><ActivityIndicator style={{ marginTop: 120 }} color={colors.accent} /></ScreenRoot> : <Missing onBack={pop} />;
  const mine = item.hostId === "me" || (serverProfileId != null && item.hostId === `srvuser:${serverProfileId}`);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={item.title} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {src ? <Image source={src} style={{ height: 200, width: "100%" }} contentFit="cover" /> : null}
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.muted }}>{[item.category, item.when, item.endsAt && !Number.isNaN(Date.parse(item.endsAt)) ? `→ ${new Date(item.endsAt).toLocaleString()}` : ""].filter(Boolean).join(" · ")}</Text>
          {item.live ? null : (
            <>
              <Text style={{ marginTop: 8, color: colors.fg }}>{item.isOnline ? [tr("En ligne"), item.onlineUrl].filter(Boolean).join(" · ") : [item.place, item.address, item.city, item.country].filter(Boolean).join(" · ")}</Text>
              <Text style={{ marginTop: 8, color: colors.accent }}>{eventAccessText(item)}</Text>
            </>
          )}
          {item.hostName ? <Text style={{ marginTop: 8, color: colors.muted }}>{tr("Organisé par")} {item.hostName}</Text> : null}
          <Text style={{ marginTop: 12, color: colors.fg }}>{item.details || item.note}</Text>
          {item.contact ? <Text style={{ marginTop: 8, color: colors.muted }}>{item.contact}</Text> : null}
          {item.adultOnly || item.capacity ? (
            <Text style={{ marginTop: 8, color: colors.muted }}>
              {[item.adultOnly ? tr("🔞 Réservé aux 18 ans et plus") : "", item.capacity ? tr("{0} places", item.capacity) : ""].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          {item.live ? (
            <EventLiveActions eventId={item.id} startsAt={item.startsAt} />
          ) : mine ? (
            <Text style={{ marginTop: 16, color: colors.fg }}>
              {item.interestedCount ? tr("{0} personne{1} intéressée{2}", item.interestedCount, item.interestedCount > 1 ? "s" : "", item.interestedCount > 1 ? "s" : "") : tr("Personne n’est encore intéressé.")}
            </Text>
          ) : (
            <Btn
              label={item.interestedMe ? tr("✓ Intéressé·e ({0})", item.interestedCount ?? 1) : tr("Je suis intéressé·e{0}", item.interestedCount ? ` · ${item.interestedCount}` : "")}
              variant={item.interestedMe ? "secondary" : undefined}
              onPress={() => {
                const on = !item.interestedMe;
                // Optimistic: flip now, the server confirms in the background.
                useWippStore.setState((s) => ({
                  lifestyle: s.lifestyle.map((x) =>
                    x.id === item.id ? { ...x, interestedMe: on, interestedCount: Math.max(0, (x.interestedCount ?? 0) + (on ? 1 : -1)) } : x,
                  ),
                }));
                void import("../lib/lot7/api").then(({ toggleInterest }) =>
                  toggleInterest(item.id, on).catch((err) => Alert.alert(tr("Événement"), errorText(err, tr("Action impossible.")))),
                );
              }}
              style={{ marginTop: 20 }}
            />
          )}
          <Btn
            label={saved ? tr("Retirer des enregistrés") : tr("Enregistrer")}
            onPress={() => {
              const on = saved;
              void import("../lib/lot7/api").then(async ({ toggleSave }) => {
                try {
                  await toggleSave("event", item.id, !on);
                  useWippStore.setState((s) => ({
                    saves: on
                      ? s.saves.filter((x) => !(x.kind === "event" && x.id === item.id))
                      : [...s.saves, { kind: "event", id: item.id }],
                  }));
                } catch (err) {
                  Alert.alert(tr("Enregistrés"), errorText(err, tr("Enregistrement impossible.")));
                }
              });
            }}
            style={{ marginTop: 20 }}
          />
          {mine ? (
            <>
              <Btn label={tr("Modifier")} variant="secondary" onPress={() => push({ name: "create-lifestyle", eventId: item.id })} style={{ marginTop: 8 }} />
              <Btn
                label={tr("Supprimer l’événement")}
                variant="secondary"
                onPress={() => {
                  Alert.alert(tr("Événement"), tr("Supprimer cet événement ?"), [
                    { text: tr("Annuler"), style: "cancel" },
                    {
                      text: tr("Supprimer"),
                      style: "destructive",
                      onPress: () => {
                        void import("../lib/lot7/api").then(async ({ removeEvent }) => {
                          await removeEvent(item.id);
                          useWippStore.setState((s) => ({ lifestyle: s.lifestyle.filter((x) => x.id !== item.id) }));
                          pop();
                        }).catch((err) => Alert.alert(tr("Événement"), errorText(err, tr("Suppression impossible."))));
                      },
                    },
                  ]);
                }}
                style={{ marginTop: 8 }}
              />
            </>
          ) : null}
          {!mine ? (
            <Press
              accessibilityLabel={tr("Signaler l’événement")}
              onPress={() => {
                Alert.alert(tr("Signaler l’événement"), undefined, [
                  ...REPORT_REASONS.map((reason) => ({
                    text: tr(reason),
                    onPress: () => {
                      // Events share the listings' report queue; « event: » tells the moderators what it is.
                      void submitContentReport({ contentType: "listing", contentId: `event:${item.id}`, targetProfileId: item.hostId?.startsWith("srvuser:") ? item.hostId : null, reason }).then(
                        () => Alert.alert(tr("Signalement envoyé"), tr("Merci. L’équipe WIPP va l’examiner.")),
                        (err) => Alert.alert(tr("Signalement"), errorText(err, tr("Signalement impossible."))),
                      );
                    },
                  })),
                  { text: tr("Annuler"), style: "cancel" as const },
                ]);
              }}
              style={{ marginTop: 18, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 }}
            >
              <Text style={{ color: colors.muted, fontSize: 13, textDecorationLine: "underline" }}>{tr("Signaler l’événement")}</Text>
            </Press>
          ) : null}
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

function Field({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ height: 48, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 12, marginTop: 8 }} />
  );
}

async function currentOwner() {
  const known = useWippStore.getState().serverProfileId;
  if (known) return known;
  const { myProfileId } = await import("../lib/lot7/api");
  const id = await myProfileId();
  useWippStore.setState({ serverProfileId: id });
  return id;
}

function CreateForm({ title, onBack, listingId, eventId }: { title: string; onBack: () => void; listingId?: string; eventId?: string }) {
  const existing = useWippStore((s) => (listingId ? s.listings.find((item) => item.id === listingId) : undefined));
  const existingEvent = useWippStore((s) => (eventId ? s.lifestyle.find((item) => item.id === eventId) : undefined));
  const [name, setName] = useState(existing?.title ?? existingEvent?.title ?? "");
  const [desc, setDesc] = useState(existing?.description ?? existingEvent?.note ?? "");
  const [city, setCity] = useState(existing?.city ?? existingEvent?.city ?? "");
  const [price, setPrice] = useState(existing?.price ?? existingEvent?.place ?? "");
  const [starts, setStarts] = useState(existingEvent?.startsAt ?? "");
  const [error, setError] = useState("");
  const event = title.toLowerCase().includes(tr("événement"));
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={onBack} />
      </GlassHeader>
      <View style={{ padding: 16 }}>
        <Field value={name} onChangeText={setName} placeholder={tr("Titre")} />
        <Field value={desc} onChangeText={setDesc} placeholder={event ? tr("Description") : tr("Description")} />
        <Field value={city} onChangeText={setCity} placeholder={tr("Ville")} />
        {event ? <Field value={price} onChangeText={setPrice} placeholder={tr("Lieu")} /> : <Field value={price} onChangeText={setPrice} placeholder={tr("Prix")} />}
        {event ? <Field value={starts} onChangeText={setStarts} placeholder={tr("Date AAAA-MM-JJ (facultatif)")} /> : null}
        {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
        <Btn
          label={tr("Enregistrer")}
          onPress={() => {
            void (async () => {
              if (event) {
                if (!name.trim()) {
                  setError(tr("Le titre est requis."));
                  return;
                }
                const me = await currentOwner();
                const { saveEvent, fetchEvents } = await import("../lib/lot7/api");
                await saveEvent({
                  id: eventId,
                  title: name.trim(),
                  description: desc.trim(),
                  city: city.trim(),
                  place: price.trim(),
                  starts: starts.trim(),
                  photo: existingEvent?.coverPath || null,
                  contact: existingEvent?.contact,
                  ends: existingEvent?.endsAt,
                  category: existingEvent?.category,
                  country: existingEvent?.country,
                  address: existingEvent?.address,
                  online: existingEvent?.isOnline,
                  url: existingEvent?.onlineUrl,
                  free: existingEvent?.isFree,
                  price: existingEvent?.price,
                  currency: existingEvent?.currency,
                });
                useWippStore.setState({ lifestyle: await fetchEvents(me) });
              } else if (title.toLowerCase().includes("annonce")) {
                if (!name.trim() || !city.trim()) {
                  setError(tr("Le titre et la ville sont requis."));
                  return;
                }
                const me = await currentOwner();
                const { saveListing, fetchListings } = await import("../lib/lot7/api");
                await saveListing({
                  id: listingId,
                  title: name.trim(),
                  description: desc.trim(),
                  category: existing?.category ?? "goods",
                  price,
                  city: city.trim(),
                  photo: existing?.photoPaths?.[0] ?? null,
                  photos: existing?.photoPaths ?? null,
                  country: existing?.country,
                  area: existing?.area,
                  phone: existing?.contactPhone,
                  negotiable: existing?.negotiable,
                  currency: existing?.currency,
                  condition: existing?.condition,
                });
                useWippStore.setState({ listings: await fetchListings(me) });
              } else {
                setError(tr("Les entreprises passent par la carte professionnelle."));
                return;
              }
              onBack();
            })().catch((err) => setError(errorText(err, tr("Enregistrement impossible"))));
          }}
          style={{ marginTop: 16 }}
        />
      </View>
    </ScreenRoot>
  );
}

export function CreateShopScreen() {
  const pop = useWippStore((s) => s.pop);
  return <CreateForm title={tr("Créer une entreprise")} onBack={pop} />;
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="" onBack={onBack} />
      </GlassHeader>
      <Empty title={tr("Introuvable")} />
    </ScreenRoot>
  );
}

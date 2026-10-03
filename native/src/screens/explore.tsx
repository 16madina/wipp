import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { Calendar, ChevronLeft, Cross, Heart, Plus, Store, Tag } from "lucide-react-native";
import { Btn, Chip, Empty, GlassHeader, Header, IconBtn, PendingNote, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { useDeviceLayout } from "../lib/device-layout";
import { formatMeters, metersBetween } from "../lib/format";
import { SHOP_CAT_KEYS } from "../lib/i18n";
import { useT, useWippStore } from "../lib/store";
import { cardToShop, listPublicBusinessCards, withSignedCardMedia } from "../lib/business-card";
import { REPORT_REASONS, submitContentReport } from "../lib/safety";
import type { Listing, Shop, ShopCategory } from "../lib/types";
import { colors, layout } from "../theme";

const CATS = ["all", "auto", "home", "goods", "jobs", "services"] as const;
const GEO = { lat: 45.531, lng: -73.518 };
type Hub = "home" | "listings" | "utilities" | "shops" | "lifestyle";

const HUB_BACKGROUNDS = {
  listings: require("../../assets/wipp/media/apt.webp"),
  utilities: require("../../assets/wipp/media/chair.webp"),
  shops: require("../../assets/wipp/media/shop-chen-hero.webp"),
  lifestyle: require("../../assets/wipp/media/soccer.webp"),
} as const;

const CONDITION_LABEL: Record<NonNullable<Listing["condition"]>, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  used: "Usagé",
};

function listingPriceText(listing: Listing) {
  const raw = listing.price.trim();
  const negotiable = Boolean(listing.negotiable);
  if (/^gratuit/i.test(raw)) return negotiable ? "Gratuit · négociable" : raw || "Gratuit";
  const money = listing.currency && raw && !raw.includes(listing.currency) ? `${raw} ${listing.currency}` : raw;
  if (!money) return negotiable ? "Prix négociable" : "";
  return negotiable && !/négociable/i.test(money) ? `${money} · négociable` : money;
}

function isUpcomingEvent(item: { startsAt?: string; endsAt?: string }) {
  const end = item.endsAt ? Date.parse(item.endsAt) : Number.NaN;
  const start = item.startsAt ? Date.parse(item.startsAt) : Number.NaN;
  const deadline = Number.isNaN(end) ? start : end;
  if (Number.isNaN(deadline)) return true;
  return deadline >= Date.now() - 60_000;
}

function eventAccessText(item: { isFree?: boolean; price?: string; currency?: string }) {
  if (item.isFree === false) return [item.price, item.currency].filter(Boolean).join(" ") || "Payant";
  return "Gratuit";
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
            <IconBtn label="Créer une annonce" onPress={() => push({ name: "create-listing" })}>
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
          <SearchField placeholder={hub === "shops" ? "Rechercher une boutique ..." : t("exploreAsk")} value={q} onChangeText={setQ} />
        </View>
        {!searching && tabbed ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
            {([
              ["home", "Tous"],
              ["shops", "Boutiques"],
              ["lifestyle", "Événements"],
              ["utilities", "Utility"],
            ] as const).map(([id, label]) => (
              <Chip key={id} label={label} active={hub === id} onPress={() => setHub(id)} />
            ))}
          </ScrollView>
        ) : null}
        {hub === "listings" && !searching ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
            {CATS.map((c) => (
              <Chip key={c} label={c === "all" ? t("all") : c} active={cat === c} onPress={() => setCat(c)} />
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

function ExploreHome({ go }: { go: (h: Hub) => void }) {
  const t = useT();
  const { tile } = useDeviceLayout();
  const hubW = tile(2, 16, 12);
  const lang = useWippStore((s) => s.language);
  const listings = useWippStore((s) => s.listings);
  const allShops = useWippStore((s) => s.shops);
  const realShops = allShops.filter((s) => s.id.startsWith("business:"));
  const serverConnected = useWippStore((s) => s.serverConnected);
  const shops = serverConnected ? realShops : realShops.length ? realShops : allShops;
  const events = useWippStore((s) => s.lifestyle);
  const pharmacies = useWippStore((s) => s.pharmacies);
  const push = useWippStore((s) => s.push);
  const near = [
    ...shops.map((s) => ({
      key: `s-${s.id}`,
      meters: metersBetween(GEO, s),
      title: s.name,
      sub: shopCatLabel(s.category, t),
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
      meters: metersBetween(GEO, e),
      title: e.title,
      sub: e.kind,
      image: e.image,
      onPress: () => push({ name: "lifestyle" as const, itemId: e.id }),
    })),
    ...pharmacies.filter((p) => p.onDuty).map((p) => ({
      key: `p-${p.id}`,
      meters: metersBetween(GEO, p),
      title: p.name,
      sub: t("onDuty"),
      image: "",
      onPress: () => push({ name: "pharmacy" as const, pharmacyId: p.id }),
    })),
  ]
    .sort((a, b) => a.meters - b.meters)
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
          <Press key={h.title} onPress={h.go} style={{ width: hubW, minHeight: 100, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, padding: 14, borderWidth: 1, borderColor: colors.hair }}>
            <Image source={HUB_BACKGROUNDS[h.kind]} contentFit="cover" style={{ position: "absolute", inset: 0, opacity: 0.32 }} />
            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(2,8,30,0.46)" }} />
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
                <Text numberOfLines={1} style={{ fontSize: 11, color: colors.muted }}>{formatMeters(row.meters, lang)} · {row.sub}</Text>
              </View>
            </Press>
          );
        })}
      </ScrollView>
      <Text style={{ marginTop: 8, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.muted }}>Populaire</Text>
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
        <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium", fontSize: 15 }}>{listing.title}</Text>
        <Text style={{ color: colors.accent, marginTop: 2 }}>{listingPriceText(listing)}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{listing.city} · {listing.distance}</Text>
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
        if (!cancel) setError(err instanceof Error ? err.message : "Recherche impossible.");
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
      {loading ? <Empty title="Recherche…" /> : null}
      {error ? <Empty title={error} /> : null}
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
      {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
      {events.map((e) => (
        <Press key={e.id} onPress={() => useWippStore.getState().push({ name: "lifestyle", itemId: e.id })} style={{ paddingVertical: 10 }}>
          <Text style={{ color: colors.fg }}>{e.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{e.city}</Text>
        </Press>
      ))}
      {!loading && !error && listings.length + shops.length + events.length === 0 ? <Empty title="Aucun résultat" /> : null}
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
        if (!cancel) setLoadError(err instanceof Error ? err.message : "Impossible de charger les annonces.");
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
          <Empty title="Aucune annonce pour le moment" />
          <Btn label="Créer une annonce" onPress={() => push({ name: "create-listing" })} />
        </View>
      ) : null}
    </View>
  );
}

function UtilitiesPane() {
  const pharmacies = useWippStore((s) => s.pharmacies);
  const serverConnected = useWippStore((s) => s.serverConnected);
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
      <PendingNote label="Services vérifiés uniquement. Aucune source externe branchée." />
      {serverConnected && services.length === 0 && shown.length === 0 ? <Empty title="Aucun service vérifié" /> : null}
      {services.map((p) => (
        <View key={p.id} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{p.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{p.category} · {p.city}{p.address ? ` · ${p.address}` : ""}</Text>
        </View>
      ))}
      {shown.map((p) => (
        <Press key={p.id} onPress={() => push({ name: "pharmacy", pharmacyId: p.id })} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{p.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{p.address}{p.onDuty ? " · De garde" : ""}</Text>
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
        if (!cancel) setError(err instanceof Error ? err.message : "Recherche impossible.");
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
  const chats = useWippStore((s) => s.chats);
  const needle = fold(q);
  const people = useMemo(
    () => Object.values(users).filter((u) => fold(`${u.displayName} ${u.username}`).includes(needle)),
    [users, needle],
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
          ["all", "Tout"],
          ["shops", "Boutiques"],
          ["users", "Utilisateurs"],
          ["groups", "Groupes"],
        ] as const).map(([id, label]) => (
          <Chip key={id} label={label} active={kind === id} onPress={() => setKind(id)} />
        ))}
      </ScrollView>
      {loading ? <Empty title="Recherche…" /> : null}
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
              <Text style={{ color: colors.muted, fontSize: 12 }}>Groupe</Text>
            </Press>
          ))
        : null}
      {empty ? <Empty title="Aucun résultat" /> : null}
    </View>
  );
}

function shopPlace(shop: Shop, t: ReturnType<typeof useT>) {
  const bits = [shop.tags?.[0] || shopCatLabel(shop.category, t), shop.city].filter(Boolean);
  if (shop.lat && shop.lng) bits.push(formatMeters(metersBetween(GEO, { lat: shop.lat, lng: shop.lng }), "fr"));
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
        accessibilityLabel={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
        onPress={() => {
          void import("../lib/lot7/api").then(async ({ toggleSave }) => {
            const id = shop.handle || shop.id;
            await toggleSave("business", id, !saved);
            useWippStore.setState((s) => ({
              saves: saved ? s.saves.filter((x) => !(x.kind === "business" && x.id === id)) : [...s.saves, { kind: "business", id }],
            }));
          }).catch((err) => Alert.alert("Favoris", err instanceof Error ? err.message : "Enregistrement impossible."));
        }}
      >
        <Heart size={18} color={saved ? colors.accent : colors.muted} fill={saved ? colors.accent : "transparent"} />
      </Press>
    </Press>
  );
}

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
        const cards = await listPublicBusinessCards();
        const mapped = (await Promise.all(cards.map((card) => withSignedCardMedia(card)))).map((c) => cardToShop(c));
        useWippStore.setState((s) => ({
          shops: [...s.shops.filter((x) => !x.id.startsWith("business:")), ...mapped],
        }));
        setLoadError("");
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Impossible de charger les boutiques.");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  const shown = shops.filter((s) => {
    if (cat === "all") return true;
    if (cat === "mode") return /mode|fashion|vêtement|vetement/i.test(`${s.name} ${s.tags?.join(" ") ?? ""} ${s.bio}`);
    return s.category === cat;
  });
  const shortcuts: { id: ShopCategory | "mode"; label: string }[] = [
    { id: "nails", label: "Onglerie" },
    { id: "restaurant", label: "Restaurant" },
    { id: "hair", label: "Coiffure" },
    { id: "mode", label: "Mode" },
    { id: "beauty", label: "Beauté" },
  ];
  function coverFor(id: ShopCategory | "mode") {
    const match = shops.find((s) => (id === "mode" ? /mode|fashion|vêtement|vetement/i.test(`${s.name} ${s.tags?.join(" ") ?? ""}`) : s.category === id) && s.image);
    if (!match?.image) return null;
    return match.image.startsWith("http") ? { uri: match.image } : wippSrc(match.image);
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
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", borderWidth: cat === item.id ? 2 : 0, borderColor: colors.accent }}>
                  <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>{item.label.slice(0, 1)}</Text>
                </View>
              )}
              <Text numberOfLines={1} style={{ marginTop: 6, color: colors.fg, fontSize: 12 }}>{item.label}</Text>
            </Press>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>Boutiques à proximité</Text>
        <Press onPress={() => setCat("all")}><Text style={{ color: colors.accent }}>Voir tout ›</Text></Press>
      </View>
      {!loaded ? <Empty title="Chargement…" /> : null}
      {loadError ? <Empty title={loadError} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {shown.slice(0, 8).map((s) => {
          const src = s.image?.startsWith("http") ? { uri: s.image } : wippSrc(s.image);
          return (
            <Press key={s.id} onPress={() => push(s.id.startsWith("business:") ? { name: "business-card-view", publicId: s.handle } : { name: "shop", shopId: s.id })} style={{ width: 168 }}>
              {src ? <Image source={src} style={{ width: 168, height: 112, borderRadius: 16 }} contentFit="cover" /> : <View style={{ width: 168, height: 112, borderRadius: 16, backgroundColor: colors.navy }} />}
              <Text numberOfLines={1} style={{ marginTop: 8, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{s.name}</Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{shopPlace(s, t)}</Text>
            </Press>
          );
        })}
      </ScrollView>
      <Text style={{ marginTop: 22, marginBottom: 10, paddingHorizontal: 16, color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>Catégories populaires</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {shortcuts.map((item) => {
          const src = coverFor(item.id);
          return (
            <Press key={`pop-${item.id}`} onPress={() => setCat(item.id)} style={{ width: 150, height: 96, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, justifyContent: "flex-end" }}>
              {src ? <Image source={src} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : null}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />
              <Text style={{ padding: 12, color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{item.label}</Text>
            </Press>
          );
        })}
      </ScrollView>
      {loaded && !loadError && shown.length === 0 ? <Empty title="Aucune boutique pour le moment" /> : null}
      <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
        <Btn label="Créer ma carte professionnelle" onPress={() => push({ name: "business-card" })} />
      </View>
    </View>
  );
}

function LifestylePane() {
  const lifestyle = useWippStore((s) => s.lifestyle);
  const items = useMemo(() => lifestyle.filter(isUpcomingEvent), [lifestyle]);
  const push = useWippStore((s) => s.push);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const { fetchEvents } = await import("../lib/lot7/api");
        const rows = await fetchEvents(useWippStore.getState().serverProfileId);
        if (!cancel) {
          useWippStore.setState({ lifestyle: rows });
          setLoadError("");
        }
      } catch (err) {
        if (!cancel) setLoadError(err instanceof Error ? err.message : "Impossible de charger les événements.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {loadError ? <Empty title={loadError} /> : null}
      {!loadError && items.length === 0 ? (
        <View>
          <Empty title="Aucun événement à venir" />
          <Btn label="Créer un événement" onPress={() => push({ name: "create-lifestyle" })} />
        </View>
      ) : null}
      {items.map((e) => {
        const src = wippSrc(e.image);
        return (
          <Press key={e.id} onPress={() => push({ name: "lifestyle", itemId: e.id })} style={{ marginBottom: 12, borderRadius: 16, overflow: "hidden", backgroundColor: colors.glassCard }}>
            {src ? <Image source={src} style={{ height: 120, width: "100%" }} contentFit="cover" /> : <View style={{ height: 80, backgroundColor: colors.navy }} />}
            <View style={{ padding: 12 }}>
              <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{e.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{e.when} · {e.isOnline ? "En ligne" : e.place} · {eventAccessText(e)}</Text>
            </View>
          </Press>
        );
      })}
    </View>
  );
}

export function ListingScreen({ listingId }: { listingId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const listing = useWippStore((s) => s.listings.find((l) => l.id === listingId));
  const seller = useWippStore((s) => (listing ? s.users[listing.sellerId] : undefined));
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const saved = useWippStore((s) => s.saves.some((item) => item.kind === "listing" && item.id === listingId));
  const src = listing?.image?.startsWith("http") ? { uri: listing.image } : wippSrc(listing?.image);
  if (!listing) return <Missing onBack={pop} />;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={listing.title} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {src ? <Image source={src} style={{ height: 220, width: "100%" }} contentFit="cover" /> : null}
        {listing.photos && listing.photos.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
            {listing.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10 }} contentFit="cover" />
            ))}
          </ScrollView>
        ) : null}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{listingPriceText(listing)}</Text>
          <Text style={{ marginTop: 8, color: colors.muted }}>{[listing.city, listing.area, listing.country].filter(Boolean).join(" · ")}{listing.distance ? ` · ${listing.distance}` : ""}</Text>
          {listing.condition ? <Text style={{ marginTop: 8, color: colors.fg }}>{CONDITION_LABEL[listing.condition]}</Text> : null}
          <Text style={{ marginTop: 12, color: colors.fg, lineHeight: 20 }}>{listing.description}</Text>
          <Text style={{ marginTop: 12, color: colors.muted }}>{listing.contactPhone ? listing.contactPhone : "Contact par message WIPP"}</Text>
          <Btn label="Contacter" onPress={() => seller && openOrCreateDm(seller.id)} style={{ marginTop: 20 }} />
          <Btn
            label="Options"
            variant="secondary"
            onPress={() => {
              const mine = listing.sellerId === "me" || listing.sellerId === useWippStore.getState().serverProfileId;
              if (mine) {
                Alert.alert("Annonce", undefined, [
                  { text: "Modifier", onPress: () => push({ name: "create-listing", listingId: listing.id }) },
                  {
                    text: "Supprimer l’annonce",
                    style: "destructive",
                    onPress: () => {
                      void import("../lib/lot7/api").then(async ({ removeListing }) => {
                        await removeListing(listing.id);
                        useWippStore.setState((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
                        pop();
                      });
                    },
                  },
                  { text: "Annuler", style: "cancel" },
                ]);
                return;
              }
              Alert.alert("Annonce", undefined, [
                {
                  text: "Signaler l’annonce",
                  onPress: () => {
                    Alert.alert("Signaler l’annonce", undefined, [
                      ...REPORT_REASONS.map((reason) => ({
                        text: reason,
                        onPress: () => {
                          void submitContentReport({
                            contentType: "listing",
                            contentId: listing.id,
                            targetProfileId: listing.sellerId,
                            reason,
                          }).then(
                            () => Alert.alert("Signalement", "Signalement envoyé."),
                            (err) => Alert.alert("Signalement", err instanceof Error ? err.message : "Signalement impossible."),
                          );
                        },
                      })),
                      { text: "Annuler", style: "cancel" as const },
                    ]);
                  },
                },
                {
                  text: "Masquer l’annonce",
                  onPress: () => {
                    useWippStore.setState((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
                    pop();
                  },
                },
                {
                  text: "Bloquer cet utilisateur",
                  style: "destructive",
                  onPress: () => {
                    Alert.alert("Bloquer", "Bloquer cette personne ?", [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Bloquer",
                        style: "destructive",
                        onPress: () => {
                          useWippStore.getState().blockUser(listing.sellerId);
                          pop();
                        },
                      },
                    ]);
                  },
                },
                { text: "Annuler", style: "cancel" },
              ]);
            }}
            style={{ marginTop: 8 }}
          />
          <Btn
            label={saved ? "Retirer des enregistrés" : "Enregistrer"}
            onPress={() => {
              const on = saved;
              void import("../lib/lot7/api").then(async ({ toggleSave }) => {
                try {
                  await toggleSave("listing", listing.id, !on);
                  useWippStore.setState((s) => ({
                    saves: on ? s.saves.filter((x) => !(x.kind === "listing" && x.id === listing.id)) : [...s.saves, { kind: "listing", id: listing.id }],
                  }));
                } catch (err) {
                  Alert.alert("Enregistrés", err instanceof Error ? err.message : "Enregistrement impossible.");
                }
              });
            }}
            style={{ marginTop: 8 }}
          />
          {listing.sellerId === "me" ? (
            <Btn
              label="Retirer l’annonce"
              onPress={() => {
                void import("../lib/lot7/api").then(async ({ removeListing }) => {
                  await removeListing(listing.id);
                  useWippStore.setState((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
                  pop();
                });
              }}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenRoot>
  );
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
        <Text style={{ color: colors.accent, marginTop: 8 }}>{p.onDuty ? `De garde jusqu’à ${p.until}` : p.phone}</Text>
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
            label="Écrire sur WIPP"
            onPress={() => {
              if (shop.id.startsWith("business:")) {
                void useWippStore.getState().openBusinessChat(shop.handle).catch((err) => {
                  Alert.alert("Message", err instanceof Error ? err.message : "Conversation impossible");
                });
                return;
              }
              openOrCreateDm(shop.ownerId);
            }}
            style={{ marginTop: 20 }}
          />
          <Btn
            label="Carte professionnelle"
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
  if (!item) return <Missing onBack={pop} />;
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
          <Text style={{ marginTop: 8, color: colors.fg }}>{item.isOnline ? ["En ligne", item.onlineUrl].filter(Boolean).join(" · ") : [item.place, item.address, item.city, item.country].filter(Boolean).join(" · ")}</Text>
          <Text style={{ marginTop: 8, color: colors.accent }}>{eventAccessText(item)}</Text>
          {item.hostName ? <Text style={{ marginTop: 8, color: colors.muted }}>Organisé par {item.hostName}</Text> : null}
          <Text style={{ marginTop: 12, color: colors.fg }}>{item.details || item.note}</Text>
          {item.contact ? <Text style={{ marginTop: 8, color: colors.muted }}>{item.contact}</Text> : null}
          <Btn
            label={saved ? "Retirer des enregistrés" : "Enregistrer"}
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
                  Alert.alert("Enregistrés", err instanceof Error ? err.message : "Enregistrement impossible.");
                }
              });
            }}
            style={{ marginTop: 20 }}
          />
          {mine ? (
            <>
              <Btn label="Modifier" variant="secondary" onPress={() => push({ name: "create-lifestyle", eventId: item.id })} style={{ marginTop: 8 }} />
              <Btn
                label="Supprimer l’événement"
                variant="secondary"
                onPress={() => {
                  Alert.alert("Événement", "Supprimer cet événement ?", [
                    { text: "Annuler", style: "cancel" },
                    {
                      text: "Supprimer",
                      style: "destructive",
                      onPress: () => {
                        void import("../lib/lot7/api").then(async ({ removeEvent }) => {
                          await removeEvent(item.id);
                          useWippStore.setState((s) => ({ lifestyle: s.lifestyle.filter((x) => x.id !== item.id) }));
                          pop();
                        }).catch((err) => Alert.alert("Événement", err instanceof Error ? err.message : "Suppression impossible."));
                      },
                    },
                  ]);
                }}
                style={{ marginTop: 8 }}
              />
            </>
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
  const event = title.toLowerCase().includes("événement");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={onBack} />
      </GlassHeader>
      <View style={{ padding: 16 }}>
        <Field value={name} onChangeText={setName} placeholder="Titre" />
        <Field value={desc} onChangeText={setDesc} placeholder={event ? "Description" : "Description"} />
        <Field value={city} onChangeText={setCity} placeholder="Ville" />
        {event ? <Field value={price} onChangeText={setPrice} placeholder="Lieu" /> : <Field value={price} onChangeText={setPrice} placeholder="Prix" />}
        {event ? <Field value={starts} onChangeText={setStarts} placeholder="Date AAAA-MM-JJ (facultatif)" /> : null}
        {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
        <Btn
          label="Enregistrer"
          onPress={() => {
            void (async () => {
              if (event) {
                if (!name.trim()) {
                  setError("Le titre est requis.");
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
                  setError("Le titre et la ville sont requis.");
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
                setError("Les boutiques passent par la carte professionnelle.");
                return;
              }
              onBack();
            })().catch((err) => setError(err instanceof Error ? err.message : "Enregistrement impossible"));
          }}
          style={{ marginTop: 16 }}
        />
      </View>
    </ScreenRoot>
  );
}

export function CreateShopScreen() {
  const pop = useWippStore((s) => s.pop);
  return <CreateForm title="Créer une boutique" onBack={pop} />;
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="" onBack={onBack} />
      </GlassHeader>
      <Empty title="Introuvable" />
    </ScreenRoot>
  );
}

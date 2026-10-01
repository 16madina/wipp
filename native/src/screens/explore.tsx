import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Calendar, ChevronLeft, Cross, Plus, Store, Tag } from "lucide-react-native";
import { Btn, Chip, Empty, GlassHeader, Header, IconBtn, PendingNote, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { useDeviceLayout } from "../lib/device-layout";
import { formatMeters, metersBetween } from "../lib/format";
import { SHOP_CAT_KEYS } from "../lib/i18n";
import { useT, useWippStore } from "../lib/store";
import { cardToShop, listPublicBusinessCards } from "../lib/business-card";
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
        const mapped = cards.map((c) => cardToShop(c));
        useWippStore.setState((s) => ({
          shops: [...s.shops.filter((x) => !x.id.startsWith("business:")), ...mapped],
        }));
      } catch {
        /* offline */
      }
    })();
  }, [hub]);
  const destTitle =
    hub === "listings" ? t("hubListings") : hub === "utilities" ? t("hubServices") : hub === "shops" ? t("hubShops") : hub === "lifestyle" ? t("hubEvents") : t("exploreTitle");
  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
          {hub !== "home" && !searching ? (
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
          <SearchField placeholder={hub === "shops" ? "Rechercher une boutique" : t("exploreAsk")} value={q} onChangeText={setQ} />
        </View>
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
        <Text style={{ color: colors.accent, marginTop: 2 }}>{listing.price}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{listing.city} · {listing.distance}</Text>
      </View>
    </Press>
  );
}

function ExploreSearch({ q }: { q: string }) {
  const serverConnected = useWippStore((s) => s.serverConnected);
  const allListings = useWippStore((s) => s.listings);
  const allShops = useWippStore((s) => s.shops);
  const events = useWippStore((s) => s.lifestyle);
  const needle = q.toLowerCase();
  const listings = allListings.filter((l) => `${l.title} ${l.description} ${l.city} ${l.category}`.toLowerCase().includes(needle));
  const shops = (serverConnected ? allShops.filter((s) => s.id.startsWith("business:")) : allShops).filter((s) =>
    `${s.name} ${s.category} ${s.bio} ${s.city}`.toLowerCase().includes(needle),
  );
  const foundEvents = events.filter((e) => `${e.title} ${e.note} ${e.city} ${e.place}`.toLowerCase().includes(needle));
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
      {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
      {foundEvents.map((e) => (
        <Press key={e.id} onPress={() => useWippStore.getState().push({ name: "lifestyle", itemId: e.id })} style={{ paddingVertical: 10 }}>
          <Text style={{ color: colors.fg }}>{e.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{e.city}</Text>
        </Press>
      ))}
      {listings.length + shops.length + foundEvents.length === 0 ? <Empty title="Aucun résultat" /> : null}
    </View>
  );
}

function ListingsPane({ cat }: { cat: (typeof CATS)[number] }) {
  const allListings = useWippStore((s) => s.listings);
  const listings = allListings.filter((l) => cat === "all" || l.category === cat);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
      {listings.length === 0 ? <Empty title="Aucune annonce" /> : null}
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
  const cards = useWippStore((s) => s.shops.filter((x) => x.id.startsWith("business:")));
  const toks = fold(q).split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const hits = cards.filter((s) => {
    const blob = fold(`${s.name} ${s.category} ${s.bio} ${s.city} ${(s.tags ?? []).join(" ")}`);
    return toks.every((t) => blob.includes(t)) || toks.some((t) => blob.includes(t));
  });
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {hits.map((s) => <ShopRow key={s.id} shop={s} />)}
      {hits.length === 0 ? <Empty title="Aucun résultat" /> : null}
    </View>
  );
}

function ShopRow({ shop }: { shop: Shop }) {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const src = shop.image?.startsWith("http") ? { uri: shop.image } : wippSrc(shop.image);
  const publicId = shop.id.startsWith("business:") ? shop.handle : shop.id;
  return (
    <Press
      onPress={() => push(shop.id.startsWith("business:") ? { name: "business-card-view", publicId } : { name: "shop", shopId: shop.id })}
      style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}
    >
      {src ? <Image source={src} style={{ width: 64, height: 64, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.navy }} />}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{shop.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{shopCatLabel(shop.category, t)} · {shop.city}</Text>
      </View>
    </Press>
  );
}

function ShopsPane() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const shops = useWippStore((s) => s.shops.filter((x) => x.id.startsWith("business:")));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        const cards = await listPublicBusinessCards();
        const mapped = cards.map((c) => cardToShop(c));
        useWippStore.setState((s) => ({
          shops: [...s.shops.filter((x) => !x.id.startsWith("business:")), ...mapped],
        }));
      } catch {
        /* offline */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  const shown = shops.filter((s) => cat === "all" || s.category === cat);
  const cats: { id: ShopCategory | "all"; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "nails", label: t("shopCatNails") },
    { id: "restaurant", label: t("shopCatRestaurant") },
    { id: "hair", label: t("shopCatHair") },
    { id: "beauty", label: t("shopCatBeauty") },
    { id: "cafe", label: t("shopCatCafe") },
    { id: "services", label: t("shopCatServices") },
  ];
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {cats.map((c) => (
          <Chip key={c.id} label={c.label} active={cat === c.id} onPress={() => setCat(c.id)} />
        ))}
      </ScrollView>
      <Btn label="Créer ma carte professionnelle" onPress={() => push({ name: "business-card" })} style={{ marginBottom: 12 }} />
      {shown.map((s) => <ShopRow key={s.id} shop={s} />)}
      {loaded && shown.length === 0 ? <Empty title="Aucune boutique pour le moment" /> : null}
    </View>
  );
}

function LifestylePane() {
  const items = useWippStore((s) => s.lifestyle);
  const push = useWippStore((s) => s.push);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {items.length === 0 ? <Empty title="Aucun événement" /> : null}
      {items.map((e) => {
        const src = wippSrc(e.image);
        return (
          <Press key={e.id} onPress={() => push({ name: "lifestyle", itemId: e.id })} style={{ marginBottom: 12, borderRadius: 16, overflow: "hidden", backgroundColor: colors.glassCard }}>
            {src ? <Image source={src} style={{ height: 120, width: "100%" }} contentFit="cover" /> : <View style={{ height: 80, backgroundColor: colors.navy }} />}
            <View style={{ padding: 12 }}>
              <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{e.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{e.when} · {e.place}</Text>
            </View>
          </Press>
        );
      })}
    </View>
  );
}

export function ListingScreen({ listingId }: { listingId: string }) {
  const pop = useWippStore((s) => s.pop);
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
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{listing.price}</Text>
          <Text style={{ marginTop: 8, color: colors.muted }}>{listing.city} · {listing.distance}</Text>
          <Text style={{ marginTop: 12, color: colors.fg, lineHeight: 20 }}>{listing.description}</Text>
          <Btn label="Contacter" onPress={() => seller && openOrCreateDm(seller.id)} style={{ marginTop: 20 }} />
          <Btn
            label={saved ? "Retirer des enregistrés" : "Enregistrer"}
            onPress={() => {
              const on = saved;
              void import("../lib/lot7/api").then(async ({ toggleSave }) => {
                await toggleSave("listing", listing.id, !on);
                useWippStore.setState((s) => ({
                  saves: on ? s.saves.filter((x) => !(x.kind === "listing" && x.id === listing.id)) : [...s.saves, { kind: "listing", id: listing.id }],
                }));
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
                void useWippStore.getState().openBusinessChat(shop.handle);
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
  const item = useWippStore((s) => s.lifestyle.find((x) => x.id === itemId));
  const src = wippSrc(item?.image);
  if (!item) return <Missing onBack={pop} />;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={item.title} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        {src ? <Image source={src} style={{ height: 200, width: "100%" }} contentFit="cover" /> : null}
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.muted }}>{item.when} · {item.place}</Text>
          <Text style={{ marginTop: 12, color: colors.fg }}>{item.note}</Text>
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

function CreateForm({ title, onBack }: { title: string; onBack: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
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
        {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
        <Btn
          label="Enregistrer"
          onPress={() => {
            void (async () => {
              const me = useWippStore.getState().serverProfileId;
              if (event) {
                const { saveEvent, fetchEvents } = await import("../lib/lot7/api");
                await saveEvent({ title: name, description: desc, city, place: price, starts: "" });
                useWippStore.setState({ lifestyle: await fetchEvents(me) });
              } else if (title.toLowerCase().includes("annonce")) {
                const { saveListing, fetchListings } = await import("../lib/lot7/api");
                await saveListing({ title: name, description: desc, category: "goods", price, city });
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

export function CreateListingScreen() {
  const pop = useWippStore((s) => s.pop);
  return <CreateForm title="Créer une annonce" onBack={pop} />;
}
export function CreateShopScreen() {
  const pop = useWippStore((s) => s.pop);
  return <CreateForm title="Créer une boutique" onBack={pop} />;
}
export function CreateLifestyleScreen() {
  const pop = useWippStore((s) => s.pop);
  return <CreateForm title="Créer un événement" onBack={pop} />;
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

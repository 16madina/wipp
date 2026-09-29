import { useState } from "react";
import { Image } from "expo-image";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Calendar, ChevronLeft, Cross, Plus, Store, Tag } from "lucide-react-native";
import { Btn, Chip, Empty, GlassHeader, Header, IconBtn, PendingNote, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { useDeviceLayout } from "../lib/device-layout";
import { formatMeters, metersBetween } from "../lib/format";
import { SHOP_CAT_KEYS } from "../lib/i18n";
import { useT, useWippStore } from "../lib/store";
import type { Listing, Shop, ShopCategory } from "../lib/types";
import { colors, layout } from "../theme";

const CATS = ["all", "auto", "home", "goods", "jobs", "services"] as const;
const GEO = { lat: 45.531, lng: -73.518 };
type Hub = "home" | "listings" | "utilities" | "shops" | "lifestyle";

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
        {searching ? <ExploreSearch q={query} /> : null}
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
  const shops = useWippStore((s) => s.shops);
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
      onPress: () => push({ name: "shop" as const, shopId: s.id }),
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
    { icon: Tag, title: t("hubListings"), sub: t("hubListingsSub"), go: () => go("listings") },
    { icon: Cross, title: t("hubServices"), sub: t("hubServicesSub"), go: () => go("utilities") },
    { icon: Store, title: t("hubShops"), sub: t("hubShopsSub"), go: () => go("shops") },
    { icon: Calendar, title: t("hubEvents"), sub: t("hubEventsSub"), go: () => go("lifestyle") },
  ];
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}>{t("exploreSplit")}</Text>
      <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {hubs.map((h) => (
          <Press key={h.title} onPress={h.go} style={{ width: hubW, minHeight: 100, borderRadius: 16, backgroundColor: colors.navy, padding: 14, borderWidth: 1, borderColor: colors.hair }}>
            <h.icon size={20} color={colors.accent} />
            <Text style={{ marginTop: 16, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{h.title}</Text>
            <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{h.sub}</Text>
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
  const allListings = useWippStore((s) => s.listings);
  const allShops = useWippStore((s) => s.shops);
  const listings = allListings.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()));
  const shops = allShops.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
      {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
      {listings.length + shops.length === 0 ? <Empty title="Aucun résultat" /> : null}
    </View>
  );
}

function ListingsPane({ cat }: { cat: (typeof CATS)[number] }) {
  const allListings = useWippStore((s) => s.listings);
  const listings = allListings.filter((l) => cat === "all" || l.category === cat);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {listings.map((l) => <ListingRow key={l.id} listing={l} />)}
    </View>
  );
}

function UtilitiesPane() {
  const pharmacies = useWippStore((s) => s.pharmacies);
  const push = useWippStore((s) => s.push);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <PendingNote label="Cartes Google / GPS natif" />
      {pharmacies.map((p) => (
        <Press key={p.id} onPress={() => push({ name: "pharmacy", pharmacyId: p.id })} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{p.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{p.address}{p.onDuty ? " · De garde" : ""}</Text>
        </Press>
      ))}
    </View>
  );
}

function ShopRow({ shop }: { shop: Shop }) {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const src = wippSrc(shop.image);
  return (
    <Press onPress={() => push({ name: "shop", shopId: shop.id })} style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}>
      {src ? <Image source={src} style={{ width: 64, height: 64, borderRadius: 10 }} contentFit="cover" /> : <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.navy }} />}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{shop.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{shopCatLabel(shop.category, t)} · {shop.city}</Text>
      </View>
    </Press>
  );
}

function ShopsPane() {
  const shops = useWippStore((s) => s.shops);
  const push = useWippStore((s) => s.push);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <PendingNote label="Cartes professionnelles publiques (Supabase)" />
      <Btn label="Créer une boutique" onPress={() => push({ name: "create-shop" })} style={{ marginBottom: 12 }} />
      {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
    </View>
  );
}

function LifestylePane() {
  const items = useWippStore((s) => s.lifestyle);
  const push = useWippStore((s) => s.push);
  return (
    <View style={{ paddingHorizontal: 16 }}>
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
  const push = useWippStore((s) => s.push);
  const listing = useWippStore((s) => s.listings.find((l) => l.id === listingId));
  const seller = useWippStore((s) => (listing ? s.users[listing.sellerId] : undefined));
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const src = wippSrc(listing?.image);
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
            label="Écrire à la boutique"
            onPress={() => {
              if (shop.id.startsWith("business:")) {
                void useWippStore.getState().openBusinessChat(shop.handle);
                return;
              }
              openOrCreateDm(shop.ownerId);
            }}
            style={{ marginTop: 20 }}
          />
          <Btn label="Carte professionnelle" variant="secondary" onPress={() => push({ name: "business-card-view", publicId: shop.id })} style={{ marginTop: 8 }} />
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

function CreateForm({ title, onBack }: { title: string; onBack: () => void }) {
  const [v, setV] = useState("");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={onBack} />
      </GlassHeader>
      <PendingNote label="Publication locale / seed — pas de nouveau schéma" />
      <View style={{ padding: 16 }}>
        <TextInput value={v} onChangeText={setV} placeholder="Titre" placeholderTextColor={colors.muted} style={{ height: 48, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 12 }} />
        <Btn label="Enregistrer" onPress={onBack} style={{ marginTop: 16 }} />
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

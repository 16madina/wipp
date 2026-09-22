import { useMemo, useState, type ReactNode } from "react";
import {
  AtSign,
  Bookmark,
  BookmarkCheck,
  Calendar,
  ChevronLeft,
  Clock,
  Copy,
  Cross,
  Globe,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Navigation,
  Phone,
  Plus,
  Search,
  Share2,
  Shield,
  Star,
  Store,
  Tag,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SmartImg } from "@/components/smart-img";
import { QrCard } from "@/components/qr-card";
import { FlagBtn, ReportSheet, flaggedIds, isFlagged } from "@/components/safety";
import { Btn, Chip, Field, Header, IconBtn, SearchField, Sheet, StatusBar } from "@/components/ui";
import { formatMeters, metersBetween } from "@/lib/format";
import { SHOP_CAT_KEYS, type I18nKey } from "@/lib/i18n";
import { seedPharmacies } from "@/lib/seed";
import { useT, useWgoStore } from "@/lib/store";
import type { LifestyleItem, LifestyleKind, Listing, Pharmacy, Shop, ShopCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NoPhoneBadge } from "./connect-extras";

const CATS = ["all", "auto", "home", "goods", "jobs", "services"] as const;
const PHARMACIES = seedPharmacies();

function useSafeCatalog() {
  const listings = useWgoStore((s) => s.listings);
  const shops = useWgoStore((s) => s.shops);
  const events = useWgoStore((s) => s.lifestyle);
  const reports = useWgoStore((s) => s.reports);
  const blockedIds = useWgoStore((s) => s.blockedIds);
  const hiddenListings = flaggedIds(reports, "listing");
  const hiddenShops = flaggedIds(reports, "shop");
  const hiddenEvents = flaggedIds(reports, "event");
  return {
    listings: listings.filter((l) => !hiddenListings.has(l.id) && !blockedIds.includes(l.sellerId)),
    shops: shops.filter((s) => !hiddenShops.has(s.id) && !blockedIds.includes(s.ownerId)),
    events: events.filter(
      (e) => !hiddenEvents.has(e.id) && (!e.hostId || e.hostId === "me" || !blockedIds.includes(e.hostId)),
    ),
  };
}
const MEDIA = [
  "/media/coffee.jpg",
  "/media/food.jpg",
  "/media/river.jpg",
  "/media/soccer.jpg",
  "/media/civic.jpg",
  "/media/apt.jpg",
  "/media/chair.jpg",
];
const SHOP_CATS: ShopCategory[] = [
  "nails",
  "hair",
  "beauty",
  "restaurant",
  "plumbing",
  "realty",
  "bakery",
  "cafe",
  "jewelry",
  "home",
  "services",
];
type Hub = "home" | "listings" | "utilities" | "shops" | "lifestyle";

const SHOP_EXTRA: Record<ShopCategory, string> = {
  nails: "onglerie ongles manucure nail nails sarah",
  hair: "coiffure salon cheveux",
  beauty: "beaute institut",
  restaurant: "restaurant resto manger",
  plumbing: "plomberie plombier",
  realty: "immobilier courtier",
  bakery: "boulangerie pain viennoiserie",
  cafe: "cafe coffee",
  jewelry: "bijou bijouterie or argent",
  home: "maison vintage meuble",
  services: "studio photo",
};

function fold(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokens(q: string) {
  return fold(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function scoreBlob(blob: string, toks: string[]) {
  if (!toks.length) return 0;
  const b = fold(blob);
  let n = 0;
  for (const t of toks) if (b.includes(t)) n += 1;
  return n;
}

export function ExploreScreen() {
  const t = useT();
  const push = useWgoStore((s) => s.push);
  const [hub, setHub] = useState<Hub>("home");
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [q, setQ] = useState("");
  const query = q.trim();
  const searching = query.length >= 2;

  const destTitle =
    hub === "listings"
      ? t("hubListings")
      : hub === "utilities"
        ? t("hubServices")
        : hub === "shops"
          ? t("hubShops")
          : hub === "lifestyle"
            ? t("hubEvents")
            : t("exploreTitle");

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-10">
        <StatusBar />
        <div className="flex items-center px-2 pb-1">
          {hub !== "home" && !searching ? (
            <IconBtn label={t("back")} onClick={() => setHub("home")}>
              <ChevronLeft className="size-6" />
            </IconBtn>
          ) : (
            <span className="w-2" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-[22px] font-semibold tracking-tight">
            {searching ? t("exploreTitle") : destTitle}
          </h1>
          {hub === "lifestyle" && !searching ? (
            <IconBtn label={t("createLifestyle")} onClick={() => push({ name: "create-lifestyle" })}>
              <Plus className="size-6" />
            </IconBtn>
          ) : (
            <span className="w-11" />
          )}
        </div>
        <div className="relative px-4 pb-3">
          <Search className="pointer-events-none absolute left-8 top-[14px] size-4 text-muted" />
          <SearchField
            className="h-12 rounded-2xl pl-10"
            placeholder={t("exploreAsk")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {hub === "listings" && !searching ? <ListingFilters cat={cat} setCat={setCat} /> : null}
      </div>
      {searching ? <ExploreSearch q={query} /> : null}
      {!searching && hub === "home" ? <ExploreHome go={setHub} /> : null}
      {!searching && hub === "listings" ? <ListingsPane cat={cat} /> : null}
      {!searching && hub === "utilities" ? <UtilitiesPane /> : null}
      {!searching && hub === "shops" ? <ShopsPane /> : null}
      {!searching && hub === "lifestyle" ? <LifestylePane /> : null}
    </div>
  );
}

function ExploreHome({ go }: { go: (h: Hub) => void }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const geo = useWgoStore((s) => s.geo);
  const { listings, shops, events } = useSafeCatalog();
  const push = useWgoStore((s) => s.push);

  const near = useMemo(() => {
    const shopRows = shops.map((s) => ({
      key: `s-${s.id}`,
      meters: metersBetween(geo, s),
      title: s.name,
      sub: shopCatLabel(s.category, t),
      image: s.image,
      onClick: () => push({ name: "shop" as const, shopId: s.id }),
    }));
    const eventRows = events.map((e) => ({
      key: `e-${e.id}`,
      meters: metersBetween(geo, e),
      title: e.title,
      sub: lifestyleKindLabel(e.kind, t),
      image: e.image,
      onClick: () => push({ name: "lifestyle" as const, itemId: e.id }),
    }));
    const phRows = PHARMACIES.filter((p) => p.onDuty).map((p) => ({
      key: `p-${p.id}`,
      meters: metersBetween(geo, p),
      title: p.name,
      sub: t("onDuty"),
      image: "",
      onClick: () => push({ name: "pharmacy" as const, pharmacyId: p.id }),
    }));
    return [...shopRows, ...eventRows, ...phRows].sort((a, b) => a.meters - b.meters).slice(0, 6);
  }, [shops, events, geo, t, push]);

  const popular = [
    listings.find((l) => l.id === "l-civic"),
    shops.find((s) => s.id === "shop-chen"),
    events.find((e) => e.id === "ls-concert-samedi"),
    shops.find((s) => s.id === "shop-nails"),
  ].filter(Boolean);

  const freshEvents = events.slice(0, 6);
  const recShops = shops.filter((s) => s.plan === "plus");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
      <p className="text-[13px] leading-relaxed text-muted">{t("exploreSplit")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <HubCard
          icon={<Tag className="size-5" />}
          title={t("hubListings")}
          sub={t("hubListingsSub")}
          onClick={() => go("listings")}
        />
        <HubCard
          icon={<Cross className="size-5" />}
          title={t("hubServices")}
          sub={t("hubServicesSub")}
          onClick={() => go("utilities")}
        />
        <HubCard
          icon={<Store className="size-5" />}
          title={t("hubShops")}
          sub={t("hubShopsSub")}
          onClick={() => go("shops")}
        />
        <HubCard
          icon={<Calendar className="size-5" />}
          title={t("hubEvents")}
          sub={t("hubEventsSub")}
          onClick={() => go("lifestyle")}
        />
      </div>

      <RailTitle title={t("nearYou")} onAll={() => go("shops")} allLabel={t("seeAll")} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {near.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={row.onClick}
            className="press w-36 shrink-0 overflow-hidden rounded-2xl glass-card text-left"
          >
            {row.image ? (
              <SmartImg src={row.image} alt="" className="h-20 w-full object-cover" />
            ) : (
              <div className="h-20 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]" />
            )}
            <div className="p-2">
              <p className="truncate text-[13px] font-semibold">{row.title}</p>
              <p className="truncate text-[11px] text-muted">
                {formatMeters(row.meters, lang)} · {row.sub}
              </p>
            </div>
          </button>
        ))}
      </div>

      <RailTitle title={t("popularToday")} />
      <div className="grid gap-2">
        {popular.filter((x): x is Shop | LifestyleItem | Listing => Boolean(x)).map((item) => {
          if ("sellerId" in item) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => push({ name: "listing", listingId: item.id })}
                className="press flex w-full items-center gap-3 rounded-2xl glass-card p-2 text-left"
              >
                <SmartImg src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{item.title}</span>
                  <span className="block text-[12px] text-muted">{item.price}</span>
                </span>
              </button>
            );
          }
          if ("code" in item) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => push({ name: "shop", shopId: item.id })}
                className="press flex w-full items-center gap-3 rounded-2xl glass-card p-2 text-left"
              >
                {item.image ? (
                  <SmartImg src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-accent">
                    <Store className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{item.name}</span>
                  <span className="block text-[12px] text-muted">{shopCatLabel(item.category, t)}</span>
                </span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => push({ name: "lifestyle", itemId: item.id })}
              className="press flex w-full items-center gap-3 rounded-2xl glass-card p-2 text-left"
            >
              {item.image ? (
                <SmartImg src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-accent">
                  <Calendar className="size-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{item.title}</span>
                <span className="block text-[12px] text-muted">{item.when}</span>
              </span>
            </button>
          );
        })}
      </div>

      <RailTitle title={t("newEvents")} onAll={() => go("lifestyle")} allLabel={t("seeAll")} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {freshEvents.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => push({ name: "lifestyle", itemId: e.id })}
            className="press w-40 shrink-0 overflow-hidden rounded-2xl glass-card text-left"
          >
            {e.image ? (
              <SmartImg src={e.image} alt="" className="h-24 w-full object-cover" />
            ) : (
              <div className="h-24 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]" />
            )}
            <div className="p-2">
              <p className="truncate text-[13px] font-semibold">{e.title}</p>
              <p className="truncate text-[11px] text-muted">{e.when}</p>
            </div>
          </button>
        ))}
      </div>

      <RailTitle title={t("recommendedShops")} onAll={() => go("shops")} allLabel={t("seeAll")} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
        {recShops.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => push({ name: "shop", shopId: s.id })}
            className="press w-40 shrink-0 overflow-hidden rounded-2xl glass-card text-left"
          >
            {s.image ? (
              <SmartImg src={s.image} alt="" className="h-24 w-full object-cover" />
            ) : (
              <div className="flex h-24 items-end bg-navy px-2 pb-2">
                <span className="text-[13px] font-semibold text-accent">{s.name}</span>
              </div>
            )}
            <div className="p-2">
              <p className="truncate text-[13px] font-semibold">{s.name}</p>
              <p className="truncate text-[11px] text-muted">{shopCatLabel(s.category, t)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HubCard({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex min-h-[132px] flex-col items-start rounded-2xl glass-card p-3 text-left"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-accent">{icon}</span>
      <span className="mt-3 text-[15px] font-semibold leading-tight">{title}</span>
      <span className="mt-1 text-[12px] leading-snug text-muted">{sub}</span>
    </button>
  );
}

function RailTitle({
  title,
  onAll,
  allLabel,
}: {
  title: string;
  onAll?: () => void;
  allLabel?: string;
}) {
  return (
    <div className="mt-6 mb-2 flex items-end justify-between gap-2">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      {onAll && allLabel ? (
        <button type="button" onClick={onAll} className="text-[12px] font-medium text-muted">
          {allLabel}
        </button>
      ) : null}
    </div>
  );
}

function ExploreSearch({ q }: { q: string }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const geo = useWgoStore((s) => s.geo);
  const { listings, shops, events } = useSafeCatalog();
  const push = useWgoStore((s) => s.push);
  const toks = tokens(q);

  const foundListings = listings
    .map((l) => ({
      item: l,
      n: scoreBlob(`${l.title} ${l.description} ${l.city} ${l.category} ${l.price}${l.category === "auto" ? " voiture auto" : ""}`, toks),
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const foundShops = shops
    .map((s) => ({
      item: s,
      n: scoreBlob(`${s.name} ${s.bio} ${s.city} ${s.handle} ${SHOP_EXTRA[s.category]}`, toks),
      meters: metersBetween(geo, s),
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.meters - b.meters);

  const foundPh = PHARMACIES.map((p) => ({
    item: p,
    n: scoreBlob(`${p.name} ${p.chain} ${p.address} ${p.city} pharmacie garde service utile`, toks),
    meters: metersBetween(geo, p),
  }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.meters - b.meters);

  const foundEvents = events
    .map((e) => ({
      item: e,
      n: scoreBlob(
        `${e.title} ${e.when} ${e.place} ${e.city} ${e.kind} ${e.note}`,
        toks,
      ),
      meters: metersBetween(geo, e),
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.meters - b.meters);

  const empty =
    !foundListings.length && !foundShops.length && !foundPh.length && !foundEvents.length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
      {empty ? <p className="py-16 text-center text-[14px] text-muted">{t("searchNoResults")}</p> : null}

      {foundShops.length ? (
        <section className="mb-5">
          <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
            {t("resultsShops")}
          </h2>
          {foundShops.map(({ item: s, meters }) => (
            <button
              key={s.id}
              type="button"
              onClick={() => push({ name: "shop", shopId: s.id })}
              className="press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left"
            >
              {s.image ? (
                <SmartImg src={s.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-accent">
                  <Store className="size-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{s.name}</span>
                <span className="block text-[12px] text-muted">
                  {shopCatLabel(s.category, t)} · {formatMeters(meters, lang)}
                </span>
                <span className="mt-1 block text-[12px] font-semibold text-navy">{t("viewCard")}</span>
              </span>
            </button>
          ))}
        </section>
      ) : null}

      {foundPh.length ? (
        <section className="mb-5">
          <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
            {t("resultsServices")}
          </h2>
          {foundPh.map(({ item: p, meters }) => (
            <button
              key={p.id}
              type="button"
              onClick={() => push({ name: "pharmacy", pharmacyId: p.id })}
              className="press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  p.onDuty ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
                )}
              >
                <Cross className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                <span className="block text-[12px] text-muted">
                  {p.city} · {formatMeters(meters, lang)}
                  {p.onDuty ? ` · ${t("onDuty")}` : ""}
                </span>
              </span>
            </button>
          ))}
        </section>
      ) : null}

      {foundEvents.length ? (
        <section className="mb-5">
          <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
            {t("resultsEvents")}
          </h2>
          {foundEvents.map(({ item: e, meters }) => (
            <button
              key={e.id}
              type="button"
              onClick={() => push({ name: "lifestyle", itemId: e.id })}
              className="press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left"
            >
              {e.image ? (
                <SmartImg src={e.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-accent">
                  <Calendar className="size-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{e.title}</span>
                <span className="block text-[12px] text-muted">
                  {formatMeters(meters, lang)} · {e.when}
                </span>
              </span>
            </button>
          ))}
        </section>
      ) : null}

      {foundListings.length ? (
        <section className="mb-5">
          <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
            {t("resultsListings")}
          </h2>
          {foundListings.map(({ item: l }) => (
            <button
              key={l.id}
              type="button"
              onClick={() => push({ name: "listing", listingId: l.id })}
              className="press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left"
            >
              <SmartImg src={l.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{l.title}</span>
                <span className="block text-[12px] text-muted">
                  {l.price} · {l.city}
                </span>
              </span>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ListingFilters({
  cat,
  setCat,
}: {
  cat: (typeof CATS)[number];
  setCat: (c: (typeof CATS)[number]) => void;
}) {
  const t = useT();
  const labels: Record<(typeof CATS)[number], string> = {
    all: t("all"),
    auto: t("categoryAuto"),
    home: t("categoryHome"),
    goods: t("categoryGoods"),
    jobs: t("categoryJobs"),
    services: t("categoryServices"),
  };
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
      {CATS.map((c) => (
        <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
          {labels[c]}
        </Chip>
      ))}
    </div>
  );
}

function ListingsPane({ cat }: { cat: (typeof CATS)[number] }) {
  const t = useT();
  const { listings } = useSafeCatalog();
  const push = useWgoStore((s) => s.push);
  const list = cat === "all" ? listings : listings.filter((l) => l.category === cat);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
      <p className="mb-3 text-[12px] text-muted">{t("phoneHiddenForever")}</p>
      {list.map((l) => (
        <button
          key={l.id}
          type="button"
          className="mb-3 w-full overflow-hidden rounded-2xl glass-card text-left"
          onClick={() => push({ name: "listing", listingId: l.id })}
        >
          <SmartImg src={l.image} alt="" className="h-40 w-full object-cover" />
          <div className="p-3">
            <p className="text-[16px] font-semibold">{l.title}</p>
            <p className="mt-0.5 text-[15px] text-fg">{l.price}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-[12px] text-muted">
                {l.city} · {l.distance}
              </p>
              <NoPhoneBadge />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function UtilitiesPane() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const geo = useWgoStore((s) => s.geo);
  const locateStatus = useWgoStore((s) => s.locateStatus);
  const locateMe = useWgoStore((s) => s.locateMe);
  const push = useWgoStore((s) => s.push);
  const [dutyOnly, setDutyOnly] = useState(true);

  const rows = useMemo(() => {
    const sorted = PHARMACIES.map((p) => ({
      ...p,
      meters: metersBetween(geo, p),
    })).sort((a, b) => a.meters - b.meters);
    return dutyOnly ? sorted.filter((p) => p.onDuty) : sorted;
  }, [geo, dutyOnly]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
      <p className="text-[13px] leading-relaxed text-muted">{t("utilitiesHint")}</p>

      <button
        type="button"
        onClick={locateMe}
        disabled={locateStatus === "locating"}
        className="press mt-3 flex w-full items-center gap-3 rounded-2xl glass-card px-4 py-3 text-left"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <MapPin className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            {locateStatus === "locating" ? t("locating") : t("locateMe")}
          </span>
          <span className="block text-[12px] text-muted">
            {locateStatus === "denied"
              ? t("locateFallback")
              : locateStatus === "done" && geo.source === "gps"
                ? `${t("locatedGps")} · ${geo.label}`
                : `${t("locatedAround")} ${geo.label}`}
          </span>
        </span>
      </button>
      <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted">{t("locateHint")}</p>

      <div className="mt-5 flex items-end justify-between gap-2">
        <h2 className="text-[16px] font-semibold">{t("pharmaciesDuty")}</h2>
      </div>
      <div className="mt-2 flex gap-2">
        <Chip active={dutyOnly} onClick={() => setDutyOnly(true)}>
          {t("pharmaciesDutyOnly")}
        </Chip>
        <Chip active={!dutyOnly} onClick={() => setDutyOnly(false)}>
          {t("pharmaciesAll")}
        </Chip>
      </div>

      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-muted">{t("noDutyNearby")}</p>
        ) : (
          rows.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => push({ name: "pharmacy", pharmacyId: p.id })}
              className="press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card px-3 py-3 text-left"
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  p.onDuty ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
                )}
              >
                <Cross className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                <span className="block truncate text-[12px] text-muted">
                  {p.city} · {formatMeters(p.meters, lang)}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
                  p.onDuty ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted",
                )}
              >
                {p.onDuty
                  ? p.until === "24h"
                    ? t("open24h")
                    : `${t("onDuty")} ${p.until}`
                  : t("closedNow")}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function ListingScreen({ listingId }: { listingId: string }) {
  const t = useT();
  const listing = useWgoStore((s) => s.listings.find((l) => l.id === listingId));
  const seller = useWgoStore((s) => (listing ? s.users[listing.sellerId] : undefined));
  const pop = useWgoStore((s) => s.pop);
  const startListingChat = useWgoStore((s) => s.startListingChat);
  const saved = useWgoStore((s) => s.savedListingIds?.includes(listingId));
  const toggleSavedListing = useWgoStore((s) => s.toggleSavedListing);
  const reports = useWgoStore((s) => s.reports);
  const [reportOpen, setReportOpen] = useState(false);
  if (!listing) return null;
  if (isFlagged(reports, "listing", listing.id)) {
    return (
      <div className="flex h-full flex-col">
        <StatusBar />
        <Header title={t("report")} onBack={pop} />
        <p className="px-6 pt-8 text-center text-[14px] text-muted">{t("hiddenReported")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header
        title={listing.title}
        onBack={pop}
        right={
          <>
            <button
              type="button"
              className="flex size-11 items-center justify-center"
              aria-label={t("saved")}
              onClick={() => toggleSavedListing(listing.id)}
            >
              <Bookmark className={cn("size-5", saved && "fill-accent text-accent")} />
            </button>
            {listing.sellerId !== "me" ? (
              <FlagBtn label={t("report")} onClick={() => setReportOpen(true)} />
            ) : null}
          </>
        }
      />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <SmartImg src={listing.image} alt="" priority className="h-56 w-full object-cover" />
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-[22px] font-semibold">{listing.price}</p>
            <NoPhoneBadge />
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {listing.city} · {listing.distance}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{listing.description}</p>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-surface p-3 hairline">
            <Avatar user={seller} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{seller?.displayName}</p>
              <p className="text-[13px] text-muted">@{seller?.username}</p>
            </div>
            <Shield className="size-4 text-muted" />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{t("sellerPrivate")}</p>
        </div>
      </div>
      <div className="p-4 pb-8">
        <Btn className="w-full" onClick={() => startListingChat(listing)}>
          {t("contactOnWgo")}
        </Btn>
      </div>
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="listing"
        targetId={listing.id}
        blockUserId={listing.sellerId !== "me" ? listing.sellerId : undefined}
        onSubmitted={pop}
      />
    </div>
  );
}

export function PharmacyScreen({ pharmacyId }: { pharmacyId: string }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const pop = useWgoStore((s) => s.pop);
  const geo = useWgoStore((s) => s.geo);
  const pharmacy = PHARMACIES.find((p) => p.id === pharmacyId);
  if (!pharmacy) return null;
  const meters = metersBetween(geo, pharmacy);

  function openMaps() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy!.lat},${pharmacy!.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-full flex-col bg-navy text-paper">
      <StatusBar />
      <Header
        title={pharmacy.name}
        onBack={pop}
        className="text-paper [&_button]:text-paper"
      />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
        <div className="mt-2 flex items-center gap-3">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl",
              pharmacy.onDuty ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper",
            )}
          >
            <Cross className="size-6" />
          </span>
          <div>
            <p className="text-[20px] font-semibold">{pharmacy.name}</p>
            <p className="text-[13px] text-paper/60">
              {pharmacy.city} · {formatMeters(meters, lang)}
            </p>
          </div>
        </div>

        <p
          className={cn(
            "mt-5 inline-flex rounded-full px-3 py-1 text-[13px] font-medium",
            pharmacy.onDuty ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper/70",
          )}
        >
          {pharmacy.onDuty
            ? pharmacy.until === "24h"
              ? t("open24h")
              : `${t("onDutyUntil")} ${pharmacy.until}`
            : `${t("openUntil")} ${pharmacy.until}`}
        </p>

        <div className="mt-6 rounded-2xl bg-paper/8 px-4 py-3">
          <p className="text-[12px] font-medium tracking-wide text-paper/45 uppercase">
            {pharmacy.city}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed">{pharmacy.address}</p>
        </div>

        <p className="mt-4 text-[12px] text-paper/50">{t("pharmacyPhone")}</p>
        <p className="text-[16px] font-medium tabular-nums">{pharmacy.phone}</p>
        <p className="mt-4 text-[12px] leading-relaxed text-paper/45">{t("civicNote")}</p>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <Btn className="w-full" onClick={openMaps}>
            <Navigation className="size-4" />
            {t("directions")}
          </Btn>
          <Btn
            variant="secondary"
            className="w-full bg-paper/10 text-paper"
            onClick={() => {
              window.location.href = `tel:${pharmacy.phone.replace(/\s/g, "")}`;
            }}
          >
            <Phone className="size-4" />
            {t("callPharmacy")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function shopCatLabel(cat: ShopCategory, t: (k: I18nKey) => string) {
  return t(SHOP_CAT_KEYS[cat]);
}

function ShopsPane() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const geo = useWgoStore((s) => s.geo);
  const { shops } = useSafeCatalog();
  const push = useWgoStore((s) => s.push);
  const mine = shops.find((s) => s.ownerId === "me");
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const [q, setQ] = useState("");
  const toks = tokens(q);

  const rows = useMemo(() => {
    return shops
      .filter((s) => (cat === "all" ? true : s.category === cat))
      .map((s) => ({
        ...s,
        meters: metersBetween(geo, s),
        n: toks.length
          ? scoreBlob(`${s.name} ${s.bio} ${s.city} ${s.handle} ${SHOP_EXTRA[s.category]}`, toks)
          : 1,
      }))
      .filter((s) => s.n > 0)
      .sort((a, b) => {
        if (toks.length) return b.n - a.n || a.meters - b.meters;
        const feat = Number(b.plan === "plus") - Number(a.plan === "plus");
        if (feat) return feat;
        return a.meters - b.meters;
      });
  }, [shops, cat, geo, toks]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
      <p className="text-[13px] leading-relaxed text-muted">{t("cardHint")}</p>
      <SearchField
        className="mt-3"
        placeholder={t("searchShops")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          {t("shopCatAll")}
        </Chip>
        {SHOP_CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {shopCatLabel(c, t)}
          </Chip>
        ))}
      </div>
      <Btn
        className="mt-3 w-full"
        variant={mine ? "secondary" : "primary"}
        onClick={() => push(mine ? { name: "shop", shopId: mine.id } : { name: "create-shop" })}
      >
        <Store className="size-4" />
        {mine ? t("myCard") : t("createCard")}
      </Btn>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-muted">{t("noShops")}</p>
        ) : (
          rows.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => push({ name: "shop", shopId: s.id })}
              className="press mb-2 w-full overflow-hidden rounded-2xl glass-card text-left"
            >
              {s.image ? (
                <SmartImg src={s.image} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.4),transparent_55%)]" />
              )}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">{s.name}</p>
                  {s.plan === "plus" ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">
                      {t("featured")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12px] text-muted">
                  {shopCatLabel(s.category, t)} · {s.city} · {formatMeters(s.meters, lang)}
                </p>
                <p className="mt-2 text-[12px] font-semibold text-navy">{t("viewCard")}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const SHOP_FACE: Record<string, { hero: string; logo: string; photos: string[] }> = {
  "shop-nails": {
    hero: "/media/shop-nails-hero.jpg",
    logo: "/media/shop-nails-logo.jpg",
    photos: [
      "/media/shop-nails-hero.jpg",
      "/media/shop-nails-art.jpg",
      "/media/shop-nails-lounge.jpg",
      "/media/shop-nails-polish.jpg",
    ],
  },
  "shop-chen": {
    hero: "/media/shop-chen-hero.jpg",
    logo: "/media/shop-chen-logo.jpg",
    photos: [
      "/media/shop-chen-latte.jpg",
      "/media/shop-chen-corner.jpg",
      "/media/shop-chen-hero.jpg",
      "/media/coffee.jpg",
    ],
  },
};

const SHOP_RATING: Record<string, { score: number; count: number }> = {
  "shop-nails": { score: 4.9, count: 86 },
  "shop-chen": { score: 4.8, count: 128 },
  "shop-deena": { score: 4.7, count: 41 },
  "shop-atlas": { score: 4.6, count: 29 },
  "shop-mie": { score: 4.8, count: 54 },
};

const SHOP_REVIEWS: Record<string, { name: string; text: string }[]> = {
  "shop-nails": [
    { name: "Léa", text: "Pose nickel. On écrit sur Wipp, c’est tout." },
    { name: "Maya", text: "Nail art propre, sur rendez-vous." },
    { name: "Sofia", text: "L’atelier est calme. Je reviens." },
  ],
  "shop-chen": [
    { name: "Noah", text: "La table du fond. Silence. Parfait." },
    { name: "Alex", text: "Café serré, Wi-Fi, pas de numéro à donner." },
    { name: "Léa", text: "J’y travaille le matin." },
  ],
  "shop-deena": [
    { name: "Samira", text: "Soin teint, on parle à @deenabeauty." },
  ],
};

export function ShopScreen({ shopId }: { shopId: string }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const shop = useWgoStore((s) => s.shops.find((x) => x.id === shopId));
  const geo = useWgoStore((s) => s.geo);
  const lifestyle = useWgoStore((s) => s.lifestyle);
  const openShopChat = useWgoStore((s) => s.openShopChat);
  const [copied, setCopied] = useState<null | "link" | "handle" | "card">(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"about" | "reviews" | "services" | "events">("about");
  const [shopMenu, setShopMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  if (!shop) return null;
  const mine = shop.ownerId === "me";
  const meters = metersBetween(geo, shop);
  const link = `wipp.me/@${shop.handle}`;
  const qrValue = `wipp.me/b/${shop.qrToken}`;
  const face = SHOP_FACE[shop.id];
  const hero = face?.hero || shop.image;
  const logo = face?.logo || shop.logo || shop.image;
  const photos = (face?.photos?.length ? face.photos : shop.photos?.length ? shop.photos : hero ? [hero] : []).filter(
    Boolean,
  );
  const mapsQuery = `${shop.address}, ${shop.city}`;
  const quebec = ["Longueuil", "Brossard", "Greenfield Park", "Saint-Lambert", "Boucherville"].includes(
    shop.city,
  );
  const place = quebec ? `${shop.city}, Québec, ${shop.country}` : `${shop.city}, ${shop.country}`;
  const tags = shop.tags?.length ? shop.tags : [shopCatLabel(shop.category, t)];
  const rating = SHOP_RATING[shop.id] ?? (shop.plan === "plus" ? { score: 4.7, count: 18 } : undefined);
  const reviews = SHOP_REVIEWS[shop.id] ?? [];
  const events = lifestyle.filter(
    (e) => e.place.toLowerCase().includes(shop.name.toLowerCase()) || e.hostId === shop.ownerId,
  );
  const initials = shop.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function copyText(value: string, key: "link" | "handle" | "card") {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* demo */
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function openMaps() {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`, "_blank", "noopener");
  }

  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <StatusBar />
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className="relative h-[196px]">
          {hero ? (
            <SmartImg src={hero} alt="" priority className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-black/20" />
          <div className="absolute inset-x-0 top-2 z-10 flex items-center justify-between px-3">
            <IconBtn
              label={t("back")}
              onClick={pop}
              className="size-10 bg-navy/55 text-paper backdrop-blur-sm"
            >
              <ChevronLeft className="size-5" />
            </IconBtn>
            <IconBtn
              label={t("share")}
              className="size-10 bg-navy/55 text-paper backdrop-blur-sm"
              onClick={() => setShopMenu(true)}
            >
              <MoreHorizontal className="size-5" />
            </IconBtn>
          </div>
        </div>

        <div className="relative z-10 -mt-8 px-3 pb-10">
          <div className="rounded-[28px] bg-navy px-4 pb-4 pt-4 shadow-[0_-18px_40px_rgb(0_0_0_/_0.4),inset_0_1px_0_rgb(255_255_255_/_0.08)]">
            <div className="flex gap-3">
              <span className="size-[76px] shrink-0 overflow-hidden rounded-full bg-ink ring-2 ring-[#C9A227] ring-offset-2 ring-offset-navy">
                {logo ? (
                  <SmartImg src={logo} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[20px] font-semibold text-accent">
                    {initials}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="min-w-0 truncate text-[18px] font-semibold tracking-tight">
                    {shop.name}
                  </h1>
                  <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                      <path
                        d="M2.2 6.2 4.6 8.6 9.8 3.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {rating ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">
                      <Star className="size-3 fill-current" />
                      {rating.score.toFixed(1)}
                      <span className="font-medium text-accent-fg/70">({rating.count})</span>
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12px] text-paper/55">
                  {shopCatLabel(shop.category, t)} · {shop.city}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-paper/80">{shop.bio}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-paper/10 px-2.5 py-1 text-[11px] font-medium text-paper/75"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-3.5 flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-2.5">
                <InfoLine icon={MapPin}>
                  <span className="block">{shop.address}</span>
                  <span className="text-paper/50">{place}</span>
                </InfoLine>
                {shop.hours ? <InfoLine icon={Clock}>{shop.hours}</InfoLine> : null}
                {shop.phone ? (
                  <InfoLine
                    icon={Phone}
                    onClick={() => {
                      window.location.href = `tel:${shop.phone.replace(/\s/g, "")}`;
                    }}
                  >
                    <span className="tabular-nums">{shop.phone}</span>
                  </InfoLine>
                ) : null}
                <InfoLine icon={Globe} onClick={() => void copyText(`https://${link}`, "link")}>
                  <span className="flex items-center gap-1">
                    {link}
                    <Copy className="size-3 opacity-50" />
                  </span>
                  {copied === "link" ? <span className="text-accent">{t("copied")}</span> : null}
                </InfoLine>
                <InfoLine icon={AtSign} onClick={() => void copyText(`@${shop.handle}`, "handle")}>
                  <span className="flex items-center gap-1">
                    @{shop.handle}
                    <Copy className="size-3 opacity-50" />
                  </span>
                </InfoLine>
                {shop.quote ? (
                  <p className="pt-1 text-[12px] leading-snug text-paper/45 italic">« {shop.quote} »</p>
                ) : null}
              </div>

              <div className="w-[148px] shrink-0 rounded-[22px] bg-paper p-2 text-center text-navy">
                <QrCard
                  value={qrValue}
                  size={132}
                  pad={6}
                  markSrc={logo || undefined}
                  className="mx-auto rounded-[16px]"
                />
                <p className="mt-1.5 px-1 text-[10px] leading-tight font-medium text-navy/55">
                  {t("scanToWrite")}
                </p>
                <button
                  type="button"
                  className="press mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-full bg-navy px-2 text-[11px] font-medium text-paper"
                  onClick={() => void copyText(`https://${link}`, "card")}
                >
                  <Share2 className="size-3" />
                  {copied === "card" ? t("copied") : t("shareMyCard")}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => (mine ? push({ name: "create-shop" }) : openShopChat(shop.id))}
                className="press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-accent text-accent-fg"
              >
                {mine ? <Store className="size-4" /> : <MessageCircle className="size-4" />}
                <span className="mt-1 px-0.5 text-center text-[10px] leading-tight font-semibold">
                  {mine ? t("editCard") : t("messageShop")}
                </span>
              </button>
              <button
                type="button"
                disabled={!shop.phone}
                onClick={() => {
                  if (!shop.phone) return;
                  window.location.href = `tel:${shop.phone.replace(/\s/g, "")}`;
                }}
                className="press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-paper/8 text-paper disabled:opacity-30"
              >
                <Phone className="size-4" />
                <span className="mt-1 text-[10px] font-medium">{t("callShop")}</span>
              </button>
              <button
                type="button"
                onClick={openMaps}
                className="press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-paper/8 text-paper"
              >
                <Navigation className="size-4" />
                <span className="mt-1 text-[10px] font-medium">{t("directions")}</span>
              </button>
              <button
                type="button"
                onClick={() => setSaved((v) => !v)}
                className="press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-paper/8 text-paper"
              >
                {saved ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />}
                <span className="mt-1 text-[10px] font-medium">
                  {saved ? t("savedCard") : t("saveCard")}
                </span>
              </button>
            </div>
          </div>

          {photos.length ? (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {photos.map((src) => (
                <SmartImg
                  key={src}
                  src={src}
                  alt=""
                  className="h-[92px] w-[118px] shrink-0 rounded-[16px] object-cover"
                />
              ))}
              {photos.length >= 4 ? (
                <span className="flex h-[92px] w-[76px] shrink-0 flex-col items-center justify-center rounded-[16px] bg-navy text-[13px] font-semibold text-paper">
                  +{photos.length}
                  <span className="text-[10px] font-medium text-paper/55">{t("morePhotos")}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex gap-4 border-b border-paper/10 px-1">
            {(
              [
                ["about", t("aboutTab")],
                ["reviews", `${t("reviewsTab")}${rating ? ` (${rating.count})` : ""}`],
                ["services", t("shopServicesTab")],
                ["events", t("shopEventsTab")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "relative pb-2.5 text-[13px] font-medium",
                  tab === id ? "text-paper" : "text-paper/40",
                )}
              >
                {label}
                {tab === id ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="px-1 pt-3">
            {tab === "about" ? (
              <p className="text-[13px] leading-relaxed text-paper/70">
                {shop.bio}
                {shop.quote ? ` « ${shop.quote} »` : ""}
                {` · ${formatMeters(meters, lang)}`}
              </p>
            ) : null}
            {tab === "reviews" ? (
              reviews.length ? (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.name} className="rounded-2xl bg-navy px-3 py-2.5">
                      <p className="text-[13px] font-medium">{r.name}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-paper/70">{r.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-paper/50">{t("noReviews")}</p>
              )
            ) : null}
            {tab === "services" ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-navy px-3 py-1.5 text-[13px] text-paper/80">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {tab === "events" ? (
              events.length ? (
                <div className="space-y-2">
                  {events.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => push({ name: "lifestyle", itemId: e.id })}
                      className="flex w-full items-center gap-3 rounded-2xl bg-navy p-2 text-left"
                    >
                      {e.image ? (
                        <SmartImg src={e.image} alt="" className="h-11 w-11 rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-accent">
                          <Calendar className="size-4" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">{e.title}</span>
                        <span className="text-[12px] text-paper/50">{e.when}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-paper/50">{t("noLifestyle")}</p>
              )
            ) : null}
          </div>
        </div>
      </div>
      <Sheet open={shopMenu} onClose={() => setShopMenu(false)} title={shop.name}>
        <button
          type="button"
          className="flex h-12 w-full items-center rounded-lg px-2 text-[15px]"
          onClick={() => {
            void copyText(`https://${link}`, "card");
            setShopMenu(false);
          }}
        >
          {t("share")}
        </button>
        {!mine ? (
          <button
            type="button"
            className="flex h-12 w-full items-center rounded-lg px-2 text-[15px]"
            onClick={() => {
              setShopMenu(false);
              setReportOpen(true);
            }}
          >
            {t("report")}
          </button>
        ) : null}
      </Sheet>
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="shop"
        targetId={shop.id}
        blockUserId={shop.ownerId !== "me" ? shop.ownerId : undefined}
        onSubmitted={pop}
      />
    </div>
  );
}

function InfoLine({
  icon: Icon,
  children,
  onClick,
}: {
  icon: typeof MapPin;
  children: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
      <span className="min-w-0 text-[12px] leading-snug text-paper/90">{children}</span>
    </>
  );
  const cls = "flex w-full items-start gap-2 text-left";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function CreateShopScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const me = useWgoStore((s) => s.me);
  const createShop = useWgoStore((s) => s.createShop);
  const existing = useWgoStore((s) => s.shops.find((x) => x.ownerId === "me"));
  const [name, setName] = useState(existing?.name ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [city, setCity] = useState(existing?.city ?? me.city ?? "Longueuil");
  const [country, setCountry] = useState(existing?.country ?? "Canada");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [handle, setHandle] = useState(existing?.handle ?? "");
  const [hours, setHours] = useState(existing?.hours ?? "");
  const [category, setCategory] = useState<ShopCategory>(existing?.category ?? "nails");
  const [banner, setBanner] = useState(existing?.image ?? "");
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);

  function publish() {
    const n = name.trim();
    if (!n) return;
    const h = handle.replace(/^@/, "").trim() || n.toLowerCase().replace(/[^a-z0-9]/g, "");
    createShop({
      name: n,
      category,
      bio: bio.trim() || n,
      address: address.trim() || city,
      city: city.trim() || "Longueuil",
      country: country.trim() || "Canada",
      phone: phone.trim(),
      handle: h,
      hours: hours.trim(),
      image: banner,
      photos: photos.length ? photos : banner ? [banner] : [],
    });
  }

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={existing ? t("editCard") : t("createCard")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <p className="text-[13px] leading-relaxed text-muted">{t("cardHint")}</p>
        <div className="mt-4">
          <MediaPicker label={t("addBanner")} value={banner} onPick={(v) => setBanner(Array.isArray(v) ? v[0] ?? "" : v)} />
        </div>
        <div className="mt-4 grid gap-3">
          <Field label={t("shopName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Field label={t("shopHandle")} value={handle} placeholder="@nailsbysarah" onChange={(e) => setHandle(e.target.value)} />
          <Field label={t("shopBio")} value={bio} onChange={(e) => setBio(e.target.value)} />
          <Field label={t("shopCountry")} value={country} onChange={(e) => setCountry(e.target.value)} />
          <Field label={t("shopCity")} value={city} onChange={(e) => setCity(e.target.value)} />
          <Field label={t("shopAddress")} value={address} onChange={(e) => setAddress(e.target.value)} />
          <Field label={t("shopPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field label={t("shopHours")} value={hours} placeholder="Mar–Sam 10 h–19 h" onChange={(e) => setHours(e.target.value)} />
        </div>
        <p className="mt-5 text-[12px] font-medium tracking-wide text-muted uppercase">
          {shopCatLabel(category, t)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHOP_CATS.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {shopCatLabel(c, t)}
            </Chip>
          ))}
        </div>
        <div className="mt-4">
          <MediaPicker
            label={t("addPhotos")}
            value={photos}
            multiple
            max={4}
            onPick={(v) => setPhotos(Array.isArray(v) ? v : v ? [v] : [])}
          />
          <p className="mt-1 text-[11px] text-muted">{t("photosHint")}</p>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted">{t("shopProNote")}</p>
        <Btn className="mt-6 w-full" disabled={!name.trim()} onClick={publish}>
          {t("publishShop")}
        </Btn>
      </div>
    </div>
  );
}

function MediaPicker({
  label,
  value,
  multiple,
  max = 4,
  onPick,
}: {
  label: string;
  value: string | string[];
  multiple?: boolean;
  max?: number;
  onPick: (v: string | string[]) => void;
}) {
  const t = useT();
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  function toggle(src: string) {
    if (!multiple) {
      onPick(src === selected[0] ? "" : src);
      return;
    }
    if (selected.includes(src)) onPick(selected.filter((s) => s !== src));
    else if (selected.length < max) onPick([...selected, src]);
  }

  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-muted">{label}</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onPick(multiple ? [] : "")}
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl glass-card text-[11px] text-muted",
            selected.length === 0 && "ring-2 ring-accent",
          )}
        >
          {t("noBanner")}
        </button>
        {MEDIA.map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => toggle(src)}
            className={cn(
              "h-16 w-20 shrink-0 overflow-hidden rounded-xl",
              selected.includes(src) && "ring-2 ring-accent",
            )}
          >
            <SmartImg src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function LifestylePane() {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const geo = useWgoStore((s) => s.geo);
  const locateMe = useWgoStore((s) => s.locateMe);
  const locateStatus = useWgoStore((s) => s.locateStatus);
  const push = useWgoStore((s) => s.push);
  const { events: items } = useSafeCatalog();
  const [kind, setKind] = useState<LifestyleKind | "all">("all");

  const rows = useMemo(() => {
    return items
      .filter((item) => (kind === "all" ? true : item.kind === kind))
      .map((item) => ({ ...item, meters: metersBetween(geo, item) }))
      .sort((a, b) => a.meters - b.meters);
  }, [kind, geo, items]);

  const filters: (LifestyleKind | "all")[] = ["all", "party", "concert", "promo", "event", "spot"];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
      <p className="text-[13px] leading-relaxed text-muted">{t("lifestyleHint")}</p>
      <button
        type="button"
        onClick={() => push({ name: "create-lifestyle" })}
        className="press mt-3 flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-accent-fg"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-navy text-paper">
          <Plus className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{t("createLifestyle")}</span>
          <span className="block text-[12px] text-accent-fg/70">{t("eventHint")}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={locateMe}
        disabled={locateStatus === "locating"}
        className="press mt-2 flex w-full items-center gap-3 rounded-2xl glass-card px-4 py-3 text-left"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-navy text-paper">
          <MapPin className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{t("lifestyleNearFirst")}</span>
          <span className="block text-[12px] text-muted">
            {locateStatus === "locating"
              ? t("locating")
              : `${t("locatedAround")} ${geo.label}`}
          </span>
        </span>
      </button>
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((id) => (
          <Chip key={id} active={kind === id} onClick={() => setKind(id)}>
            {id === "all" ? t("lifestyleAll") : lifestyleKindLabel(id, t)}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-muted">{t("noLifestyle")}</p>
        ) : (
          rows.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => push({ name: "lifestyle", itemId: item.id })}
              className="press mb-3 w-full overflow-hidden rounded-2xl glass-card text-left"
            >
              <LifestyleCover item={item} className="h-36" />
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-paper">
                    {lifestyleKindLabel(item.kind, t)}
                  </span>
                  <PriceBadge item={item} />
                </div>
                <p className="mt-2 text-[16px] font-semibold">{item.title}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {formatMeters(item.meters, lang)} · {item.when} · {item.city}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function PriceBadge({ item }: { item: { deal?: string; paid: boolean; price?: string; kind: LifestyleKind } }) {
  const t = useT();
  const label = item.deal ?? (item.paid ? item.price : item.kind === "party" || item.kind === "concert" ? t("eventFree") : undefined);
  if (!label) return null;
  const accent = Boolean(item.deal || item.paid);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        accent ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
      )}
    >
      {label}
    </span>
  );
}

function lifestyleKindLabel(
  kind: LifestyleKind,
  t: (k: "lifestyleEvent" | "lifestyleSpot" | "lifestyleParty" | "lifestyleConcert" | "lifestylePromo") => string,
) {
  const map = {
    event: "lifestyleEvent",
    spot: "lifestyleSpot",
    party: "lifestyleParty",
    concert: "lifestyleConcert",
    promo: "lifestylePromo",
  } as const;
  return t(map[kind]);
}

function LifestyleCover({
  item,
  className,
  label,
}: {
  item: { image: string; kind: LifestyleKind; title: string };
  className?: string;
  label?: boolean;
}) {
  if (item.image) {
    return <SmartImg src={item.image} alt="" className={cn("w-full object-cover", className)} />;
  }
  return (
    <div
      className={cn(
        "flex items-end bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]",
        label && "px-4 pb-3",
        className,
      )}
    >
      {label ? <span className="text-[18px] font-semibold text-accent">{item.title}</span> : null}
    </div>
  );
}

export function LifestyleScreen({ itemId }: { itemId: string }) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const geo = useWgoStore((s) => s.geo);
  const item = useWgoStore((s) => s.lifestyle.find((x) => x.id === itemId));
  const host = useWgoStore((s) => {
    if (!item?.hostId) return undefined;
    if (item.hostId === "me") return s.me;
    return s.users[item.hostId];
  });
  const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
  const [reportOpen, setReportOpen] = useState(false);
  if (!item) return null;
  const meters = metersBetween(geo, item);
  const mine = item.hostId === "me";

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header
        title={item.title}
        onBack={pop}
        right={
          !mine ? <FlagBtn label={t("report")} onClick={() => setReportOpen(true)} /> : undefined
        }
      />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <LifestyleCover item={item} className="h-52" label />
        <div className="px-5 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-paper">
              {lifestyleKindLabel(item.kind, t)}
            </span>
            <PriceBadge item={item} />
          </div>
          <p className="mt-3 text-[15px] text-muted">
            {formatMeters(meters, lang)} · {item.when}
          </p>
          <p className="mt-1 text-[15px] text-muted">
            {item.place} · {item.city}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed">{item.note}</p>
          {host ? (
            mine ? (
              <p className="mt-6 text-[13px] text-muted">{t("youHostEvent")}</p>
            ) : (
              <button
                type="button"
                className="mt-6 flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left hairline"
                onClick={() => push({ name: "found-profile", userId: host.id, via: "nearby" })}
              >
                <Avatar user={host} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{host.displayName}</span>
                  <span className="text-[13px] text-muted">@{host.username}</span>
                </span>
              </button>
            )
          ) : (
            <p className="mt-6 text-[13px] text-muted">{t("noHost")}</p>
          )}
        </div>
      </div>
      {host && !mine ? (
        <div className="p-4 pb-8">
          <Btn className="w-full" onClick={() => openOrCreateDm(host.id)}>
            {t("messageHost")}
          </Btn>
        </div>
      ) : null}
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="event"
        targetId={item.id}
        blockUserId={host && host.id !== "me" ? host.id : undefined}
        onSubmitted={pop}
      />
    </div>
  );
}

export function CreateLifestyleScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const createLifestyle = useWgoStore((s) => s.createLifestyle);
  const [kind, setKind] = useState<LifestyleKind>("party");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("Samedi · 21 h");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState("15 $");
  const [image, setImage] = useState("");
  const kinds: LifestyleKind[] = ["party", "concert", "promo", "event", "spot"];

  function publish() {
    const n = title.trim();
    if (!n) return;
    createLifestyle({
      kind,
      title: n,
      when: when.trim() || "Bientôt",
      place: place.trim() || "Longueuil",
      note: note.trim() || n,
      paid,
      price: paid ? price.trim() : undefined,
      image,
      deal: kind === "promo" && !paid ? (note.trim() || undefined) : undefined,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title={t("createLifestyle")} onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <p className="text-[13px] leading-relaxed text-muted">{t("eventHint")}</p>
        <p className="mt-5 text-[12px] font-medium tracking-wide text-muted uppercase">
          {lifestyleKindLabel(kind, t)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {kinds.map((id) => (
            <Chip key={id} active={kind === id} onClick={() => setKind(id)}>
              {lifestyleKindLabel(id, t)}
            </Chip>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <Field label={t("lsTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Field label={t("eventWhen")} value={when} onChange={(e) => setWhen(e.target.value)} />
          <Field label={t("eventPlace")} value={place} onChange={(e) => setPlace(e.target.value)} />
          <Field label={t("eventNote")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="mt-5 text-[12px] font-medium tracking-wide text-muted uppercase">{t("eventPrice")}</p>
        <div className="mt-2 flex gap-2">
          <Chip active={!paid} onClick={() => setPaid(false)}>
            {t("eventFree")}
          </Chip>
          <Chip active={paid} onClick={() => setPaid(true)}>
            {t("eventPaid")}
          </Chip>
        </div>
        {paid ? (
          <div className="mt-3">
            <Field label={t("eventPrice")} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        ) : null}
        <div className="mt-5">
          <MediaPicker label={t("pickImage")} value={image} onPick={(v) => setImage(Array.isArray(v) ? v[0] ?? "" : v)} />
        </div>
        <Btn className="mt-6 w-full" disabled={!title.trim()} onClick={publish}>
          {t("publishEvent")}
        </Btn>
      </div>
    </div>
  );
}

import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { B as metersBetween, D as formatMeters, V as seedPharmacies, X as useWgoStore, Y as useT, f as SHOP_CAT_KEYS, y as cn } from "./boot-BFpP81oK.mjs";
import { B as Navigation, D as Search, Et as AtSign, G as MessageCircle, N as Phone, S as Shield, _ as Store, bt as Bookmark, ct as Cross, dt as Clock, h as Tag, j as Plus, lt as Copy, mt as ChevronLeft, ot as Ellipsis, q as MapPin, tt as Globe, vt as Calendar, w as Share2, xt as BookmarkCheck, y as Star } from "../_libs/lucide-react.mjs";
import { C as IconBtn, E as StatusBar, S as Header, T as Sheet, d as ReportSheet, g as Avatar, h as SmartImg, m as isFlagged, n as NoPhoneBadge, p as flaggedIds, r as QrCard, u as FlagBtn, v as Btn, w as SearchField, x as Field, y as Chip } from "./app-CnfuwP9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/explore-BEa8QqBE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CATS = [
	"all",
	"auto",
	"home",
	"goods",
	"jobs",
	"services"
];
var PHARMACIES = seedPharmacies();
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
		events: events.filter((e) => !hiddenEvents.has(e.id) && (!e.hostId || e.hostId === "me" || !blockedIds.includes(e.hostId)))
	};
}
var MEDIA = [
	"/media/coffee.jpg",
	"/media/food.jpg",
	"/media/river.jpg",
	"/media/soccer.jpg",
	"/media/civic.jpg",
	"/media/apt.jpg",
	"/media/chair.jpg"
];
var SHOP_CATS = [
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
	"services"
];
var SHOP_EXTRA = {
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
	services: "studio photo"
};
function fold(s) {
	return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function tokens(q) {
	return fold(q).split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
}
function scoreBlob(blob, toks) {
	if (!toks.length) return 0;
	const b = fold(blob);
	let n = 0;
	for (const t of toks) if (b.includes(t)) n += 1;
	return n;
}
function ExploreScreen() {
	const t = useT();
	const push = useWgoStore((s) => s.push);
	const [hub, setHub] = (0, import_react.useState)("home");
	const [cat, setCat] = (0, import_react.useState)("all");
	const [q, setQ] = (0, import_react.useState)("");
	const query = q.trim();
	const searching = query.length >= 2;
	const destTitle = hub === "listings" ? t("hubListings") : hub === "utilities" ? t("hubServices") : hub === "shops" ? t("hubShops") : hub === "lifestyle" ? t("hubEvents") : t("exploreTitle");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass sticky top-0 z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center px-2 pb-1",
						children: [
							hub !== "home" && !searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("back"),
								onClick: () => setHub("home"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-6" })
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "min-w-0 flex-1 truncate text-[22px] font-semibold tracking-tight",
								children: searching ? t("exploreTitle") : destTitle
							}),
							hub === "lifestyle" && !searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("createLifestyle"),
								onClick: () => push({ name: "create-lifestyle" }),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-6" })
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-11" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative px-4 pb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-8 top-[14px] size-4 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
							className: "h-12 rounded-2xl pl-10",
							placeholder: t("exploreAsk"),
							value: q,
							onChange: (e) => setQ(e.target.value)
						})]
					}),
					hub === "listings" && !searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingFilters, {
						cat,
						setCat
					}) : null
				]
			}),
			searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExploreSearch, { q: query }) : null,
			!searching && hub === "home" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExploreHome, { go: setHub }) : null,
			!searching && hub === "listings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingsPane, { cat }) : null,
			!searching && hub === "utilities" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UtilitiesPane, {}) : null,
			!searching && hub === "shops" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopsPane, {}) : null,
			!searching && hub === "lifestyle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LifestylePane, {}) : null
		]
	});
}
function ExploreHome({ go }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const geo = useWgoStore((s) => s.geo);
	const { listings, shops, events } = useSafeCatalog();
	const push = useWgoStore((s) => s.push);
	const near = (0, import_react.useMemo)(() => {
		const shopRows = shops.map((s) => ({
			key: `s-${s.id}`,
			meters: metersBetween(geo, s),
			title: s.name,
			sub: shopCatLabel(s.category, t),
			image: s.image,
			onClick: () => push({
				name: "shop",
				shopId: s.id
			})
		}));
		const eventRows = events.map((e) => ({
			key: `e-${e.id}`,
			meters: metersBetween(geo, e),
			title: e.title,
			sub: lifestyleKindLabel(e.kind, t),
			image: e.image,
			onClick: () => push({
				name: "lifestyle",
				itemId: e.id
			})
		}));
		const phRows = PHARMACIES.filter((p) => p.onDuty).map((p) => ({
			key: `p-${p.id}`,
			meters: metersBetween(geo, p),
			title: p.name,
			sub: t("onDuty"),
			image: "",
			onClick: () => push({
				name: "pharmacy",
				pharmacyId: p.id
			})
		}));
		return [
			...shopRows,
			...eventRows,
			...phRows
		].sort((a, b) => a.meters - b.meters).slice(0, 6);
	}, [
		shops,
		events,
		geo,
		t,
		push
	]);
	const popular = [
		listings.find((l) => l.id === "l-civic"),
		shops.find((s) => s.id === "shop-chen"),
		events.find((e) => e.id === "ls-concert-samedi"),
		shops.find((s) => s.id === "shop-nails")
	].filter(Boolean);
	const freshEvents = events.slice(0, 6);
	const recShops = shops.filter((s) => s.plan === "plus");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] leading-relaxed text-muted",
				children: t("exploreSplit")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HubCard, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { className: "size-5" }),
						title: t("hubListings"),
						sub: t("hubListingsSub"),
						onClick: () => go("listings")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HubCard, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cross, { className: "size-5" }),
						title: t("hubServices"),
						sub: t("hubServicesSub"),
						onClick: () => go("utilities")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HubCard, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-5" }),
						title: t("hubShops"),
						sub: t("hubShopsSub"),
						onClick: () => go("shops")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HubCard, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "size-5" }),
						title: t("hubEvents"),
						sub: t("hubEventsSub"),
						onClick: () => go("lifestyle")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailTitle, {
				title: t("nearYou"),
				onAll: () => go("shops"),
				allLabel: t("seeAll")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto no-scrollbar",
				children: near.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: row.onClick,
					className: "press w-36 shrink-0 overflow-hidden rounded-2xl glass-card text-left",
					children: [row.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: row.image,
						alt: "",
						className: "h-20 w-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-20 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[13px] font-semibold",
							children: row.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-[11px] text-muted",
							children: [
								formatMeters(row.meters, lang),
								" · ",
								row.sub
							]
						})]
					})]
				}, row.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailTitle, { title: t("popularToday") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: popular.filter((x) => Boolean(x)).map((item) => {
					if ("sellerId" in item) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => push({
							name: "listing",
							listingId: item.id
						}),
						className: "press flex w-full items-center gap-3 rounded-2xl glass-card p-2 text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: item.image,
							alt: "",
							className: "h-14 w-14 rounded-xl object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-semibold",
								children: item.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-[12px] text-muted",
								children: item.price
							})]
						})]
					}, item.id);
					if ("code" in item) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => push({
							name: "shop",
							shopId: item.id
						}),
						className: "press flex w-full items-center gap-3 rounded-2xl glass-card p-2 text-left",
						children: [item.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: item.image,
							alt: "",
							className: "h-14 w-14 rounded-xl object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-semibold",
								children: item.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-[12px] text-muted",
								children: shopCatLabel(item.category, t)
							})]
						})]
					}, item.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => push({
							name: "lifestyle",
							itemId: item.id
						}),
						className: "press flex w-full items-center gap-3 rounded-2xl glass-card p-2 text-left",
						children: [item.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: item.image,
							alt: "",
							className: "h-14 w-14 rounded-xl object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-semibold",
								children: item.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-[12px] text-muted",
								children: item.when
							})]
						})]
					}, item.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailTitle, {
				title: t("newEvents"),
				onAll: () => go("lifestyle"),
				allLabel: t("seeAll")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto no-scrollbar",
				children: freshEvents.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "lifestyle",
						itemId: e.id
					}),
					className: "press w-40 shrink-0 overflow-hidden rounded-2xl glass-card text-left",
					children: [e.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: e.image,
						alt: "",
						className: "h-24 w-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[13px] font-semibold",
							children: e.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[11px] text-muted",
							children: e.when
						})]
					})]
				}, e.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailTitle, {
				title: t("recommendedShops"),
				onAll: () => go("shops"),
				allLabel: t("seeAll")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto no-scrollbar pb-4",
				children: recShops.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "shop",
						shopId: s.id
					}),
					className: "press w-40 shrink-0 overflow-hidden rounded-2xl glass-card text-left",
					children: [s.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: s.image,
						alt: "",
						className: "h-24 w-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-24 items-end bg-navy px-2 pb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[13px] font-semibold text-accent",
							children: s.name
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[13px] font-semibold",
							children: s.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[11px] text-muted",
							children: shopCatLabel(s.category, t)
						})]
					})]
				}, s.id))
			})
		]
	});
}
function HubCard({ icon, title, sub, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "press flex min-h-[132px] flex-col items-start rounded-2xl glass-card p-3 text-left",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-10 items-center justify-center rounded-xl bg-navy text-accent",
				children: icon
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-3 text-[15px] font-semibold leading-tight",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 text-[12px] leading-snug text-muted",
				children: sub
			})
		]
	});
}
function RailTitle({ title, onAll, allLabel }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 mb-2 flex items-end justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-[16px] font-semibold",
			children: title
		}), onAll && allLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onAll,
			className: "text-[12px] font-medium text-muted",
			children: allLabel
		}) : null]
	});
}
function ExploreSearch({ q }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const geo = useWgoStore((s) => s.geo);
	const { listings, shops, events } = useSafeCatalog();
	const push = useWgoStore((s) => s.push);
	const toks = tokens(q);
	const foundListings = listings.map((l) => ({
		item: l,
		n: scoreBlob(`${l.title} ${l.description} ${l.city} ${l.category} ${l.price}${l.category === "auto" ? " voiture auto" : ""}`, toks)
	})).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
	const foundShops = shops.map((s) => ({
		item: s,
		n: scoreBlob(`${s.name} ${s.bio} ${s.city} ${s.handle} ${SHOP_EXTRA[s.category]}`, toks),
		meters: metersBetween(geo, s)
	})).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.meters - b.meters);
	const foundPh = PHARMACIES.map((p) => ({
		item: p,
		n: scoreBlob(`${p.name} ${p.chain} ${p.address} ${p.city} pharmacie garde service utile`, toks),
		meters: metersBetween(geo, p)
	})).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.meters - b.meters);
	const foundEvents = events.map((e) => ({
		item: e,
		n: scoreBlob(`${e.title} ${e.when} ${e.place} ${e.city} ${e.kind} ${e.note}`, toks),
		meters: metersBetween(geo, e)
	})).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.meters - b.meters);
	const empty = !foundListings.length && !foundShops.length && !foundPh.length && !foundEvents.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24",
		children: [
			empty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "py-16 text-center text-[14px] text-muted",
				children: t("searchNoResults")
			}) : null,
			foundShops.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase",
					children: t("resultsShops")
				}), foundShops.map(({ item: s, meters }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "shop",
						shopId: s.id
					}),
					className: "press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left",
					children: [s.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: s.image,
						alt: "",
						className: "h-12 w-12 rounded-xl object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-accent",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-semibold",
								children: s.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-[12px] text-muted",
								children: [
									shopCatLabel(s.category, t),
									" · ",
									formatMeters(meters, lang)
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 block text-[12px] font-semibold text-navy",
								children: t("viewCard")
							})
						]
					})]
				}, s.id))]
			}) : null,
			foundPh.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase",
					children: t("resultsServices")
				}), foundPh.map(({ item: p, meters }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "pharmacy",
						pharmacyId: p.id
					}),
					className: "press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("flex h-12 w-12 items-center justify-center rounded-xl", p.onDuty ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cross, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-[15px] font-semibold",
							children: p.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block text-[12px] text-muted",
							children: [
								p.city,
								" · ",
								formatMeters(meters, lang),
								p.onDuty ? ` · ${t("onDuty")}` : ""
							]
						})]
					})]
				}, p.id))]
			}) : null,
			foundEvents.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase",
					children: t("resultsEvents")
				}), foundEvents.map(({ item: e, meters }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "lifestyle",
						itemId: e.id
					}),
					className: "press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left",
					children: [e.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: e.image,
						alt: "",
						className: "h-12 w-12 rounded-xl object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-accent",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-[15px] font-semibold",
							children: e.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block text-[12px] text-muted",
							children: [
								formatMeters(meters, lang),
								" · ",
								e.when
							]
						})]
					})]
				}, e.id))]
			}) : null,
			foundListings.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase",
					children: t("resultsListings")
				}), foundListings.map(({ item: l }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "listing",
						listingId: l.id
					}),
					className: "press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card p-3 text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: l.image,
						alt: "",
						className: "h-12 w-12 rounded-xl object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-[15px] font-semibold",
							children: l.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block text-[12px] text-muted",
							children: [
								l.price,
								" · ",
								l.city
							]
						})]
					})]
				}, l.id))]
			}) : null
		]
	});
}
function ListingFilters({ cat, setCat }) {
	const t = useT();
	const labels = {
		all: t("all"),
		auto: t("categoryAuto"),
		home: t("categoryHome"),
		goods: t("categoryGoods"),
		jobs: t("categoryJobs"),
		services: t("categoryServices")
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3",
		children: CATS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
			active: cat === c,
			onClick: () => setCat(c),
			children: labels[c]
		}, c))
	});
}
function ListingsPane({ cat }) {
	const t = useT();
	const { listings } = useSafeCatalog();
	const push = useWgoStore((s) => s.push);
	const list = cat === "all" ? listings : listings.filter((l) => l.category === cat);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1 overflow-y-auto no-scrollbar px-4 pb-24",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-[12px] text-muted",
			children: t("phoneHiddenForever")
		}), list.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "mb-3 w-full overflow-hidden rounded-2xl glass-card text-left",
			onClick: () => push({
				name: "listing",
				listingId: l.id
			}),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
				src: l.image,
				alt: "",
				className: "h-40 w-full object-cover"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[16px] font-semibold",
						children: l.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-[15px] text-fg",
						children: l.price
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[12px] text-muted",
							children: [
								l.city,
								" · ",
								l.distance
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoPhoneBadge, {})]
					})
				]
			})]
		}, l.id))]
	});
}
function UtilitiesPane() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const geo = useWgoStore((s) => s.geo);
	const locateStatus = useWgoStore((s) => s.locateStatus);
	const locateMe = useWgoStore((s) => s.locateMe);
	const push = useWgoStore((s) => s.push);
	const [dutyOnly, setDutyOnly] = (0, import_react.useState)(true);
	const rows = (0, import_react.useMemo)(() => {
		const sorted = PHARMACIES.map((p) => ({
			...p,
			meters: metersBetween(geo, p)
		})).sort((a, b) => a.meters - b.meters);
		return dutyOnly ? sorted.filter((p) => p.onDuty) : sorted;
	}, [geo, dutyOnly]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] leading-relaxed text-muted",
				children: t("utilitiesHint")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: locateMe,
				disabled: locateStatus === "locating",
				className: "press mt-3 flex w-full items-center gap-3 rounded-2xl glass-card px-4 py-3 text-left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-10 items-center justify-center rounded-lg bg-accent text-accent-fg",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[15px] font-semibold",
						children: locateStatus === "locating" ? t("locating") : t("locateMe")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[12px] text-muted",
						children: locateStatus === "denied" ? t("locateFallback") : locateStatus === "done" && geo.source === "gps" ? `${t("locatedGps")} · ${geo.label}` : `${t("locatedAround")} ${geo.label}`
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 px-1 text-[11px] leading-relaxed text-muted",
				children: t("locateHint")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 flex items-end justify-between gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-[16px] font-semibold",
					children: t("pharmaciesDuty")
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: dutyOnly,
					onClick: () => setDutyOnly(true),
					children: t("pharmaciesDutyOnly")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: !dutyOnly,
					onClick: () => setDutyOnly(false),
					children: t("pharmaciesAll")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-10 text-center text-[14px] text-muted",
					children: t("noDutyNearby")
				}) : rows.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "pharmacy",
						pharmacyId: p.id
					}),
					className: "press mb-2 flex w-full items-center gap-3 rounded-2xl glass-card px-3 py-3 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("flex size-11 items-center justify-center rounded-xl", p.onDuty ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cross, { className: "size-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-semibold",
								children: p.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block truncate text-[12px] text-muted",
								children: [
									p.city,
									" · ",
									formatMeters(p.meters, lang)
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-medium", p.onDuty ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"),
							children: p.onDuty ? p.until === "24h" ? t("open24h") : `${t("onDuty")} ${p.until}` : t("closedNow")
						})
					]
				}, p.id))
			})
		]
	});
}
function ListingScreen({ listingId }) {
	const t = useT();
	const listing = useWgoStore((s) => s.listings.find((l) => l.id === listingId));
	const seller = useWgoStore((s) => listing ? s.users[listing.sellerId] : void 0);
	const pop = useWgoStore((s) => s.pop);
	const startListingChat = useWgoStore((s) => s.startListingChat);
	const saved = useWgoStore((s) => s.savedListingIds?.includes(listingId));
	const toggleSavedListing = useWgoStore((s) => s.toggleSavedListing);
	const reports = useWgoStore((s) => s.reports);
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	if (!listing) return null;
	if (isFlagged(reports, "listing", listing.id)) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("report"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 pt-8 text-center text-[14px] text-muted",
				children: t("hiddenReported")
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: listing.title,
				onBack: pop,
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex size-11 items-center justify-center",
					"aria-label": t("saved"),
					onClick: () => toggleSavedListing(listing.id),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: cn("size-5", saved && "fill-accent text-accent") })
				}), listing.sellerId !== "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBtn, {
					label: t("report"),
					onClick: () => setReportOpen(true)
				}) : null] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
					src: listing.image,
					alt: "",
					priority: true,
					className: "h-56 w-full object-cover"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[22px] font-semibold",
								children: listing.price
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoPhoneBadge, {})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-[13px] text-muted",
							children: [
								listing.city,
								" · ",
								listing.distance
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-[15px] leading-relaxed text-muted",
							children: listing.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex items-center gap-3 rounded-xl bg-surface p-3 hairline",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									user: seller,
									size: 44
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[15px] font-medium",
										children: seller?.displayName
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[13px] text-muted",
										children: ["@", seller?.username]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4 text-muted" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-[12px] leading-relaxed text-muted",
							children: t("sellerPrivate")
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-4 pb-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "w-full",
					onClick: () => startListingChat(listing),
					children: t("contactOnWgo")
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: "listing",
				targetId: listing.id,
				blockUserId: listing.sellerId !== "me" ? listing.sellerId : void 0,
				onSubmitted: pop
			})
		]
	});
}
function PharmacyScreen({ pharmacyId }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const pop = useWgoStore((s) => s.pop);
	const geo = useWgoStore((s) => s.geo);
	const pharmacy = PHARMACIES.find((p) => p.id === pharmacyId);
	if (!pharmacy) return null;
	const meters = metersBetween(geo, pharmacy);
	function openMaps() {
		const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`;
		window.open(url, "_blank", "noopener,noreferrer");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: pharmacy.name,
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-5 pb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("flex size-12 items-center justify-center rounded-2xl", pharmacy.onDuty ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cross, { className: "size-6" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[20px] font-semibold",
							children: pharmacy.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[13px] text-paper/60",
							children: [
								pharmacy.city,
								" · ",
								formatMeters(meters, lang)
							]
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: cn("mt-5 inline-flex rounded-full px-3 py-1 text-[13px] font-medium", pharmacy.onDuty ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper/70"),
						children: pharmacy.onDuty ? pharmacy.until === "24h" ? t("open24h") : `${t("onDutyUntil")} ${pharmacy.until}` : `${t("openUntil")} ${pharmacy.until}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 rounded-2xl bg-paper/8 px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[12px] font-medium tracking-wide text-paper/45 uppercase",
							children: pharmacy.city
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[15px] leading-relaxed",
							children: pharmacy.address
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[12px] text-paper/50",
						children: t("pharmacyPhone")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[16px] font-medium tabular-nums",
						children: pharmacy.phone
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[12px] leading-relaxed text-paper/45",
						children: t("civicNote")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
							className: "w-full",
							onClick: openMaps,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "size-4" }), t("directions")]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
							variant: "secondary",
							className: "w-full bg-paper/10 text-paper",
							onClick: () => {
								window.location.href = `tel:${pharmacy.phone.replace(/\s/g, "")}`;
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" }), t("callPharmacy")]
						})]
					})
				]
			})
		]
	});
}
function shopCatLabel(cat, t) {
	return t(SHOP_CAT_KEYS[cat]);
}
function ShopsPane() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const geo = useWgoStore((s) => s.geo);
	const { shops } = useSafeCatalog();
	const push = useWgoStore((s) => s.push);
	const mine = shops.find((s) => s.ownerId === "me");
	const [cat, setCat] = (0, import_react.useState)("all");
	const [q, setQ] = (0, import_react.useState)("");
	const toks = tokens(q);
	const rows = (0, import_react.useMemo)(() => {
		return shops.filter((s) => cat === "all" ? true : s.category === cat).map((s) => ({
			...s,
			meters: metersBetween(geo, s),
			n: toks.length ? scoreBlob(`${s.name} ${s.bio} ${s.city} ${s.handle} ${SHOP_EXTRA[s.category]}`, toks) : 1
		})).filter((s) => s.n > 0).sort((a, b) => {
			if (toks.length) return b.n - a.n || a.meters - b.meters;
			const feat = Number(b.plan === "plus") - Number(a.plan === "plus");
			if (feat) return feat;
			return a.meters - b.meters;
		});
	}, [
		shops,
		cat,
		geo,
		toks
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] leading-relaxed text-muted",
				children: t("cardHint")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
				className: "mt-3",
				placeholder: t("searchShops"),
				value: q,
				onChange: (e) => setQ(e.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex gap-2 overflow-x-auto no-scrollbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: cat === "all",
					onClick: () => setCat("all"),
					children: t("shopCatAll")
				}), SHOP_CATS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: cat === c,
					onClick: () => setCat(c),
					children: shopCatLabel(c, t)
				}, c))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
				className: "mt-3 w-full",
				variant: mine ? "secondary" : "primary",
				onClick: () => push(mine ? {
					name: "shop",
					shopId: mine.id
				} : { name: "create-shop" }),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-4" }), mine ? t("myCard") : t("createCard")]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-10 text-center text-[14px] text-muted",
					children: t("noShops")
				}) : rows.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "shop",
						shopId: s.id
					}),
					className: "press mb-2 w-full overflow-hidden rounded-2xl glass-card text-left",
					children: [s.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: s.image,
						alt: "",
						className: "h-28 w-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-28 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.4),transparent_55%)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "min-w-0 flex-1 truncate text-[16px] font-semibold",
									children: s.name
								}), s.plan === "plus" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg",
									children: t("featured")
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 text-[12px] text-muted",
								children: [
									shopCatLabel(s.category, t),
									" · ",
									s.city,
									" · ",
									formatMeters(s.meters, lang)
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[12px] font-semibold text-navy",
								children: t("viewCard")
							})
						]
					})]
				}, s.id))
			})
		]
	});
}
var SHOP_FACE = {
	"shop-nails": {
		hero: "/media/shop-nails-hero.jpg",
		logo: "/media/shop-nails-logo.jpg",
		photos: [
			"/media/shop-nails-hero.jpg",
			"/media/shop-nails-art.jpg",
			"/media/shop-nails-lounge.jpg",
			"/media/shop-nails-polish.jpg"
		]
	},
	"shop-chen": {
		hero: "/media/shop-chen-hero.jpg",
		logo: "/media/shop-chen-logo.jpg",
		photos: [
			"/media/shop-chen-latte.jpg",
			"/media/shop-chen-corner.jpg",
			"/media/shop-chen-hero.jpg",
			"/media/coffee.jpg"
		]
	}
};
var SHOP_RATING = {
	"shop-nails": {
		score: 4.9,
		count: 86
	},
	"shop-chen": {
		score: 4.8,
		count: 128
	},
	"shop-deena": {
		score: 4.7,
		count: 41
	},
	"shop-atlas": {
		score: 4.6,
		count: 29
	},
	"shop-mie": {
		score: 4.8,
		count: 54
	}
};
var SHOP_REVIEWS = {
	"shop-nails": [
		{
			name: "Léa",
			text: "Pose nickel. On écrit sur Wipp, c’est tout."
		},
		{
			name: "Maya",
			text: "Nail art propre, sur rendez-vous."
		},
		{
			name: "Sofia",
			text: "L’atelier est calme. Je reviens."
		}
	],
	"shop-chen": [
		{
			name: "Noah",
			text: "La table du fond. Silence. Parfait."
		},
		{
			name: "Alex",
			text: "Café serré, Wi-Fi, pas de numéro à donner."
		},
		{
			name: "Léa",
			text: "J’y travaille le matin."
		}
	],
	"shop-deena": [{
		name: "Samira",
		text: "Soin teint, on parle à @deenabeauty."
	}]
};
function ShopScreen({ shopId }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const shop = useWgoStore((s) => s.shops.find((x) => x.id === shopId));
	const geo = useWgoStore((s) => s.geo);
	const lifestyle = useWgoStore((s) => s.lifestyle);
	const openShopChat = useWgoStore((s) => s.openShopChat);
	const [copied, setCopied] = (0, import_react.useState)(null);
	const [saved, setSaved] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("about");
	const [shopMenu, setShopMenu] = (0, import_react.useState)(false);
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	if (!shop) return null;
	const mine = shop.ownerId === "me";
	const meters = metersBetween(geo, shop);
	const link = `wipp.me/@${shop.handle}`;
	const qrValue = `wipp.me/b/${shop.qrToken}`;
	const face = SHOP_FACE[shop.id];
	const hero = face?.hero || shop.image;
	const logo = face?.logo || shop.logo || shop.image;
	const photos = (face?.photos?.length ? face.photos : shop.photos?.length ? shop.photos : hero ? [hero] : []).filter(Boolean);
	const mapsQuery = `${shop.address}, ${shop.city}`;
	const place = [
		"Longueuil",
		"Brossard",
		"Greenfield Park",
		"Saint-Lambert",
		"Boucherville"
	].includes(shop.city) ? `${shop.city}, Québec, ${shop.country}` : `${shop.city}, ${shop.country}`;
	const tags = shop.tags?.length ? shop.tags : [shopCatLabel(shop.category, t)];
	const rating = SHOP_RATING[shop.id] ?? (shop.plan === "plus" ? {
		score: 4.7,
		count: 18
	} : void 0);
	const reviews = SHOP_REVIEWS[shop.id] ?? [];
	const events = lifestyle.filter((e) => e.place.toLowerCase().includes(shop.name.toLowerCase()) || e.hostId === shop.ownerId);
	const initials = shop.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
	async function copyText(value, key) {
		try {
			await navigator.clipboard.writeText(value);
		} catch {}
		setCopied(key);
		window.setTimeout(() => setCopied(null), 1400);
	}
	function openMaps() {
		window.open(`https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`, "_blank", "noopener");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-ink text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 overflow-y-auto no-scrollbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative h-[196px]",
					children: [
						hero ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: hero,
							alt: "",
							priority: true,
							className: "absolute inset-0 size-full object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-ink via-transparent to-black/20" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute inset-x-0 top-2 z-10 flex items-center justify-between px-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("back"),
								onClick: pop,
								className: "size-10 bg-navy/55 text-paper backdrop-blur-sm",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("share"),
								className: "size-10 bg-navy/55 text-paper backdrop-blur-sm",
								onClick: () => setShopMenu(true),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "size-5" })
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10 -mt-8 px-3 pb-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-[28px] bg-navy px-4 pb-4 pt-4 shadow-[0_-18px_40px_rgb(0_0_0_/_0.4),inset_0_1px_0_rgb(255_255_255_/_0.08)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "size-[76px] shrink-0 overflow-hidden rounded-full bg-ink ring-2 ring-[#C9A227] ring-offset-2 ring-offset-navy",
										children: logo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
											src: logo,
											alt: "",
											className: "size-full object-cover"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex size-full items-center justify-center text-[20px] font-semibold text-accent",
											children: initials
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
														className: "min-w-0 truncate text-[18px] font-semibold tracking-tight",
														children: shop.name
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
															width: "10",
															height: "10",
															viewBox: "0 0 12 12",
															"aria-hidden": true,
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
																d: "M2.2 6.2 4.6 8.6 9.8 3.4",
																fill: "none",
																stroke: "currentColor",
																strokeWidth: "1.8",
																strokeLinecap: "round",
																strokeLinejoin: "round"
															})
														})
													}),
													rating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "size-3 fill-current" }),
															rating.score.toFixed(1),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "font-medium text-accent-fg/70",
																children: [
																	"(",
																	rating.count,
																	")"
																]
															})
														]
													}) : null
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-0.5 text-[12px] text-paper/55",
												children: [
													shopCatLabel(shop.category, t),
													" · ",
													shop.city
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1.5 line-clamp-2 text-[13px] leading-snug text-paper/80",
												children: shop.bio
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3 flex flex-wrap gap-1.5",
									children: tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-full bg-paper/10 px-2.5 py-1 text-[11px] font-medium text-paper/75",
										children: tag
									}, tag))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3.5 flex items-start gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1 space-y-2.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(InfoLine, {
												icon: MapPin,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "block",
													children: shop.address
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-paper/50",
													children: place
												})]
											}),
											shop.hours ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoLine, {
												icon: Clock,
												children: shop.hours
											}) : null,
											shop.phone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoLine, {
												icon: Phone,
												onClick: () => {
													window.location.href = `tel:${shop.phone.replace(/\s/g, "")}`;
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "tabular-nums",
													children: shop.phone
												})
											}) : null,
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(InfoLine, {
												icon: Globe,
												onClick: () => void copyText(`https://${link}`, "link"),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "flex items-center gap-1",
													children: [link, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3 opacity-50" })]
												}), copied === "link" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-accent",
													children: t("copied")
												}) : null]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoLine, {
												icon: AtSign,
												onClick: () => void copyText(`@${shop.handle}`, "handle"),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "flex items-center gap-1",
													children: [
														"@",
														shop.handle,
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3 opacity-50" })
													]
												})
											}),
											shop.quote ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "pt-1 text-[12px] leading-snug text-paper/45 italic",
												children: [
													"« ",
													shop.quote,
													" »"
												]
											}) : null
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "w-[148px] shrink-0 rounded-[22px] bg-paper p-2 text-center text-navy",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCard, {
												value: qrValue,
												size: 132,
												pad: 6,
												markSrc: logo || void 0,
												className: "mx-auto rounded-[16px]"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1.5 px-1 text-[10px] leading-tight font-medium text-navy/55",
												children: t("scanToWrite")
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												className: "press mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-full bg-navy px-2 text-[11px] font-medium text-paper",
												onClick: () => void copyText(`https://${link}`, "card"),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-3" }), copied === "card" ? t("copied") : t("shareMyCard")]
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 grid grid-cols-4 gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => mine ? push({ name: "create-shop" }) : openShopChat(shop.id),
											className: "press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-accent text-accent-fg",
											children: [mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-1 px-0.5 text-center text-[10px] leading-tight font-semibold",
												children: mine ? t("editCard") : t("messageShop")
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: !shop.phone,
											onClick: () => {
												if (!shop.phone) return;
												window.location.href = `tel:${shop.phone.replace(/\s/g, "")}`;
											},
											className: "press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-paper/8 text-paper disabled:opacity-30",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-1 text-[10px] font-medium",
												children: t("callShop")
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: openMaps,
											className: "press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-paper/8 text-paper",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-1 text-[10px] font-medium",
												children: t("directions")
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setSaved((v) => !v),
											className: "press flex h-[58px] flex-col items-center justify-center rounded-[20px] bg-paper/8 text-paper",
											children: [saved ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookmarkCheck, { className: "size-4 text-accent" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-1 text-[10px] font-medium",
												children: saved ? t("savedCard") : t("saveCard")
											})]
										})
									]
								})
							]
						}),
						photos.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex gap-2 overflow-x-auto no-scrollbar",
							children: [photos.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
								src,
								alt: "",
								className: "h-[92px] w-[118px] shrink-0 rounded-[16px] object-cover"
							}, src)), photos.length >= 4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex h-[92px] w-[76px] shrink-0 flex-col items-center justify-center rounded-[16px] bg-navy text-[13px] font-semibold text-paper",
								children: [
									"+",
									photos.length,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-medium text-paper/55",
										children: t("morePhotos")
									})
								]
							}) : null]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 flex gap-4 border-b border-paper/10 px-1",
							children: [
								["about", t("aboutTab")],
								["reviews", `${t("reviewsTab")}${rating ? ` (${rating.count})` : ""}`],
								["services", t("shopServicesTab")],
								["events", t("shopEventsTab")]
							].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setTab(id),
								className: cn("relative pb-2.5 text-[13px] font-medium", tab === id ? "text-paper" : "text-paper/40"),
								children: [label, tab === id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" }) : null]
							}, id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-1 pt-3",
							children: [
								tab === "about" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[13px] leading-relaxed text-paper/70",
									children: [
										shop.bio,
										shop.quote ? ` « ${shop.quote} »` : "",
										` · ${formatMeters(meters, lang)}`
									]
								}) : null,
								tab === "reviews" ? reviews.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-3",
									children: reviews.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-2xl bg-navy px-3 py-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[13px] font-medium",
											children: r.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-0.5 text-[13px] leading-snug text-paper/70",
											children: r.text
										})]
									}, r.name))
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[13px] text-paper/50",
									children: t("noReviews")
								}) : null,
								tab === "services" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-2",
									children: tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-full bg-navy px-3 py-1.5 text-[13px] text-paper/80",
										children: tag
									}, tag))
								}) : null,
								tab === "events" ? events.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2",
									children: events.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => push({
											name: "lifestyle",
											itemId: e.id
										}),
										className: "flex w-full items-center gap-3 rounded-2xl bg-navy p-2 text-left",
										children: [e.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
											src: e.image,
											alt: "",
											className: "h-11 w-11 rounded-xl object-cover"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-accent",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "size-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block truncate text-[13px] font-medium",
												children: e.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[12px] text-paper/50",
												children: e.when
											})]
										})]
									}, e.id))
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[13px] text-paper/50",
									children: t("noLifestyle")
								}) : null
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				open: shopMenu,
				onClose: () => setShopMenu(false),
				title: shop.name,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex h-12 w-full items-center rounded-lg px-2 text-[15px]",
					onClick: () => {
						copyText(`https://${link}`, "card");
						setShopMenu(false);
					},
					children: t("share")
				}), !mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex h-12 w-full items-center rounded-lg px-2 text-[15px]",
					onClick: () => {
						setShopMenu(false);
						setReportOpen(true);
					},
					children: t("report")
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: "shop",
				targetId: shop.id,
				blockUserId: shop.ownerId !== "me" ? shop.ownerId : void 0,
				onSubmitted: pop
			})
		]
	});
}
function InfoLine({ icon: Icon, children, onClick }) {
	const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "mt-0.5 size-3.5 shrink-0 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "min-w-0 text-[12px] leading-snug text-paper/90",
		children
	})] });
	const cls = "flex w-full items-start gap-2 text-left";
	if (onClick) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: cls,
		children: body
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cls,
		children: body
	});
}
function CreateShopScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const me = useWgoStore((s) => s.me);
	const createShop = useWgoStore((s) => s.createShop);
	const existing = useWgoStore((s) => s.shops.find((x) => x.ownerId === "me"));
	const [name, setName] = (0, import_react.useState)(existing?.name ?? "");
	const [bio, setBio] = (0, import_react.useState)(existing?.bio ?? "");
	const [address, setAddress] = (0, import_react.useState)(existing?.address ?? "");
	const [city, setCity] = (0, import_react.useState)(existing?.city ?? me.city ?? "Longueuil");
	const [country, setCountry] = (0, import_react.useState)(existing?.country ?? "Canada");
	const [phone, setPhone] = (0, import_react.useState)(existing?.phone ?? "");
	const [handle, setHandle] = (0, import_react.useState)(existing?.handle ?? "");
	const [hours, setHours] = (0, import_react.useState)(existing?.hours ?? "");
	const [category, setCategory] = (0, import_react.useState)(existing?.category ?? "nails");
	const [banner, setBanner] = (0, import_react.useState)(existing?.image ?? "");
	const [photos, setPhotos] = (0, import_react.useState)(existing?.photos ?? []);
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
			photos: photos.length ? photos : banner ? [banner] : []
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: existing ? t("editCard") : t("createCard"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-4 pb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] leading-relaxed text-muted",
						children: t("cardHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaPicker, {
							label: t("addBanner"),
							value: banner,
							onPick: (v) => setBanner(Array.isArray(v) ? v[0] ?? "" : v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopName"),
								value: name,
								onChange: (e) => setName(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopHandle"),
								value: handle,
								placeholder: "@nailsbysarah",
								onChange: (e) => setHandle(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopBio"),
								value: bio,
								onChange: (e) => setBio(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopCountry"),
								value: country,
								onChange: (e) => setCountry(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopCity"),
								value: city,
								onChange: (e) => setCity(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopAddress"),
								value: address,
								onChange: (e) => setAddress(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopPhone"),
								value: phone,
								onChange: (e) => setPhone(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("shopHours"),
								value: hours,
								placeholder: "Mar–Sam 10 h–19 h",
								onChange: (e) => setHours(e.target.value)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-[12px] font-medium tracking-wide text-muted uppercase",
						children: shopCatLabel(category, t)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: SHOP_CATS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: category === c,
							onClick: () => setCategory(c),
							children: shopCatLabel(c, t)
						}, c))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaPicker, {
							label: t("addPhotos"),
							value: photos,
							multiple: true,
							max: 4,
							onPick: (v) => setPhotos(Array.isArray(v) ? v : v ? [v] : [])
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[11px] text-muted",
							children: t("photosHint")
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[12px] leading-relaxed text-muted",
						children: t("shopProNote")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-6 w-full",
						disabled: !name.trim(),
						onClick: publish,
						children: t("publishShop")
					})
				]
			})
		]
	});
}
function MediaPicker({ label, value, multiple, max = 4, onPick }) {
	const t = useT();
	const selected = Array.isArray(value) ? value : value ? [value] : [];
	function toggle(src) {
		if (!multiple) {
			onPick(src === selected[0] ? "" : src);
			return;
		}
		if (selected.includes(src)) onPick(selected.filter((s) => s !== src));
		else if (selected.length < max) onPick([...selected, src]);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-1.5 text-[12px] font-medium text-muted",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-2 overflow-x-auto no-scrollbar",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onPick(multiple ? [] : ""),
			className: cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-xl glass-card text-[11px] text-muted", selected.length === 0 && "ring-2 ring-accent"),
			children: t("noBanner")
		}), MEDIA.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => toggle(src),
			className: cn("h-16 w-20 shrink-0 overflow-hidden rounded-xl", selected.includes(src) && "ring-2 ring-accent"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
				src,
				alt: "",
				className: "h-full w-full object-cover"
			})
		}, src))]
	})] });
}
function LifestylePane() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const geo = useWgoStore((s) => s.geo);
	const locateMe = useWgoStore((s) => s.locateMe);
	const locateStatus = useWgoStore((s) => s.locateStatus);
	const push = useWgoStore((s) => s.push);
	const { events: items } = useSafeCatalog();
	const [kind, setKind] = (0, import_react.useState)("all");
	const rows = (0, import_react.useMemo)(() => {
		return items.filter((item) => kind === "all" ? true : item.kind === kind).map((item) => ({
			...item,
			meters: metersBetween(geo, item)
		})).sort((a, b) => a.meters - b.meters);
	}, [
		kind,
		geo,
		items
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] leading-relaxed text-muted",
				children: t("lifestyleHint")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => push({ name: "create-lifestyle" }),
				className: "press mt-3 flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-accent-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-10 items-center justify-center rounded-lg bg-navy text-paper",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[15px] font-semibold",
						children: t("createLifestyle")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[12px] text-accent-fg/70",
						children: t("eventHint")
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: locateMe,
				disabled: locateStatus === "locating",
				className: "press mt-2 flex w-full items-center gap-3 rounded-2xl glass-card px-4 py-3 text-left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-10 items-center justify-center rounded-lg bg-navy text-paper",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[15px] font-semibold",
						children: t("lifestyleNearFirst")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[12px] text-muted",
						children: locateStatus === "locating" ? t("locating") : `${t("locatedAround")} ${geo.label}`
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex gap-2 overflow-x-auto no-scrollbar",
				children: [
					"all",
					"party",
					"concert",
					"promo",
					"event",
					"spot"
				].map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: kind === id,
					onClick: () => setKind(id),
					children: id === "all" ? t("lifestyleAll") : lifestyleKindLabel(id, t)
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-10 text-center text-[14px] text-muted",
					children: t("noLifestyle")
				}) : rows.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({
						name: "lifestyle",
						itemId: item.id
					}),
					className: "press mb-3 w-full overflow-hidden rounded-2xl glass-card text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LifestyleCover, {
						item,
						className: "h-36"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-paper",
									children: lifestyleKindLabel(item.kind, t)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriceBadge, { item })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[16px] font-semibold",
								children: item.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 text-[12px] text-muted",
								children: [
									formatMeters(item.meters, lang),
									" · ",
									item.when,
									" · ",
									item.city
								]
							})
						]
					})]
				}, item.id))
			})
		]
	});
}
function PriceBadge({ item }) {
	const t = useT();
	const label = item.deal ?? (item.paid ? item.price : item.kind === "party" || item.kind === "concert" ? t("eventFree") : void 0);
	if (!label) return null;
	const accent = Boolean(item.deal || item.paid);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", accent ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"),
		children: label
	});
}
function lifestyleKindLabel(kind, t) {
	return t({
		event: "lifestyleEvent",
		spot: "lifestyleSpot",
		party: "lifestyleParty",
		concert: "lifestyleConcert",
		promo: "lifestylePromo"
	}[kind]);
}
function LifestyleCover({ item, className, label }) {
	if (item.image) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
		src: item.image,
		alt: "",
		className: cn("w-full object-cover", className)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex items-end bg-navy bg-[radial-gradient(circle_at_80%_10%,rgb(255_216_77_/_0.35),transparent_55%)]", label && "px-4 pb-3", className),
		children: label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[18px] font-semibold text-accent",
			children: item.title
		}) : null
	});
}
function LifestyleScreen({ itemId }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const geo = useWgoStore((s) => s.geo);
	const item = useWgoStore((s) => s.lifestyle.find((x) => x.id === itemId));
	const host = useWgoStore((s) => {
		if (!item?.hostId) return void 0;
		if (item.hostId === "me") return s.me;
		return s.users[item.hostId];
	});
	const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	if (!item) return null;
	const meters = metersBetween(geo, item);
	const mine = item.hostId === "me";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: item.title,
				onBack: pop,
				right: !mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBtn, {
					label: t("report"),
					onClick: () => setReportOpen(true)
				}) : void 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LifestyleCover, {
					item,
					className: "h-52",
					label: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-paper",
								children: lifestyleKindLabel(item.kind, t)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriceBadge, { item })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-[15px] text-muted",
							children: [
								formatMeters(meters, lang),
								" · ",
								item.when
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-[15px] text-muted",
							children: [
								item.place,
								" · ",
								item.city
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-[15px] leading-relaxed",
							children: item.note
						}),
						host ? mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 text-[13px] text-muted",
							children: t("youHostEvent")
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-6 flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left hairline",
							onClick: () => push({
								name: "found-profile",
								userId: host.id,
								via: "nearby"
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: host,
								size: 44
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[15px] font-medium",
									children: host.displayName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[13px] text-muted",
									children: ["@", host.username]
								})]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 text-[13px] text-muted",
							children: t("noHost")
						})
					]
				})]
			}),
			host && !mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-4 pb-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "w-full",
					onClick: () => openOrCreateDm(host.id),
					children: t("messageHost")
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: "event",
				targetId: item.id,
				blockUserId: host && host.id !== "me" ? host.id : void 0,
				onSubmitted: pop
			})
		]
	});
}
function CreateLifestyleScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const createLifestyle = useWgoStore((s) => s.createLifestyle);
	const [kind, setKind] = (0, import_react.useState)("party");
	const [title, setTitle] = (0, import_react.useState)("");
	const [when, setWhen] = (0, import_react.useState)("Samedi · 21 h");
	const [place, setPlace] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	const [paid, setPaid] = (0, import_react.useState)(false);
	const [price, setPrice] = (0, import_react.useState)("15 $");
	const [image, setImage] = (0, import_react.useState)("");
	const kinds = [
		"party",
		"concert",
		"promo",
		"event",
		"spot"
	];
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
			price: paid ? price.trim() : void 0,
			image,
			deal: kind === "promo" && !paid ? note.trim() || void 0 : void 0
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("createLifestyle"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-4 pb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] leading-relaxed text-muted",
						children: t("eventHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-[12px] font-medium tracking-wide text-muted uppercase",
						children: lifestyleKindLabel(kind, t)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: kinds.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: kind === id,
							onClick: () => setKind(id),
							children: lifestyleKindLabel(id, t)
						}, id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("lsTitle"),
								value: title,
								onChange: (e) => setTitle(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("eventWhen"),
								value: when,
								onChange: (e) => setWhen(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("eventPlace"),
								value: place,
								onChange: (e) => setPlace(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("eventNote"),
								value: note,
								onChange: (e) => setNote(e.target.value)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-[12px] font-medium tracking-wide text-muted uppercase",
						children: t("eventPrice")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: !paid,
							onClick: () => setPaid(false),
							children: t("eventFree")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: paid,
							onClick: () => setPaid(true),
							children: t("eventPaid")
						})]
					}),
					paid ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: t("eventPrice"),
							value: price,
							onChange: (e) => setPrice(e.target.value)
						})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaPicker, {
							label: t("pickImage"),
							value: image,
							onPick: (v) => setImage(Array.isArray(v) ? v[0] ?? "" : v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-6 w-full",
						disabled: !title.trim(),
						onClick: publish,
						children: t("publishEvent")
					})
				]
			})
		]
	});
}
//#endregion
export { CreateLifestyleScreen, CreateShopScreen, ExploreScreen, LifestyleScreen, ListingScreen, PharmacyScreen, ShopScreen };

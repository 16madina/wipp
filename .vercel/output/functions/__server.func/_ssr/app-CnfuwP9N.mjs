import { i as __toESM } from "../_runtime.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as formatRemainShort, C as formatChatTime, E as formatLastSeen, F as isEmojiSticker, G as stickerLabel, H as shortFp, I as isStickerId, K as stickersInPack, L as isStoryLive, P as isChatSealed, R as isTabScreen, T as formatDuration, U as stickerById, W as stickerIdFromEmoji, X as useWgoStore, Y as useT, Z as yearsOld, _ as STORY_VIDEO_MAX_MS, a as DISAPPEAR_24H, b as defaultA11y, c as LEGAL_CONTACT, d as NEARBY, f as SHOP_CAT_KEYS, i as APP_HOST, k as formatRemain, l as LEGAL_VERSION, n as IntroSplash, o as DISAPPEAR_7D, p as STICKER_PACKS, r as PhoneShell, s as EMOJI_CATS, v as TAKEN_USERNAMES, w as formatClock, x as emojiFromStickerId, y as cn, z as legalDoc } from "./boot-BFpP81oK.mjs";
import { $ as Hash, A as QrCode, C as ShieldCheck, Ct as BellOff, D as Search, Dt as ArrowRight, E as Send, Et as AtSign, G as MessageCircle, H as Moon, J as LogOut, K as Megaphone, M as Play, N as Phone, O as ScanLine, Q as Heart, R as Pencil, S as Shield, St as Bell, T as Settings, Tt as BadgeCheck, U as Mic, V as Music, X as Languages, Y as Lock, Z as ImagePlus, _ as Store, _t as Camera, a as Video, at as Eye, b as Sparkles, bt as Bookmark, c as Users, d as Type, dt as Clock, et as Hand, ft as CircleHelp, gt as Check, h as Tag, ht as ChevronDown, it as FileText, j as Plus, k as ScanFace, l as User, lt as Copy, m as Timer, mt as ChevronLeft, n as X, nt as Flag, ot as Ellipsis, p as Trash2, pt as ChevronRight, q as MapPin, rt as Fingerprint, s as Vibrate, t as Zap, tt as Globe, u as UserPlus, ut as Compass, v as Sticker, vt as Calendar, w as Share2, wt as Ban, x as Smartphone, yt as CalendarDays } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-lTWLEqBa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var HAPTIC = {
	tap: [10],
	select: [14],
	send: [12, 28],
	success: [
		12,
		40,
		22
	],
	error: [
		40,
		50,
		40
	],
	connect: [
		16,
		36,
		16,
		36,
		28
	],
	hold: [
		8,
		18,
		8
	],
	incoming: [
		240,
		140,
		240,
		140,
		240
	]
};
function canVibrate() {
	return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
function hapticsOn() {
	return useWgoStore.getState().a11y?.haptics !== false;
}
function haptic(kind = "tap") {
	if (!hapticsOn()) return false;
	if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("wipp-haptic", { detail: kind }));
	if (!canVibrate()) return false;
	try {
		navigator.vibrate([...HAPTIC[kind]]);
		return true;
	} catch {
		return false;
	}
}
function hapticStop() {
	try {
		navigator.vibrate?.(0);
	} catch {}
}
function reducedMotion() {
	if (typeof window === "undefined") return false;
	if (useWgoStore.getState().a11y?.reduceMotion) return true;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function announce(text) {
	if (typeof document === "undefined" || !text) return;
	const live = document.getElementById("wipp-live");
	if (!live) return;
	live.textContent = "";
	window.requestAnimationFrame(() => {
		live.textContent = text;
	});
}
function StatusBar({ className }) {
	const [time, setTime] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}));
	(0, import_react.useEffect)(() => {
		const tick = () => setTime((/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		}));
		tick();
		const id = window.setInterval(tick, 3e4);
		return () => window.clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex h-12 shrink-0 items-end justify-between px-6 pb-1 text-[12px] font-medium text-fg tabular-nums", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			suppressHydrationWarning: true,
			children: time
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-1.5 opacity-80",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-2 w-4 rounded-[2px] bg-fg/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-2.5 w-1.5 rounded-[1px] bg-fg" })]
		})]
	});
}
function Btn({ variant = "primary", className, children, onPointerDown, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn("press inline-flex h-12 min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium", variant === "primary" && "bg-accent text-accent-fg", variant === "navy" && "bg-navy text-paper", variant === "secondary" && "glass-card text-fg", variant === "ghost" && "bg-transparent text-fg", variant === "danger" && "bg-danger/15 text-danger", "disabled:opacity-40", className),
		onPointerDown: (e) => {
			if (!e.currentTarget.disabled && e.button === 0) haptic("tap");
			onPointerDown?.(e);
		},
		...props,
		children
	});
}
function IconBtn({ className, children, label, onPointerDown, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		"aria-label": label,
		className: cn("press hit inline-flex size-[var(--touch-min)] items-center justify-center rounded-full text-fg", className),
		onPointerDown: (e) => {
			if (!e.currentTarget.disabled && e.button === 0) haptic("tap");
			onPointerDown?.(e);
		},
		...props,
		children
	});
}
function Field({ label, className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1.5 block text-[12px] font-medium text-muted",
			children: label
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: cn("h-12 min-h-[var(--touch-min)] w-full rounded-md bg-surface-2 px-4 text-[15px] text-fg outline-none", "shadow-[var(--shadow-hairline)] placeholder:text-muted", "focus:ring-2 focus:ring-ring", className),
			...props
		})]
	});
}
function SearchField({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("h-11 w-full rounded-lg glass-card px-4 text-[15px] text-fg outline-none", "placeholder:text-muted", className),
		...props
	});
}
function Header({ title, onBack, right, subtitle, className }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex shrink-0 items-center gap-1 px-2", subtitle ? "min-h-14" : "h-12 min-h-12", className),
		children: [
			onBack ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
				label: t("back"),
				onClick: onBack,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-6" })
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col justify-center leading-tight",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-[17px] font-semibold tracking-tight",
					children: title
				}), subtitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-[12px] font-normal text-muted",
					children: subtitle
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center",
				children: right
			})
		]
	});
}
function Row({ icon, label, value, onClick, danger, trailing }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(onClick ? "button" : "div", {
		type: onClick ? "button" : void 0,
		onClick,
		onPointerDown: onClick ? () => haptic("tap") : void 0,
		className: cn("flex min-h-[var(--touch-min)] w-full items-center gap-3 px-4 py-3 text-left", onClick && "press"),
		children: [
			icon ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-9 items-center justify-center rounded-md bg-surface-2 text-fg",
				children: icon
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("flex-1 text-[15px]", danger && "text-danger"),
				children: label
			}),
			value ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[13px] text-muted",
				children: value
			}) : null,
			trailing,
			onClick && !trailing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4 text-muted" }) : null
		]
	});
}
function Section({ title, children, caps = true }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "px-4",
		children: [title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: cn("mb-2 px-1 font-medium text-muted", caps ? "text-[12px] tracking-wide uppercase" : "text-[13px]"),
			children: title
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-hidden rounded-xl glass-card",
			children
		})]
	});
}
function Toggle({ checked, onChange, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "switch",
		"aria-checked": checked,
		"aria-label": label,
		onClick: () => {
			haptic("select");
			onChange(!checked);
		},
		className: cn("relative flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("relative h-7 w-11 rounded-full transition-colors duration-150", checked ? "bg-accent" : "bg-surface-2 hairline"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-paper transition-transform duration-150", checked && "translate-x-4 bg-navy") })
		})
	});
}
function Sheet({ open, onClose, children, title }) {
	const t = useT();
	const [shown, setShown] = (0, import_react.useState)(open);
	const [inPos, setInPos] = (0, import_react.useState)(open);
	(0, import_react.useEffect)(() => {
		if (open) {
			setShown(true);
			const id = window.requestAnimationFrame(() => setInPos(true));
			return () => window.cancelAnimationFrame(id);
		}
		setInPos(false);
		const t = window.setTimeout(() => setShown(false), 320);
		return () => window.clearTimeout(t);
	}, [open]);
	if (!shown) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-40 flex flex-col justify-end",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: cn("sheet-scrim absolute inset-0 bg-ink/50", inPos ? "opacity-100" : "opacity-0"),
			"aria-label": t("close"),
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("glass-strong sheet-panel relative rounded-t-2xl px-4 pt-3 pb-8", inPos ? "translate-y-0" : "translate-y-full"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-3 h-1 w-10 rounded-full bg-muted/40" }),
				title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-center text-[15px] font-semibold",
					children: title
				}) : null,
				children
			]
		})]
	});
}
function Empty({ title, body, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-1 flex-col items-center justify-center px-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[17px] font-semibold",
				children: title
			}),
			body ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-[14px] leading-relaxed text-muted",
				children: body
			}) : null,
			action ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5",
				children: action
			}) : null
		]
	});
}
function Badge({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg tabular-nums",
		children
	});
}
function Chip({ active, children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: cn("press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium", active ? "bg-accent text-accent-fg" : "glass-card text-fg"),
		children
	});
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/avatar-VdPPUklP.js
var PHOTO_DIRS = [
	"/avatars/",
	"/media/",
	"/brand/"
];
function webpSrc(src) {
	if (!src) return src ?? "";
	if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) return src;
	if (!PHOTO_DIRS.some((d) => src.startsWith(d))) return src;
	return src.replace(/\.(jpe?g|png)$/i, ".webp");
}
function Avatar({ user, size = 44, ring, className, hidden, priority }) {
	const initials = (user?.displayName ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("relative inline-flex shrink-0", className),
		style: {
			width: size,
			height: size
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("overflow-hidden rounded-full bg-surface-2 text-muted", ring === "accent" && "ring-2 ring-accent ring-offset-2 ring-offset-bg", ring === "muted" && "ring-2 ring-hair ring-offset-2 ring-offset-bg"),
			style: {
				width: size,
				height: size
			},
			children: hidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-full items-center justify-center bg-navy",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: size * .42,
					height: size * .42,
					viewBox: "0 0 64 64",
					"aria-hidden": true,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "20",
							cy: "32",
							r: "7",
							fill: "#F7F9FC"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "44",
							cy: "32",
							r: "7",
							fill: "#FFD84D"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8",
							stroke: "#F7F9FC",
							strokeWidth: "3",
							fill: "none",
							strokeLinecap: "round"
						})
					]
				})
			}) : user?.avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: webpSrc(user.avatar),
				alt: "",
				width: size,
				height: size,
				loading: priority ? "eager" : "lazy",
				decoding: "async",
				fetchPriority: priority ? "high" : "low",
				className: "size-full object-cover outline outline-1 -outline-offset-1 outline-black/20"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-full items-center justify-center bg-navy text-paper",
				style: { fontSize: size * .34 },
				children: initials
			})
		}), !hidden && user?.online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute right-0 bottom-0 rounded-full bg-accent outline-2 outline-bg",
			style: {
				width: Math.max(8, size * .22),
				height: Math.max(8, size * .22)
			}
		}) : null]
	});
}
function GroupAvatar({ users, size = 44, photo, priority }) {
	if (photo) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface-2",
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: webpSrc(photo),
			alt: "",
			width: size,
			height: size,
			loading: priority ? "eager" : "lazy",
			decoding: "async",
			className: "size-full object-cover outline outline-1 -outline-offset-1 outline-black/20"
		})
	});
	const a = users[0];
	const b = users[1];
	const inner = Math.round(size * .68);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "relative inline-flex shrink-0",
		style: {
			width: size,
			height: size
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute top-0 right-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
				user: b,
				size: inner,
				priority
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute bottom-0 left-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
				user: a,
				size: inner,
				priority
			})
		})]
	});
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/smart-img-Ccum8cfU.js
function SmartImg({ src, alt = "", className, priority, loading, decoding, fetchPriority, ...rest }) {
	const webp = webpSrc(src);
	const eager = Boolean(priority);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: webp || src,
		alt,
		className: cn("bg-surface-2", className),
		loading: loading ?? (eager ? "eager" : "lazy"),
		decoding: decoding ?? "async",
		fetchPriority: fetchPriority ?? (eager ? "high" : "low"),
		...rest
	});
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/app-CnfuwP9N.js
var REASONS = [
	{
		id: "spam",
		key: "reportSpam"
	},
	{
		id: "harass",
		key: "reportHarass"
	},
	{
		id: "hate",
		key: "reportHate"
	},
	{
		id: "fake",
		key: "reportFake"
	},
	{
		id: "scam",
		key: "reportScam"
	},
	{
		id: "sexual",
		key: "reportSexual"
	},
	{
		id: "underage",
		key: "reportUnderage"
	},
	{
		id: "other",
		key: "reportOther"
	}
];
function flaggedIds(reports, kind) {
	const set = /* @__PURE__ */ new Set();
	for (const r of reports ?? []) if (r.kind === kind) set.add(r.targetId);
	return set;
}
function isFlagged(reports, kind, id) {
	return Boolean(reports?.some((r) => r.kind === kind && r.targetId === id));
}
function ReportSheet({ open, onClose, kind, targetId, blockUserId, onSubmitted }) {
	const t = useT();
	const reportTarget = useWgoStore((s) => s.reportTarget);
	const blockUser = useWgoStore((s) => s.blockUser);
	const [reason, setReason] = (0, import_react.useState)(null);
	const [alsoBlock, setAlsoBlock] = (0, import_react.useState)(false);
	const [done, setDone] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!open) {
			setReason(null);
			setAlsoBlock(false);
			setDone(false);
		}
	}, [open, blockUserId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open,
		onClose,
		title: t("reportTitle"),
		children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "px-2 py-6 text-center text-[15px] leading-relaxed",
			children: t("reportThanks")
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-2 pb-2 text-[13px] leading-relaxed text-muted",
					children: t("reportBody")
				}),
				REASONS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cn("flex h-11 items-center rounded-lg px-3 text-left text-[14px]", reason === r.id ? "bg-accent/15 text-fg" : ""),
					onClick: () => setReason(r.id),
					children: t(r.key)
				}, r.id)),
				reason === "underage" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-2 pt-2 text-[12px] leading-relaxed text-muted",
					children: t("reportUnderageHint")
				}) : null,
				blockUserId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-2 flex items-center gap-3 px-2 py-2 text-[14px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: alsoBlock,
						onChange: (e) => setAlsoBlock(e.target.checked),
						className: "size-4 accent-[var(--color-accent)]"
					}), t("reportAlsoBlock")]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "mt-3 w-full",
					disabled: !reason,
					onClick: () => {
						if (!reason) return;
						reportTarget({
							kind,
							targetId,
							reason
						});
						if (blockUserId && alsoBlock) blockUser(blockUserId);
						setDone(true);
						window.setTimeout(() => {
							onSubmitted?.();
							onClose();
						}, 1400);
					},
					children: t("reportSend")
				})
			]
		})
	});
}
function BlockSheet({ open, onClose, userId, onBlocked }) {
	const t = useT();
	const blockUser = useWgoStore((s) => s.blockUser);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
		open,
		onClose,
		title: t("block"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-2 pb-4 text-[14px] leading-relaxed text-muted",
				children: t("blockConfirm")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				variant: "danger",
				className: "w-full",
				onClick: () => {
					blockUser(userId);
					onClose();
					onBlocked?.();
				},
				children: t("blockNow")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				variant: "ghost",
				className: "mt-2 w-full",
				onClick: onClose,
				children: t("cancel")
			})
		]
	});
}
function FlagBtn({ onClick, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "flex size-11 items-center justify-center text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { className: "size-5" })
	});
}
function AppLockGate() {
	const t = useT();
	const on = useWgoStore((s) => s.biometricsOn);
	const locked = useWgoStore((s) => s.appLocked);
	const unlockApp = useWgoStore((s) => s.unlockApp);
	const lockApp = useWgoStore((s) => s.lockApp);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
	(0, import_react.useEffect)(() => {
		if (!on) return;
		const onVis = () => {
			if (document.hidden) lockApp();
		};
		document.addEventListener("visibilitychange", onVis);
		window.addEventListener("pagehide", lockApp);
		return () => {
			document.removeEventListener("visibilitychange", onVis);
			window.removeEventListener("pagehide", lockApp);
		};
	}, [on, lockApp]);
	if (!on || !locked) return null;
	function unlock() {
		setBusy(true);
		window.setTimeout(() => {
			unlockApp();
			setBusy(false);
		}, 900);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-[90] flex flex-col items-center justify-center bg-bg px-8 text-center",
		children: [
			android ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fingerprint, { className: "size-14 text-accent" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanFace, { className: "size-14 text-accent" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 text-[22px] font-semibold",
				children: t("lockTitle")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-[14px] text-muted",
				children: t("biometricsHint")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				className: "mt-8 w-full",
				onClick: unlock,
				disabled: busy,
				children: busy ? t("biometricsUnlocking") : t("biometricsUnlock")
			})
		]
	});
}
function SafetyRow({ onReport, onBlock }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "flex h-12 items-center gap-3 rounded-lg px-2 text-[15px]",
			onClick: onReport,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { className: "size-4" }),
				" ",
				t("report")
			]
		}), onBlock ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "flex h-12 items-center gap-3 rounded-lg px-2 text-[15px] text-danger",
			onClick: onBlock,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "size-4" }),
				" ",
				t("block")
			]
		}) : null]
	});
}
/** Compact smile mark — tab bar, onboarding. */
function WippMark({ size = 56, className, invert }) {
	const face = invert ? "#0B1220" : "#F7F9FC";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: size,
		height: size,
		viewBox: "0 0 64 64",
		fill: "none",
		className,
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "64",
				height: "64",
				rx: "32",
				fill: invert ? "#FFD84D" : "#0B1220"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "22",
				cy: "27",
				r: "4.4",
				fill: face
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "42",
				cy: "27",
				r: "4.4",
				fill: face
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M18 36c4.8 9.5 23.2 9.5 28 0",
				stroke: invert ? "#0B1220" : "#FFD84D",
				strokeWidth: "3.6",
				strokeLinecap: "round",
				fill: "none"
			})
		]
	});
}
/**
* Header wordmark: rounded “wipp” + yellow i-dot + smile.
* Height follows font-size (1em).
*/
function WippWordmark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 172 58",
		className: cn("h-[1em] w-[2.96em]", className),
		"aria-label": "Wipp",
		role: "img",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "10.5",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13 14c0 0-1 24 12.5 24 10.5 0 13-16.5 16.5-16.5S48 38 58.5 38C73 38 72 14 72 14" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M88 23.5v18" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M108 12v38" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M108 16.5c18.5 0 23 4.5 23 12.5s-4.5 12.5-23 12.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M142 12v38" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M142 16.5c18.5 0 23 4.5 23 12.5s-4.5 12.5-23 12.5" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "88",
				cy: "12",
				r: "5.8",
				className: "fill-accent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M20 52c32 8 98 8 132 0",
				className: "stroke-accent",
				strokeWidth: "5.5",
				strokeLinecap: "round",
				fill: "none"
			})
		]
	});
}
function WgoWordmark(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippWordmark, { ...props });
}
var TABS = [
	{
		name: "chats",
		key: "tabChats"
	},
	{
		name: "calls",
		key: "tabCalls"
	},
	{
		name: "explore",
		key: "tabExplore"
	},
	{
		name: "me",
		key: "tabMe"
	}
];
/** Two outline phones leaning in, with a short connection signal between them. */
function WippPhonesGlyph({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 64 64",
		className,
		"aria-hidden": true,
		fill: "none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
				transform: "rotate(14 17 33)",
				stroke: "currentColor",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "8",
						y: "15",
						width: "18",
						height: "36",
						rx: "4",
						strokeWidth: "1.7"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "11",
						y: "18.8",
						width: "12",
						height: "23.5",
						rx: "1.3",
						strokeWidth: "0.9",
						opacity: "0.65"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M14.6 46.4h4.8",
						strokeWidth: "1.35"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
				transform: "rotate(-14 47 33)",
				stroke: "currentColor",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "38",
						y: "15",
						width: "18",
						height: "36",
						rx: "4",
						strokeWidth: "1.7"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "41",
						y: "18.8",
						width: "12",
						height: "23.5",
						rx: "1.3",
						strokeWidth: "0.9",
						opacity: "0.65"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M44.6 46.4h4.8",
						strokeWidth: "1.35"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M29.4 31c1.15 1.5 1.15 3.9 0 5.4",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M32.4 29c1.6 2 1.6 6 0 8",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M35.5 27.2c2 2.4 2 7.6 0 10",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				opacity: "0.75"
			})
		]
	});
}
function TouchHero() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "wipp-touch-stage",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wipp-touch-glow" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wipp-touch-phone is-l",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WIPP" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "wipp-touch-sig",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wipp-touch-phone is-r",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WIPP" })
			})
		]
	});
}
function TabBar({ active }) {
	const t = useT();
	const goTab = useWgoStore((s) => s.goTab);
	const push = useWgoStore((s) => s.push);
	const locateMe = useWgoStore((s) => s.locateMe);
	const setNearby = useWgoStore((s) => s.setNearby);
	const nearby = useWgoStore((s) => s.nearby);
	const unread = useWgoStore((s) => s.chats.reduce((n, c) => n + (c.archived || c.isRequest ? 0 : c.unread), 0));
	const missed = useWgoStore((s) => s.calls.filter((c) => c.missed && c.at > (s.callsSeenAt ?? 0)).length);
	const pending = useWgoStore((s) => s.requests.filter((r) => r.status === "pending").length + s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [shown, setShown] = (0, import_react.useState)(false);
	const [inPos, setInPos] = (0, import_react.useState)(false);
	const [pulse, setPulse] = (0, import_react.useState)(false);
	const [dragY, setDragY] = (0, import_react.useState)(0);
	const dragging = (0, import_react.useRef)(false);
	const startY = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (open) {
			setShown(true);
			const id = window.requestAnimationFrame(() => setInPos(true));
			return () => window.cancelAnimationFrame(id);
		}
		setInPos(false);
		const id = window.setTimeout(() => {
			setShown(false);
			setDragY(0);
		}, 280);
		return () => window.clearTimeout(id);
	}, [open]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);
	function closeSheet() {
		setOpen(false);
	}
	function tapWipp() {
		haptic("select");
		setPulse(true);
		window.setTimeout(() => setPulse(false), 520);
		setOpen((v) => !v);
	}
	function go(name) {
		haptic("select");
		closeSheet();
		if (name === "nearby") {
			locateMe();
			if (nearby === 0) setNearby(5);
		}
		window.setTimeout(() => push({ name }), 160);
	}
	const alts = [
		{
			id: "scanner",
			title: "wippScanCard",
			hint: "wippScanCardHint",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanLine, {
				className: "size-6",
				strokeWidth: 1.8
			})
		},
		{
			id: "my-qr",
			title: "wippMyQrCard",
			hint: "wippMyQrCardHint",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, {
				className: "size-6",
				strokeWidth: 1.8
			})
		},
		{
			id: "search-user",
			title: "wippSearchCard",
			hint: "wippSearchCardHint",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
				className: "size-6",
				strokeWidth: 1.8
			})
		},
		{
			id: "nearby",
			title: "wippNearbyCard",
			hint: "wippNearbyCardHint",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, {
				className: "size-6",
				strokeWidth: 1.8
			})
		}
	];
	function onGrabPointerDown(e) {
		dragging.current = true;
		startY.current = e.clientY;
		e.currentTarget.setPointerCapture(e.pointerId);
	}
	function onGrabPointerMove(e) {
		if (!dragging.current) return;
		setDragY(Math.max(0, e.clientY - startY.current));
	}
	function onGrabPointerUp() {
		if (!dragging.current) return;
		dragging.current = false;
		if (dragY > 72) closeSheet();
		else setDragY(0);
	}
	const left = TABS.slice(0, 2);
	const right = TABS.slice(2);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "tab-dock",
		children: [shown ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "wipp-sheet-root",
			"data-open": inPos ? "1" : "0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "wipp-sheet-scrim",
				"aria-label": t("cancel"),
				onClick: closeSheet
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "wipp-sheet",
				style: dragY ? {
					transform: `translateY(${dragY}px)`,
					transition: dragging.current ? "none" : void 0
				} : void 0,
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": "wipp-connect-title",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "wipp-sheet-grab",
						onPointerDown: onGrabPointerDown,
						onPointerMove: onGrabPointerMove,
						onPointerUp: onGrabPointerUp,
						onPointerCancel: onGrabPointerUp,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "wipp-sheet-handle" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wipp-sheet-head",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								id: "wipp-connect-title",
								className: "wipp-sheet-title",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippWordmark, { className: "wipp-sheet-mark" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "wipp-sheet-connect",
									children: "Connect"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("wippConnectSub") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "wipp-sheet-x",
								"aria-label": t("cancel"),
								onClick: closeSheet,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
									className: "size-4",
									strokeWidth: 2.2
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "wipp-touch-card press",
						onClick: () => go("wgo-touch"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchHero, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "wipp-touch-copy",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wipp-touch-badge",
										children: t("wippTouchBadge")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wipp-touch-name",
										children: t("wippTouchCard")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wipp-touch-hint",
										children: t("wippTouchCardHint")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wipp-touch-body",
										children: t("wippTouchCardBody")
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "wipp-touch-go",
								"aria-hidden": true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
									className: "size-4",
									strokeWidth: 2.4
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "wipp-alt-grid",
						children: alts.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "wipp-alt press",
							onClick: () => go(c.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "wipp-alt-ico",
									children: c.icon
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "wipp-alt-copy",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wipp-alt-name",
										children: t(c.title)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wipp-alt-hint",
										children: t(c.hint)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
									className: "wipp-alt-chev",
									strokeWidth: 2
								})
							]
						}, c.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "wipp-sheet-foot",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, {
								className: "size-4",
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								t("wippConnectFoot"),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t("wippConnectFootEm") })
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, {
								className: "size-4",
								"aria-hidden": true
							})
						]
					})
				]
			})]
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			className: "tab-bar",
			"aria-label": "WIPP",
			children: [
				left.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabItem, {
					tab,
					active: active === tab.name && !open,
					badge: tab.name === "chats" && unread + pending ? unread + pending : tab.name === "calls" && missed ? missed : 0,
					onClick: () => {
						haptic("select");
						closeSheet();
						goTab(tab.name);
					},
					label: t(tab.key)
				}, tab.name)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: cn("wipp-fab", (open || pulse) && "is-on", pulse && "is-pulse"),
					"aria-label": t("tabConnect"),
					"aria-expanded": open,
					"aria-haspopup": "dialog",
					onClick: tapWipp,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wipp-fab-halo",
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wipp-fab-disc",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippPhonesGlyph, { className: "wipp-fab-glyph" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wipp-fab-label",
							children: t("tabConnect")
						})
					]
				}),
				right.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabItem, {
					tab,
					active: active === tab.name && !open,
					badge: 0,
					onClick: () => {
						haptic("select");
						closeSheet();
						goTab(tab.name);
					},
					label: t(tab.key)
				}, tab.name))
			]
		})]
	});
}
function TabItem({ tab, active, badge, onClick, label }) {
	const Icon = tab.name === "chats" ? MessageCircle : tab.name === "calls" ? Phone : tab.name === "explore" ? Compass : User;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: cn("tab-item press", active && "is-on"),
		onClick,
		"aria-label": label,
		"aria-current": active ? "page" : void 0,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				className: "tab-item-ico",
				strokeWidth: active ? 2.35 : 1.9,
				fill: active && (tab.name === "chats" || tab.name === "me") ? "currentColor" : "none",
				fillOpacity: active && (tab.name === "chats" || tab.name === "me") ? .18 : 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			badge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tab-item-badge",
				children: badge > 9 ? "9+" : badge
			}) : null
		]
	});
}
var GALLERY_IMAGES = [
	"/media/coffee.jpg",
	"/media/food.jpg",
	"/media/river.jpg",
	"/media/soccer.jpg",
	"/media/apt.jpg",
	"/media/chair.jpg",
	"/media/civic.jpg",
	"/avatars/deena.jpg",
	"/avatars/maya.jpg",
	"/avatars/alex.jpg",
	"/avatars/samira.jpg",
	"/avatars/julien.jpg",
	"/avatars/noah.jpg",
	"/avatars/lea.jpg",
	"/avatars/sofia.jpg",
	"/avatars/aisha.jpg",
	"/avatars/ines.jpg",
	"/avatars/karim.jpg",
	"/avatars/malik.jpg",
	"/avatars/adama.jpg"
];
var GALLERY_VIDEOS = [
	{
		src: "/stories/soccer.mp4",
		poster: "/media/soccer.jpg",
		durationMs: 1e4
	},
	{
		src: "/stories/river.mp4",
		poster: "/media/river.jpg",
		durationMs: 1e4
	},
	{
		src: "/stories/food.mp4",
		poster: "/media/food.jpg",
		durationMs: 1e4
	},
	{
		src: "/stories/city.mp4",
		poster: "/media/coffee.jpg",
		durationMs: 1e4
	}
];
function formatStoryDuration(ms) {
	const s = Math.min(60, Math.max(1, Math.round(ms / 1e3)));
	if (s >= 60) return "1:00";
	return `0:${String(s).padStart(2, "0")}`;
}
function readImageFile(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, 960 / Math.max(img.width, img.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(img.width * scale));
			canvas.height = Math.max(1, Math.round(img.height * scale));
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				URL.revokeObjectURL(url);
				reject(/* @__PURE__ */ new Error("canvas"));
				return;
			}
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL("image/jpeg", .82));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(/* @__PURE__ */ new Error("image"));
		};
		img.src = url;
	});
}
function readVideoFile(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const video = document.createElement("video");
		video.preload = "metadata";
		video.onloadedmetadata = () => {
			const durationMs = Math.round((Number.isFinite(video.duration) ? video.duration : 0) * 1e3);
			if (!durationMs) {
				URL.revokeObjectURL(url);
				reject(/* @__PURE__ */ new Error("video"));
				return;
			}
			if (durationMs > 60500) {
				URL.revokeObjectURL(url);
				reject(/* @__PURE__ */ new Error("too-long"));
				return;
			}
			resolve({
				url,
				durationMs: Math.min(durationMs, STORY_VIDEO_MAX_MS)
			});
		};
		video.onerror = () => {
			URL.revokeObjectURL(url);
			reject(/* @__PURE__ */ new Error("video"));
		};
		video.src = url;
	});
}
function GalleryGrid({ onPick, selected }) {
	const t = useT();
	const input = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: input,
			type: "file",
			accept: "image/*",
			className: "hidden",
			onChange: (e) => {
				const file = e.target.files?.[0];
				e.target.value = "";
				if (!file) return;
				readImageFile(file).then(onPick);
			}
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl glass-card text-[14px] font-medium",
			onClick: () => input.current?.click(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "size-4" }), t("fromDevice")]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 px-0.5 text-[12px] font-medium tracking-wide text-muted uppercase",
			children: t("recents")
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-3 gap-1",
			children: GALLERY_IMAGES.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: cn("aspect-square overflow-hidden rounded-md bg-surface-2", selected === src && "ring-2 ring-accent ring-offset-2 ring-offset-bg"),
				onClick: () => onPick(src),
				"aria-label": t("pickPhoto"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
					src,
					alt: "",
					className: "size-full object-cover"
				})
			}, src))
		})
	] });
}
function StoryMediaGrid({ kind, onPick }) {
	const t = useT();
	const input = (0, import_react.useRef)(null);
	const [error, setError] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: input,
			type: "file",
			accept: kind === "video" ? "video/*" : "image/*",
			className: "hidden",
			onChange: (e) => {
				const file = e.target.files?.[0];
				e.target.value = "";
				if (!file) return;
				setError(null);
				if (kind === "video") readVideoFile(file).then((clip) => onPick({
					type: "video",
					url: clip.url,
					durationMs: clip.durationMs
				}), (err) => setError(err.message === "too-long" ? t("storyVideoTooLong") : t("storyVideoFail")));
				else readImageFile(file).then((url) => onPick({
					type: "image",
					url
				}));
			}
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl glass-card text-[14px] font-medium",
			onClick: () => input.current?.click(),
			children: [
				kind === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "size-4" }),
				t("fromDevice"),
				kind === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-[12px] font-normal text-muted",
					children: ["· ", t("storyVideoMax")]
				}) : null
			]
		}),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-center text-[13px] text-danger",
			children: error
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 px-0.5 text-[12px] font-medium tracking-wide text-muted uppercase",
			children: t("recents")
		}),
		kind === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-3 gap-1",
			children: GALLERY_VIDEOS.map((clip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "relative aspect-square overflow-hidden rounded-md bg-surface-2",
				onClick: () => onPick({
					type: "video",
					url: clip.src,
					durationMs: clip.durationMs
				}),
				"aria-label": t("pickVideo"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: clip.poster,
						alt: "",
						className: "size-full object-cover"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 bg-ink/20" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink/55",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5 translate-x-px text-paper" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute right-1.5 bottom-1.5 rounded-full bg-ink/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-paper",
						children: formatStoryDuration(clip.durationMs)
					})
				]
			}, clip.src))
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-3 gap-1",
			children: GALLERY_IMAGES.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "aspect-square overflow-hidden rounded-md bg-surface-2",
				onClick: () => onPick({
					type: "image",
					url: src
				}),
				"aria-label": t("pickPhoto"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
					src,
					alt: "",
					className: "size-full object-cover"
				})
			}, src))
		})
	] });
}
function GallerySheet({ open, onClose, onPick, title }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open,
		onClose,
		title: title ?? t("gallery"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-h-[68vh] overflow-y-auto no-scrollbar",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GalleryGrid, { onPick: (url) => {
				onPick(url);
				onClose();
			} })
		})
	});
}
function AuthLockup({ align = "left" }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex flex-col", align === "center" ? "items-center" : "items-start"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex items-start",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 36 28",
					className: "absolute -top-2 left-3 h-6 w-8 text-accent",
					"aria-hidden": true,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: "0",
							y: "8",
							width: "18",
							height: "14",
							rx: "6",
							fill: "currentColor",
							opacity: "0.5"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: "10",
							y: "1",
							width: "24",
							height: "16",
							rx: "7",
							fill: "currentColor"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "19",
							cy: "9",
							r: "1.45",
							fill: "#0B1220"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "25",
							cy: "9",
							r: "1.45",
							fill: "#0B1220"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "31",
							cy: "9",
							r: "1.45",
							fill: "#0B1220"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "bg-linear-to-b from-[#fff6d0] to-accent bg-clip-text text-[38px] leading-none font-black tracking-[-0.05em] text-transparent",
					children: "WIPP"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-0.5 ml-0.5 text-[8px] font-semibold text-accent",
					children: "TM"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1.5 text-[8px] font-medium tracking-[0.36em] text-accent/85 uppercase",
			children: t("authTagline")
		})]
	});
}
function AuthLang() {
	const language = useWgoStore((s) => s.language);
	const setLanguage = useWgoStore((s) => s.setLanguage);
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "flex h-9 items-center gap-1 rounded-full px-1.5 text-[12px] font-medium text-muted",
			onClick: () => setOpen((v) => !v),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "size-3.5" }),
				language.toUpperCase(),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5" })
			]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute right-0 z-30 mt-1 overflow-hidden rounded-xl bg-navy ring-1 ring-hair",
			children: ["fr", "en"].map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "flex h-10 w-24 items-center justify-between px-3 text-[13px]",
				onClick: () => {
					setLanguage(l);
					setOpen(false);
				},
				children: [l.toUpperCase(), language === l ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-accent" }) : null]
			}, l))
		}) : null]
	});
}
function AuthShell({ children, onBack }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 flex flex-col overflow-hidden bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "auth-orb" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 flex items-center justify-between px-3",
				children: [onBack ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onPointerDown: () => haptic("tap"),
					onClick: onBack,
					className: "flex size-[var(--touch-min)] items-center justify-center rounded-full text-fg",
					"aria-label": t("back"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-5" })
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-11" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthLang, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthLockup, {}), children]
			})
		]
	});
}
function AuthSteps({ step }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-5 flex items-center gap-2 text-[12px] font-medium",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepDot, {
				n: 1,
				active: step === 1,
				done: step > 1,
				label: t("stepAccount")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mb-4 h-px w-7 bg-hair" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepDot, {
				n: 2,
				active: step === 2,
				done: false,
				label: t("stepIdentity")
			})
		]
	});
}
function StepDot({ n, active, done, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "flex items-center gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("flex size-6 items-center justify-center rounded-full text-[11px] font-bold", done || active ? "bg-accent text-accent-fg" : "ring-1 ring-white/25 text-muted"),
			children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
				className: "size-3.5",
				strokeWidth: 3
			}) : n
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn(active || done ? "text-accent" : "text-muted"),
			children: label
		})]
	});
}
function AuthField({ label, icon, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: cn("block", className),
		children: [label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1.5 block text-[12px] font-medium text-muted",
			children: label
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "relative flex h-12 items-center gap-2 rounded-2xl bg-[#12141c] px-3 ring-1 ring-white/8 focus-within:ring-accent/40",
			children: [icon ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: icon
			}) : null, children]
		})]
	});
}
function AuthCta({ children, disabled, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		disabled,
		onPointerDown: () => {
			if (!disabled) haptic("tap");
		},
		onClick,
		className: "press mt-5 flex h-[52px] min-h-[var(--touch-min)] w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-accent-fg disabled:opacity-40",
		children
	});
}
var COUNTRIES = [
	{
		id: "CA",
		dial: "+1",
		fr: "Canada",
		en: "Canada"
	},
	{
		id: "SN",
		dial: "+221",
		fr: "Sénégal",
		en: "Senegal"
	},
	{
		id: "CI",
		dial: "+225",
		fr: "Côte d’Ivoire",
		en: "Côte d’Ivoire"
	},
	{
		id: "ML",
		dial: "+223",
		fr: "Mali",
		en: "Mali"
	},
	{
		id: "GN",
		dial: "+224",
		fr: "Guinée",
		en: "Guinea"
	},
	{
		id: "FR",
		dial: "+33",
		fr: "France",
		en: "France"
	},
	{
		id: "US",
		dial: "+1",
		fr: "États-Unis",
		en: "United States"
	}
];
var AVATAR_PICKS = [
	"/avatars/deena.jpg",
	"/avatars/maya.jpg",
	"/avatars/aisha.jpg",
	"/avatars/lea.jpg",
	"/avatars/sofia.jpg"
];
function LegalScreen({ doc }) {
	useT();
	const pop = useWgoStore((s) => s.pop);
	const lang = useWgoStore((s) => s.language);
	const paper = legalDoc(lang, doc);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: paper.title,
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalBody, { doc })
		]
	});
}
function LegalOverlay({ doc, onClose }) {
	const lang = useWgoStore((s) => s.language);
	const t = useT();
	const paper = legalDoc(lang, doc);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-[60] flex flex-col bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: paper.title,
				onBack: onClose
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalBody, {
				doc,
				footer: t("legalCloseHint")
			})
		]
	});
}
function LegalBody({ doc, footer }) {
	const lang = useWgoStore((s) => s.language);
	const t = useT();
	const paper = legalDoc(lang, doc);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1 overflow-y-auto no-scrollbar px-5 pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 flex items-center gap-2 text-[12px] text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					t("legalUpdated"),
					" ",
					paper.updated,
					" · v",
					LEGAL_VERSION
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-[14px] leading-relaxed text-muted",
				children: paper.intro
			}),
			paper.sections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-[15px] font-semibold tracking-tight",
					children: section.title
				}), section.paragraphs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[14px] leading-relaxed text-fg/90",
					children: p
				}, p.slice(0, 48)))]
			}, section.title)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-8 text-[13px] text-muted",
				children: [
					t("legalContact"),
					" ",
					LEGAL_CONTACT
				]
			}),
			footer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-[12px] text-muted",
				children: footer
			}) : null
		]
	});
}
var HERO = {
	tap: {
		webp: "/onboarding/hero-tap.webp?v=2",
		jpg: "/onboarding/hero-tap.jpg?v=2",
		pos: "center 42%"
	},
	globe: {
		webp: "/onboarding/hero-globe.webp?v=2",
		jpg: "/onboarding/hero-globe.jpg?v=2",
		pos: "center 46%"
	},
	privacy: {
		webp: "/onboarding/hero-privacy.webp?v=2",
		jpg: "/onboarding/hero-privacy.jpg?v=2",
		pos: "center 40%"
	},
	together: {
		webp: "/onboarding/hero-together.webp?v=2",
		jpg: "/onboarding/hero-together.jpg?v=2",
		pos: "center 36%"
	}
};
var ONB = [
	{
		kind: "tap",
		title: "onb1Title",
		accent: "onb1Accent",
		body: "onb1Body"
	},
	{
		kind: "globe",
		title: "onb3Title",
		accent: "onb3Accent",
		body: "onb3Body"
	},
	{
		kind: "privacy",
		title: "onb2Title",
		accent: "onb2Accent",
		body: "onb2Body"
	},
	{
		kind: "together",
		title: "onb4Title",
		accent: "onb4Accent",
		body: "onb4Body"
	}
];
function HeroImg({ kind, split, className }) {
	const h = HERO[kind];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("picture", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
		srcSet: h.webp,
		type: "image/webp"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: h.jpg,
		alt: "",
		draggable: false,
		className: cn("onb-hero", split && `onb-split is-${split}`, className),
		style: { objectPosition: h.pos }
	})] });
}
function SceneTap({ t }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "onb-scene",
		"data-kind": "tap",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroImg, {
				kind: "tap",
				split: "l"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroImg, {
				kind: "tap",
				split: "r"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "onb-screen-glow is-l" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "onb-screen-glow is-r" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-flash" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-rings",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-tl",
				children: t("onbTapLeft")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-tr",
				children: t("onbTapRight")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-pills",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "onb-pill d1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
							className: "size-4",
							strokeWidth: 2.4
						}), t("onbFast")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "onb-pill d2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
							className: "size-4",
							strokeWidth: 2.4
						}), t("onbSimple")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "onb-pill d3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, {
							className: "size-4",
							strokeWidth: 2.4
						}), t("onbNoNumber")]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-connected",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
					className: "size-3.5",
					strokeWidth: 3
				}), t("onbConnected")]
			})
		]
	});
}
function SceneGlobe({ t }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "onb-scene",
		"data-kind": "globe",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroImg, {
				kind: "globe",
				className: "onb-globe-spin"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "onb-arcs",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M22 30 C 40 18, 62 18, 78 32" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M22 30 C 18 48, 16 62, 20 62" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M78 32 C 84 50, 86 64, 80 66" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 62 C 40 78, 62 78, 80 66" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "onb-travel a" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "onb-travel b" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "onb-travel c" }),
			[
				{
					key: "onbCityMtl",
					cls: "is-mtl"
				},
				{
					key: "onbCityAbj",
					cls: "is-abj"
				},
				{
					key: "onbCityPar",
					cls: "is-par"
				},
				{
					key: "onbCityNyc",
					cls: "is-nyc"
				}
			].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: cn("onb-city", c.cls),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "onb-city-dot" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, {
						className: "size-3",
						strokeWidth: 2.6
					}),
					t(c.key)
				]
			}, c.cls)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-pin-drop",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-tl",
				children: t("onbWherever")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-br",
				children: t("onbWorldChat")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "onb-note",
				children: t("onbNewMeetings")
			})
		]
	});
}
function ScenePrivacy({ t }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "onb-scene",
		"data-kind": "privacy",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroImg, {
				kind: "privacy",
				className: "onb-phone-tilt"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "onb-scan",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "onb-shield-glow",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-pcards",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "onb-pcard d1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "onb-pcard-ico",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, {
								className: "size-4",
								strokeWidth: 2.3
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t("onbCardUser") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t("onbCardUserHint") })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "onb-pcard d2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "onb-pcard-ico",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
								className: "size-4",
								strokeWidth: 2.3
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t("onbCardPhone") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t("onbCardPhoneHint") })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "onb-pcard d3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "onb-pcard-ico",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, {
								className: "size-4",
								strokeWidth: 2.3
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t("onbCardPlace") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t("onbCardPlaceHint") })] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-tl",
				children: t("onbYourId")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-br",
				children: t("onbPrivacyFirst")
			})
		]
	});
}
function SceneTogether({ t }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "onb-scene",
		"data-kind": "together",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroImg, {
				kind: "together",
				split: "l"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroImg, {
				kind: "together",
				split: "r"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "onb-link",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "onb-pulse",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-toast",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "onb-toast-check",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						className: "size-3.5",
						strokeWidth: 3
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t("onbConnOk") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t("onbConnOkHint") })] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "onb-features",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "onb-feat d1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
							className: "size-5",
							strokeWidth: 2.2
						}), t("onbOneTap")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "onb-feat d2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, {
							className: "size-5",
							strokeWidth: 2.2
						}), t("onbExchange")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "onb-feat d3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, {
							className: "size-5",
							strokeWidth: 2.2
						}), t("onbStartChat")]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "onb-msg",
				"aria-hidden": true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, {
					className: "size-4",
					strokeWidth: 2.4
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-tl",
				children: t("onbRealMeet")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "onb-script is-tr",
				children: t("onbJustWipp")
			})
		]
	});
}
function OnboardingScreen() {
	const t = useT();
	const replace = useWgoStore((s) => s.replace);
	const [page, setPage] = (0, import_react.useState)(0);
	const [dir, setDir] = (0, import_react.useState)(1);
	const startX = (0, import_react.useRef)(null);
	const slide = ONB[Math.min(page, ONB.length - 1)];
	const last = page >= ONB.length - 1;
	const calm = reducedMotion();
	function goTo(next) {
		const clamped = Math.max(0, Math.min(ONB.length - 1, next));
		setDir(clamped >= page ? 1 : -1);
		setPage(clamped);
		haptic("select");
		announce(`${clamped + 1} / ${ONB.length}`);
	}
	function finish() {
		haptic("success");
		replace({ name: "signup" });
	}
	(0, import_react.useEffect)(() => {
		if (calm) return;
		if (slide.kind !== "tap" && slide.kind !== "together") return;
		const delay = slide.kind === "tap" ? 1250 : 1200;
		const id = window.setTimeout(() => haptic("connect"), delay);
		return () => window.clearTimeout(id);
	}, [
		slide.kind,
		page,
		calm
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("onb", calm && "is-calm"),
		role: "group",
		"aria-roledescription": "carousel",
		"aria-label": t("start"),
		onPointerDown: (e) => {
			startX.current = e.clientX;
		},
		onPointerUp: (e) => {
			if (startX.current == null) return;
			const dx = e.clientX - startX.current;
			startX.current = null;
			if (Math.abs(dx) < 56) return;
			if (dx < 0) {
				if (last) finish();
				else goTo(page + 1);
			} else goTo(page - 1);
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "onb-stage",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "onb-stage-in",
					"data-dir": dir === 1 ? "next" : "prev",
					children: [
						slide.kind === "tap" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SceneTap, { t }) : null,
						slide.kind === "globe" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SceneGlobe, { t }) : null,
						slide.kind === "privacy" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScenePrivacy, { t }) : null,
						slide.kind === "together" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SceneTogether, { t }) : null
					]
				}, page)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "onb-head",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "onb-skip",
						onPointerDown: (e) => e.stopPropagation(),
						onClick: finish,
						children: t("skip")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/brand/wipp-wordmark.webp",
						alt: "Wipp",
						className: "onb-logo",
						draggable: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "onb-brand",
						children: t("onbBrand")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "onb-foot",
				onPointerDown: (e) => e.stopPropagation(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "onb-copy",
						"aria-live": "polite",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
							t(slide.title),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t(slide.accent) })
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t(slide.body) })]
					}, `copy-${page}`),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "onb-dots",
						children: ONB.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": `${i + 1} / ${ONB.length}`,
							"aria-current": i === page ? "true" : void 0,
							onClick: () => goTo(i),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn(i === page && "is-on") })
						}, i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "onb-actions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "onb-back press",
							disabled: page === 0,
							onClick: () => goTo(page - 1),
							children: t("back")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "onb-next press",
							onClick: () => last ? finish() : goTo(page + 1),
							children: [last ? t("start") : t("next"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
								className: "size-4",
								strokeWidth: 2.4
							})]
						})]
					})
				]
			})
		]
	});
}
function SplashScreen() {
	const onboarded = useWgoStore((s) => s.onboarded);
	const replace = useWgoStore((s) => s.replace);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroSplash, { onDone: () => replace({ name: onboarded ? "chats" : "onboarding" }) });
}
function SignupScreen() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const replace = useWgoStore((s) => s.replace);
	const saveSignup = useWgoStore((s) => s.saveSignup);
	const acceptLegal = useWgoStore((s) => s.acceptLegal);
	const [firstName, setFirst] = (0, import_react.useState)("Deena");
	const [lastName, setLast] = (0, import_react.useState)("Diallo");
	const [country, setCountry] = (0, import_react.useState)(COUNTRIES[0]);
	const [phone, setPhone] = (0, import_react.useState)("514 555 0148");
	const [birthday, setBirthday] = (0, import_react.useState)("1999-04-12");
	const [accepted, setAccepted] = (0, import_react.useState)(false);
	const [needAccept, setNeedAccept] = (0, import_react.useState)(false);
	const [tooYoung, setTooYoung] = (0, import_react.useState)(false);
	const [doc, setDoc] = (0, import_react.useState)(null);
	const [countryOpen, setCountryOpen] = (0, import_react.useState)(false);
	const [dialOpen, setDialOpen] = (0, import_react.useState)(false);
	function tryContinue() {
		const age = yearsOld(birthday);
		if (age > 0 && age < 13) {
			setTooYoung(true);
			setNeedAccept(false);
			return;
		}
		setTooYoung(false);
		if (!accepted) {
			setNeedAccept(true);
			return;
		}
		setNeedAccept(false);
		acceptLegal();
		saveSignup({
			firstName,
			lastName,
			displayName: `${firstName} ${lastName}`.trim(),
			phone: `${country.dial} ${phone}`,
			birthday,
			country: country.id
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 flex flex-col bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignupBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSteps, { step: 1 }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
							label: t("firstName"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-4" }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "h-full w-full bg-transparent text-[15px] outline-none",
								value: firstName,
								onChange: (e) => setFirst(e.target.value)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
							label: t("lastName"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-4" }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "h-full w-full bg-transparent text-[15px] outline-none",
								value: lastName,
								onChange: (e) => setLast(e.target.value)
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
							label: t("country"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "size-4" }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex h-full w-full items-center justify-between text-left text-[15px]",
								onClick: () => setCountryOpen((v) => !v),
								children: [lang === "fr" ? country.fr : country.en, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-muted" })]
							})
						}), countryOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountryMenu, {
							lang,
							onPick: (c) => {
								setCountry(c);
								setCountryOpen(false);
							}
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mt-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1.5 block text-[12px] font-medium text-muted",
								children: t("phone")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex h-12 items-center gap-1 rounded-2xl bg-[#12141c] px-2 ring-1 ring-white/8 focus-within:ring-accent/40",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "ml-1 size-4 shrink-0 text-muted" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "flex h-full items-center gap-1 px-1 text-[14px] font-medium",
										onClick: () => setDialOpen((v) => !v),
										children: [country.dial, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5 text-muted" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-5 w-px bg-white/10" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none",
										value: phone,
										inputMode: "tel",
										onChange: (e) => setPhone(e.target.value)
									})
								]
							}),
							dialOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountryMenu, {
								lang,
								showDial: true,
								onPick: (c) => {
									setCountry(c);
									setDialOpen(false);
								}
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 flex gap-1.5 text-[11px] leading-snug text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "mt-0.5 size-3 shrink-0 text-accent" }), t("phonePrivate")]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthField, {
							label: t("birthday"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "size-4" }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex-1 text-[15px]",
								children: formatBday(birthday, lang)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: birthday,
								onChange: (e) => setBirthday(e.target.value),
								className: "absolute inset-0 cursor-pointer opacity-0"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-4 flex items-start gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative mt-0.5 flex size-5 shrink-0 items-center justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: accepted,
								onChange: (e) => {
									setAccepted(e.target.checked);
									if (e.target.checked) setNeedAccept(false);
								},
								className: "peer absolute inset-0 opacity-0"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-5 items-center justify-center rounded-md bg-paper/10 ring-1 ring-white/35 peer-checked:bg-accent peer-checked:ring-0",
								children: accepted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
									className: "size-3 text-accent-fg",
									strokeWidth: 3
								}) : null
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[12px] leading-relaxed text-muted",
							children: [
								t("legalAcceptShort"),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-medium text-accent underline underline-offset-2",
									onClick: () => setDoc("terms"),
									children: t("termsOfUse")
								}),
								" ",
								t("legalAnd"),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-medium text-accent underline underline-offset-2",
									onClick: () => setDoc("privacy"),
									children: t("privacyPolicy")
								}),
								" ",
								t("legalOfWipp")
							]
						})]
					}),
					needAccept ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[13px] text-danger",
						children: t("legalNeedAccept")
					}) : null,
					tooYoung ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[13px] text-danger",
						children: t("legalTooYoung")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthCta, {
						onClick: tryContinue,
						children: [t("continue"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "my-4 flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-hair" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12px] text-muted",
								children: t("or")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-hair" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex h-12 w-full items-center justify-center rounded-full text-[14px] ring-1 ring-hair",
						onClick: () => replace({ name: "login" }),
						children: [
							t("alreadyAccount"),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-1 font-semibold text-accent",
								children: t("signIn")
							})
						]
					})
				]
			}),
			doc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalOverlay, {
				doc,
				onClose: () => setDoc(null)
			}) : null
		]
	});
}
function SignupBanner() {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-[300px] shrink-0 overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-accent/20 blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
				src: "/avatars/deena.jpg",
				alt: "",
				priority: true,
				className: "pointer-events-none absolute top-[-12%] right-[-14%] h-[140%] w-[82%] object-cover object-[70%_10%]"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--wgo-bg)_0%,var(--wgo-bg)_26%,rgb(7_10_15/0.35)_48%,transparent_68%)]" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(to_top,var(--wgo-bg),transparent)]" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-11 right-3 z-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthLang, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 px-5 pt-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthLockup, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "mt-6 text-[32px] leading-[1.05] font-semibold tracking-tight",
						children: [
							t("signupHeroTitle"),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-accent",
								children: "WIPP"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-[19ch] text-[13px] leading-relaxed text-muted",
						children: t("signupHeroBody")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-script pointer-events-none absolute right-4 bottom-12 z-10 w-[6.6rem] -rotate-[18deg] text-right text-[21px] leading-[0.9] text-accent drop-shadow-[0_4px_12px_rgb(0_0_0/0.75)]",
				children: [
					"Donne-moi",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"ton WIPP ♡"
				]
			})
		]
	});
}
function CountryMenu({ lang, onPick, showDial }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl bg-navy ring-1 ring-hair",
		children: COUNTRIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "flex h-11 w-full items-center justify-between px-4 text-[14px]",
			onClick: () => onPick(c),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lang === "fr" ? c.fr : c.en }), showDial ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: c.dial
			}) : null]
		}, c.id))
	});
}
function formatBday(iso, lang) {
	const d = /* @__PURE__ */ new Date(`${iso}T12:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
		day: "numeric",
		month: "short",
		year: "numeric"
	});
}
function LoginScreen() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const replace = useWgoStore((s) => s.replace);
	const saveSignup = useWgoStore((s) => s.saveSignup);
	const [country, setCountry] = (0, import_react.useState)(COUNTRIES[0]);
	const [phone, setPhone] = (0, import_react.useState)("514 555 0148");
	const [dialOpen, setDialOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 flex flex-col bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignupBanner, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative z-10 min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-[22px] font-semibold tracking-tight",
					children: t("loginHero")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-[13px] text-muted",
					children: t("loginSub")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mb-1.5 block text-[12px] font-medium text-muted",
							children: t("phone")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex h-12 items-center gap-1 rounded-2xl bg-[#12141c] px-2 ring-1 ring-white/8 focus-within:ring-accent/40",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "ml-1 size-4 shrink-0 text-muted" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "flex h-full items-center gap-1 px-1 text-[14px] font-medium",
									onClick: () => setDialOpen((v) => !v),
									children: [country.dial, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5 text-muted" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-5 w-px bg-white/10" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none",
									value: phone,
									inputMode: "tel",
									onChange: (e) => setPhone(e.target.value)
								})
							]
						}),
						dialOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountryMenu, {
							lang,
							showDial: true,
							onPick: (c) => {
								setCountry(c);
								setDialOpen(false);
							}
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthCta, {
					onClick: () => saveSignup({
						phone: `${country.dial} ${phone}`,
						country: country.id,
						firstName: ""
					}),
					children: [t("continue"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mx-auto mt-4 block text-[13px] text-muted",
					onClick: () => replace({ name: "signup" }),
					children: t("back")
				})
			]
		})]
	});
}
function OtpScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const openDemo = useWgoStore((s) => s.openDemo);
	const pending = useWgoStore((s) => s.pendingSignup);
	const phone = useWgoStore((s) => s.pendingSignup.phone ?? s.me.phone);
	const isLogin = !pending.firstName;
	const [code, setCode] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)(false);
	function pass() {
		if (isLogin) openDemo();
		else push({ name: "setup" });
	}
	function submit(next) {
		setCode(next);
		setErr(false);
		if (next.length === 4) {
			if (next === "1234") pass();
			else setErr(true);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthShell, {
		onBack: pop,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 text-[28px] font-semibold tracking-tight",
				children: t("otpHero")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-[14px] text-muted",
				children: [
					t("otpBody"),
					" ",
					phone
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSteps, { step: 1 }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex justify-between gap-2",
				children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					inputMode: "numeric",
					maxLength: 1,
					value: code[i] ?? "",
					onChange: (e) => {
						const v = e.target.value.replace(/\D/g, "").slice(-1);
						const chars = code.split("");
						chars[i] = v;
						submit(chars.join("").slice(0, 4));
						const next = e.currentTarget.nextElementSibling;
						if (v && next instanceof HTMLInputElement) next.focus();
					},
					className: "h-16 w-16 rounded-2xl bg-surface text-center text-[22px] font-semibold ring-1 ring-hair outline-none focus:ring-2 focus:ring-accent"
				}, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-[13px] text-muted",
				children: t("otpHint")
			}),
			err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-[13px] text-danger",
				children: t("otpError")
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthCta, {
				disabled: code.length !== 4,
				onClick: () => {
					if (code === "1234") pass();
					else setErr(true);
				},
				children: [t("continue"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
			})
		]
	});
}
var GENDERS = [
	"unspecified",
	"woman",
	"man",
	"nb"
];
function SetupScreen() {
	const t = useT();
	const pending = useWgoStore((s) => s.pendingSignup);
	const me = useWgoStore((s) => s.me);
	const completeSetup = useWgoStore((s) => s.completeSetup);
	const pop = useWgoStore((s) => s.pop);
	const [displayName, setName] = (0, import_react.useState)(pending.displayName || `${pending.firstName ?? me.firstName} ${pending.lastName ?? ""}`.trim());
	const [username, setUser] = (0, import_react.useState)((pending.firstName || me.username).toLowerCase().replace(/[^a-z0-9]/g, ""));
	const [bio, setBio] = (0, import_react.useState)("");
	const [gender, setGender] = (0, import_react.useState)("unspecified");
	const [avatar, setAvatar] = (0, import_react.useState)(pending.avatar || me.avatar || "/avatars/deena.jpg");
	const [genderOpen, setGenderOpen] = (0, import_react.useState)(false);
	const [pick, setPick] = (0, import_react.useState)(false);
	const taken = TAKEN_USERNAMES.has(username) && username !== "deena";
	const valid = username.length >= 3 && username.length <= 20 && !taken;
	function genderLabel(g) {
		return t(g === "woman" ? "genderWoman" : g === "man" ? "genderMan" : g === "nb" ? "genderNb" : "genderUnspecified");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthShell, {
			onBack: pop,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-5 text-[28px] leading-tight font-semibold tracking-tight",
					children: [
						t("setupHeroTitle"),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-fg",
							children: [t("setupHeroYou"), " "]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-accent",
							children: "WIPP"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-[34ch] text-[13px] leading-relaxed text-muted",
					children: t("setupHeroBody")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSteps, { step: 2 }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-[12px] font-medium text-muted",
					children: t("profilePhoto")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "relative",
						onClick: () => setPick(true),
						"aria-label": t("profilePhoto"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block size-[124px] overflow-hidden rounded-full ring-2 ring-accent/80",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
								src: avatar,
								alt: "",
								priority: true,
								className: "size-full object-cover"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full bg-navy text-paper ring-2 ring-bg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-4" })
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex items-center justify-center gap-2",
					children: [AVATAR_PICKS.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setAvatar(src),
						className: cn("size-11 overflow-hidden rounded-full ring-2", avatar === src ? "ring-accent" : "ring-transparent"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src,
							alt: "",
							className: "size-full object-cover"
						})
					}, src)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex size-11 flex-col items-center justify-center rounded-full bg-surface text-[8px] leading-tight text-muted ring-1 ring-hair",
						onClick: () => setPick(true),
						children: ["+", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("later") })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthField, {
						label: t("usernameWipp"),
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtSign, { className: "size-4" }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none",
							value: username,
							onChange: (e) => setUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
						}), valid ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 shrink-0 text-emerald-400" }) : null]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: cn("mt-1.5 text-[11px] leading-relaxed", taken ? "text-danger" : "text-muted"),
						children: taken ? t("usernameTaken") : t("usernameHintSetup")
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
					className: "mt-3",
					label: t("displayName"),
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-4" }),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "h-full w-full bg-transparent text-[15px] outline-none",
						value: displayName,
						onChange: (e) => setName(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mb-1.5 block text-[12px] font-medium text-muted",
						children: t("bioOptional")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative block",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 2,
								maxLength: 100,
								value: bio,
								onChange: (e) => setBio(e.target.value.slice(0, 100)),
								placeholder: "Bonne énergie, belles discussions",
								className: "w-full resize-none rounded-2xl bg-surface px-10 py-3 text-[15px] outline-none ring-1 ring-hair placeholder:text-muted focus:ring-accent/50"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "pointer-events-none absolute top-3.5 left-3 size-4 text-muted" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "absolute right-3 bottom-2 text-[11px] text-muted",
								children: [bio.length, "/100"]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
						label: t("genderOptional"),
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-4" }),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-full w-full items-center justify-between text-left text-[15px]",
							onClick: () => setGenderOpen((v) => !v),
							children: [genderLabel(gender), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-muted" })]
						})
					}), genderOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl bg-navy ring-1 ring-hair",
						children: GENDERS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-11 w-full items-center px-4 text-[14px]",
							onClick: () => {
								setGender(g);
								setGenderOpen(false);
							},
							children: genderLabel(g)
						}, g))
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthCta, {
					disabled: !valid || !displayName,
					onClick: () => completeSetup({
						displayName,
						username,
						bio,
						avatar,
						gender,
						firstName: pending.firstName || displayName.split(" ")[0],
						lastName: pending.lastName || displayName.split(" ").slice(1).join(" "),
						discoverability: "everyone"
					}),
					children: [t("createMyWipp"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface/80 px-2 py-3 ring-1 ring-hair",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex flex-col items-center gap-1.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "size-5 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] leading-tight text-muted",
								children: t("authFootChat")
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex flex-col items-center gap-1.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-5 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] leading-tight text-muted",
								children: t("authFootConnect")
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex flex-col items-center gap-1.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, { className: "size-5 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] leading-tight text-muted",
								children: t("authFootExplore")
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-center text-[12px] text-muted",
					children: [
						t("authCloser"),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-accent",
							children: "♡"
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GallerySheet, {
			open: pick,
			onClose: () => setPick(false),
			onPick: (src) => {
				setAvatar(src);
				setPick(false);
			}
		})]
	});
}
function chatPeer(chat, users) {
	if (chat.type === "group") return void 0;
	const id = chat.participantIds.find((x) => x !== "me");
	return id ? users[id] : void 0;
}
function shopFace(shop) {
	return {
		displayName: shop.name,
		avatar: shop.image,
		online: true
	};
}
function ChatsScreen() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const me = useWgoStore((s) => s.me);
	const users = useWgoStore((s) => s.users);
	const chats = useWgoStore((s) => s.chats);
	const shops = useWgoStore((s) => s.shops);
	const stories = useWgoStore((s) => s.stories);
	const viewed = useWgoStore((s) => s.viewedStories);
	const pending = useWgoStore((s) => s.requests.filter((r) => r.status === "pending").length + s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length);
	const push = useWgoStore((s) => s.push);
	const markRead = useWgoStore((s) => s.markRead);
	const verifiedIds = useWgoStore((s) => s.verifiedIds);
	const sealExpired = useWgoStore((s) => s.sealExpired);
	const blockedIds = useWgoStore((s) => s.blockedIds);
	const reports = useWgoStore((s) => s.reports);
	const [now, setNow] = (0, import_react.useState)(Date.now());
	const [filter, setFilter] = (0, import_react.useState)("all");
	(0, import_react.useEffect)(() => {
		sealExpired();
		const id = window.setInterval(() => {
			setNow(Date.now());
			sealExpired();
		}, 1e3);
		return () => window.clearInterval(id);
	}, [sealExpired]);
	const visible = chats.filter((c) => !c.archived && !c.isRequest && c.participantIds.includes("me")).filter((c) => {
		if (c.type === "dm") {
			const other = c.participantIds.find((id) => id !== "me");
			if (other && blockedIds.includes(other)) return false;
		}
		if (filter === "shops") return Boolean(c.shopId);
		if (filter === "groups") return c.type === "group";
		if (filter === "personal") return !c.shopId && c.type !== "group";
		return true;
	}).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastAt - a.lastAt);
	const storyUsers = (0, import_react.useMemo)(() => [...new Set(stories.filter((s) => s.userId !== "me" && isStoryLive(s, now) && !blockedIds.includes(s.userId) && !(reports ?? []).some((r) => r.kind === "story" && r.targetId === s.id || r.kind === "user" && r.targetId === s.userId)).map((s) => s.userId))], [
		stories,
		now,
		blockedIds,
		reports
	]);
	const myStory = stories.filter((s) => s.userId === "me" && isStoryLive(s, now)).length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass sticky top-0 z-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 px-4 pb-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WgoWordmark, { className: "text-[22px]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("search"),
								onClick: () => push({ name: "global-search" }),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("newChat"),
								onClick: () => push({ name: "new-chat" }),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ml-1",
								onClick: () => push({ name: "me" }),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									user: me,
									size: 32,
									priority: true
								})
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4 overflow-x-auto no-scrollbar px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex w-16 shrink-0 flex-col items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => push(myStory ? {
								name: "stories",
								userId: "me"
							} : { name: "new-story" }),
							"aria-label": t("yourStory"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: me,
								size: 56,
								ring: myStory ? "accent" : "none",
								priority: true
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg outline-2 outline-bg",
							onClick: () => push({ name: "new-story" }),
							"aria-label": t("addStory"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
								className: "size-3",
								strokeWidth: 3
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-full truncate text-center text-[11px] text-muted",
						children: t("yourStory")
					})]
				}), storyUsers.map((id) => {
					const u = users[id];
					const lastViewed = viewed[id] ?? 0;
					const unseen = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.createdAt > lastViewed);
					const withMusic = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.music);
					const withVideo = stories.some((s) => s.userId === id && isStoryLive(s, now) && s.type === "video");
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-16 shrink-0 flex-col items-center gap-1.5",
						onClick: () => push({
							name: "stories",
							userId: id
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: u,
								size: 56,
								ring: unseen ? "accent" : "muted"
							}), withVideo || withMusic ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg outline-2 outline-bg",
								children: withVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3 translate-x-px" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Music, { className: "size-3" })
							}) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-full truncate text-center text-[11px] text-muted",
							children: u?.displayName
						})]
					}, id);
				})]
			}),
			pending > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => push({ name: "requests" }),
				className: "mx-4 mb-1 flex items-center gap-3 rounded-xl glass-card px-3 py-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-9 items-center justify-center rounded-full bg-accent/20 text-accent-fg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "size-4 text-navy" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1 text-left text-[14px] font-medium",
						children: t("requests")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: pending })
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: filter === "all",
						onClick: () => setFilter("all"),
						children: t("chatsAll")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: filter === "personal",
						onClick: () => setFilter("personal"),
						children: t("chatsPersonal")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: filter === "shops",
						onClick: () => setFilter("shops"),
						children: t("chatsShops")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: filter === "groups",
						onClick: () => setFilter("groups"),
						children: t("chatsGroups")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-24",
				children: visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
					title: filter === "groups" ? t("groupsEmpty") : t("chatsEmpty"),
					body: filter === "groups" ? t("groupsEmptySub") : t("chatsEmptySub"),
					action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						onClick: () => push({ name: filter === "groups" ? "new-group" : "connect" }),
						children: filter === "groups" ? t("createGroup") : t("connectCta")
					})
				}) : visible.map((chat, i) => {
					const peer = chatPeer(chat, users);
					const shop = chat.shopId ? shops.find((s) => s.id === chat.shopId) : void 0;
					const mineShop = Boolean(shop && shop.ownerId === "me");
					const groupUsers = chat.participantIds.filter((id) => id !== "me").map((id) => users[id]);
					const sealed = isChatSealed(chat, now);
					const ephemeral = Boolean(chat.ephemeral) && !sealed;
					const title = chat.type === "group" ? chat.name : sealed ? t("tempChatEnded") : ephemeral ? peer?.firstName ?? t("someone") : shop && !mineShop ? shop.name : peer?.displayName;
					const preview = sealed ? t("sealedKeepsNone") : chat.preview;
					const stamp = ephemeral && chat.expiresAt ? formatRemainShort(chat.expiresAt, now) : formatChatTime(chat.lastAt, lang);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
							onClick: () => {
								markRead(chat.id);
								push({
									name: "conversation",
									chatId: chat.id
								});
							},
							children: [chat.type === "group" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
								users: groupUsers,
								size: 52,
								photo: chat.avatar,
								priority: i < 8
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: shop && !mineShop ? shopFace(shop) : peer,
								size: 52,
								hidden: sealed,
								priority: i < 8
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1 border-b border-hair pb-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate text-[16px] font-medium",
											children: title
										}),
										shop ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "shrink-0 rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-medium text-accent",
											children: t("shopContext")
										}) : null,
										peer && verifiedIds.includes(peer.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5 shrink-0 text-accent" }) : !sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3.5 shrink-0 text-muted" }) : null,
										ephemeral ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-3.5 shrink-0 text-accent" }) : null,
										chat.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellOff, { className: "size-3.5 text-muted" }) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("ml-auto shrink-0 text-[12px] tabular-nums", ephemeral ? "text-accent" : "text-muted"),
											children: stamp
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mt-0.5 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("min-w-0 flex-1 truncate text-[14px]", sealed ? "text-muted" : chat.unread ? "text-fg" : "text-muted"),
										children: shop && !sealed ? `${t(SHOP_CAT_KEYS[shop.category])} · ${preview}` : preview
									}), !sealed && chat.unread ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: chat.unread }) : null]
								})]
							})]
						})
					}, chat.id);
				})
			})
		]
	});
}
function NewChatScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const users = useWgoStore((s) => s.users);
	const blocked = useWgoStore((s) => s.blockedIds);
	const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
	const [q, setQ] = (0, import_react.useState)("");
	const contacts = Object.values(users).filter((u) => u.connected && !blocked.includes(u.id) && `${u.displayName} ${u.username}`.toLowerCase().includes(q.toLowerCase()));
	const actions = [
		{
			icon: ScanLine,
			label: t("scanQr"),
			go: () => push({ name: "scanner" })
		},
		{
			icon: QrCode,
			label: t("shareMyWgo"),
			go: () => push({ name: "my-qr" })
		},
		{
			icon: Hash,
			label: t("liveCode"),
			go: () => push({ name: "live-code" })
		},
		{
			icon: Users,
			label: t("createGroup"),
			go: () => push({ name: "new-group" })
		},
		{
			icon: MapPin,
			label: t("nearbyPeople"),
			go: () => push({ name: "nearby" })
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("newChat"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4 pb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
					placeholder: t("searchPeople"),
					value: q,
					onChange: (e) => setQ(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar",
				children: [
					actions.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: a.go,
						className: "flex w-full items-center gap-3 px-4 py-3 text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-10 items-center justify-center rounded-full bg-surface-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(a.icon, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[15px] font-medium",
							children: a.label
						})]
					}, a.label)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 px-4 pb-2 text-[12px] font-medium text-muted uppercase",
						children: t("wgoContacts")
					}),
					contacts.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
						onClick: () => openOrCreateDm(u.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							user: u,
							size: 44
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[15px] font-medium",
							children: u.displayName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[13px] text-muted",
							children: ["@", u.username]
						})] })]
					}, u.id))
				]
			})
		]
	});
}
function RequestsScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const requests = useWgoStore((s) => s.requests);
	const intros = useWgoStore((s) => s.intros);
	const users = useWgoStore((s) => s.users);
	const acceptRequest = useWgoStore((s) => s.acceptRequest);
	const ignoreRequest = useWgoStore((s) => s.ignoreRequest);
	const blockedIds = useWgoStore((s) => s.blockedIds);
	const pending = requests.filter((r) => r.status === "pending" && !blockedIds.includes(r.fromId));
	const pendingIntros = intros.filter((i) => i.recipientId === "me" && i.status === "pending");
	const [reportId, setReportId] = (0, import_react.useState)(null);
	const [blockId, setBlockId] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("requests"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-4",
				children: pendingIntros.length === 0 && pending.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { title: t("noResults") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [pendingIntros.map((intro) => {
					const from = users[intro.introducerId];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mb-3 w-full rounded-xl bg-surface p-4 text-left hairline",
						onClick: () => push({
							name: "intro-detail",
							introId: intro.id
						}),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								hidden: true,
								size: 48
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium",
										children: t("someone")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[13px] text-muted",
										children: t("usernameHidden")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-2 text-[14px] text-muted",
										children: [
											t("introBy"),
											" ",
											from?.displayName
										]
									})
								]
							})]
						})
					}, intro.id);
				}), pending.map((r) => {
					const u = users[r.fromId];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 rounded-xl bg-surface p-4 hairline",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									user: u,
									size: 48
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-medium",
											children: u?.displayName
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[13px] text-muted",
											children: ["@", u?.username]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 text-[14px] text-muted",
											children: r.preview
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 grid grid-cols-3 gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										className: "h-10 text-[13px]",
										onClick: () => acceptRequest(r.id),
										children: t("accept")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										variant: "secondary",
										className: "h-10 text-[13px]",
										onClick: () => ignoreRequest(r.id),
										children: t("ignore")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										variant: "danger",
										className: "h-10 text-[13px]",
										onClick: () => setBlockId(r.fromId),
										children: t("block")
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mt-2 w-full text-center text-[13px] text-muted",
								onClick: () => setReportId(r.fromId),
								children: t("report")
							})
						]
					}, r.id);
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: Boolean(reportId),
				onClose: () => setReportId(null),
				kind: "user",
				targetId: reportId ?? "",
				blockUserId: reportId ?? void 0
			}),
			blockId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockSheet, {
				open: true,
				onClose: () => setBlockId(null),
				userId: blockId
			}) : null
		]
	});
}
function GlobalSearchScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const users = useWgoStore((s) => s.users);
	const chats = useWgoStore((s) => s.chats);
	const listings = useWgoStore((s) => s.listings);
	const shops = useWgoStore((s) => s.shops);
	const messages = useWgoStore((s) => s.messages);
	const blocked = useWgoStore((s) => s.blockedIds);
	const markRead = useWgoStore((s) => s.markRead);
	const [q, setQ] = (0, import_react.useState)("");
	const query = q.trim().toLowerCase();
	const people = query ? Object.values(users).filter((u) => !blocked.includes(u.id) && `${u.displayName} ${u.username} ${u.bio}`.toLowerCase().includes(query)) : [];
	const chatHits = query ? chats.filter((c) => (c.name ?? "").toLowerCase().includes(query)) : [];
	const msgHits = query ? Object.values(messages).flat().filter((m) => m.text?.toLowerCase().includes(query)).slice(0, 8) : [];
	const listingHits = query ? listings.filter((l) => `${l.title} ${l.city}`.toLowerCase().includes(query)) : [];
	const shopHits = query ? shops.filter((s) => `${s.name} ${s.handle} ${s.city} ${s.bio}`.toLowerCase().includes(query)) : [];
	const total = people.length + chatHits.length + msgHits.length + listingHits.length + shopHits.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("searchGlobal"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4 pb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
					autoFocus: true,
					placeholder: t("searchHint"),
					value: q,
					onChange: (e) => setQ(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-4 pb-8",
				children: !query ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "pt-8 text-center text-[14px] text-muted",
					children: t("searchHint")
				}) : total === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "pt-8 text-center text-[14px] text-muted",
					children: t("noResults")
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					people.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 py-2.5 text-left",
						onClick: () => push({
							name: "found-profile",
							userId: u.id
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							user: u,
							size: 40
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[15px]",
							children: u.displayName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[13px] text-muted",
							children: ["@", u.username]
						})] })]
					}, u.id)),
					chatHits.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex w-full py-2.5 text-left text-[15px]",
						onClick: () => {
							markRead(c.id);
							push({
								name: "conversation",
								chatId: c.id
							});
						},
						children: c.name
					}, c.id)),
					msgHits.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "block w-full py-2.5 text-left",
						onClick: () => {
							markRead(m.chatId);
							push({
								name: "conversation",
								chatId: m.chatId
							});
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-[15px]",
							children: m.text
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[12px] text-muted",
							children: formatChatTime(m.createdAt, "fr")
						})]
					}, m.id)),
					shopHits.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 py-2.5 text-left",
						onClick: () => push({
							name: "shop",
							shopId: s.id
						}),
						children: [s.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: s.image,
							alt: "",
							className: "size-10 rounded-md object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-10 items-center justify-center rounded-md bg-navy text-[11px] text-accent",
							children: s.name.slice(0, 2).toUpperCase()
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[15px]",
							children: s.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[13px] text-muted",
							children: [
								t("shopContext"),
								" · @",
								s.handle
							]
						})] })]
					}, s.id)),
					listingHits.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 py-2.5 text-left",
						onClick: () => push({
							name: "listing",
							listingId: l.id
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: l.image,
							alt: "",
							className: "size-12 rounded-md object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[15px]",
							children: l.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[13px] text-muted",
							children: l.price
						})] })]
					}, l.id))
				] })
			})
		]
	});
}
function NewGroupScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const users = useWgoStore((s) => s.users);
	const createGroup = useWgoStore((s) => s.createGroup);
	const [name, setName] = (0, import_react.useState)("");
	const [ids, setIds] = (0, import_react.useState)([]);
	const [photo, setPhoto] = (0, import_react.useState)();
	const [pick, setPick] = (0, import_react.useState)(false);
	const contacts = Object.values(users).filter((u) => u.connected);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("createGroup"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-5 pb-3 text-[13px] leading-relaxed text-muted",
				children: t("groupQrBody")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center px-4 pb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "relative",
					onClick: () => setPick(true),
					"aria-label": t("addGroupPhoto"),
					children: [photo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: photo,
						alt: "",
						className: "size-20 rounded-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-20 items-center justify-center rounded-full bg-navy text-paper",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-7" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-3.5" })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-2 text-[13px] font-medium text-accent",
					children: photo ? t("changeGroupPhoto") : t("addGroupPhoto")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
					placeholder: t("groupName"),
					value: name,
					onChange: (e) => setName(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex-1 overflow-y-auto no-scrollbar",
				children: contacts.map((u) => {
					const on = ids.includes(u.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
						onClick: () => setIds((prev) => on ? prev.filter((x) => x !== u.id) : [...prev, u.id]),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: u,
								size: 40
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex-1 text-[15px]",
								children: u.displayName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-5 rounded-full hairline", on && "bg-accent") })
						]
					}, u.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-4 pb-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "w-full",
					disabled: !name.trim() || ids.length < 1,
					onClick: () => createGroup(name.trim(), ids, photo),
					children: t("create")
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GallerySheet, {
				open: pick,
				onClose: () => setPick(false),
				onPick: setPhoto,
				title: t("addGroupPhoto")
			})
		]
	});
}
function MyGroupsScreen() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const users = useWgoStore((s) => s.users);
	const chats = useWgoStore((s) => s.chats);
	const markRead = useWgoStore((s) => s.markRead);
	const groups = chats.filter((c) => c.type === "group" && c.participantIds.includes("me") && !c.archived).sort((a, b) => b.lastAt - a.lastAt);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("myGroups"),
				onBack: pop,
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: t("createGroup"),
					onClick: () => push({ name: "new-group" }),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-8",
				children: groups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
					title: t("groupsEmpty"),
					body: t("groupsEmptySub"),
					action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						onClick: () => push({ name: "new-group" }),
						children: t("createGroup")
					})
				}) : groups.map((chat) => {
					const faces = chat.participantIds.filter((id) => id !== "me").map((id) => users[id]);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
						onClick: () => {
							markRead(chat.id);
							push({
								name: "conversation",
								chatId: chat.id
							});
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
							users: faces,
							size: 52,
							photo: chat.avatar
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1 border-b border-hair pb-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-[16px] font-medium",
									children: chat.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto shrink-0 text-[12px] text-muted tabular-nums",
									children: formatChatTime(chat.lastAt, lang)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-0.5 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate text-[14px] text-muted",
									children: chat.preview
								}), chat.unread ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: chat.unread }) : null]
							})]
						})]
					}, chat.id);
				})
			})
		]
	});
}
function hash32(input) {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
function inFinder(r, c, n) {
	const inBox = (rr, cc, r0, c0) => rr >= r0 && rr < r0 + 7 && cc >= c0 && cc < c0 + 7;
	return inBox(r, c, 0, 0) || inBox(r, c, 0, n - 7) || inBox(r, c, n - 7, 0);
}
function finderModule(r, c, r0, c0) {
	const rr = r - r0;
	const cc = c - c0;
	return rr === 0 || rr === 6 || cc === 0 || cc === 6 || rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
}
function qrGrid(value, n = 29) {
	const grid = Array.from({ length: n }, () => Array(n).fill(false));
	const seed = hash32(value);
	let h = seed;
	for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
		if (inFinder(r, c, n)) {
			r < 7 || n - 7;
			c < 7 || r < 7 && c >= n - 7 && n - 7;
			const topRight = r < 7 && c >= n - 7;
			const bottomLeft = r >= n - 7 && c < 7;
			const originR = topRight ? 0 : bottomLeft ? n - 7 : 0;
			const originC = topRight ? n - 7 : 0;
			grid[r][c] = finderModule(r, c, originR, originC);
			continue;
		}
		h = Math.imul(h ^ r * 131 + c * 17 + seed, 16777619) >>> 0;
		grid[r][c] = (h >>> 28 & 1) === 1;
	}
	const timing = 6;
	for (let i = 8; i < n - 8; i++) {
		grid[timing][i] = i % 2 === 0;
		grid[i][timing] = i % 2 === 0;
	}
	return grid;
}
async function qrPngBlob(value, size = 720) {
	const grid = qrGrid(value);
	const n = grid.length;
	const pad = 3;
	const dim = n + 6;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas");
	ctx.fillStyle = "#F7F9FC";
	ctx.fillRect(0, 0, size, size);
	const cell = size / dim;
	for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
		if (!grid[r][c]) continue;
		ctx.fillStyle = r < 7 && c < 7 || r < 7 && c > n - 8 || r > n - 8 && c < 7 ? "#0B1220" : r % 7 === 3 && c % 7 === 3 ? "#C9A227" : "#0B1220";
		ctx.fillRect((c + pad) * cell, (r + pad) * cell, cell + .4, cell + .4);
	}
	const mark = Math.round(size * .18);
	const mx = (size - mark) / 2;
	const my = (size - mark) / 2;
	ctx.fillStyle = "#0B1220";
	roundRect(ctx, mx, my, mark, mark, 10);
	ctx.fill();
	ctx.fillStyle = "#F7F9FC";
	ctx.beginPath();
	ctx.arc(mx + mark * .32, my + mark * .5, mark * .1, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#FFD84D";
	ctx.beginPath();
	ctx.arc(mx + mark * .68, my + mark * .5, mark * .1, 0, Math.PI * 2);
	ctx.fill();
	return new Promise((resolve, reject) => {
		canvas.toBlob((b) => b ? resolve(b) : reject(/* @__PURE__ */ new Error("blob")), "image/png");
	});
}
function roundRect(ctx, x, y, w, h, r) {
	const rad = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + rad, y);
	ctx.arcTo(x + w, y, x + w, y + h, rad);
	ctx.arcTo(x + w, y + h, x, y + h, rad);
	ctx.arcTo(x, y + h, x, y, rad);
	ctx.arcTo(x, y, x + w, y, rad);
	ctx.closePath();
}
function QrCard({ value, size = 220, className, markSrc, pad = 12 }) {
	const grid = qrGrid(value);
	const n = grid.length;
	const qPad = 3;
	const dim = n + 6;
	const inner = Math.max(48, size - pad * 2);
	const mark = Math.round(inner * .22);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative overflow-hidden rounded-xl bg-paper", className),
		style: {
			width: size,
			height: size,
			padding: pad
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: inner,
				height: inner,
				viewBox: `0 0 ${dim} ${dim}`,
				className: "block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					width: dim,
					height: dim,
					fill: "#F7F9FC"
				}), grid.map((row, r) => row.map((on, c) => on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: c + qPad,
					y: r + qPad,
					width: 1,
					height: 1,
					rx: .15,
					fill: r < 7 && c < 7 || r < 7 && c > n - 8 || r > n - 8 && c < 7 ? "#0B1220" : r % 7 === 3 && c % 7 === 3 ? "#C9A227" : "#0B1220"
				}, `${r}-${c}`) : null))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 flex items-center justify-center",
				children: markSrc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: markSrc,
					alt: "",
					className: "rounded-lg object-cover outline outline-3 outline-paper",
					style: {
						width: mark,
						height: mark
					}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center rounded-lg bg-navy shadow-[0_0_0_3px_#F7F9FC]",
					style: {
						width: mark,
						height: mark
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: mark * .55,
						height: mark * .55,
						viewBox: "0 0 64 64",
						"aria-hidden": true,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "20",
								cy: "32",
								r: "6",
								fill: "#F7F9FC"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "44",
								cy: "32",
								r: "6",
								fill: "#FFD84D"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8",
								stroke: "#F7F9FC",
								strokeWidth: "3",
								fill: "none",
								strokeLinecap: "round"
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: value
			})
		]
	});
}
function ConnectHubExtras() {
	const t = useT();
	const push = useWgoStore((s) => s.push);
	const pendingIntros = useWgoStore((s) => s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-4 mt-3 grid grid-cols-2 gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => push({ name: "live-code" }),
			className: "press flex min-h-[100px] flex-col items-start rounded-2xl glass-card p-3.5 text-left",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-9 items-center justify-center rounded-lg bg-accent text-accent-fg",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hash, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-auto pt-3 text-[15px] font-semibold",
					children: t("liveCode")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-0.5 text-[11px] leading-snug text-muted",
					children: t("liveCodeSub")
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => push({ name: "one-time-qr" }),
			className: "press flex min-h-[100px] flex-col items-start rounded-2xl glass-card p-3.5 text-left",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-9 items-center justify-center rounded-lg bg-navy text-paper",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-auto pt-3 text-[15px] font-semibold",
					children: t("oneTimeQr")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-0.5 text-[11px] leading-snug text-muted",
					children: t("oneTimeQrSub")
				})
			]
		})]
	}), pendingIntros > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => push({ name: "requests" }),
		className: "mx-4 mt-3 flex items-center gap-3 rounded-2xl glass-card p-4 text-left",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-10 items-center justify-center rounded-lg bg-surface-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "size-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[15px] font-semibold",
					children: t("intros")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[12px] text-muted",
					children: t("usernameHidden")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[13px] font-semibold tabular-nums",
				children: pendingIntros
			})
		]
	}) : null] });
}
function NoPhoneBadge({ className }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[11px] font-medium text-paper", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-3" }), t("noPhoneListing")]
	});
}
function ScanResultHint({ via }) {
	const t = useT();
	if (!via) return null;
	const label = via === "code" ? t("foundViaCode") : via === "qr" ? t("foundViaQr") : via === "intro" ? t("foundViaIntro") : via === "nearby" ? t("foundViaNearby") : via === "touch" ? t("foundViaTouch") : null;
	if (!label) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-2 text-[12px] text-muted",
		children: label
	});
}
function ConnectScreen() {
	const t = useT();
	const push = useWgoStore((s) => s.push);
	const cards = [
		{
			name: "scanner",
			icon: ScanLine,
			title: t("scan"),
			sub: t("scanSub")
		},
		{
			name: "my-qr",
			icon: QrCode,
			title: t("myQr"),
			sub: t("myQrSub")
		},
		{
			name: "search-user",
			icon: Search,
			title: t("searchCard"),
			sub: t("searchCardSub")
		},
		{
			name: "nearby",
			icon: MapPin,
			title: t("nearby"),
			sub: t("nearbySub")
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass sticky top-0 z-10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-5 pt-2 pb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-[24px] leading-tight font-semibold tracking-tight",
					children: t("connectTitle")
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => push({ name: "wgo-touch" }),
					className: "press mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-navy px-4 py-3.5 text-left text-paper ring-1 ring-accent/35",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippMark, {
							size: 52,
							invert: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[16px] font-semibold",
								children: t("wgoTouch")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[12px] text-paper/60",
								children: t("wgoTouchSub")
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-accent-fg",
							children: t("touchLive")
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid grid-cols-2 gap-3 px-4",
					children: cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => push({ name: c.name }),
						className: "press flex min-h-[108px] flex-col items-start rounded-2xl glass-card p-3.5 text-left",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-9 items-center justify-center rounded-lg bg-navy text-paper",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(c.icon, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-auto pt-3 text-[15px] font-semibold",
								children: c.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 text-[11px] leading-snug text-muted",
								children: c.sub
							})
						]
					}, c.name))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectHubExtras, {})
			]
		})]
	});
}
function MyQrScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const me = useWgoStore((s) => s.me);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const link = `${APP_HOST}/${me.username}`;
	async function share() {
		const payload = {
			title: "Wipp",
			text: `@${me.username}`,
			url: `https://${link}`
		};
		try {
			if (navigator.share) await navigator.share(payload);
			else {
				await navigator.clipboard.writeText(`https://${link}`);
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1600);
			}
		} catch {
			await navigator.clipboard.writeText(`https://${link}`);
			setCopied(true);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("myQr"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center overflow-y-auto no-scrollbar px-6 pt-2 pb-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippWordmark, { className: "mb-4 text-[22px] text-paper" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
						user: me,
						size: 72
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-[20px] font-semibold",
						children: me.displayName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[14px] text-paper/60",
						children: ["@", me.username]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "wipp-card mt-5 rounded-2xl p-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl bg-paper p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCard, {
								value: link,
								size: 220
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-[28ch] text-center text-[13px] leading-relaxed text-paper/60",
						children: t("myCardHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[12px] text-paper/40",
						children: link
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
						className: "mt-5 w-full",
						onClick: share,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-4" }), copied ? t("copied") : t("shareMyCard")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
						variant: "secondary",
						className: "mt-2 w-full",
						onClick: () => push({ name: "wgo-touch" }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "size-4" }), t("wgoTouch")]
					})
				]
			})
		]
	});
}
function ScannerScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const replace = useWgoStore((s) => s.replace);
	const redeemQr = useWgoStore((s) => s.redeemQr);
	const [scan, setScan] = (0, import_react.useState)(null);
	const [fail, setFail] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!scan) return;
		const id = window.setTimeout(() => {
			if (scan === "profile") {
				replace({
					name: "found-profile",
					userId: "lea",
					via: "qr"
				});
				return;
			}
			if (scan === "group") {
				replace({
					name: "group-invite",
					token: "soiree-samedi"
				});
				return;
			}
			const res = redeemQr(scan === "once" ? "once-lea-cafe" : scan === "shop" ? "shop-nails" : "event-soiree-sam");
			if (!res.ok) {
				setFail(res.reason === "used" ? t("codeUsed") : res.reason === "expired" ? t("qrExpired") : t("codeNotFound"));
				setScan(null);
			}
		}, 1100);
		return () => window.clearTimeout(id);
	}, [
		scan,
		replace,
		redeemQr,
		t
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-ink text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("scan"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center justify-center px-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setFail(null);
							setScan("profile");
						},
						className: "relative size-64",
						"aria-label": t("scanAction"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-3xl border border-accent/40" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-0 left-0 h-8 w-8 rounded-tl-2xl border-t-2 border-l-2 border-accent" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-0 right-0 h-8 w-8 rounded-tr-2xl border-t-2 border-r-2 border-accent" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-accent" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-accent" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute inset-x-3 h-0.5 bg-accent/80", scan ? "top-4 animate-pulse" : "top-1/2") })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 text-[14px] text-paper/60",
						children: t("scanHint")
					}),
					fail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[13px] text-danger",
						children: fail
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid w-full gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								onClick: () => {
									setFail(null);
									setScan("profile");
								},
								children: t("scanProfile")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "secondary",
								onClick: () => {
									setFail(null);
									setScan("once");
								},
								children: t("scanOnce")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "secondary",
								onClick: () => {
									setFail(null);
									setScan("group");
								},
								children: t("scanGroup")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "secondary",
								onClick: () => {
									setFail(null);
									setScan("shop");
								},
								children: t("scanShop")
							})
						]
					})
				]
			})
		]
	});
}
function SearchUserScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const users = useWgoStore((s) => s.users);
	const shops = useWgoStore((s) => s.shops);
	const blocked = useWgoStore((s) => s.blockedIds);
	const [q, setQ] = (0, import_react.useState)("");
	const query = q.replace(/^@/, "").toLowerCase();
	const hits = Object.values(users).filter((u) => !blocked.includes(u.id) && query.length > 0 && `${u.username} ${u.displayName} ${u.firstName} ${u.lastName}`.toLowerCase().includes(query));
	const shopHits = shops.filter((s) => query.length > 0 && `${s.handle} ${s.name} ${s.city}`.toLowerCase().includes(query));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("searchCard"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
					autoFocus: true,
					placeholder: "@username",
					value: q,
					onChange: (e) => setQ(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex-1 overflow-y-auto no-scrollbar px-4",
				children: [
					shopHits.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 py-3 text-left",
						onClick: () => push({
							name: "shop",
							shopId: s.id
						}),
						children: [s.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: s.image,
							alt: "",
							className: "size-12 rounded-full object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-12 items-center justify-center rounded-full bg-navy text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[16px] font-medium",
							children: s.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[13px] text-muted",
							children: [
								t("shopContext"),
								" · @",
								s.handle
							]
						})] })]
					}, s.id)),
					hits.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 py-3 text-left",
						onClick: () => push({
							name: "found-profile",
							userId: u.id,
							via: "username"
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							user: u,
							size: 48
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[16px] font-medium",
							children: u.displayName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[13px] text-muted",
							children: ["@", u.username]
						})] })]
					}, u.id)),
					query && hits.length === 0 && shopHits.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "pt-10 text-center text-[14px] text-muted",
						children: t("noResults")
					}) : null
				]
			})
		]
	});
}
function NearbyScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const nearby = useWgoStore((s) => s.nearby);
	const setNearby = useWgoStore((s) => s.setNearby);
	const users = useWgoStore((s) => s.users);
	const blocked = useWgoStore((s) => s.blockedIds);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("nearby"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 px-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: nearby === 0,
						onClick: () => setNearby(0),
						children: t("invisible")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: nearby === 5,
						onClick: () => setNearby(5),
						children: t("visible5")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: nearby === 15,
						onClick: () => setNearby(15),
						children: t("visible15")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-5 pt-3 text-[13px] text-muted",
				children: t("nearbyHint")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex-1 overflow-y-auto no-scrollbar px-4",
				children: nearby === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
					title: t("nearbyOff"),
					body: t("nearbyHint")
				}) : NEARBY.filter((n) => !blocked.includes(n.id)).map((n) => {
					const u = users[n.id];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 py-3 text-left",
						onClick: () => push({
							name: "found-profile",
							userId: n.id,
							via: "nearby"
						}),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: u,
								size: 48
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[16px] font-medium",
									children: u?.displayName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[13px] text-muted",
									children: ["@", u?.username]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[12px] text-muted tabular-nums",
								children: [
									n.meters,
									" ",
									t("meters")
								]
							})
						]
					}, n.id);
				})
			})
		]
	});
}
function FoundProfileScreen({ userId, via }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const users = useWgoStore((s) => s.users);
	const me = useWgoStore((s) => s.me);
	const sent = useWgoStore((s) => s.sentRequestIds.includes(userId));
	const blocked = useWgoStore((s) => s.blockedIds.includes(userId));
	const connectWith = useWgoStore((s) => s.connectWith);
	const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
	const startCall = useWgoStore((s) => s.startCall);
	const unblockUser = useWgoStore((s) => s.unblockUser);
	const verified = useWgoStore((s) => s.verifiedIds.includes(userId));
	const chats = useWgoStore((s) => s.chats);
	const user = userId === "me" ? me : users[userId];
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	const [blockOpen, setBlockOpen] = (0, import_react.useState)(false);
	if (!user) return null;
	const connected = user.connected || userId === "me";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("foundTitle"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center px-6 pt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
						user,
						size: 112
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "mt-4 flex items-center gap-1.5 text-[24px] font-semibold",
						children: [user.displayName, verified ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "size-5 text-accent" }) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[15px] text-muted",
						children: ["@", user.username]
					}),
					connected && userId !== "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 flex items-center gap-1 text-[12px] text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3" }), verified ? t("e2eVerified") : t("e2eOn")]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanResultHint, { via }),
					user.bio ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-[32ch] text-center text-[14px] leading-relaxed text-muted",
						children: user.bio
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-[12px] text-muted",
						children: [
							user.city,
							" · 2 ",
							t("commonContacts")
						]
					}),
					connected && userId !== "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex items-center justify-center gap-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "press flex flex-col items-center gap-1.5",
							onClick: () => startCall(userId, "audio"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-12 items-center justify-center rounded-full bg-navy text-paper",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-medium text-muted",
								children: t("audioCall")
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "press flex flex-col items-center gap-1.5",
							onClick: () => startCall(userId, "video"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-12 items-center justify-center rounded-full bg-navy text-paper",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-medium text-muted",
								children: t("videoCall")
							})]
						})]
					}) : null,
					connected && userId !== "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "mt-5 flex items-center gap-2 text-[13px] text-muted",
						onClick: () => {
							const chat = chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral);
							if (chat) push({
								name: "e2e-info",
								chatId: chat.id
							});
							else {
								const id = openOrCreateDm(userId);
								push({
									name: "e2e-info",
									chatId: id
								});
							}
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3.5" }), t("e2eCompare")]
					}) : null,
					userId !== "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid w-full gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								disabled: sent && !connected,
								onClick: () => connected ? openOrCreateDm(userId) : connectWith(userId),
								children: connected ? t("message") : sent ? t("requestSent") : t("connectWith")
							}),
							connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "secondary",
								onClick: () => push({
									name: "introduce",
									toUserId: userId
								}),
								children: t("introduce")
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "secondary",
								onClick: () => openOrCreateDm(userId, true),
								children: t("message")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "ghost",
								onClick: () => setReportOpen(true),
								children: t("report")
							}),
							blocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "ghost",
								onClick: () => unblockUser(userId),
								children: t("unblock")
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "ghost",
								className: "text-danger",
								onClick: () => setBlockOpen(true),
								children: t("block")
							})
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: "user",
				targetId: userId,
				blockUserId: userId,
				onSubmitted: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockSheet, {
				open: blockOpen,
				onClose: () => setBlockOpen(false),
				userId,
				onBlocked: pop
			})
		]
	});
}
function keyGreen(data) {
	const p = data.data;
	for (let i = 0; i < p.length; i += 4) {
		const r = p[i];
		const g = p[i + 1];
		const b = p[i + 2];
		const maxRB = Math.max(r, b);
		const greenLead = g - maxRB;
		if (g > 48 && greenLead > 14 && g > (r + b) * .42) {
			const spill = Math.min(1, greenLead / 36);
			p[i + 3] = Math.round(p[i + 3] * Math.max(0, 1 - spill * 1.35));
		} else if (g > r && g > b && greenLead > 6) p[i + 1] = maxRB + Math.round(greenLead * .25);
	}
}
function StickerClip({ src, poster, size, loopSoft, label, onLongPress }) {
	const videoRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const played = (0, import_react.useRef)(false);
	const raf = (0, import_react.useRef)(0);
	function paint() {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;
		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);
		if (video.readyState < 2) return;
		ctx.drawImage(video, 0, 0, w, h);
		const frame = ctx.getImageData(0, 0, w, h);
		keyGreen(frame);
		ctx.putImageData(frame, 0, 0);
	}
	function tick() {
		paint();
		const video = videoRef.current;
		if (video && !video.paused && !video.ended) raf.current = requestAnimationFrame(tick);
	}
	function playOnce() {
		const video = videoRef.current;
		if (!video) return;
		video.loop = Boolean(loopSoft);
		video.playbackRate = loopSoft ? .92 : 1;
		video.currentTime = 0;
		video.play().then(() => {
			cancelAnimationFrame(raf.current);
			raf.current = requestAnimationFrame(tick);
		});
	}
	(0, import_react.useEffect)(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.round(size * dpr);
		canvas.height = Math.round(size * dpr);
		const posterImg = new Image();
		posterImg.onload = () => {
			const ctx = canvas.getContext("2d");
			if (!ctx || played.current) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(posterImg, 0, 0, canvas.width, canvas.height);
		};
		posterImg.src = poster;
		const onTime = () => {
			if (loopSoft) return;
			if (video.currentTime >= 3.05) {
				video.pause();
				paint();
			}
		};
		const onEnded = () => {
			if (!loopSoft) {
				video.pause();
				paint();
			}
		};
		video.addEventListener("timeupdate", onTime);
		video.addEventListener("ended", onEnded);
		video.addEventListener("seeked", paint);
		const io = new IntersectionObserver(([entry]) => {
			if (!entry?.isIntersecting || played.current) return;
			played.current = true;
			playOnce();
		}, { threshold: .45 });
		io.observe(canvas);
		return () => {
			io.disconnect();
			video.removeEventListener("timeupdate", onTime);
			video.removeEventListener("ended", onEnded);
			video.removeEventListener("seeked", paint);
			cancelAnimationFrame(raf.current);
		};
	}, [
		size,
		loopSoft,
		src
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "button",
		tabIndex: 0,
		"aria-label": label,
		className: "relative shrink-0 cursor-pointer",
		style: {
			width: size,
			height: size
		},
		onClick: (e) => {
			e.stopPropagation();
			playOnce();
		},
		onKeyDown: (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				playOnce();
			}
		},
		onContextMenu: (e) => {
			e.preventDefault();
			onLongPress?.();
		},
		onPointerDown: (e) => {
			if (!onLongPress) return;
			const hold = window.setTimeout(() => onLongPress(), 480);
			const up = () => {
				window.clearTimeout(hold);
				window.removeEventListener("pointerup", up);
			};
			window.addEventListener("pointerup", up);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
			ref: videoRef,
			src,
			poster,
			muted: true,
			playsInline: true,
			preload: "auto",
			className: "pointer-events-none absolute opacity-0",
			style: {
				width: 1,
				height: 1
			}
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			className: "size-full",
			style: {
				width: size,
				height: size
			}
		})]
	});
}
function WippSticker({ id, size = 72, className, animated = false, onLongPress }) {
	const row = stickerById(id);
	if (isEmojiSticker(id)) {
		const emoji = emojiFromStickerId(id);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			role: "img",
			"aria-label": emoji,
			className: cn("inline-flex shrink-0 items-center justify-center leading-none", className),
			style: {
				width: size,
				height: size,
				fontSize: size * .78
			},
			onContextMenu: (e) => {
				e.preventDefault();
				onLongPress?.();
			},
			onPointerDown: () => {
				if (!onLongPress) return;
				const hold = window.setTimeout(() => onLongPress(), 480);
				const up = () => {
					window.clearTimeout(hold);
					window.removeEventListener("pointerup", up);
				};
				window.addEventListener("pointerup", up);
			},
			children: emoji
		});
	}
	if (!row) return null;
	if (animated && "anim" in row && row.anim) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickerClip, {
		src: row.anim,
		poster: row.src,
		size,
		loopSoft: "loopSoft" in row && row.loopSoft,
		label: row.labelFr,
		onLongPress
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: row.src,
		alt: row.labelFr,
		width: size,
		height: size,
		draggable: false,
		className: cn("shrink-0 object-contain", className),
		style: {
			width: size,
			height: size
		}
	});
}
var REACTS = [
	"❤️",
	"😂",
	"👍",
	"😮",
	"😢",
	"🔥"
];
var EMPTY_MSGS = [];
function ConversationScreen({ chatId }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
	const messages = useWgoStore((s) => s.messages[chatId]) ?? EMPTY_MSGS;
	const users = useWgoStore((s) => s.users);
	const shops = useWgoStore((s) => s.shops);
	const typing = useWgoStore((s) => s.typing[chatId]);
	const sendMessage = useWgoStore((s) => s.sendMessage);
	const retryMessage = useWgoStore((s) => s.retryMessage);
	const startCall = useWgoStore((s) => s.startCall);
	const addReaction = useWgoStore((s) => s.addReaction);
	const deleteMessage = useWgoStore((s) => s.deleteMessage);
	const translateMessage = useWgoStore((s) => s.translateMessage);
	const markRead = useWgoStore((s) => s.markRead);
	const sealExpired = useWgoStore((s) => s.sealExpired);
	const sealChat = useWgoStore((s) => s.sealChat);
	const keepContact = useWgoStore((s) => s.keepContact);
	const showCiphertext = useWgoStore((s) => s.showCiphertext);
	const verifiedIds = useWgoStore((s) => s.verifiedIds);
	const setDisappear = useWgoStore((s) => s.setDisappear);
	const burnViewOnce = useWgoStore((s) => s.burnViewOnce);
	const recentStickerIds = useWgoStore((s) => s.recentStickerIds ?? []);
	const [text, setText] = (0, import_react.useState)("");
	const [rec, setRec] = (0, import_react.useState)(null);
	const [elapsed, setElapsed] = (0, import_react.useState)(0);
	const [active, setActive] = (0, import_react.useState)(null);
	const [attach, setAttach] = (0, import_react.useState)(false);
	const [pickPhoto, setPickPhoto] = (0, import_react.useState)(false);
	const [pickVideo, setPickVideo] = (0, import_react.useState)(false);
	const [viewOnce, setViewOnce] = (0, import_react.useState)(false);
	const [viewer, setViewer] = (0, import_react.useState)(null);
	const [pickStickers, setPickStickers] = (0, import_react.useState)(false);
	const [stickerTab, setStickerTab] = (0, import_react.useState)("recent");
	const [emojiCat, setEmojiCat] = (0, import_react.useState)("smileys");
	const [menu, setMenu] = (0, import_react.useState)(false);
	const [disappearOpen, setDisappearOpen] = (0, import_react.useState)(false);
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	const [blockOpen, setBlockOpen] = (0, import_react.useState)(false);
	const [reportMsgId, setReportMsgId] = (0, import_react.useState)(null);
	const scroller = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		markRead(chatId);
		sealExpired();
	}, [
		chatId,
		markRead,
		sealExpired
	]);
	const [now, setNow] = (0, import_react.useState)(Date.now());
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			setNow(Date.now());
			sealExpired();
		}, 1e3);
		return () => window.clearInterval(id);
	}, [sealExpired]);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, [messages.length, typing]);
	(0, import_react.useEffect)(() => {
		if (!rec) return;
		const id = window.setInterval(() => setElapsed((Date.now() - rec.t0) / 1e3), 200);
		return () => window.clearInterval(id);
	}, [rec]);
	if (!chat) return null;
	const peerId = chat.type === "dm" ? chat.participantIds.find((id) => id !== "me") : void 0;
	const peer = peerId ? users[peerId] : void 0;
	const shop = chat.shopId ? shops.find((s) => s.id === chat.shopId) : void 0;
	const mineShop = Boolean(shop && shop.ownerId === "me");
	const shopFace = shop ? {
		displayName: shop.name,
		avatar: shop.image,
		online: true
	} : void 0;
	const sealed = isChatSealed(chat, now);
	const ephemeral = Boolean(chat.ephemeral) && !sealed;
	const title = chat.type === "group" ? chat.name : sealed ? t("tempChatEnded") : ephemeral ? peer?.firstName ?? t("someone") : shop && !mineShop ? shop.name : peer?.displayName;
	const subtitle = sealed ? t("tempChatEnded") : ephemeral ? t("firstNameOnly") : chat.type === "group" ? `${chat.participantIds.length} ${t("members")}` : shop ? mineShop ? `${t("shopContext")} · ${shop.name}` : `${t("shopContext")} · ${t(SHOP_CAT_KEYS[shop.category])}` : formatLastSeen(peer?.lastSeen, Boolean(peer?.online), lang);
	function send() {
		const value = text.trim();
		if (!value) return;
		haptic("send");
		sendMessage(chatId, { text: value });
		setText("");
	}
	function finishVoice(cancel = false) {
		if (!rec) return;
		const dur = Math.max(1, Math.round((Date.now() - rec.t0) / 1e3));
		setRec(null);
		setElapsed(0);
		if (!cancel) {
			haptic("send");
			sendMessage(chatId, {
				type: "voice",
				duration: dur,
				text: t("voice")
			});
		}
	}
	function sendSticker(id, label) {
		haptic("send");
		sendMessage(chatId, {
			type: "sticker",
			stickerId: id,
			text: label
		});
		setStickerTab("recent");
		setPickStickers(false);
	}
	function sendMedia(pick) {
		haptic("send");
		const once = viewOnce || void 0;
		if (pick.type === "video") {
			sendMessage(chatId, {
				type: "video",
				videoUrl: pick.url,
				duration: Math.max(1, Math.round(pick.durationMs / 1e3)),
				text: "",
				viewOnce: once
			});
			setPickVideo(false);
		} else {
			sendMessage(chatId, {
				type: "image",
				imageUrl: pick.url,
				text: "",
				viewOnce: once
			});
			setPickPhoto(false);
		}
	}
	function closeViewer() {
		if (viewer?.viewOnce && !viewer.viewed) burnViewOnce(chatId, viewer.id);
		setViewer(null);
	}
	const unreadCount = chat.unread;
	const emojiSet = EMOJI_CATS.find((c) => c.id === emojiCat) ?? EMOJI_CATS[0];
	const trayTabs = [
		{
			id: "recent",
			label: t("recents")
		},
		{
			id: "emoji",
			label: t("stickerEmoji")
		},
		...Object.keys(STICKER_PACKS).map((id) => ({
			id,
			label: lang === "fr" ? STICKER_PACKS[id].labelFr : STICKER_PACKS[id].labelEn
		}))
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-full flex-col bg-transparent",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass sticky top-0 z-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
					onBack: pop,
					title: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex min-w-0 items-center gap-2",
						onClick: () => {
							if (sealed || ephemeral) return;
							if (shop && !mineShop) {
								push({
									name: "shop",
									shopId: shop.id
								});
								return;
							}
							if (chat.type === "group") push({
								name: "group-info",
								chatId
							});
							else if (peerId) push({
								name: "found-profile",
								userId: peerId
							});
						},
						children: [
							chat.type === "group" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
								users: chat.participantIds.filter((id) => id !== "me").map((id) => users[id]),
								size: 32,
								photo: chat.avatar
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: shop && !mineShop ? shopFace : peer,
								size: 32,
								hidden: sealed
							}),
							sealed ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: title
							}),
							!sealed && peerId && verifiedIds.includes(peerId) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5 shrink-0 text-accent" }) : !sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3.5 shrink-0 text-muted" }) : null
						]
					}),
					subtitle,
					right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [peerId && !ephemeral && !sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: t("audioCall"),
						onClick: () => startCall(peerId, "audio"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: t("videoCall"),
						onClick: () => startCall(peerId, "video"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-5" })
					})] }) : null, !sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: "Menu",
						onClick: () => setMenu(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "size-5" })
					}) : null] })
				})]
			}),
			!sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => push({
					name: "e2e-info",
					chatId
				}),
				className: "glass-card mx-4 mb-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "mt-0.5 size-3.5 shrink-0 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[12px] leading-relaxed text-muted",
					children: t("e2eBanner")
				})]
			}) : null,
			!sealed && chat.disappearAfterMs ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass-card mx-4 mb-2 flex items-start gap-2 rounded-xl px-3 py-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "mt-0.5 size-3.5 shrink-0 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-[12px] leading-relaxed text-muted",
					children: [
						t("disappearingBanner"),
						" ",
						chat.disappearAfterMs >= 6048e5 ? t("disappearing7d") : t("disappearing24h"),
						"."
					]
				})]
			}) : null,
			ephemeral ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-4 mb-2 rounded-xl bg-navy px-3 py-2.5 text-paper",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-2 text-[12px] font-medium",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-3.5 text-accent" }),
							t("tempExpires"),
							" ",
							chat.expiresAt ? formatRemain(chat.expiresAt, now) : "—"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[12px] text-paper/60",
						children: t("tempBanner")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-8 rounded-full bg-accent px-3 text-[12px] font-medium text-accent-fg",
							onClick: () => keepContact(chatId),
							children: t("revealWgo")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-8 rounded-full bg-paper/10 px-3 text-[12px] font-medium text-paper",
							onClick: () => sealChat(chatId),
							children: t("simulateExpire")
						})]
					})
				]
			}) : null,
			sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center justify-center px-8 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-14 items-center justify-center rounded-full bg-navy text-accent",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-6" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-4 text-[18px] font-semibold",
						children: t("sealedTitle")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[14px] leading-relaxed text-muted",
						children: t("sealedBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-[12px] font-medium text-muted uppercase",
						children: t("sealedLost")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[13px] text-fg",
						children: t("sealedLostList")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[12px] font-medium text-muted uppercase",
						children: t("sealedKeeps")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[13px] text-muted",
						children: t("sealedKeepsNone")
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				unreadCount > 4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "hairline mx-4 mb-1 rounded-lg bg-surface px-3 py-2 text-left text-[13px]",
					children: [
						unreadCount,
						" ",
						t("unreadN"),
						" · ",
						t("summarize")
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: scroller,
					className: "no-scrollbar flex-1 overflow-y-auto px-3 py-3",
					children: [messages.filter((m) => !m.expiresAt || m.expiresAt > now).map((m, i, list) => {
						const mine = m.fromId === "me";
						const prev = list[i - 1];
						const showName = chat.type === "group" && !mine && prev?.fromId !== m.fromId;
						const sender = !mine && shop && m.fromId === shop.ownerId ? shopFace : users[m.fromId];
						if (m.type === "system") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "my-3 text-center text-[12px] text-muted",
							children: m.text
						}, m.id);
						if (m.type === "shop") {
							const card = shops.find((s) => s.id === m.shopId) ?? shop;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hairline mx-auto my-3 max-w-[80%] rounded-xl bg-surface p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-muted",
										children: t("contactingShop")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-[15px] font-semibold",
										children: card?.name ?? m.text
									}),
									card ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[12px] text-muted",
										children: t(SHOP_CAT_KEYS[card.category])
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[12px] text-muted",
										children: [
											card.city,
											", ",
											card.country
										]
									})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[12px] text-muted",
										children: t("shopContext")
									})
								]
							}, m.id);
						}
						if (m.type === "listing") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hairline mx-auto my-3 max-w-[80%] rounded-xl bg-surface p-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "px-1 pb-1 text-[11px] text-muted",
									children: t("talkingAbout")
								}),
								m.imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
									src: m.imageUrl,
									alt: "",
									className: "h-28 w-full rounded-lg object-cover"
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "px-1 pt-2 text-[14px] font-medium",
									children: m.text
								})
							]
						}, m.id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								if (mine && m.status === "failed") {
									retryMessage(chatId, m.id);
									return;
								}
								if (m.viewOnce) {
									if (!m.viewed) setViewer(m);
									return;
								}
								if (m.type === "sticker" || m.type === "video") return;
								setActive(m);
							},
							className: cn("mb-1 flex w-full", mine ? "justify-end" : "justify-start"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: cn("max-w-[78%] text-left", mine ? "items-end" : "items-start"),
								children: [
									showName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mb-0.5 px-1 text-[11px] text-muted",
										children: sender?.displayName
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: cn(m.type === "sticker" ? "bg-transparent px-0 py-0" : "rounded-2xl px-3 py-2", m.type !== "sticker" && (mine ? "rounded-br-sm bg-bubble-me text-bubble-me-fg" : "rounded-bl-sm bg-bubble-them text-fg")),
										children: [
											m.viewOnce && !m.viewed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-2 py-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "flex size-9 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg",
													children: "1"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[14px] font-medium",
													children: t("viewOnceOpen")
												})]
											}) : m.viewOnce && m.viewed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-2 py-1 opacity-60",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[14px]",
													children: t("viewOnceOpened")
												})]
											}) : m.type === "image" && m.imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
												src: m.imageUrl,
												alt: "",
												className: "mb-1 max-h-52 w-full rounded-lg object-cover"
											}) : m.type === "video" && m.videoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mb-1 block overflow-hidden rounded-lg",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
													src: m.videoUrl,
													controls: true,
													playsInline: true,
													preload: "metadata",
													className: "max-h-52 w-full bg-black object-cover",
													onClick: (e) => e.stopPropagation()
												})
											}) : null,
											m.type === "sticker" && isStickerId(m.stickerId) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippSticker, {
												id: m.stickerId,
												size: isEmojiSticker(m.stickerId) ? 72 : 148,
												animated: true,
												onLongPress: () => setActive(m)
											}) : null,
											m.type === "voice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "ml-0.5 text-[11px] font-semibold",
															children: "▶"
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "flex h-5 items-end gap-0.5",
														children: Array.from({ length: 16 }).map((_, b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: cn("w-0.5 rounded-full", mine ? "bg-paper/80" : "bg-fg/50"),
															style: { height: 6 + b * 7 % 14 }
														}, b))
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[12px] tabular-nums opacity-80",
														children: formatDuration(m.duration ?? 0)
													})
												]
											}) : m.type === "sticker" || m.type === "image" || m.type === "video" || m.viewOnce ? null : m.encFailed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: cn("flex items-center gap-1.5 text-[13px] italic", mine ? "text-paper/70" : "text-muted"),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3.5 shrink-0" }), t("e2eFailed")]
											}) : showCiphertext && m.enc ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "break-all font-mono text-[11px] leading-relaxed opacity-80",
												children: [
													m.enc.iv,
													".",
													m.enc.ct
												]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[15px] leading-snug",
												children: m.text ?? t("e2eLocked")
											}),
											m.translated ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 border-t border-white/10 pt-1 text-[13px] opacity-80",
												children: m.translated
											}) : null,
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: cn("mt-1 flex items-center justify-end gap-1 text-[11px] tabular-nums", mine ? "text-paper/50" : "text-muted"),
												children: [
													m.enc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-2.5 opacity-70" }) : null,
													m.expiresAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "size-2.5 opacity-70" }) : null,
													formatClock(m.createdAt),
													mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptMark, { status: m.status }) : null
												]
											})
										]
									}),
									m.reactions.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: cn("mt-0.5 flex gap-1", mine ? "justify-end" : "justify-start"),
										children: m.reactions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "hairline rounded-full bg-surface px-1.5 text-[12px]",
											children: r.emoji
										}, r.userId + r.emoji))
									}) : null
								]
							})
						}, m.id);
					}), typing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 flex justify-start",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl rounded-bl-sm bg-bubble-them px-3 py-2 text-[13px] text-muted",
							children: "···"
						})
					}) : null]
				}),
				rec ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass flex items-center gap-3 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-[13px] text-danger",
							onClick: () => finishVoice(true),
							children: t("slideCancel")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 flex-1 rounded-full bg-danger/40" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[13px] tabular-nums",
							children: formatDuration(elapsed)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg",
							"aria-label": t("send"),
							onClick: () => finishVoice(false),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-5" })
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass flex items-end gap-1.5 px-2 py-2 pb-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							label: "Plus",
							onClick: () => setAttach(true),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							label: t("stickers"),
							onClick: () => setPickStickers(true),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sticker, { className: "size-5" })
						}),
						chat.disappearAfterMs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "mb-3 size-3.5 shrink-0 text-accent" }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hairline flex min-h-11 flex-1 items-end rounded-xl bg-surface-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 1,
								value: text,
								onChange: (e) => setText(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										send();
									}
								},
								placeholder: t("e2ePlaceholder"),
								className: "max-h-28 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none"
							})
						}),
						text.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "press mb-0.5 flex size-[var(--touch-min)] items-center justify-center rounded-full bg-accent text-accent-fg",
							"aria-label": t("send"),
							onClick: send,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-5" })
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "press mb-0.5 flex size-[var(--touch-min)] items-center justify-center rounded-full bg-surface-2",
							"aria-label": t("voice"),
							onPointerDown: () => setRec({
								t0: Date.now(),
								locked: false
							}),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-5" })
						})
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: Boolean(active),
				onClose: () => setActive(null),
				children: active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 flex justify-center gap-2",
							children: REACTS.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "press flex size-10 items-center justify-center rounded-full bg-surface-2 text-lg",
								onClick: () => {
									addReaction(chatId, active.id, e);
									setActive(null);
								},
								children: e
							}, e))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								if (active.text) navigator.clipboard.writeText(active.text);
								setActive(null);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }),
								" ",
								t("copyMsg")
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								translateMessage(chatId, active.id);
								setActive(null);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Languages, { className: "size-4" }),
								" ",
								t("translate")
							]
						}),
						active.enc ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								navigator.clipboard.writeText(`${active.enc.iv}.${active.enc.ct}`);
								setActive(null);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }),
								" ",
								t("e2eCopyCipher")
							]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2 text-danger",
							onClick: () => {
								deleteMessage(chatId, active.id);
								setActive(null);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }),
								" ",
								t("deleteMe")
							]
						}),
						active.fromId !== "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								setActive(null);
								setReportMsgId(active.id);
							},
							children: t("report")
						}) : null
					]
				}) : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: attach,
				onClose: () => setAttach(false),
				title: t("gallery"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-3 gap-2",
					children: [
						[t("photo"), () => {
							setAttach(false);
							setPickPhoto(true);
						}],
						[t("video"), () => {
							setAttach(false);
							setPickVideo(true);
						}],
						[t("stickers"), () => {
							setAttach(false);
							setPickStickers(true);
						}],
						[t("location"), () => sendMessage(chatId, { text: "📍 Longueuil" })],
						[t("contact"), () => sendMessage(chatId, { text: "@maya" })]
					].map(([label, fn]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-16 rounded-xl bg-surface-2 text-[13px] font-medium",
						onClick: () => {
							fn();
							if (label !== t("photo") && label !== t("video") && label !== t("stickers")) setAttach(false);
						},
						children: label
					}, String(label)))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				open: pickPhoto,
				onClose: () => setPickPhoto(false),
				title: t("photo"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewOnceRow, {
					on: viewOnce,
					onChange: setViewOnce,
					label: t("viewOnce"),
					hint: t("viewOnceHint")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-[58vh] overflow-y-auto no-scrollbar",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMediaGrid, {
						kind: "image",
						onPick: sendMedia
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				open: pickVideo,
				onClose: () => setPickVideo(false),
				title: t("video"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewOnceRow, {
					on: viewOnce,
					onChange: setViewOnce,
					label: t("viewOnce"),
					hint: t("viewOnceHint")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-[58vh] overflow-y-auto no-scrollbar",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMediaGrid, {
						kind: "video",
						onPick: sendMedia
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				open: pickStickers,
				onClose: () => setPickStickers(false),
				title: t("stickerPack"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-3 flex gap-1 overflow-x-auto pb-0.5",
					children: trayTabs.map((tab) => {
						const on = stickerTab === tab.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: cn("h-9 shrink-0 rounded-xl px-3 text-[12px] font-semibold", on ? "bg-accent text-accent-fg" : "bg-navy/50 text-muted"),
							onClick: () => setStickerTab(tab.id),
							children: tab.label
						}, tab.id);
					})
				}), stickerTab === "recent" ? recentStickerIds.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-4 gap-1.5 pb-2",
					children: recentStickerIds.filter(isStickerId).map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "press flex aspect-square items-center justify-center rounded-2xl bg-navy/40",
						"aria-label": stickerLabel(id, lang),
						onClick: () => sendSticker(id, stickerLabel(id, lang)),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippSticker, {
							id,
							size: isEmojiSticker(id) ? 40 : 64
						})
					}, id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-2 py-8 text-center text-[13px] text-muted",
					children: t("stickerRecentEmpty")
				}) : stickerTab === "emoji" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-2 flex gap-1 overflow-x-auto",
					children: EMOJI_CATS.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-[18px]", emojiCat === cat.id ? "bg-accent/20" : "bg-navy/40"),
						"aria-label": lang === "fr" ? cat.labelFr : cat.labelEn,
						onClick: () => setEmojiCat(cat.id),
						children: cat.icon
					}, cat.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid max-h-[46vh] grid-cols-6 gap-0.5 overflow-y-auto pb-2",
					children: emojiSet.emojis.map((emoji) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "press flex aspect-square items-center justify-center rounded-xl text-[26px] leading-none",
						"aria-label": emoji,
						onClick: () => sendSticker(stickerIdFromEmoji(emoji), emoji),
						children: emoji
					}, emoji))
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-4 gap-1.5 pb-2",
					children: stickersInPack(stickerTab).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "press flex aspect-square items-center justify-center rounded-2xl bg-navy/40",
						"aria-label": lang === "fr" ? s.labelFr : s.labelEn,
						onClick: () => sendSticker(s.id, lang === "fr" ? s.labelFr : s.labelEn),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippSticker, {
							id: s.id,
							size: 64
						})
					}, s.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 pb-1 text-center text-[12px] text-muted",
					children: t("stickerSameVibe")
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: menu,
				onClose: () => {
					setMenu(false);
					setDisappearOpen(false);
				},
				title: disappearOpen ? t("disappearing") : title,
				children: disappearOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-1",
					children: [[
						[0, t("disappearingOff")],
						[DISAPPEAR_24H, t("disappearing24h")],
						[DISAPPEAR_7D, t("disappearing7d")]
					].map(([ms, label]) => {
						const on = (chat.disappearAfterMs ?? 0) === ms;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center justify-between rounded-lg px-2 text-[15px]",
							onClick: () => {
								setDisappear(chatId, ms);
								setDisappearOpen(false);
								setMenu(false);
							},
							children: [label, on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-accent" }) : null]
						}, label);
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-2 pt-2 text-[12px] leading-relaxed text-muted",
						children: t("disappearingHint")
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								setMenu(false);
								push({
									name: "e2e-info",
									chatId
								});
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }),
								" ",
								t("e2e")
							]
						}),
						!ephemeral && !sealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => setDisappearOpen(true),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "size-4" }),
								" ",
								t("disappearing"),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto text-[12px] text-muted",
									children: chat.disappearAfterMs ? chat.disappearAfterMs >= 6048e5 ? t("disappearing7d") : t("disappearing24h") : t("disappearingOff")
								})
							]
						}) : null,
						chat.type === "group" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								setMenu(false);
								push({
									name: "group-info",
									chatId
								});
							},
							children: t("groupInfo")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								setMenu(false);
								push({
									name: "group-qr",
									chatId
								});
							},
							children: t("groupQr")
						})] }) : peerId && !ephemeral && !sealed && !shop ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								setMenu(false);
								push({
									name: "introduce",
									toUserId: peerId
								});
							},
							children: t("introduce")
						}) : ephemeral ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2",
							onClick: () => {
								setMenu(false);
								keepContact(chatId);
							},
							children: t("revealWgo")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-12 items-center gap-3 rounded-lg px-2 text-danger",
							onClick: () => {
								setMenu(false);
								sealChat(chatId);
							},
							children: t("simulateExpire")
						})] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafetyRow, {
							onReport: () => {
								setMenu(false);
								setReportOpen(true);
							},
							onBlock: peerId ? () => {
								setMenu(false);
								setBlockOpen(true);
							} : void 0
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: chat.type === "group" ? "group" : "user",
				targetId: chat.type === "group" ? chatId : peerId ?? chatId,
				blockUserId: peerId
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: Boolean(reportMsgId),
				onClose: () => setReportMsgId(null),
				kind: "message",
				targetId: reportMsgId ?? chatId,
				blockUserId: peerId
			}),
			peerId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockSheet, {
				open: blockOpen,
				onClose: () => setBlockOpen(false),
				userId: peerId,
				onBlocked: pop
			}) : null,
			viewer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-40 flex flex-col bg-ink text-paper",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-3 pt-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] font-medium text-paper/70",
						children: t("viewOnce")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "press rounded-full px-3 py-2 text-[14px] font-semibold",
						onClick: closeViewer,
						children: t("done")
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-1 items-center justify-center p-4",
					children: viewer.type === "video" && viewer.videoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						src: viewer.videoUrl,
						controls: true,
						autoPlay: true,
						playsInline: true,
						className: "max-h-full w-full rounded-xl bg-black"
					}) : viewer.imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
						src: viewer.imageUrl,
						alt: "",
						className: "max-h-full w-full rounded-xl object-contain"
					}) : null
				})]
			}) : null
		]
	});
}
function ReceiptMark({ status }) {
	const t = useT();
	const receiptsOn = useWgoStore((s) => s.privacy.readReceipts !== false);
	const shown = status === "read" && !receiptsOn ? "delivered" : status;
	const label = shown === "sending" ? t("receiptSending") : shown === "sent" ? t("receiptSent") : shown === "delivered" ? t("receiptDelivered") : shown === "failed" ? t("receiptFailed") : t("receiptRead");
	if (shown === "failed") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "receipt-fail",
		role: "img",
		"aria-label": label,
		children: "!"
	});
	const pair = shown === "delivered" || shown === "read";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("receipt", `is-${shown}`),
		role: "img",
		"aria-label": label,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
			shown === "read" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}) : null,
			pair ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}) : null
		]
	});
}
function ViewOnceRow({ on, onChange, label, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: "mb-3 flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-left",
		onClick: () => onChange(!on),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", on ? "bg-accent text-accent-fg" : "bg-navy text-muted"),
				children: "1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[14px] font-semibold",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[12px] leading-snug text-muted",
					children: hint
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-2.5 shrink-0 rounded-full", on ? "bg-accent" : "bg-hair") })
		]
	});
}
function MeScreen() {
	const t = useT();
	const me = useWgoStore((s) => s.me);
	const push = useWgoStore((s) => s.push);
	const theme = useWgoStore((s) => s.theme);
	const language = useWgoStore((s) => s.language);
	const changeAvatar = useWgoStore((s) => s.changeAvatar);
	const users = useWgoStore((s) => s.users);
	const chats = useWgoStore((s) => s.chats);
	const listings = useWgoStore((s) => s.listings);
	const lifestyle = useWgoStore((s) => s.lifestyle);
	const [pick, setPick] = (0, import_react.useState)(false);
	const [hint, setHint] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!hint) return;
		const id = window.setTimeout(() => setHint(false), 2400);
		return () => window.clearTimeout(id);
	}, [hint]);
	const contacts = Object.values(users).filter((u) => u.connected).length;
	const groups = chats.filter((c) => c.type === "group" && c.participantIds.includes("me")).length;
	const myEvents = lifestyle.filter((e) => e.hostId === "me").length;
	const myListings = listings.filter((l) => l.sellerId === "me").length;
	const themeLabel = theme === "light" ? t("themeLight") : theme === "dark" ? t("themeDark") : t("themeSystem");
	const country = me.country === "CA" ? "Canada" : me.country;
	async function shareProfile() {
		const link = `https://${APP_HOST}/${me.username}`;
		try {
			if (navigator.share) await navigator.share({
				title: "Wipp",
				text: `@${me.username}`,
				url: link
			});
			else {
				await navigator.clipboard.writeText(link);
				setHint(true);
			}
		} catch {
			await navigator.clipboard.writeText(link);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sticky top-0 z-10 bg-bg/80 backdrop-blur-md",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center px-4 pb-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippWordmark, { className: "text-[26px] text-fg" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-11 items-center justify-center",
							"aria-label": t("myQr"),
							onClick: () => push({ name: "my-qr" }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-11 items-center justify-center",
							"aria-label": t("appearance"),
							onClick: () => push({ name: "appearance" }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-5" })
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-28",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4 pt-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "wipp-card relative overflow-hidden rounded-2xl px-3.5 pt-3.5 pb-3 text-paper",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-script pointer-events-none absolute top-3 right-3 max-w-[8ch] text-right text-[22px] leading-[0.95] text-accent",
									children: [t("goodVibes"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "ml-0.5 inline size-3 fill-accent text-accent" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "relative shrink-0",
										onClick: () => setPick(true),
										"aria-label": t("changePhoto"),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block rounded-full ring-2 ring-accent ring-offset-2 ring-offset-navy",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
												user: me,
												size: 72
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_2px_8px_rgb(0_0_0/0.35)]",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-3.5" })
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1 pr-[4.5rem] pt-0.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
													className: "truncate text-[18px] font-semibold",
													children: me.displayName
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "size-4 shrink-0 fill-accent text-navy" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[12px] text-paper/55",
												children: ["@", me.username]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 flex items-center gap-1 text-[11px] text-paper/70",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "size-3 shrink-0 text-accent" }),
													me.city,
													", ",
													country
												]
											})
										]
									})]
								}),
								me.bio ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2.5 text-[12px] leading-snug text-paper/80",
									children: me.bio
								}) : null,
								hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 rounded-full bg-accent px-3 py-1 text-center text-[11px] font-medium text-accent-fg",
									children: t("photoPublished")
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3 grid grid-cols-4 divide-x divide-paper/10",
									children: [
										[
											contacts,
											t("statContacts"),
											() => push({ name: "new-chat" })
										],
										[
											groups,
											t("statGroups"),
											() => push({ name: "my-groups" })
										],
										[
											myEvents,
											t("statEvents"),
											() => push({
												name: "my-activity",
												kind: "events"
											})
										],
										[
											myListings,
											t("statListings"),
											() => push({
												name: "my-activity",
												kind: "listings"
											})
										]
									].map(([n, label, go]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "px-1 py-1 text-center",
										onClick: go,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-[16px] font-semibold tabular-nums",
											children: n
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-[10px] text-paper/50",
											children: label
										})]
									}, String(label)))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 grid grid-cols-3 gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "flex h-10 items-center justify-center gap-1.5 rounded-full border border-paper/20 text-[11px] font-medium",
											onClick: () => push({ name: "account" }),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-3.5" }), t("editProfile")]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "flex h-10 items-center justify-center gap-1.5 rounded-full border border-paper/20 text-[11px] font-medium",
											onClick: () => push({ name: "my-qr" }),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "size-3.5" }), t("myQr")]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-[11px] font-semibold text-accent-fg",
											onClick: () => void shareProfile(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-3.5" }), t("share")]
										})
									]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 px-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex items-end justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-[13px] font-medium text-muted",
								children: t("myActivity")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "text-[12px] font-medium text-accent",
								onClick: () => push({
									name: "my-activity",
									kind: "listings"
								}),
								children: [t("seeAll"), " ›"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-4 gap-2",
							children: [
								{
									icon: Tag,
									color: "text-accent",
									title: t("myCard"),
									sub: t("myCardSub"),
									go: () => push({ name: "my-qr" })
								},
								{
									icon: Megaphone,
									color: "text-tile-info",
									title: t("myListings"),
									sub: t("myListingsSub"),
									go: () => push({
										name: "my-activity",
										kind: "listings"
									})
								},
								{
									icon: CalendarDays,
									color: "text-tile-event",
									title: t("myEvents"),
									sub: t("myEventsSub"),
									go: () => push({
										name: "my-activity",
										kind: "events"
									})
								},
								{
									icon: Bookmark,
									color: "text-tile-save",
									title: t("saved"),
									sub: t("savedSub"),
									go: () => push({
										name: "my-activity",
										kind: "saved"
									})
								}
							].map((tile) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: tile.go,
								className: "press flex min-h-[118px] flex-col rounded-2xl bg-navy/80 px-2 py-2.5 text-left ring-1 ring-hair",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(tile.icon, { className: cn("size-5", tile.color) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-auto text-[11px] font-semibold leading-tight",
										children: tile.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "mt-0.5 flex items-center gap-0.5 text-[9px] leading-snug text-muted",
										children: [tile.sub, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-2.5 shrink-0" })]
									})
								]
							}, tile.title))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: t("myWipp"),
							caps: false,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-4" }),
									label: t("account"),
									onClick: () => push({ name: "account" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4" }),
									label: t("privacy"),
									onClick: () => push({ name: "privacy" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }),
									label: t("security"),
									onClick: () => push({ name: "security" })
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: t("preferences"),
							caps: false,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "size-4" }),
									label: t("notifications"),
									onClick: () => push({ name: "notifications" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-4" }),
									label: t("appearance"),
									value: themeLabel,
									onClick: () => push({ name: "appearance" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "size-4" }),
									label: t("accessibility"),
									onClick: () => push({ name: "accessibility" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "size-4" }),
									label: t("language"),
									value: language === "fr" ? t("french") : t("english"),
									onClick: () => push({ name: "appearance" })
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: t("devicesHelp"),
							caps: false,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "size-4" }),
									label: t("devices"),
									value: "1",
									onClick: () => push({ name: "security" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleHelp, { className: "size-4" }),
									label: t("help"),
									onClick: () => push({ name: "help" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-4" }),
									label: t("termsOfUse"),
									onClick: () => push({
										name: "legal",
										doc: "terms"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4" }),
									label: t("privacyPolicy"),
									onClick: () => push({
										name: "legal",
										doc: "privacy"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "size-4" }),
									label: t("invite"),
									trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg",
											children: t("inviteReward")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4 text-muted" })]
									}),
									onClick: () => push({ name: "my-qr" })
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-4 mt-4 mb-2 flex items-center gap-3 rounded-2xl bg-navy/80 px-4 py-3 ring-1 ring-hair",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippWordmark, { className: "text-[18px] text-fg" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-6 w-px bg-hair" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-script flex-1 text-[18px] text-muted",
								children: t("footerTagline")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] text-muted",
								children: t("appVersion")
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 mb-8 px-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
							variant: "ghost",
							className: "w-full text-danger",
							onClick: () => {
								if (window.confirm(t("signOutConfirm"))) useWgoStore.getState().signOut();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" }), t("signOut")]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GallerySheet, {
				open: pick,
				onClose: () => setPick(false),
				title: t("changePhoto"),
				onPick: (url) => {
					changeAvatar(url);
					setHint(true);
				}
			})
		]
	});
}
function AccountScreen() {
	const t = useT();
	const me = useWgoStore((s) => s.me);
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const updateMe = useWgoStore((s) => s.updateMe);
	const resetDemo = useWgoStore((s) => s.resetDemo);
	const changeAvatar = useWgoStore((s) => s.changeAvatar);
	const [pick, setPick] = (0, import_react.useState)(false);
	const [hint, setHint] = (0, import_react.useState)(false);
	const [displayName, setDisplayName] = (0, import_react.useState)(me.displayName);
	const [username, setUsername] = (0, import_react.useState)(me.username);
	const [bio, setBio] = (0, import_react.useState)(me.bio);
	const [city, setCity] = (0, import_react.useState)(me.city);
	const taken = TAKEN_USERNAMES.has(username.toLowerCase()) && username.toLowerCase() !== me.username;
	(0, import_react.useEffect)(() => {
		if (!hint) return;
		const id = window.setTimeout(() => setHint(false), 2400);
		return () => window.clearTimeout(id);
	}, [hint]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("editProfile"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-4 pb-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "mx-auto mt-2 mb-5 flex flex-col items-center",
						onClick: () => setPick(true),
						"aria-label": t("changePhoto"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: {
									...me,
									avatar: me.avatar
								},
								size: 88
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-4" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-2 text-[13px] font-medium text-accent",
							children: t("changePhoto")
						})]
					}),
					hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-center text-[13px] text-muted",
						children: t("photoPublished")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("displayName"),
								value: displayName,
								onChange: (e) => setDisplayName(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("username"),
								value: username,
								onChange: (e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 20))
							}),
							taken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[12px] text-danger",
								children: t("usernameTaken")
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1.5 block text-[12px] font-medium text-muted",
									children: t("bio")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 3,
									value: bio,
									onChange: (e) => setBio(e.target.value.slice(0, 140)),
									className: "w-full rounded-md bg-surface-2 px-4 py-3 text-[15px] text-fg outline-none shadow-[var(--shadow-hairline)]"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: t("city") ?? "Ville",
								value: city,
								onChange: (e) => setCity(e.target.value)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-5 w-full",
						disabled: taken || !displayName.trim() || username.length < 3,
						onClick: () => {
							updateMe({
								displayName: displayName.trim(),
								username: username.toLowerCase(),
								bio: bio.trim(),
								city: city.trim() || me.city
							});
							pop();
						},
						children: t("save")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("phone"),
							value: `${me.phone} · ${t("youOnly")}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("email"),
							value: me.email || "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("blockedList"),
							onClick: () => push({ name: "blocked" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("downloadData"),
							onClick: downloadMyData
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "ghost",
						className: "mt-6 w-full text-danger",
						onClick: () => push({ name: "delete-account" }),
						children: t("deleteAccount")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "ghost",
						className: "mt-2 w-full text-muted",
						onClick: resetDemo,
						children: t("resetDemo")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GallerySheet, {
				open: pick,
				onClose: () => setPick(false),
				title: t("changePhoto"),
				onPick: (url) => {
					changeAvatar(url);
					setHint(true);
				}
			})
		]
	});
}
var PRIVACY_ROWS = [
	{
		key: "photo",
		label: "whoPhoto"
	},
	{
		key: "bio",
		label: "whoBio"
	},
	{
		key: "lastSeen",
		label: "whoLast"
	},
	{
		key: "online",
		label: "whoOnline"
	},
	{
		key: "calls",
		label: "whoCall"
	},
	{
		key: "requests",
		label: "whoRequest"
	},
	{
		key: "groups",
		label: "whoGroup"
	},
	{
		key: "stories",
		label: "whoStories"
	},
	{
		key: "findByPhone",
		label: "whoPhone"
	},
	{
		key: "findByUsername",
		label: "whoUser"
	}
];
function PrivacyScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const privacy = useWgoStore((s) => s.privacy);
	const setPrivacy = useWgoStore((s) => s.setPrivacy);
	const setReadReceipts = useWgoStore((s) => s.setReadReceipts);
	const setEphemeralCalls = useWgoStore((s) => s.setEphemeralCalls);
	const [open, setOpen] = (0, import_react.useState)(null);
	const labelFor = (v) => v === "everyone" ? t("everyone") : v === "contacts" ? t("contacts") : t("nobody");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("privacy"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: PRIVACY_ROWS.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: t(row.label),
						value: labelFor(privacy[row.key]),
						onClick: () => setOpen(row.key)
					}, row.key)) }),
					open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 px-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
							title: t(PRIVACY_ROWS.find((r) => r.key === open).label),
							children: [
								"everyone",
								"contacts",
								"nobody"
							].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]",
								onClick: () => {
									setPrivacy(open, v);
									setOpen(null);
								},
								children: [labelFor(v), privacy[open] === v ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-accent" }) : null]
							}, v))
						})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
								title: t("privacy"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: t("readReceipts"),
									trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
										checked: privacy.readReceipts !== false,
										onChange: setReadReceipts
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: t("ephemeralCalls"),
									trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
										checked: privacy.ephemeralCalls === true,
										onChange: setEphemeralCalls
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-6 pt-3 text-[13px] leading-relaxed text-muted",
								children: t("readReceiptsHint")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-6 pt-2 text-[13px] leading-relaxed text-muted",
								children: t("ephemeralCallsHint")
							})
						]
					})
				]
			})
		]
	});
}
function SecurityScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const myFingerprint = useWgoStore((s) => s.myFingerprint);
	const showCiphertext = useWgoStore((s) => s.showCiphertext);
	const setShowCiphertext = useWgoStore((s) => s.setShowCiphertext);
	const rotateIdentity = useWgoStore((s) => s.rotateIdentity);
	const verifiedIds = useWgoStore((s) => s.verifiedIds);
	const users = useWgoStore((s) => s.users);
	const chats = useWgoStore((s) => s.chats);
	const keyRotatedAt = useWgoStore((s) => s.keyRotatedAt);
	const biometricsOn = useWgoStore((s) => s.biometricsOn);
	const setBiometrics = useWgoStore((s) => s.setBiometrics);
	const lockApp = useWgoStore((s) => s.lockApp);
	const [confirm, setConfirm] = (0, import_react.useState)(false);
	const verified = verifiedIds.map((id) => users[id]).filter(Boolean);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("security"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
						title: t("e2e"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }),
								label: t("e2eOn"),
								value: t("e2eAlways")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: t("e2eAlg") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: t("e2eIdentity"),
								value: myFingerprint ? shortFp(myFingerprint) : "…",
								onClick: () => {
									if (myFingerprint) navigator.clipboard.writeText(myFingerprint);
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: t("e2eShowCipher"),
								trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									checked: showCiphertext,
									onChange: setShowCiphertext
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 py-3 text-[13px] leading-relaxed text-muted",
						children: t("e2eShowCipherHint")
					}),
					keyRotatedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 pb-3 text-[13px] leading-relaxed text-danger",
						children: t("e2eKeyChanged")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: t("e2eContacts"),
						children: verified.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-4 py-3 text-[14px] text-muted",
							children: t("e2eNoVerified")
						}) : verified.map((u) => {
							const chat = chats.find((c) => c.type === "dm" && c.participantIds.includes(u.id) && !c.ephemeral);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "size-4" }),
								label: u.displayName,
								value: `@${u.username}`,
								onClick: () => chat && push({
									name: "e2e-info",
									chatId: chat.id
								})
							}, u.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: t("e2eRotate"),
						danger: true,
						onClick: () => setConfirm(true)
					}) }),
					confirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-4 pt-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-1 text-[13px] leading-relaxed text-muted",
								children: t("e2eRotateBody")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "danger",
								className: "mt-3 w-full",
								onClick: () => {
									rotateIdentity();
									setConfirm(false);
								},
								children: t("e2eRotateConfirm")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								variant: "ghost",
								className: "mt-1 w-full",
								onClick: () => setConfirm(false),
								children: t("cancel")
							})
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("pinCode"),
							value: "••••"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("biometrics"),
							trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: biometricsOn,
								onChange: setBiometrics
							})
						}),
						biometricsOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("testLock"),
							onClick: () => lockApp()
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("twoFa"),
							value: "On"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("sessions"),
							value: "1"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: t("ephemeral"),
							value: t("ephemeralPerChat")
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 pt-3 text-[13px] leading-relaxed text-muted",
						children: t("biometricsHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 pt-2 text-[13px] leading-relaxed text-muted",
						children: t("ephemeralPerChatHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 pt-4 text-[13px] leading-relaxed text-muted",
						children: t("e2eBody")
					})
				]
			})
		]
	});
}
function NotificationsScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const notifs = useWgoStore((s) => s.notifs);
	const setNotif = useWgoStore((s) => s.setNotif);
	const pushMaster = useWgoStore((s) => s.pushMaster);
	const pushGranted = useWgoStore((s) => s.pushGranted);
	const setPushMaster = useWgoStore((s) => s.setPushMaster);
	const setPushGranted = useWgoStore((s) => s.setPushGranted);
	const [denied, setDenied] = (0, import_react.useState)(false);
	const rows = [
		["messages", t("tabChats")],
		["requests", t("requests")],
		["calls", t("tabCalls")],
		["stories", t("stories")],
		["groups", t("createGroup")],
		["mentions", "@"],
		["reactions", t("react")],
		["security", t("security")]
	];
	async function toggleMaster(on) {
		if (!on) {
			setPushMaster(false);
			return;
		}
		if (typeof Notification === "undefined") {
			setPushGranted(true);
			setPushMaster(true);
			return;
		}
		const p = await Notification.requestPermission();
		const ok = p === "granted";
		setPushGranted(ok);
		setPushMaster(ok);
		setDenied(p === "denied");
		if (ok) try {
			new Notification("WIPP", { body: t("pushPreview") });
		} catch {}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("notifications"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: t("pushMaster"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: t("pushMaster"),
					value: pushMaster ? t("pushOn") : t("pushOff"),
					trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						checked: pushMaster,
						onChange: (v) => void toggleMaster(v)
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 pt-3 text-[13px] leading-relaxed text-muted",
				children: t("pushMasterHint")
			}),
			denied && !pushGranted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 pt-2 text-[13px] text-danger",
				children: t("pushDenied")
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: rows.map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label,
				trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
					checked: notifs[key],
					onChange: (v) => setNotif(key, v)
				})
			}, key)) })
		]
	});
}
function AppearanceScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const theme = useWgoStore((s) => s.theme);
	const language = useWgoStore((s) => s.language);
	const setTheme = useWgoStore((s) => s.setTheme);
	const setLanguage = useWgoStore((s) => s.setLanguage);
	const themes = [
		{
			id: "light",
			label: t("themeLight")
		},
		{
			id: "dark",
			label: t("themeDark")
		},
		{
			id: "system",
			label: t("themeSystem")
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("appearance"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: t("appearance"),
				children: themes.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]",
					onClick: () => {
						haptic("select");
						setTheme(x.id);
					},
					children: [x.label, theme === x.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-accent" }) : null]
				}, x.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: t("language"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]",
					onClick: () => {
						haptic("select");
						setLanguage("fr");
					},
					children: [t("french"), language === "fr" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-accent" }) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex min-h-[var(--touch-min)] w-full items-center justify-between px-4 py-3 text-[15px]",
					onClick: () => {
						haptic("select");
						setLanguage("en");
					},
					children: [t("english"), language === "en" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-accent" }) : null]
				})]
			})
		]
	});
}
function AccessibilityScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const a11y = useWgoStore((s) => s.a11y) ?? defaultA11y;
	const setA11y = useWgoStore((s) => s.setA11y);
	const [tested, setTested] = (0, import_react.useState)(false);
	function testHaptic() {
		if (!a11y.haptics) setA11y({ haptics: true });
		const ok = haptic("success");
		setTested(true);
		announce(ok ? t("hapticsTestDone") : t("hapticsUnavailable"));
		window.setTimeout(() => setTested(false), 2400);
	}
	const rows = [
		{
			key: "haptics",
			icon: Vibrate,
			label: "haptics",
			hint: "hapticsHint"
		},
		{
			key: "largeTouch",
			icon: Hand,
			label: "largeTouch",
			hint: "largeTouchHint"
		},
		{
			key: "largeText",
			icon: Type,
			label: "largeText",
			hint: "largeTextHint"
		},
		{
			key: "reduceMotion",
			icon: Sparkles,
			label: "reduceMotion",
			hint: "reduceMotionHint"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("accessibility"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-24",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-4 mb-4 overflow-hidden rounded-2xl bg-navy px-4 py-4 text-paper ring-1 ring-hair",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "size-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[15px] font-semibold",
								children: t("hapticLang")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[12px] leading-relaxed text-paper/65",
								children: t("accessibilityHint")
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 grid grid-cols-3 gap-2",
							children: [
								["hapticTap", "tap"],
								["hapticSend", "send"],
								["hapticConnect", "connect"]
							].map(([label, kind]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "press rounded-xl bg-paper/8 px-2 py-2.5 text-center ring-1 ring-paper/10",
								onClick: () => {
									if (!a11y.haptics) setA11y({ haptics: true });
									haptic(kind);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[10px] font-medium tracking-wide text-accent uppercase",
									children: kind === "tap" ? "·" : kind === "send" ? "··" : "···"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-[11px] font-medium",
									children: t(label)
								})]
							}, kind))
						})]
					}),
					rows.map((row) => {
						const Icon = row.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
								label: t(row.label),
								trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									checked: a11y[row.key],
									label: t(row.label),
									onChange: (v) => {
										setA11y({ [row.key]: v });
										if (row.key === "haptics" && v) window.setTimeout(() => haptic("success"), 0);
									}
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-4 pb-3 text-[12px] leading-relaxed text-muted",
								children: t(row.hint)
							})] })
						}, row.key);
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-4 pt-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "press flex h-12 min-h-[var(--touch-min)] w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-accent-fg",
							onClick: testHaptic,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Vibrate, { className: "size-4" }), t("hapticsTest")]
						}), tested ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-center text-[12px] text-muted",
							role: "status",
							children: t("hapticsTestDone")
						}) : null]
					})
				]
			})
		]
	});
}
function HelpScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("help"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Languages, { className: "mb-3 size-6 text-muted" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[15px] leading-relaxed",
						children: t("aboutWgo")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[13px] text-muted",
						children: APP_HOST
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-6 text-[13px] font-medium text-muted",
						children: t("communityRules")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[14px] leading-relaxed",
						children: t("communityRulesBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[14px] leading-relaxed text-muted",
						children: t("reportBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-6 text-[13px] font-medium text-muted",
						children: t("agePolicy")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[14px] leading-relaxed",
						children: t("agePolicyBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-6 text-[13px] font-medium text-muted",
						children: t("childSafety")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[14px] leading-relaxed",
						children: t("childSafetyBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[13px] text-muted",
						children: t("guidelinesContact")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-5 text-left text-[14px] font-medium text-accent",
						onClick: () => push({
							name: "legal",
							doc: "terms"
						}),
						children: t("termsOfUse")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-3 block text-left text-[14px] font-medium text-accent",
						onClick: () => push({
							name: "legal",
							doc: "privacy"
						}),
						children: t("privacyPolicy")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "mt-3 block text-[14px] font-medium text-accent",
						href: `mailto:${LEGAL_CONTACT}`,
						children: t("supportMail")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "mt-3 block text-[14px] font-medium text-accent",
						href: "/delete-account.html",
						target: "_blank",
						rel: "noreferrer",
						children: t("webDelete")
					})
				]
			})
		]
	});
}
function BlockedScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const users = useWgoStore((s) => s.users);
	const blockedIds = useWgoStore((s) => s.blockedIds);
	const unblockUser = useWgoStore((s) => s.unblockUser);
	const rows = blockedIds.map((id) => users[id]).filter(Boolean);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("blockedList"),
				onBack: pop
			}),
			rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 pt-8 text-center text-[14px] text-muted",
				children: t("blockedEmpty")
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar",
				children: rows.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 px-4 py-2.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							user: u,
							size: 44
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-[15px] font-medium",
								children: u.displayName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[13px] text-muted",
								children: ["@", u.username]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-[13px] font-medium text-accent",
							onClick: () => unblockUser(u.id),
							children: t("unblock")
						})
					]
				}, u.id))
			})
		]
	});
}
function DeleteAccountScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const deleteAccount = useWgoStore((s) => s.deleteAccount);
	const [word, setWord] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)(false);
	const need = t("deleteWord");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("deleteAccount"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-6 pt-2 pb-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[15px] leading-relaxed",
						children: t("deleteAccountBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[13px] text-muted",
						children: t("deleteAccountWarn")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						className: "mt-3",
						value: word,
						onChange: (e) => {
							setWord(e.target.value);
							setErr(false);
						}
					}),
					err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[13px] text-danger",
						children: t("deleteNeedWord")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "danger",
						className: "mt-6 w-full",
						onClick: () => {
							if (word.trim().toUpperCase() !== need) {
								setErr(true);
								return;
							}
							deleteAccount();
						},
						children: t("deleteAccountCta")
					})
				]
			})
		]
	});
}
function downloadMyData() {
	const s = useWgoStore.getState();
	const payload = {
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		profile: s.me,
		privacy: s.privacy,
		blockedIds: s.blockedIds,
		shops: s.shops.filter((x) => x.ownerId === "me"),
		listings: s.listings.filter((l) => l.sellerId === "me")
	};
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = "wipp-mes-donnees.json";
	a.click();
	window.setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function MyActivityScreen({ kind }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const listings = useWgoStore((s) => s.listings);
	const lifestyle = useWgoStore((s) => s.lifestyle);
	const savedListingIds = useWgoStore((s) => s.savedListingIds) ?? [];
	const savedEventIds = useWgoStore((s) => s.savedEventIds) ?? [];
	const title = kind === "listings" ? t("myListings") : kind === "events" ? t("myEvents") : t("saved");
	const listingRows = kind === "listings" ? listings.filter((l) => l.sellerId === "me") : kind === "saved" ? listings.filter((l) => savedListingIds.includes(l.id)) : [];
	const eventRows = kind === "events" ? lifestyle.filter((e) => e.hostId === "me") : kind === "saved" ? lifestyle.filter((e) => savedEventIds.includes(e.id)) : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title,
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-10",
				children: [
					listingRows.length === 0 && eventRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 pt-8 text-center text-[14px] text-muted",
						children: kind === "listings" ? t("noListings") : kind === "events" ? t("noEvents") : t("noSaved")
					}) : null,
					listingRows.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
						onClick: () => push({
							name: "listing",
							listingId: l.id
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: l.image,
							alt: "",
							className: "size-14 rounded-xl object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-medium",
								children: l.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-[13px] text-muted",
								children: [
									l.price,
									" · ",
									l.city
								]
							})]
						})]
					}, l.id)),
					eventRows.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
						onClick: () => push({
							name: "lifestyle",
							itemId: e.id
						}),
						children: [e.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
							src: e.image,
							alt: "",
							className: "size-14 rounded-xl object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-14 items-center justify-center rounded-xl bg-navy text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[15px] font-medium",
								children: e.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-[13px] text-muted",
								children: [
									e.when,
									" · ",
									e.place
								]
							})]
						})]
					}, e.id)),
					kind === "listings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4 pt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							className: "w-full",
							onClick: () => push({ name: "explore" }),
							children: t("hubListings")
						})
					}) : null,
					kind === "events" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4 pt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							className: "w-full",
							onClick: () => push({ name: "create-lifestyle" }),
							children: t("createLifestyle")
						})
					}) : null
				]
			})
		]
	});
}
var app_exports = /* @__PURE__ */ __exportAll({ WgoApp: () => WgoApp });
var loadCalls = () => import("./calls-DxT2jb87.mjs");
var loadExplore = () => import("./explore-BEa8QqBE.mjs");
var loadStories = () => import("./stories-Br147v1K.mjs");
var loadTrust = () => import("./trust-3reQ52ry.mjs");
var loadE2e = () => import("./e2e-DtPCF8nx.mjs");
var loadTouch = () => import("./touch-DwOP_-5n.mjs");
var CallsScreen = (0, import_react.lazy)(() => loadCalls().then((m) => ({ default: m.CallsScreen })));
var ActiveCallScreen = (0, import_react.lazy)(() => loadCalls().then((m) => ({ default: m.ActiveCallScreen })));
var CallLinkScreen = (0, import_react.lazy)(() => loadCalls().then((m) => ({ default: m.CallLinkScreen })));
var CallLayer = (0, import_react.lazy)(() => loadCalls().then((m) => ({ default: m.CallLayer })));
var ExploreScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.ExploreScreen })));
var ListingScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.ListingScreen })));
var PharmacyScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.PharmacyScreen })));
var ShopScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.ShopScreen })));
var CreateShopScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.CreateShopScreen })));
var LifestyleScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.LifestyleScreen })));
var CreateLifestyleScreen = (0, import_react.lazy)(() => loadExplore().then((m) => ({ default: m.CreateLifestyleScreen })));
var StoriesScreen = (0, import_react.lazy)(() => loadStories().then((m) => ({ default: m.StoriesScreen })));
var NewStoryScreen = (0, import_react.lazy)(() => loadStories().then((m) => ({ default: m.NewStoryScreen })));
var LiveCodeScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.LiveCodeScreen })));
var OneTimeQrScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.OneTimeQrScreen })));
var IntroduceScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.IntroduceScreen })));
var IntroDetailScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.IntroDetailScreen })));
var GroupQrScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.GroupQrScreen })));
var GroupInfoScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.GroupInfoScreen })));
var GroupInviteScreen = (0, import_react.lazy)(() => loadTrust().then((m) => ({ default: m.GroupInviteScreen })));
var E2eInfoScreen = (0, import_react.lazy)(() => loadE2e().then((m) => ({ default: m.E2eInfoScreen })));
var WgoTouchScreen = (0, import_react.lazy)(() => loadTouch().then((m) => ({ default: m.WgoTouchScreen })));
function prefetchTabs() {
	loadCalls();
	loadExplore();
	loadStories();
	loadTrust();
}
function layerKey(screen, index) {
	switch (screen.name) {
		case "conversation":
		case "group-qr":
		case "group-info":
		case "e2e-info": return `${screen.name}:${screen.chatId}:${index}`;
		case "group-invite": return `${screen.name}:${screen.token}:${index}`;
		case "found-profile":
		case "stories": return `${screen.name}:${screen.userId}:${index}`;
		case "active-call": return `${screen.name}:${screen.userId}:${screen.kind}:${screen.dir ?? "out"}:${index}`;
		case "listing": return `listing:${screen.listingId}`;
		case "pharmacy": return `pharmacy:${screen.pharmacyId}`;
		case "shop": return `shop:${screen.shopId}`;
		case "lifestyle": return `lifestyle:${screen.itemId}`;
		case "my-activity": return `activity:${screen.kind}:${index}`;
		case "introduce": return `introduce:${screen.toUserId}`;
		case "intro-detail": return `intro:${screen.introId}`;
		default: return `${screen.name}:${index}`;
	}
}
function ScreenFallback() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full bg-bg" });
}
function ScreenView({ screen }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScreenFallback, {}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScreenSwitch, { screen })
	});
}
function ScreenSwitch({ screen }) {
	switch (screen.name) {
		case "splash": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SplashScreen, {});
		case "onboarding": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OnboardingScreen, {});
		case "signup": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignupScreen, {});
		case "login": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginScreen, {});
		case "otp": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OtpScreen, {});
		case "setup": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetupScreen, {});
		case "chats": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatsScreen, {});
		case "conversation": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConversationScreen, { chatId: screen.chatId });
		case "new-chat": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewChatScreen, {});
		case "requests": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequestsScreen, {});
		case "calls": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallsScreen, {});
		case "active-call": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActiveCallScreen, {
			userId: screen.userId,
			kind: screen.kind,
			dir: screen.dir
		});
		case "call-link": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallLinkScreen, {});
		case "connect": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectScreen, {});
		case "my-qr": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MyQrScreen, {});
		case "scanner": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScannerScreen, {});
		case "search-user": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchUserScreen, {});
		case "nearby": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NearbyScreen, {});
		case "found-profile": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FoundProfileScreen, {
			userId: screen.userId,
			via: screen.via
		});
		case "explore": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExploreScreen, {});
		case "listing": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingScreen, { listingId: screen.listingId });
		case "me": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeScreen, {});
		case "my-activity": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MyActivityScreen, { kind: screen.kind });
		case "privacy": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrivacyScreen, {});
		case "account": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountScreen, {});
		case "security": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecurityScreen, {});
		case "notifications": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationsScreen, {});
		case "appearance": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearanceScreen, {});
		case "accessibility": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessibilityScreen, {});
		case "help": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpScreen, {});
		case "blocked": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockedScreen, {});
		case "delete-account": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeleteAccountScreen, {});
		case "legal": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalScreen, { doc: screen.doc });
		case "stories": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoriesScreen, { userId: screen.userId });
		case "global-search": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlobalSearchScreen, {});
		case "new-group": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewGroupScreen, {});
		case "my-groups": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MyGroupsScreen, {});
		case "new-story": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewStoryScreen, {});
		case "live-code": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveCodeScreen, {});
		case "one-time-qr": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OneTimeQrScreen, {});
		case "introduce": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroduceScreen, { toUserId: screen.toUserId });
		case "intro-detail": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroDetailScreen, { introId: screen.introId });
		case "group-qr": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupQrScreen, { chatId: screen.chatId });
		case "group-info": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupInfoScreen, { chatId: screen.chatId });
		case "group-invite": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupInviteScreen, { token: screen.token });
		case "wgo-touch": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WgoTouchScreen, {});
		case "pharmacy": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PharmacyScreen, { pharmacyId: screen.pharmacyId });
		case "shop": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopScreen, { shopId: screen.shopId });
		case "create-shop": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateShopScreen, {});
		case "lifestyle": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LifestyleScreen, { itemId: screen.itemId });
		case "create-lifestyle": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateLifestyleScreen, {});
		case "e2e-info": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(E2eInfoScreen, { chatId: screen.chatId });
		default: return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatsScreen, {});
	}
}
function PushLayer({ screen, index, exiting }) {
	const [entered, setEntered] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const id = window.requestAnimationFrame(() => setEntered(true));
		return () => window.cancelAnimationFrame(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("stack-layer", entered && !exiting && "is-in", exiting && "is-out"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScreenView, { screen })
	});
}
function NativeStack() {
	const stack = useWgoStore((s) => s.stack);
	const top = stack.at(-1) ?? { name: "splash" };
	const showTabs = isTabScreen(top.name);
	const root = stack[0] ?? { name: "splash" };
	const livePushed = stack.slice(1);
	const stackLen = stack.length;
	const [exitScreen, setExitScreen] = (0, import_react.useState)(null);
	const prevPushed = (0, import_react.useRef)(livePushed);
	(0, import_react.useEffect)(() => {
		const current = stack.slice(1);
		const prev = prevPushed.current;
		if (current.length < prev.length) {
			setExitScreen(prev[prev.length - 1] ?? null);
			const t = window.setTimeout(() => {
				setExitScreen(null);
				prevPushed.current = current;
			}, 320);
			return () => window.clearTimeout(t);
		}
		prevPushed.current = current;
		setExitScreen(null);
	}, [stack, stackLen]);
	const displayPushed = exitScreen ? [...livePushed, exitScreen] : livePushed;
	const pushedIn = livePushed.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full min-h-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "h-full overflow-hidden",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("stack-root", pushedIn && "is-pushed"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScreenView, { screen: root })
			}), displayPushed.map((screen, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PushLayer, {
				screen,
				index: i,
				exiting: Boolean(exitScreen) && i === displayPushed.length - 1
			}, layerKey(screen, i)))]
		}), showTabs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute inset-0 z-20",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBar, { active: top.name })
		}) : null]
	});
}
function WgoApp() {
	const liveCall = useWgoStore((s) => s.liveCall);
	(0, import_react.useEffect)(() => {
		const id = (window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 500)))(() => prefetchTabs());
		return () => {
			if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
			else window.clearTimeout(id);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full min-h-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeStack, {}),
			liveCall ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: null,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallLayer, {})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLockGate, {})
		]
	}) });
}
//#endregion
export { reducedMotion as A, IconBtn as C, announce as D, StatusBar as E, haptic as O, Header as S, Sheet as T, GroupAvatar as _, GallerySheet as a, Empty as b, WippWordmark as c, ReportSheet as d, SafetyRow as f, Avatar as g, SmartImg as h, qrPngBlob as i, hapticStop as k, BlockSheet as l, isFlagged as m, NoPhoneBadge as n, StoryMediaGrid as o, flaggedIds as p, QrCard as r, WippMark as s, app_exports as t, FlagBtn as u, Btn as v, SearchField as w, Field as x, Chip as y };

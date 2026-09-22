import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { H as shortFp, X as useWgoStore, Y as useT, j as formatSafety, y as cn } from "./boot-BFpP81oK.mjs";
import { S as Shield, Tt as BadgeCheck, Y as Lock, lt as Copy } from "../_libs/lucide-react.mjs";
import { E as StatusBar, S as Header, r as QrCard, v as Btn } from "./app-CnfuwP9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/e2e-DtPCF8nx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function E2eInfoScreen({ chatId }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
	const users = useWgoStore((s) => s.users);
	const me = useWgoStore((s) => s.me);
	const verifiedIds = useWgoStore((s) => s.verifiedIds);
	const myFingerprint = useWgoStore((s) => s.myFingerprint);
	const toggleVerified = useWgoStore((s) => s.toggleVerified);
	const safetyNumberFor = useWgoStore((s) => s.safetyNumberFor);
	const [safety, setSafety] = (0, import_react.useState)("");
	const [copied, setCopied] = (0, import_react.useState)(false);
	const peerId = chat?.type === "dm" ? chat.participantIds.find((id) => id !== "me") : void 0;
	const peer = peerId ? users[peerId] : void 0;
	const verified = Boolean(peerId && verifiedIds.includes(peerId));
	const groups = (0, import_react.useMemo)(() => (safety.match(/.{1,5}/g) ?? []).slice(0, 12), [safety]);
	(0, import_react.useEffect)(() => {
		let live = true;
		safetyNumberFor(chatId).then((value) => {
			if (live) setSafety(value);
		});
		return () => {
			live = false;
		};
	}, [
		chatId,
		safetyNumberFor,
		myFingerprint
	]);
	async function copy() {
		try {
			await navigator.clipboard.writeText(formatSafety(safety));
		} catch {}
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass sticky top-0 z-10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("e2eInfoTitle"),
				onBack: pop
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 overflow-y-auto no-scrollbar px-5 pb-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-16 items-center justify-center rounded-full bg-navy text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-7" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-4 max-w-[18ch] text-[22px] font-semibold tracking-tight",
							children: t("e2eOn")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 max-w-[34ch] text-[14px] leading-relaxed text-muted",
							children: t("e2eInfoBody")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-[12px] font-medium text-accent",
							children: t("e2eAlg")
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 rounded-2xl glass-card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[12px] font-medium tracking-wide text-muted uppercase",
							children: t("e2eSafety")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[13px] leading-relaxed text-muted",
							children: t("e2eSafetyHint")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 grid grid-cols-4 gap-x-2 gap-y-2 font-mono text-[13px] tabular-nums tracking-wide",
							children: groups.map((g, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-center text-fg",
								children: g
							}, i))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 flex justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-2xl bg-paper p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCard, {
									value: safety ? `wipp.me/e2e/${safety.slice(0, 24)}` : "wipp.me/e2e",
									size: 148,
									pad: 8
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
							variant: "secondary",
							className: "mt-4 w-full",
							onClick: () => void copy(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), copied ? t("copied") : t("e2eCompare")]
						}),
						peerId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							className: "mt-2 w-full",
							variant: verified ? "navy" : "primary",
							onClick: () => toggleVerified(peerId),
							children: verified ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "size-4" }), t("e2eUnverify")] }) : t("e2eVerify")
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 rounded-2xl glass-card p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px] font-medium tracking-wide text-muted uppercase",
						children: t("e2eHow")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-3 grid gap-3",
						children: [
							t("e2eHow1"),
							t("e2eHow2"),
							t("e2eHow3")
						].map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-3 text-[13px] leading-relaxed text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-accent",
								children: i + 1
							}), line]
						}, i))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 rounded-2xl glass-card px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[12px] text-muted",
							children: t("e2eIdentity")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-mono text-[13px] tabular-nums",
							children: shortFp(myFingerprint)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[12px] text-muted",
							children: chat?.type === "group" ? chat.name : peer?.displayName ?? me.displayName
						})
					]
				}),
				verified ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: cn("mt-4 flex items-center justify-center gap-1.5 text-[13px] text-accent"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-3.5" }), t("e2eVerified")]
				}) : null
			]
		})]
	});
}
//#endregion
export { E2eInfoScreen };

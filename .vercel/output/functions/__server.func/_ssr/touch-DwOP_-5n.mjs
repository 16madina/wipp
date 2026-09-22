import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { X as useWgoStore, Y as useT, d as NEARBY, y as cn } from "./boot-BFpP81oK.mjs";
import { A as QrCode, O as ScanLine, gt as Check } from "../_libs/lucide-react.mjs";
import { A as reducedMotion, D as announce, E as StatusBar, O as haptic, S as Header, c as WippWordmark, g as Avatar, s as WippMark, v as Btn } from "./app-CnfuwP9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/touch-DwOP_-5n.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CLOSE_M = 15;
var TOKEN_MS = 6e4;
function mintToken() {
	return `WIPP-TEMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
function playConnectChime() {
	try {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) return;
		const ctx = new Ctx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(784, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + .14);
		gain.gain.setValueAtTime(.04, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .28);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + .3);
		window.setTimeout(() => void ctx.close(), 400);
	} catch {}
}
function MiniPhone({ side, user, phase }) {
	const showPeer = side === "them" && phase !== "idle" && phase !== "failed";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("mini-phone", side === "me" ? "phone-me" : "phone-them"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mini-island" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mini-phone-screen",
			children: side === "me" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
				user,
				size: 40
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippWordmark, { className: "mt-2 text-[13px] text-paper" })] }) : showPeer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
				user,
				size: 40
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-[13px] font-semibold text-paper",
				children: user?.firstName
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "touch-radar",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
				]
			})
		})]
	});
}
function Lockup({ me, peer, done }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 items-center justify-center gap-3 px-4 py-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
					user: me,
					size: 56
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-[11px] font-semibold tracking-wide uppercase",
					children: me.firstName
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex size-12 items-center justify-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippMark, {
					size: done ? 36 : 44,
					invert: true
				}), done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						className: "size-3",
						strokeWidth: 3
					})
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center",
				children: [peer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
					user: peer,
					size: 56
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-14 rounded-full bg-paper/10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-[11px] font-semibold tracking-wide uppercase",
					children: peer?.firstName ?? "…"
				})]
			})
		]
	});
}
function WgoTouchScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const me = useWgoStore((s) => s.me);
	const users = useWgoStore((s) => s.users);
	const blocked = useWgoStore((s) => s.blockedIds);
	const allowed = useWgoStore((s) => s.touchAllowed);
	const setTouchAllowed = useWgoStore((s) => s.setTouchAllowed);
	const completeTouch = useWgoStore((s) => s.completeTouch);
	const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
	const nearby = (0, import_react.useMemo)(() => NEARBY.filter((n) => n.meters <= CLOSE_M && !blocked.includes(n.id) && users[n.id]).map((n) => ({
		...n,
		user: users[n.id]
	})).sort((a, b) => {
		const ac = a.user.connected ? 1 : 0;
		const bc = b.user.connected ? 1 : 0;
		if (ac !== bc) return ac - bc;
		return a.meters - b.meters;
	}), [blocked, users]);
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [hold, setHold] = (0, import_react.useState)(0);
	const [peerId, setPeerId] = (0, import_react.useState)(null);
	const tokenRef = (0, import_react.useRef)(mintToken());
	const tokenUntilRef = (0, import_react.useRef)(Date.now() + TOKEN_MS);
	const holding = (0, import_react.useRef)(false);
	const timers = (0, import_react.useRef)([]);
	const peer = peerId ? users[peerId] : nearby[0]?.user;
	(0, import_react.useEffect)(() => {
		return () => {
			holding.current = false;
			timers.current.forEach((id) => window.clearTimeout(id));
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (phase !== "idle" || !allowed) return;
		const id = window.setInterval(() => {
			if (Date.now() >= tokenUntilRef.current) {
				tokenRef.current = mintToken();
				tokenUntilRef.current = Date.now() + TOKEN_MS;
			}
		}, 1e3);
		return () => window.clearInterval(id);
	}, [phase, allowed]);
	function later(ms, fn) {
		const id = window.setTimeout(fn, ms);
		timers.current.push(id);
	}
	function remint() {
		tokenRef.current = mintToken();
		tokenUntilRef.current = Date.now() + TOKEN_MS;
	}
	function resetToIdle() {
		timers.current.forEach((id) => window.clearTimeout(id));
		timers.current = [];
		holding.current = false;
		setHold(0);
		setPeerId(null);
		remint();
		setPhase("idle");
	}
	function afterContact() {
		if (nearby.length === 0) {
			setPhase("failed");
			haptic("error");
			return;
		}
		if (nearby.length === 1) {
			setPeerId(nearby[0].id);
			setPhase("offer");
			return;
		}
		setPhase("pick");
	}
	function start() {
		if (phase !== "idle") return;
		if (!tokenRef.current || Date.now() >= tokenUntilRef.current) remint();
		holding.current = false;
		setHold(1);
		haptic("hold");
		if (reducedMotion()) {
			afterContact();
			return;
		}
		setPhase("reaching");
		later(720, () => {
			setPhase("contact");
			haptic("connect");
		});
		later(1280, afterContact);
	}
	function onPointerDown() {
		if (phase !== "idle") return;
		holding.current = true;
		const t0 = Date.now();
		const tick = () => {
			if (!holding.current) return;
			const p = Math.min(1, (Date.now() - t0) / 700);
			setHold(p);
			if (p >= 1) start();
			else requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}
	function onPointerUp() {
		if (phase !== "idle") return;
		holding.current = false;
		setHold(0);
	}
	function acceptPeer(id) {
		setPeerId(id);
		setPhase("waiting");
		later(1100, () => {
			completeTouch(id);
			remint();
			setPhase("connected");
			haptic("success");
			playConnectChime();
			announce(t("touchConnected"));
		});
	}
	const detecting = phase === "idle" || phase === "reaching" || phase === "contact";
	const animPhase = detecting ? phase : phase === "failed" ? "idle" : "reveal";
	if (!allowed) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("wgoTouch"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center justify-center px-8 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippMark, {
						size: 72,
						invert: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-6 max-w-[18ch] text-[22px] font-semibold leading-tight",
						children: t("touchPermTitle")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-[34ch] text-[14px] leading-relaxed text-paper/65",
						children: t("touchPermBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-8 w-full",
						onClick: () => setTouchAllowed(true),
						children: t("touchAllow")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "ghost",
						className: "mt-2 w-full text-paper",
						onClick: pop,
						children: t("later")
					})
				]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "isolate flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("wgoTouch"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "touch-glow",
						"data-phase": animPhase
					}),
					detecting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "touch-stage",
						"data-phase": animPhase,
						"aria-label": t("touchHold"),
						onPointerDown,
						onPointerUp,
						onPointerLeave: onPointerUp,
						onPointerCancel: onPointerUp,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniPhone, {
								side: "me",
								user: me,
								phase
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "touch-spark",
								"aria-hidden": true,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "touch-flash" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									viewBox: "0 0 64 64",
									className: "touch-mark",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											className: "dot-l",
											cx: "20",
											cy: "32",
											r: "5.5",
											fill: "#F7F9FC"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											className: "dot-r",
											cx: "44",
											cy: "32",
											r: "5.5",
											fill: "#FFD84D"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
											className: "smile",
											d: "M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8",
											stroke: "#F7F9FC",
											strokeWidth: "2.6",
											strokeLinecap: "round",
											fill: "none"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniPhone, {
								side: "them",
								user: peer,
								phase
							}),
							phase === "idle" && hold > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "touch-hold-ring",
								style: { background: `conic-gradient(var(--color-accent) ${hold * 360}deg, transparent 0)` }
							}) : null
						]
					}) : phase === "pick" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-8 pt-4 text-center text-[14px] leading-relaxed text-paper/70",
						children: t("touchPick")
					}) : phase === "offer" || phase === "waiting" || phase === "connected" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lockup, {
						me,
						peer,
						done: phase === "connected"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center px-4 py-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WippMark, {
							size: 64,
							invert: true
						})
					}),
					detecting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: cn("px-8 text-center text-[14px] leading-relaxed text-paper/60", phase === "contact" && "text-accent"),
						children: phase === "idle" ? t("touchHint") : phase === "reaching" ? t("touchSearching") : t("touchContact")
					}), phase === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 px-8 text-center text-[11px] text-paper/40",
						children: t("touchVisible")
					}) : null] }) : null,
					phase === "pick" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 px-4",
						children: nearby.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "press mb-2 flex w-full items-center gap-3 rounded-2xl bg-paper/8 px-3 py-3 text-left ring-1 ring-paper/10",
							onClick: () => {
								setPeerId(n.id);
								setPhase("offer");
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									user: n.user,
									size: 48
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-[16px] font-semibold",
										children: n.user.displayName
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[12px] text-paper/55",
										children: ["@", n.user.username]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[12px] tabular-nums text-accent",
									children: [n.meters, "\xA0m"]
								})
							]
						}, n.id))
					}) : null,
					phase === "offer" && peer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 mx-4 mt-1 rounded-2xl bg-paper/8 px-5 py-5 text-center ring-1 ring-accent/30 rise",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[12px] font-medium tracking-[0.14em] text-accent uppercase",
								children: t("touchDetected")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: peer,
								size: 72,
								className: "mx-auto mt-3"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-[20px] font-semibold",
								children: peer.displayName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[14px] text-paper/55",
								children: ["@", peer.username]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-[13px] leading-snug text-paper/75",
								children: [
									peer.firstName,
									" ",
									t("touchWantsShare")
								]
							})
						]
					}) : null,
					phase === "waiting" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-8 pt-2 text-center text-[14px] leading-relaxed text-paper/60",
						children: t("touchWaiting")
					}) : null,
					phase === "connected" && peer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 mx-4 mt-1 rounded-2xl bg-paper/8 px-5 py-5 text-center ring-1 ring-accent/35 rise",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
									className: "size-5",
									strokeWidth: 3
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-[22px] font-semibold",
								children: t("touchConnected")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-[14px] leading-relaxed text-paper/70",
								children: [
									peer.displayName,
									" ",
									t("touchAdded")
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[12px] text-paper/45",
								children: t("touchBothOk")
							})
						]
					}) : null,
					phase === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-8 text-center text-[15px] leading-relaxed text-paper/70",
						children: t("touchFail")
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 shrink-0 px-5 pb-8 pt-3",
				children: [
					phase === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "w-full",
						onClick: start,
						children: t("touchCta")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
							variant: "secondary",
							className: "text-paper",
							onClick: () => push({ name: "scanner" }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanLine, { className: "size-4" }), t("touchScanQr")]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
							variant: "secondary",
							className: "text-paper",
							onClick: () => push({ name: "my-qr" }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "size-4" }), t("touchShowQr")]
						})]
					})] }) : null,
					phase === "offer" && peerId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							className: "text-paper",
							onClick: resetToIdle,
							children: t("touchRefuse")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							onClick: () => acceptPeer(peerId),
							children: t("accept")
						})]
					}) : null,
					phase === "waiting" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "h-12 text-center text-[13px] leading-[48px] text-paper/50",
						children: t("touchWaiting")
					}) : null,
					phase === "connected" && peerId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							className: "text-paper",
							onClick: () => push({
								name: "found-profile",
								userId: peerId,
								via: "touch"
							}),
							children: t("viewProfile")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							onClick: () => openOrCreateDm(peerId),
							children: t("write")
						})]
					}) : null,
					phase === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							className: "text-paper",
							onClick: () => push({ name: "scanner" }),
							children: t("touchScanQr")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							onClick: () => push({ name: "my-qr" }),
							children: t("touchShowQr")
						})]
					}) : null,
					phase === "pick" || phase === "reaching" || phase === "contact" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-1 h-11 w-full text-[13px] text-paper/45",
						onClick: resetToIdle,
						children: t("cancel")
					}) : null
				]
			})
		]
	});
}
//#endregion
export { WgoTouchScreen };

import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as formatChatTime, P as isChatSealed, T as formatDuration, X as useWgoStore, Y as useT, y as cn } from "./boot-BFpP81oK.mjs";
import { F as PhoneOff, I as PhoneMissed, L as PhoneIncoming, N as Phone, P as PhoneOutgoing, U as Mic, W as MicOff, Y as Lock, a as Video, g as SwitchCamera, ht as ChevronDown, i as Volume2, m as Timer, o as VideoOff } from "../_libs/lucide-react.mjs";
import { C as IconBtn, E as StatusBar, O as haptic, S as Header, T as Sheet, b as Empty, d as ReportSheet, f as SafetyRow, g as Avatar, k as hapticStop, l as BlockSheet, r as QrCard, v as Btn, y as Chip } from "./app-CnfuwP9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/calls-DxT2jb87.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function groupCallLogs(calls) {
	const groups = [];
	for (const c of calls) {
		const head = groups[groups.length - 1]?.items[0];
		if (head && head.userId === c.userId && head.kind === c.kind && head.direction === c.direction && head.missed === c.missed) groups[groups.length - 1].items.push(c);
		else groups.push({ items: [c] });
	}
	return groups;
}
function callPipSrc(avatar) {
	const m = avatar?.match(/\/avatars\/([^/.]+)\.\w+$/);
	return m ? `/calls/${m[1]}.mp4` : "";
}
async function enterOsPip(video) {
	if (!video) return false;
	const v = video;
	v.disablePictureInPicture = false;
	if ("autoPictureInPicture" in v) v.autoPictureInPicture = true;
	try {
		if (video.paused) await video.play();
	} catch {}
	try {
		if (document.pictureInPictureElement !== video && document.pictureInPictureEnabled) await video.requestPictureInPicture();
	} catch {}
	try {
		if (v.webkitPresentationMode !== "picture-in-picture") v.webkitSetPresentationMode?.("picture-in-picture");
	} catch {}
	return document.pictureInPictureElement === video || v.webkitPresentationMode === "picture-in-picture";
}
async function leaveOsPip(video) {
	try {
		if (document.pictureInPictureElement) await document.exitPictureInPicture();
	} catch {}
	const v = video;
	try {
		v?.webkitSetPresentationMode?.("inline");
	} catch {}
}
function CallsScreen() {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const calls = useWgoStore((s) => s.calls);
	const users = useWgoStore((s) => s.users);
	const push = useWgoStore((s) => s.push);
	const startCall = useWgoStore((s) => s.startCall);
	const live = useWgoStore((s) => s.liveCall);
	const expandCall = useWgoStore((s) => s.expandCall);
	const deleteCalls = useWgoStore((s) => s.deleteCalls);
	const markCallsSeen = useWgoStore((s) => s.markCallsSeen);
	const blockedIds = useWgoStore((s) => s.blockedIds);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [picker, setPicker] = (0, import_react.useState)(false);
	const [menu, setMenu] = (0, import_react.useState)(null);
	const [reportUser, setReportUser] = (0, import_react.useState)(null);
	const [blockUserId, setBlockUserId] = (0, import_react.useState)(null);
	const [now, setNow] = (0, import_react.useState)(Date.now());
	const list = filter === "missed" ? calls.filter((c) => c.missed) : calls;
	const contacts = Object.values(users).filter((u) => u.connected && !blockedIds.includes(u.id));
	const groups = groupCallLogs(list);
	(0, import_react.useEffect)(() => {
		markCallsSeen();
	}, [markCallsSeen]);
	(0, import_react.useEffect)(() => {
		if (!live?.pip) return;
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, [live?.pip]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass sticky top-0 z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-4 pb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-[22px] font-semibold tracking-tight",
							children: t("callsTitle")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "text-[13px] font-medium text-muted",
								onClick: () => push({ name: "call-link" }),
								children: t("createCallLink")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("newCall"),
								onClick: () => setPicker(true),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-5" })
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 px-4 pb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: filter === "all",
							onClick: () => setFilter("all"),
							children: t("all")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: filter === "missed",
							onClick: () => setFilter("missed"),
							children: t("missed")
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "no-scrollbar flex-1 overflow-y-auto pb-24",
				children: [live?.pip ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: expandCall,
					className: "mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-accent/15 px-3 py-3 text-left outline outline-1 outline-accent/40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative flex size-12 items-center justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wgo-call-ring absolute inset-0 rounded-full bg-accent/40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: users[live.userId],
								size: 48
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-[15px] font-semibold",
								children: t("callInProgress")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[12px] tabular-nums text-muted",
								children: [
									users[live.userId]?.displayName,
									" · ",
									formatDuration((now - (live.startedAt || now)) / 1e3)
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg",
							children: t("returnToCall")
						})
					]
				}) : !live ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => startCall("maya", "video", "in"),
					className: "glass-card mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl px-3 py-3 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative flex size-12 items-center justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wgo-call-ring absolute inset-0 rounded-full bg-accent/40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: users.maya,
								size: 48
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-[15px] font-semibold",
								children: users.maya?.displayName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[12px] text-muted",
								children: [
									t("incomingFrom"),
									" · ",
									t("videoCall")
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg",
							children: t("answer")
						})
					]
				}) : null, groups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
					title: t("noResults"),
					body: t("createCallLink")
				}) : groups.map((g) => {
					const c = g.items[0];
					const u = users[c.userId];
					const Icon = c.missed ? PhoneMissed : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
					const ids = g.items.map((x) => x.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 px-4 py-2.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => push({
									name: "found-profile",
									userId: c.userId
								}),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									user: u,
									size: 48
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "min-w-0 flex-1 text-left",
								onClick: () => startCall(c.userId, c.kind),
								onContextMenu: (e) => {
									e.preventDefault();
									setMenu({
										ids,
										userId: c.userId,
										kind: c.kind
									});
								},
								onPointerDown: (e) => {
									const id = window.setTimeout(() => setMenu({
										ids,
										userId: c.userId,
										kind: c.kind
									}), 480);
									const clear = () => window.clearTimeout(id);
									e.currentTarget.addEventListener("pointerup", clear, { once: true });
									e.currentTarget.addEventListener("pointercancel", clear, { once: true });
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: cn("truncate font-medium", c.missed && "text-danger"),
									children: [u?.displayName, g.items.length > 1 ? ` (${g.items.length})` : ""]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "flex items-center gap-1 text-[13px] text-muted",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5" }),
										c.kind === "video" ? t("videoCall") : t("audioCall"),
										c.duration ? ` · ${formatDuration(c.duration)}` : ""
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12px] text-muted",
								children: formatChatTime(c.at, lang)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("callAgain"),
								onClick: () => startCall(c.userId, c.kind),
								children: c.kind === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-5" })
							})
						]
					}, c.id);
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: picker,
				onClose: () => setPicker(false),
				title: t("newCall"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "no-scrollbar max-h-[50vh] overflow-y-auto",
					children: contacts.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: u,
								size: 40
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 flex-1 text-[15px] font-medium",
								children: u.displayName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("audioCall"),
								onClick: () => {
									setPicker(false);
									startCall(u.id, "audio");
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: t("videoCall"),
								onClick: () => {
									setPicker(false);
									startCall(u.id, "video");
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-5" })
							})
						]
					}, u.id))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: Boolean(menu),
				onClose: () => setMenu(null),
				title: menu ? users[menu.userId]?.displayName : t("callsTitle"),
				children: menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 pb-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							onClick: () => {
								startCall(menu.userId, "audio");
								setMenu(null);
							},
							children: t("audioCall")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							onClick: () => {
								startCall(menu.userId, "video");
								setMenu(null);
							},
							children: t("videoCall")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "danger",
							onClick: () => {
								deleteCalls(menu.ids);
								setMenu(null);
							},
							children: t("deleteCall")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafetyRow, {
							onReport: () => {
								setReportUser(menu.userId);
								setMenu(null);
							},
							onBlock: () => {
								setBlockUserId(menu.userId);
								setMenu(null);
							}
						})
					]
				}) : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: Boolean(reportUser),
				onClose: () => setReportUser(null),
				kind: "user",
				targetId: reportUser ?? "",
				blockUserId: reportUser ?? void 0
			}),
			blockUserId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockSheet, {
				open: true,
				onClose: () => setBlockUserId(null),
				userId: blockUserId
			}) : null
		]
	});
}
function CallLinkScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const startCall = useWgoStore((s) => s.startCall);
	const me = useWgoStore((s) => s.me);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const link = `wipp.me/call/${me.username}`;
	async function share() {
		try {
			await navigator.clipboard.writeText(`https://${link}`);
		} catch {}
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { className: "text-paper" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("createCallLink"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center px-6 pt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-[14px] leading-relaxed text-paper/65",
						children: t("callLinkBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 rounded-2xl bg-paper p-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCard, {
							value: link,
							size: 200
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[13px] text-accent",
						children: link
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-6 w-full",
						onClick: share,
						children: copied ? t("copied") : t("share")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "secondary",
						className: "mt-2 w-full bg-paper/10 text-paper",
						onClick: () => startCall("maya", "video"),
						children: t("joinCall")
					})
				]
			})
		]
	});
}
function ActiveCallScreen({ userId, kind, dir = "out" }) {
	const startCall = useWgoStore((s) => s.startCall);
	const live = useWgoStore((s) => s.liveCall);
	(0, import_react.useEffect)(() => {
		if (!live) startCall(userId, kind, dir);
		else if (live.pip) useWgoStore.getState().expandCall();
	}, [
		dir,
		kind,
		live,
		startCall,
		userId
	]);
	return null;
}
function CallLayer() {
	const live = useWgoStore((s) => s.liveCall);
	if (!live) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallSession, {}, live.userId);
}
function CallSession() {
	const t = useT();
	const live = useWgoStore((s) => s.liveCall);
	const user = useWgoStore((s) => live ? s.users[live.userId] : void 0);
	const me = useWgoStore((s) => s.me);
	const endCall = useWgoStore((s) => s.endCall);
	const setCallEphemeral = useWgoStore((s) => s.setCallEphemeral);
	const minimizeCall = useWgoStore((s) => s.minimizeCall);
	const expandCall = useWgoStore((s) => s.expandCall);
	const [phase, setPhase] = (0, import_react.useState)(live?.dir === "in" ? "incoming" : "ring");
	const [mode, setMode] = (0, import_react.useState)(live?.kind ?? "audio");
	const forcedEphemeral = useWgoStore((s) => {
		const id = s.liveCall?.userId;
		if (!id) return false;
		return s.chats.some((c) => c.ephemeral && !isChatSealed(c) && c.participantIds.includes(id) && c.participantIds.includes("me"));
	});
	const [t0, setT0] = (0, import_react.useState)(0);
	const [now, setNow] = (0, import_react.useState)(Date.now());
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [speaker, setSpeaker] = (0, import_react.useState)(true);
	const [camOff, setCamOff] = (0, import_react.useState)(false);
	const [facing, setFacing] = (0, import_react.useState)("user");
	const [mediaError, setMediaError] = (0, import_react.useState)(false);
	const [localReady, setLocalReady] = (0, import_react.useState)(false);
	const localRef = (0, import_react.useRef)(null);
	const pipVideoRef = (0, import_react.useRef)(null);
	const osPipVideoRef = (0, import_react.useRef)(null);
	(0, import_react.useRef)(null);
	const mixLocalRef = (0, import_react.useRef)(null);
	const statusRef = (0, import_react.useRef)("");
	const dragStartY = (0, import_react.useRef)(null);
	const dragRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const hangingRef = (0, import_react.useRef)(false);
	const [pipPos, setPipPos] = (0, import_react.useState)(null);
	const [osPipOn, setOsPipOn] = (0, import_react.useState)(false);
	const pip = Boolean(live?.pip);
	const wantMedia = phase === "ring" || phase === "live";
	(0, import_react.useEffect)(() => {
		if (phase !== "ring") return;
		const id = window.setTimeout(() => {
			setPhase("live");
			setT0(Date.now());
		}, 2200);
		return () => window.clearTimeout(id);
	}, [phase]);
	(0, import_react.useEffect)(() => {
		if (phase !== "live") return;
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, [phase]);
	(0, import_react.useEffect)(() => {
		if (phase !== "incoming" && phase !== "ring") return;
		if (pip) return;
		let ctx = null;
		let interval = 0;
		try {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			ctx = new AC();
			const burst = () => {
				if (!ctx) return;
				const tStart = ctx.currentTime;
				for (const freq of phase === "incoming" ? [440, 480] : [520]) {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = "sine";
					osc.frequency.value = freq;
					gain.gain.setValueAtTime(1e-4, tStart);
					gain.gain.exponentialRampToValueAtTime(.06, tStart + .03);
					gain.gain.exponentialRampToValueAtTime(1e-4, tStart + .85);
					osc.connect(gain).connect(ctx.destination);
					osc.start(tStart);
					osc.stop(tStart + .9);
				}
			};
			ctx.resume().then(() => {
				burst();
				interval = window.setInterval(burst, 1800);
			});
		} catch {}
		if (phase === "incoming") haptic("incoming");
		return () => {
			window.clearInterval(interval);
			hapticStop();
			ctx?.close();
		};
	}, [phase, pip]);
	(0, import_react.useEffect)(() => {
		if (!wantMedia) {
			streamRef.current?.getTracks().forEach((tr) => tr.stop());
			streamRef.current = null;
			return;
		}
		let cancelled = false;
		if (!navigator.mediaDevices?.getUserMedia) {
			setMediaError(true);
			return;
		}
		navigator.mediaDevices.getUserMedia({
			audio: true,
			video: mode === "video" ? {
				facingMode: facing,
				width: { ideal: 720 }
			} : false
		}).then((stream) => {
			if (cancelled) {
				stream.getTracks().forEach((tr) => tr.stop());
				return;
			}
			streamRef.current?.getTracks().forEach((tr) => tr.stop());
			streamRef.current = stream;
			stream.getAudioTracks().forEach((tr) => {
				tr.enabled = !muted;
			});
			stream.getVideoTracks().forEach((tr) => {
				tr.enabled = !camOff;
			});
			const node = pip ? pipVideoRef.current : localRef.current;
			if (node) {
				node.srcObject = stream;
				node.play().catch(() => void 0);
			}
			setLocalReady(false);
			setMediaError(false);
		}).catch(() => setMediaError(true));
		return () => {
			cancelled = true;
		};
	}, [
		wantMedia,
		mode,
		facing
	]);
	(0, import_react.useEffect)(() => {
		const stream = streamRef.current;
		if (!stream) return;
		const node = pip ? pipVideoRef.current : localRef.current;
		if (node) {
			node.srcObject = stream;
			node.play().catch(() => void 0);
		}
	}, [pip]);
	(0, import_react.useEffect)(() => {
		if (!wantMedia || localReady) return;
		const id = window.setTimeout(() => setMediaError(true), 2500);
		return () => window.clearTimeout(id);
	}, [wantMedia, localReady]);
	(0, import_react.useEffect)(() => {
		streamRef.current?.getAudioTracks().forEach((tr) => {
			tr.enabled = !muted;
		});
	}, [muted]);
	(0, import_react.useEffect)(() => {
		streamRef.current?.getVideoTracks().forEach((tr) => {
			tr.enabled = !camOff;
		});
	}, [camOff]);
	(0, import_react.useEffect)(() => {
		const el = mixLocalRef.current;
		if (!el) return;
		el.srcObject = streamRef.current;
		if (streamRef.current) el.play().catch(() => void 0);
	}, [
		wantMedia,
		mode,
		facing,
		pip
	]);
	(0, import_react.useEffect)(() => {
		return () => {
			streamRef.current?.getTracks().forEach((tr) => tr.stop());
			streamRef.current = null;
			if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => void 0);
		};
	}, []);
	const elapsed = phase === "live" && t0 ? (now - t0) / 1e3 : 0;
	const videoOn = mode === "video" && !camOff;
	const liveVideo = videoOn && phase === "live";
	const showSelf = mode === "video" && phase !== "ended";
	const canPip = phase === "live" || phase === "ring";
	const status = phase === "incoming" ? `${t("incomingFrom")} · ${mode === "video" ? t("videoCall") : t("audioCall")}` : phase === "ring" ? t("ringing") : phase === "ended" ? t("callEnded") : formatDuration(elapsed);
	statusRef.current = status;
	(0, import_react.useEffect)(() => {
		const video = osPipVideoRef.current;
		if (!video || !user) return;
		const src = callPipSrc(user.avatar);
		if (!src) return;
		video.srcObject = null;
		if (!video.currentSrc.includes(src)) video.src = src;
		video.loop = true;
		video.muted = true;
		video.disablePictureInPicture = false;
		const play = () => void video.play().catch(() => void 0);
		if (video.readyState >= 2) play();
		else video.addEventListener("canplay", play, { once: true });
		return () => video.removeEventListener("canplay", play);
	}, [user, pip]);
	(0, import_react.useEffect)(() => {
		if (!user || phase === "ended") return;
		const session = navigator.mediaSession;
		if (!session) return;
		try {
			session.metadata = new MediaMetadata({
				title: user.displayName,
				artist: "Wipp",
				artwork: user.avatar ? [{
					src: user.avatar,
					sizes: "512x512",
					type: "image/jpeg"
				}] : []
			});
			session.playbackState = "playing";
			if (pip || phase === "live") session.setActionHandler("enterpictureinpicture", async () => {
				await enterOsPip(osPipVideoRef.current);
			});
		} catch {}
		return () => {
			try {
				session.setActionHandler("enterpictureinpicture", null);
			} catch {}
		};
	}, [
		user,
		phase,
		pip
	]);
	(0, import_react.useEffect)(() => {
		const video = osPipVideoRef.current;
		if (!video) return;
		const onEnter = () => setOsPipOn(true);
		const onLeave = () => setOsPipOn(false);
		const onWebkit = () => {
			const mode = video.webkitPresentationMode;
			setOsPipOn(mode === "picture-in-picture");
		};
		video.addEventListener("enterpictureinpicture", onEnter);
		video.addEventListener("leavepictureinpicture", onLeave);
		video.addEventListener("webkitpresentationmodechanged", onWebkit);
		return () => {
			video.removeEventListener("enterpictureinpicture", onEnter);
			video.removeEventListener("leavepictureinpicture", onLeave);
			video.removeEventListener("webkitpresentationmodechanged", onWebkit);
		};
	}, [user]);
	(0, import_react.useEffect)(() => {
		const video = osPipVideoRef.current;
		if (!video) return;
		if (phase === "ended") {
			leaveOsPip(video);
			return;
		}
		video.disablePictureInPicture = false;
		const v = video;
		if ("autoPictureInPicture" in v) v.autoPictureInPicture = true;
		video.play().catch(() => void 0);
	}, [pip, phase]);
	(0, import_react.useEffect)(() => {
		if (!canPip) return;
		const goBackground = () => {
			if (!useWgoStore.getState().liveCall?.pip) minimizeCall();
			enterOsPip(osPipVideoRef.current);
		};
		const onVis = () => {
			if (document.hidden || document.visibilityState === "hidden") goBackground();
		};
		document.addEventListener("visibilitychange", onVis);
		window.addEventListener("pagehide", goBackground);
		document.addEventListener("freeze", goBackground);
		return () => {
			document.removeEventListener("visibilitychange", onVis);
			window.removeEventListener("pagehide", goBackground);
			document.removeEventListener("freeze", goBackground);
		};
	}, [canPip, minimizeCall]);
	function hang(duration = elapsed) {
		if (hangingRef.current) return;
		hangingRef.current = true;
		if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => void 0);
		streamRef.current?.getTracks().forEach((tr) => tr.stop());
		streamRef.current = null;
		setPhase("ended");
		window.setTimeout(() => endCall(duration), 700);
	}
	function accept() {
		setPhase("live");
		setT0(Date.now());
	}
	function onSwipeStart(clientY) {
		dragStartY.current = clientY;
	}
	function onSwipeEnd(clientY) {
		const start = dragStartY.current;
		dragStartY.current = null;
		if (start != null && clientY - start > 72 && canPip) shrinkCall();
	}
	async function shrinkCall() {
		const ok = await enterOsPip(osPipVideoRef.current);
		const v = osPipVideoRef.current;
		if (ok || document.pictureInPictureElement || v?.webkitPresentationMode === "picture-in-picture") setOsPipOn(true);
		minimizeCall();
	}
	const pipW = mode === "video" ? 132 : 220;
	const pipH = mode === "video" ? 196 : 64;
	function onPipPointerDown(e) {
		if (e.target.closest("[data-pip-hang]")) return;
		e.preventDefault();
		const node = e.currentTarget;
		const rect = node.getBoundingClientRect();
		const host = node.offsetParent?.getBoundingClientRect() ?? rect;
		dragRef.current = {
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			ox: rect.left - host.left,
			oy: rect.top - host.top,
			moved: false
		};
		try {
			node.setPointerCapture(e.pointerId);
		} catch {}
	}
	function onPipPointerMove(e) {
		const d = dragRef.current;
		if (!d || d.id !== e.pointerId) return;
		const dx = e.clientX - d.x;
		const dy = e.clientY - d.y;
		if (!d.moved && dx * dx + dy * dy < 64) return;
		d.moved = true;
		const host = e.currentTarget.offsetParent;
		const hw = host?.clientWidth ?? 390;
		const hh = host?.clientHeight ?? 700;
		const x = Math.max(8, Math.min(hw - pipW - 8, d.ox + dx));
		const y = Math.max(44, Math.min(hh - pipH - 80, d.oy + dy));
		setPipPos({
			x,
			y
		});
	}
	function onPipPointerUp(e) {
		const d = dragRef.current;
		dragRef.current = null;
		if (!d || d.id !== e.pointerId) return;
		if (!d.moved) expandCall();
	}
	if (!live || !user) return null;
	const callIsEphemeral = Boolean(live.ephemeral);
	const pipFile = callPipSrc(user.avatar);
	const osPipNodes = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		ref: mixLocalRef,
		muted: true,
		playsInline: true,
		autoPlay: true,
		disablePictureInPicture: true,
		className: "pointer-events-none fixed top-0 left-0 h-px w-px opacity-0",
		"aria-hidden": true
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		ref: osPipVideoRef,
		src: pipFile || void 0,
		loop: true,
		muted: true,
		playsInline: true,
		autoPlay: true,
		className: pip ? "pointer-events-none fixed top-0 left-0 h-px w-px opacity-0" : "pointer-events-none absolute inset-0 z-[69] size-full object-cover"
	})] });
	if (pip && osPipOn && phase !== "ended") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: osPipNodes });
	if (pip && phase !== "ended") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [osPipNodes, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-0 z-[70]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-auto absolute touch-none",
			style: pipPos ? {
				left: pipPos.x,
				top: pipPos.y,
				width: pipW,
				touchAction: "none"
			} : {
				right: 12,
				top: 56,
				width: pipW,
				touchAction: "none"
			},
			onPointerDown: onPipPointerDown,
			onPointerMove: onPipPointerMove,
			onPointerUp: onPipPointerUp,
			onPointerCancel: () => {
				dragRef.current = null;
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					role: "button",
					className: "relative flex cursor-grab overflow-hidden rounded-2xl bg-navy text-left text-paper shadow-[0_12px_40px_rgba(0,0,0,0.45)] outline outline-1 outline-white/20 active:cursor-grabbing",
					style: { width: pipW },
					"aria-label": t("returnToCall"),
					children: mode === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative block h-48 w-full",
						children: [user.avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: user.avatar,
							alt: "",
							className: "absolute inset-0 size-full object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 bg-navy" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[11px] font-semibold",
								children: user.displayName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] tabular-nums text-paper/70",
								children: status
							})]
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 py-2 pr-10 pl-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							user,
							size: 40
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-[13px] font-semibold",
								children: user.displayName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] tabular-nums text-accent",
								children: status
							})]
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"data-pip-hang": true,
					className: "absolute top-1.5 right-1.5 z-10 flex size-8 items-center justify-center rounded-full bg-danger text-paper shadow-md",
					onPointerDown: (e) => e.stopPropagation(),
					onClick: (e) => {
						e.stopPropagation();
						hang(elapsed);
					},
					"aria-label": t("hangup"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "size-3.5" })
				})]
			})
		})
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [osPipNodes, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("absolute inset-0 z-[70] flex flex-col overflow-hidden text-paper", pipFile ? "bg-transparent" : "bg-navy"),
		onPointerDown: (e) => onSwipeStart(e.clientY),
		onPointerUp: (e) => onSwipeEnd(e.clientY),
		onPointerCancel: () => {
			dragStartY.current = null;
		},
		children: [
			pipFile ? null : user.avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.avatar,
				alt: "",
				className: cn("absolute inset-0 size-full object-cover", phase === "live" && "wgo-remote-live")
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-navy" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/90" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex h-full flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { className: "text-paper" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-2",
						children: [
							canPip ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "press flex items-center gap-1 px-3 py-2 text-paper",
								onClick: () => void shrinkCall(),
								"aria-label": t("callMinimize"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-6" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[13px] font-medium",
									children: t("callMinimize")
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-11" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "flex items-center justify-center gap-1 text-center text-[11px] font-medium tracking-wide text-paper/50 uppercase",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3" }), t("e2eCall")]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-11" })
						]
					}),
					liveVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-4 pt-1 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-[18px] font-semibold",
							children: user.displayName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[13px] text-paper/70 tabular-nums",
							children: status
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-1 flex-col items-center justify-center px-6",
						children: [
							mode === "audio" || camOff || phase === "incoming" || phase === "ring" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [(phase === "ring" || phase === "incoming") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wgo-call-ring absolute inset-[-18px] rounded-full bg-accent/25" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "wgo-call-ring absolute inset-[-18px] rounded-full bg-accent/20",
									style: { animationDelay: "0.55s" }
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									user,
									size: 128
								})]
							}) : null,
							liveVideo ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "mt-6 text-[26px] font-semibold",
									children: user.displayName
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-[14px] text-paper/70 tabular-nums",
									children: status
								}),
								canPip ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-[12px] text-paper/45",
									children: t("callPipHint")
								}) : null
							] }),
							mediaError && phase === "live" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 max-w-[28ch] text-center text-[12px] leading-relaxed text-paper/45",
								children: t("permDenied")
							}) : null
						]
					}),
					showSelf ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute top-16 right-4 overflow-hidden rounded-2xl bg-ink outline outline-1 outline-white/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: me.avatar,
							alt: "",
							className: "h-36 w-24 object-cover"
						}), videoOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
							ref: localRef,
							muted: true,
							playsInline: true,
							autoPlay: true,
							disablePictureInPicture: true,
							onPlaying: () => setLocalReady(true),
							className: cn("absolute inset-0 h-36 w-24 object-cover", localReady ? "opacity-100" : "opacity-0"),
							style: { transform: facing === "user" ? "scaleX(-1)" : void 0 }
						}) : null]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						ref: localRef,
						muted: true,
						playsInline: true,
						autoPlay: true,
						disablePictureInPicture: true,
						className: "hidden"
					}),
					phase === "incoming" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 flex items-center justify-around px-10 pb-16",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "press flex flex-col items-center gap-2",
							onClick: () => hang(0),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-16 items-center justify-center rounded-full bg-danger",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "size-7" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12px] text-paper/70",
								children: t("declineCall")
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "press flex flex-col items-center gap-2",
							onClick: accept,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-16 items-center justify-center rounded-full bg-accent text-accent-fg",
								children: mode === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-7" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-7" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12px] text-paper/70",
								children: t("answer")
							})]
						})]
					}) : phase === "ended" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "pb-16 text-center text-[15px] text-paper/60",
						children: t("callEnded")
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 px-6 pb-14",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: forcedEphemeral,
								onClick: () => setCallEphemeral(!callIsEphemeral),
								className: cn("press mb-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold", callIsEphemeral ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper", forcedEphemeral && "opacity-90"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "size-4" }), callIsEphemeral ? t("ephemeralCallOn") : t("ephemeralCallOff")]
							}),
							callIsEphemeral ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "-mt-2 mb-4 text-center text-[12px] leading-snug text-paper/60",
								children: forcedEphemeral ? t("ephemeralCallForced") : t("ephemeralCallHint")
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-4 gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCtrl, {
										label: t("muteMic"),
										active: muted,
										onClick: () => setMuted((v) => !v),
										children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCtrl, {
										label: t("speaker"),
										active: speaker,
										onClick: () => setSpeaker((v) => !v),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCtrl, {
										label: mode === "video" ? t("camera") : t("videoCall"),
										active: mode === "video" && !camOff,
										onClick: () => {
											if (mode === "audio") {
												setMode("video");
												setCamOff(false);
												return;
											}
											setCamOff((v) => !v);
										},
										children: mode === "video" && !camOff ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoOff, { className: "size-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCtrl, {
										label: t("flipCam"),
										onClick: () => setFacing((f) => f === "user" ? "environment" : "user"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchCamera, { className: "size-5" })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-5 flex justify-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "press flex size-16 items-center justify-center rounded-full bg-danger text-paper",
									onClick: () => hang(elapsed),
									"aria-label": t("hangup"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "size-7" })
								})
							})
						]
					})
				]
			})
		]
	})] });
}
function CallCtrl({ label, active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "press flex flex-col items-center gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("flex size-14 items-center justify-center rounded-full", active ? "bg-paper text-navy" : "bg-paper/10 text-paper"),
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[10px] text-paper/60",
			children: label
		})]
	});
}
//#endregion
export { ActiveCallScreen, CallLayer, CallLinkScreen, CallsScreen };

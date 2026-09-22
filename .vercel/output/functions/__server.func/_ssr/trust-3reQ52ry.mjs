import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as groupInviteHref, N as groupInviteLabel, S as findChatByInvite, X as useWgoStore, Y as useT, y as cn } from "./boot-BFpP81oK.mjs";
import { A as QrCode, S as Shield, _t as Camera, dt as Clock, gt as Check, lt as Copy, st as Delete, w as Share2 } from "../_libs/lucide-react.mjs";
import { E as StatusBar, S as Header, T as Sheet, _ as GroupAvatar, a as GallerySheet, b as Empty, d as ReportSheet, f as SafetyRow, g as Avatar, i as qrPngBlob, r as QrCard, v as Btn, x as Field, y as Chip } from "./app-CnfuwP9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/trust-3reQ52ry.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useNow(ms = 250) {
	const [now, setNow] = (0, import_react.useState)(Date.now());
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), ms);
		return () => window.clearInterval(id);
	}, [ms]);
	return now;
}
function countdown(expiresAt, now) {
	const s = Math.max(0, Math.ceil((expiresAt - now) / 1e3));
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function LiveCodeScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const ensureMyCode = useWgoStore((s) => s.ensureMyCode);
	const regenerateMyCode = useWgoStore((s) => s.regenerateMyCode);
	const ensurePeerCode = useWgoStore((s) => s.ensurePeerCode);
	const redeemCode = useWgoStore((s) => s.redeemCode);
	const simulateCodeEntered = useWgoStore((s) => s.simulateCodeEntered);
	const setCodeChatTtl = useWgoStore((s) => s.setCodeChatTtl);
	const codeChatTtl = useWgoStore((s) => s.codeChatTtl);
	const codes = useWgoStore((s) => s.codes);
	const [tab, setTab] = (0, import_react.useState)("mine");
	const [digits, setDigits] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const now = useNow();
	(0, import_react.useEffect)(() => {
		ensureMyCode();
		ensurePeerCode("lea");
	}, [ensureMyCode, ensurePeerCode]);
	const mine = codes.find((c) => c.ownerId === "me");
	const lea = codes.find((c) => c.ownerId === "lea" && c.expiresAt > now);
	const live = mine && mine.expiresAt > now;
	const remain = mine ? countdown(mine.expiresAt, now) : "0:00";
	function redeemDigits(next) {
		const res = redeemCode(next);
		if (!res.ok) {
			setError(res.reason === "expired" ? t("codeExpired") : res.reason === "own" ? t("codeOwn") : t("codeNotFound"));
			setDigits("");
		}
	}
	function press(d) {
		setError(null);
		setDigits((prev) => {
			const next = (prev + d).slice(0, 6);
			if (next.length === 6) window.setTimeout(() => redeemDigits(next), 0);
			return next;
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("liveCode"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 px-4 pb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: tab === "mine",
					onClick: () => setTab("mine"),
					children: t("myCode")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: tab === "enter",
					onClick: () => setTab("enter"),
					children: t("enterCode")
				})]
			}),
			tab === "mine" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center overflow-y-auto px-6 pt-2 pb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-[13px] leading-relaxed text-paper/60",
						children: t("codeHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 flex gap-2",
						children: (mine?.code ?? "------").split("").map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("flex h-12 w-9 items-center justify-center rounded-lg bg-paper/10 text-[24px] font-semibold tabular-nums", i === 3 && "ml-2", !live && "opacity-30"),
							children: live ? d : "·"
						}, i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 flex items-center gap-2 text-[14px] text-accent tabular-nums",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-4" }), live ? `${t("codeExpires")} ${remain}` : t("codeExpired")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-[11px] font-medium tracking-wide text-paper/50 uppercase",
						children: t("chatTtl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap justify-center gap-2",
						children: [
							[9e5, "ttl15"],
							[36e5, "ttl1h"],
							[864e5, "ttl24h"]
						].map(([ms, key]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setCodeChatTtl(ms),
							className: cn("press h-9 rounded-full px-3.5 text-[13px] font-medium", codeChatTtl === ms ? "bg-accent text-accent-fg" : "bg-paper/10 text-paper"),
							children: t(key)
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-[32ch] text-center text-[12px] leading-relaxed text-paper/50",
						children: t("codeVsPerm")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-4 w-full",
						onClick: () => regenerateMyCode(),
						children: t("regenerate")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "ghost",
						className: "mt-1 w-full text-paper",
						onClick: () => simulateCodeEntered("ines"),
						children: t("simulateEntered")
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col px-6 pt-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center gap-2 py-4",
						children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("flex h-12 w-9 items-center justify-center rounded-lg bg-paper/10 text-[22px] font-semibold tabular-nums", i === 3 && "ml-2"),
							children: digits[i] ?? ""
						}, i))
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-center text-[13px] text-danger",
						children: error
					}) : null,
					lea ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mb-3 rounded-lg bg-paper/10 px-3 py-2 text-[13px] text-paper/80",
						onClick: () => {
							setError(null);
							setDigits(lea.code);
							redeemDigits(lea.code);
						},
						children: t("demoCodeLea")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto grid grid-cols-3 gap-2 pb-8",
						children: [
							"1",
							"2",
							"3",
							"4",
							"5",
							"6",
							"7",
							"8",
							"9",
							"",
							"0",
							"del"
						].map((k) => k === "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}, "sp") : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "press flex h-14 items-center justify-center rounded-xl bg-paper/10 text-[22px] font-medium",
							onClick: () => {
								if (k === "del") {
									setDigits((d) => d.slice(0, -1));
									setError(null);
								} else press(k);
							},
							"aria-label": k === "del" ? t("back") : k,
							children: k === "del" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delete, { className: "size-6" }) : k
						}, k))
					})
				]
			})
		]
	});
}
function OneTimeQrScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const createOneTimeQr = useWgoStore((s) => s.createOneTimeQr);
	const allQrs = useWgoStore((s) => s.oneTimeQrs);
	const now = useNow(1e3);
	const [mode, setMode] = (0, import_react.useState)("once");
	const [label, setLabel] = (0, import_react.useState)("");
	const [hours, setHours] = (0, import_react.useState)(2);
	const latest = allQrs.filter((q) => q.ownerId === "me")[0];
	function make() {
		createOneTimeQr({
			kind: mode,
			label: mode === "once" ? t("onceTitle") : label.trim() || t("eventTitle"),
			hours: mode === "once" ? 24 : hours
		});
	}
	const shown = latest;
	const dead = shown && (shown.used || shown.expiresAt < now);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("oneTimeQr"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-5 pb-8",
				children: [shown ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center pt-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mb-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-fg",
							children: shown.kind === "once" ? t("onceBadge") : shown.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("rounded-2xl bg-paper p-3", dead && "opacity-40"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCard, {
								value: `wipp.me/q/${shown.token}`,
								size: 200
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-center text-[13px] text-paper/60",
							children: dead ? shown.used ? t("qrBurned") : t("qrExpired") : `${t("codeExpires")} ${countdown(shown.expiresAt, now)}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 max-w-[32ch] text-center text-[12px] leading-relaxed text-paper/50",
							children: shown.kind === "once" ? t("onceBody") : t("eventBody")
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 pb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: mode === "once",
							onClick: () => setMode("once"),
							children: t("onceBadge")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: mode === "event",
							onClick: () => setMode("event"),
							children: t("eventBadge")
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] leading-relaxed text-paper/60",
						children: mode === "once" ? t("onceBody") : t("eventBody")
					}),
					mode === "event" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							placeholder: t("eventName"),
							value: label,
							onChange: (e) => setLabel(e.target.value),
							className: "bg-paper/10 text-paper placeholder:text-paper/40"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-2",
							children: [
								[2, t("exp2h")],
								[6, t("expTonight")],
								[24, t("exp24h")]
							].map(([h, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
								active: hours === h,
								onClick: () => setHours(Number(h)),
								children: String(l)
							}, String(h)))
						})]
					}) : null
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "mt-5 w-full",
					onClick: make,
					children: shown ? t("regenerate") : mode === "once" ? t("createOnce") : t("createEvent")
				})]
			})
		]
	});
}
function IntroduceScreen({ toUserId }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const users = useWgoStore((s) => s.users);
	const sendIntro = useWgoStore((s) => s.sendIntro);
	const to = users[toUserId];
	const [subjectId, setSubjectId] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)("");
	const [sent, setSent] = (0, import_react.useState)(false);
	const candidates = Object.values(users).filter((u) => u.connected && u.id !== toUserId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("introduceTitle"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-5 pb-3 text-[13px] leading-relaxed text-muted",
				children: t("introduceSub")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "px-5 pb-2 text-[12px] font-medium text-muted uppercase",
				children: [
					t("pickPerson"),
					" → ",
					to?.displayName
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar",
				children: candidates.map((u) => {
					const on = subjectId === u.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex w-full items-center gap-3 px-4 py-2.5 text-left",
						onClick: () => setSubjectId(u.id),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user: u,
								size: 44
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[15px] font-medium",
									children: u.displayName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[13px] text-muted",
									children: ["@", u.username]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("flex size-5 items-center justify-center rounded-full hairline", on && "bg-accent"),
								children: on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3 text-accent-fg" }) : null
							})
						]
					}, u.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 p-4 pb-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					placeholder: t("introNote"),
					value: note,
					onChange: (e) => setNote(e.target.value)
				}), sent ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-[13px] text-muted",
					children: t("introSent")
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "w-full",
					disabled: !subjectId,
					onClick: () => {
						if (!subjectId) return;
						sendIntro(toUserId, subjectId, note);
						setSent(true);
						window.setTimeout(pop, 700);
					},
					children: t("sendIntro")
				})]
			})
		]
	});
}
function IntroDetailScreen({ introId }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const intro = useWgoStore((s) => s.intros.find((x) => x.id === introId));
	const users = useWgoStore((s) => s.users);
	const acceptIntro = useWgoStore((s) => s.acceptIntro);
	const declineIntro = useWgoStore((s) => s.declineIntro);
	if (!intro) return null;
	const introducer = users[intro.introducerId];
	const revealed = intro.status === "accepted";
	const subject = users[intro.subjectId];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("intros"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center px-6 pt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
						user: subject,
						size: 104,
						hidden: !revealed
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-4 text-[24px] font-semibold",
						children: revealed ? subject?.displayName : t("someone")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[14px] text-muted",
						children: revealed ? `@${subject?.username}` : t("usernameHidden")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-[14px] text-muted",
						children: [
							t("introBy"),
							" ",
							introducer?.displayName
						]
					}),
					intro.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-[34ch] text-center text-[15px] leading-relaxed",
						children: intro.note
					}) : null,
					intro.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 grid w-full gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							onClick: () => acceptIntro(intro.id),
							children: t("acceptIntro")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							onClick: () => {
								declineIntro(intro.id);
								pop();
							},
							children: t("decline")
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-8 text-center text-[13px] text-muted",
						children: t("introAccepted")
					})
				]
			})
		]
	});
}
function GroupQrScreen({ chatId }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	useWgoStore((s) => s.push);
	const openGroupInvite = useWgoStore((s) => s.openGroupInvite);
	const ensureGroupInvite = useWgoStore((s) => s.ensureGroupInvite);
	const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
	const users = useWgoStore((s) => s.users);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [askOpen, setAskOpen] = (0, import_react.useState)(false);
	const hold = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (chat) ensureGroupInvite(chat.id);
	}, [chat, ensureGroupInvite]);
	if (!chat) return null;
	const group = chat;
	const token = group.inviteToken ?? group.id;
	const href = groupInviteHref(token);
	const label = groupInviteLabel(token);
	const members = group.participantIds.filter((id) => id !== "me").map((id) => users[id]);
	function clearHold() {
		window.clearTimeout(hold.current);
	}
	function startHold() {
		clearHold();
		hold.current = window.setTimeout(() => setAskOpen(true), 480);
	}
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(href);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			setCopied(true);
		}
	}
	async function shareGroup() {
		const payload = {
			title: group.name ?? "Wipp",
			text: t("groupInviteBody"),
			url: href
		};
		try {
			if (navigator.share) await navigator.share(payload);
			else await copyLink();
		} catch {
			await copyLink();
		}
	}
	async function shareQr() {
		try {
			const blob = await qrPngBlob(href);
			const file = new File([blob], `${group.name ?? "wipp"}.png`, { type: "image/png" });
			const nav = navigator;
			if (nav.share && nav.canShare?.({ files: [file] })) {
				await nav.share({
					title: group.name ?? "Wipp",
					text: t("groupInviteBody"),
					files: [file]
				});
				return;
			}
			await shareGroup();
		} catch {
			await shareGroup();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("groupQr"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center overflow-y-auto no-scrollbar px-6 pt-2 pb-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
						users: members,
						size: 56,
						photo: chat.avatar
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-[20px] font-semibold",
						children: chat.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] text-paper/60",
						children: t("joinByQr")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-6 select-none rounded-2xl bg-paper p-4",
						"aria-label": t("openInWipp"),
						onPointerDown: startHold,
						onPointerUp: clearHold,
						onPointerCancel: clearHold,
						onPointerLeave: clearHold,
						onContextMenu: (e) => {
							e.preventDefault();
							setAskOpen(true);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCard, {
							value: href,
							size: 220
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-[12px] text-paper/40",
						children: label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-[32ch] text-center text-[13px] leading-relaxed text-paper/60",
						children: t("holdQrHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-[32ch] text-center text-[12px] leading-relaxed text-paper/45",
						children: t("groupLinkHint")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
						className: "mt-5 w-full",
						onClick: () => void shareGroup(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-4" }), t("shareGroup")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
						variant: "secondary",
						className: "mt-2 w-full",
						onClick: () => void copyLink(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), copied ? t("copied") : t("copyLink")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
						variant: "ghost",
						className: "mt-2 w-full text-paper",
						onClick: () => void shareQr(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "size-4" }), t("shareGroupQr")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						variant: "ghost",
						className: "mt-2 text-paper",
						onClick: pop,
						children: t("openGroup")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: askOpen,
				onClose: () => setAskOpen(false),
				title: t("openInWipp"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center pb-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
							users: members,
							size: 64,
							photo: chat.avatar
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-[17px] font-semibold",
							children: chat.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 max-w-[32ch] text-center text-[13px] leading-relaxed text-muted",
							children: t("openInWippBody")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							className: "mt-5 w-full",
							onClick: () => {
								setAskOpen(false);
								openGroupInvite(token);
							},
							children: t("openWipp")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							variant: "secondary",
							className: "mt-2 w-full",
							onClick: () => setAskOpen(false),
							children: t("cancel")
						})
					]
				})
			})
		]
	});
}
function GroupInfoScreen({ chatId }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const push = useWgoStore((s) => s.push);
	const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
	const users = useWgoStore((s) => s.users);
	const me = useWgoStore((s) => s.me);
	const setGroupAvatar = useWgoStore((s) => s.setGroupAvatar);
	const ensureGroupInvite = useWgoStore((s) => s.ensureGroupInvite);
	const [pick, setPick] = (0, import_react.useState)(false);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (chat) ensureGroupInvite(chat.id);
	}, [chat, ensureGroupInvite]);
	if (!chat) return null;
	const members = chat.participantIds.map((id) => id === "me" ? me : users[id]);
	const token = chat.inviteToken ?? chat.id;
	const href = groupInviteHref(token);
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(href);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			setCopied(true);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: chat.name ?? t("groupInfo"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar pb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center px-4 pt-2 pb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "relative",
							onClick: () => setPick(true),
							"aria-label": t("changeGroupPhoto"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
								users: members.filter((u) => u && u.id !== "me"),
								size: 88,
								photo: chat.avatar
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-4" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-[13px] font-medium text-accent",
							children: t("changeGroupPhoto")
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-4 mb-4 rounded-xl bg-surface p-4 hairline",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[14px] font-medium",
									children: t("joinByQr")
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[13px] leading-relaxed text-muted",
								children: t("noPhoneGroup")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[13px] text-muted",
								children: t("noInviteLink")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 break-all text-[12px] text-muted",
								children: groupInviteLabel(token)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
								className: "mt-4 w-full",
								onClick: () => push({
									name: "group-qr",
									chatId
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "size-4" }), t("groupQr")]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
								variant: "secondary",
								className: "mt-2 w-full",
								onClick: () => void copyLink(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), copied ? t("copied") : t("copyLink")]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "px-5 pb-2 text-[12px] font-medium text-muted uppercase",
						children: [
							t("participants"),
							" · ",
							members.length
						]
					}),
					members.map((u) => u ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 px-4 py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							user: u,
							size: 44
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[15px] font-medium",
							children: u.id === "me" ? t("you") : u.displayName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[13px] text-muted",
							children: ["@", u.username]
						})] })]
					}, u.id) : null),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-5 pt-4 text-[12px] text-muted",
						children: t("membersHiddenPhone")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 px-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafetyRow, { onReport: () => setReportOpen(true) })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GallerySheet, {
				open: pick,
				onClose: () => setPick(false),
				onPick: (url) => setGroupAvatar(chatId, url),
				title: t("changeGroupPhoto")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: "group",
				targetId: chatId,
				onSubmitted: pop
			})
		]
	});
}
function GroupInviteScreen({ token }) {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const chats = useWgoStore((s) => s.chats);
	const qrs = useWgoStore((s) => s.oneTimeQrs);
	const users = useWgoStore((s) => s.users);
	const joinGroup = useWgoStore((s) => s.joinGroup);
	const replace = useWgoStore((s) => s.replace);
	const markRead = useWgoStore((s) => s.markRead);
	const chat = findChatByInvite(chats, qrs, token);
	const members = chat ? chat.participantIds.filter((id) => id !== "me").map((id) => users[id]) : [];
	const already = Boolean(chat?.participantIds.includes("me"));
	if (!chat) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("groupInviteTitle"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
				title: t("linkInvalid"),
				body: t("groupInviteBody")
			})
		]
	});
	function enter() {
		if (!chat) return;
		if (already) {
			replace({
				name: "conversation",
				chatId: chat.id
			});
			markRead(chat.id);
			return;
		}
		joinGroup(chat.id);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("groupInviteTitle"),
				onBack: pop,
				className: "text-paper [&_button]:text-paper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center px-6 pt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupAvatar, {
						users: members,
						size: 88,
						photo: chat.avatar
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-[22px] font-semibold",
						children: chat.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-[13px] text-paper/60",
						children: [
							chat.participantIds.length,
							" ",
							t("participants"),
							" · ",
							t("joinByQr")
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-[32ch] text-center text-[14px] leading-relaxed text-paper/70",
						children: t("groupInviteBody")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						className: "mt-8 w-full",
						onClick: enter,
						children: already ? t("alreadyMember") : t("joinThisGroup")
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
}
//#endregion
export { GroupInfoScreen, GroupInviteScreen, GroupQrScreen, IntroDetailScreen, IntroduceScreen, LiveCodeScreen, OneTimeQrScreen };

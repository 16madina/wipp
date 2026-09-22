import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { J as storyViewMs, L as isStoryLive, O as formatRelativeShort, X as useWgoStore, Y as useT, _ as STORY_VIDEO_MAX_MS, g as STORY_TTL_48H, h as STORY_TTL_24H, k as formatRemain, m as STORY_MUSIC, q as storyTtlMs, u as MUSIC_MOODS, y as cn } from "./boot-BFpP81oK.mjs";
import { D as Search, M as Play, V as Music, at as Eye, i as Volume2, n as X, nt as Flag, r as VolumeX, z as Pause } from "../_libs/lucide-react.mjs";
import { E as StatusBar, S as Header, d as ReportSheet, g as Avatar, h as SmartImg, o as StoryMediaGrid, v as Btn, y as Chip } from "./app-CnfuwP9N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stories-Br147v1K.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MOOD_KEY = {
	trending: "storyMusicTrending",
	chill: "storyMusicChill",
	party: "storyMusicParty",
	afro: "storyMusicAfro",
	lofi: "storyMusicLofi",
	rnb: "storyMusicRnb"
};
function useStoryAudio(src, opts = {}) {
	const { paused = false, muted = false, loop = false } = opts;
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!src) return;
		const a = new Audio(src);
		a.preload = "auto";
		a.loop = loop;
		ref.current = a;
		return () => {
			a.pause();
			a.src = "";
			ref.current = null;
		};
	}, [src, loop]);
	(0, import_react.useEffect)(() => {
		const a = ref.current;
		if (!a) return;
		a.muted = muted;
		if (paused) {
			a.pause();
			return;
		}
		a.play().catch(() => {});
	}, [
		paused,
		muted,
		src
	]);
}
function StoryMusicChip({ track, playing, muted, onToggleMute, onRemove }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-[240px] items-center gap-2 rounded-full bg-ink/55 py-1.5 pr-1.5 pl-1.5 glass",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("story-vinyl shrink-0", playing && !muted && "is-spinning"),
				style: { background: track.color }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-[12px] font-semibold leading-tight",
					children: track.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-[11px] text-paper/70",
					children: track.artist
				})]
			}),
			onToggleMute ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "flex size-8 shrink-0 items-center justify-center rounded-full",
				onClick: onToggleMute,
				"aria-label": muted ? t("storyMusic") : t("storyRemoveMusic"),
				children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" })
			}) : null,
			onRemove ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "flex size-8 shrink-0 items-center justify-center rounded-full",
				onClick: onRemove,
				"aria-label": t("storyRemoveMusic"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
			}) : null
		]
	});
}
function StoryMusicButton({ track, onClick }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "mb-3 flex h-11 w-full items-center gap-2 rounded-full bg-paper/10 px-3 text-left text-paper",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Music, { className: "size-4" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate text-[14px] font-medium",
				children: track ? track.title : t("storyAddMusic")
			}), track ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "block truncate text-[11px] text-paper/70",
				children: [
					track.artist,
					" · ",
					t("storyChangeMusic")
				]
			}) : null]
		})]
	});
}
function StoryMusicPicker({ selectedId, onPick, onClose }) {
	const t = useT();
	const [q, setQ] = (0, import_react.useState)("");
	const [mood, setMood] = (0, import_react.useState)("all");
	const [previewId, setPreviewId] = (0, import_react.useState)(null);
	const tracks = (0, import_react.useMemo)(() => {
		const query = q.trim().toLowerCase();
		return STORY_MUSIC.filter((track) => {
			if (mood !== "all" && track.mood !== mood) return false;
			if (!query) return true;
			return `${track.title} ${track.artist}`.toLowerCase().includes(query);
		});
	}, [q, mood]);
	const preview = STORY_MUSIC.find((x) => x.id === previewId);
	useStoryAudio(preview?.src, {
		paused: !preview,
		loop: true
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-50 flex flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("storyMusic"),
				onBack: onClose
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4 pb-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "relative block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "h-11 w-full rounded-lg bg-paper/8 pr-3 pl-10 text-[15px] text-paper outline-none placeholder:text-paper/40",
						placeholder: t("storyMusicSearch"),
						value: q,
						onChange: (e) => setQ(e.target.value)
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: mood === "all",
					onClick: () => setMood("all"),
					children: t("storyMusicForYou")
				}), MUSIC_MOODS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: mood === m,
					onClick: () => setMood(m),
					children: t(MOOD_KEY[m])
				}, m))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto no-scrollbar px-2 pb-8",
				children: tracks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 pt-8 text-center text-[14px] text-paper/70",
					children: t("storyNoMusic")
				}) : tracks.map((track) => {
					const playing = previewId === track.id;
					const selected = selectedId === track.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 px-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left",
							onClick: () => onPick(track),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("story-vinyl shrink-0", playing && "is-spinning"),
									style: { background: track.color }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-[15px] font-medium",
										children: track.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-[12px] text-paper/60",
										children: track.artist
									})]
								}),
								selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg",
									children: "OK"
								}) : null
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-11 shrink-0 items-center justify-center",
							onClick: () => setPreviewId((id) => id === track.id ? null : track.id),
							"aria-label": playing ? "Pause" : "Play",
							children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4 translate-x-px" })
						})]
					}, track.id);
				})
			}),
			preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-4 pb-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					className: "w-full",
					onClick: () => onPick(preview),
					children: t("storyAddMusic")
				})
			}) : null
		]
	});
}
function StoriesScreen({ userId }) {
	const t = useT();
	const lang = useWgoStore((s) => s.language);
	const allStories = useWgoStore((s) => s.stories);
	const users = useWgoStore((s) => s.users);
	const me = useWgoStore((s) => s.me);
	const viewStory = useWgoStore((s) => s.viewStory);
	const pop = useWgoStore((s) => s.pop);
	const openOrCreateDm = useWgoStore((s) => s.openOrCreateDm);
	const [i, setI] = (0, import_react.useState)(0);
	const [viewsOpen, setViewsOpen] = (0, import_react.useState)(false);
	const [now, setNow] = (0, import_react.useState)(Date.now());
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [reportOpen, setReportOpen] = (0, import_react.useState)(false);
	const videoRef = (0, import_react.useRef)(null);
	const stories = (0, import_react.useMemo)(() => allStories.filter((s) => s.userId === userId && isStoryLive(s, now)).sort((a, b) => a.createdAt - b.createdAt), [
		allStories,
		userId,
		now
	]);
	const item = stories[i];
	const user = userId === "me" ? me : users[userId];
	const mine = userId === "me";
	(0, import_react.useEffect)(() => {
		viewStory(userId);
	}, [userId, viewStory]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, []);
	(0, import_react.useEffect)(() => {
		if (i > stories.length - 1) setI(Math.max(0, stories.length - 1));
	}, [i, stories.length]);
	(0, import_react.useEffect)(() => {
		if (!item || viewsOpen || reportOpen) return;
		const id = window.setTimeout(() => {
			if (i < stories.length - 1) setI((n) => n + 1);
			else pop();
		}, storyViewMs(item));
		return () => window.clearTimeout(id);
	}, [
		i,
		item,
		stories.length,
		pop,
		viewsOpen,
		reportOpen
	]);
	useStoryAudio(item?.music?.src, {
		paused: !item?.music || viewsOpen || reportOpen,
		muted,
		loop: true
	});
	(0, import_react.useEffect)(() => {
		const video = videoRef.current;
		if (!video) return;
		video.muted = muted || Boolean(item?.music);
		if (viewsOpen) {
			video.pause();
			return;
		}
		video.play().catch(() => {});
	}, [
		item,
		viewsOpen,
		muted,
		i
	]);
	if (!item || !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("stories"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 pt-8 text-center text-[14px] text-paper/70",
				children: t("storyExpired")
			})
		]
	});
	const left = formatRemain(item.createdAt + storyTtlMs(item), now);
	const viewers = item.viewers ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-full flex-col bg-ink text-paper",
		children: [
			item.type === "video" && item.videoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref: videoRef,
				src: item.videoUrl,
				poster: item.imageUrl,
				className: "pointer-events-none absolute inset-0 size-full object-cover",
				playsInline: true,
				autoPlay: true,
				muted: muted || Boolean(item.music)
			}) : item.type === "image" && item.imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
				src: item.imageUrl,
				alt: "",
				priority: true,
				className: "absolute inset-0 size-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center px-8 text-center",
				style: { background: item.bg ?? "#0B1220" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[28px] font-semibold leading-snug",
					children: item.text
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink/50" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex h-full flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1 px-3",
						children: stories.map((s, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-0.5 flex-1 overflow-hidden rounded-full bg-white/30",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("story-bar-fill block h-full w-full origin-left bg-accent", idx > i && "w-0", (idx !== i || viewsOpen || reportOpen) && "![animation:none]"),
								style: idx === i && !viewsOpen && !reportOpen ? { animationDuration: `${storyViewMs(item) / 1e3}s` } : { width: idx < i ? "100%" : "0%" }
							})
						}, s.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 px-3 pt-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								user,
								size: 36
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[14px] font-medium",
									children: user.displayName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] text-paper/70",
									children: [
										formatRelativeShort(item.createdAt, lang),
										" · ",
										left,
										" ",
										t("storyLeft")
									]
								})]
							}),
							!mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex size-11 items-center justify-center",
								onClick: () => setReportOpen(true),
								"aria-label": t("report"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { className: "size-5" })
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex size-11 items-center justify-center",
								onClick: pop,
								"aria-label": t("back"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
							})
						]
					}),
					item.type === "video" && !item.music ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative z-20 px-3 pt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-11 items-center justify-center rounded-full bg-ink/45",
							onClick: () => setMuted((m) => !m),
							"aria-label": t("addVideoStory"),
							children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
						})
					}) : null,
					item.kind === "profile" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-4 pt-2 text-[13px] font-medium text-paper/90",
						children: t("newPhotoStory")
					}) : null,
					item.music ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative z-20 px-3 pt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMusicChip, {
							track: item.music,
							playing: !viewsOpen,
							muted,
							onToggleMute: () => setMuted((m) => !m)
						})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "absolute top-20 bottom-28 left-0 z-10 w-1/3",
						"aria-label": t("back"),
						onClick: () => i === 0 ? pop() : setI((n) => n - 1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "absolute top-20 bottom-28 right-0 z-10 w-1/3",
						"aria-label": t("next"),
						onClick: () => i < stories.length - 1 ? setI((n) => n + 1) : pop()
					}),
					mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative z-20 mt-auto p-4 pb-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/10 text-[14px] font-medium glass",
							onClick: () => setViewsOpen(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }), viewers.length ? `${t("viewedBy")} ${viewers.length}` : t("noViews")]
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative z-20 mt-auto p-4 pb-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-12 w-full rounded-full bg-white/10 text-[14px] glass",
							onClick: () => openOrCreateDm(userId),
							children: t("storyReply")
						})
					})
				]
			}),
			viewsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-40 flex flex-col justify-end",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "absolute inset-0 bg-ink/50",
					"aria-label": t("back"),
					onClick: () => setViewsOpen(false)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-strong relative max-h-[62vh] rounded-t-2xl px-4 pt-3 pb-8",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-3 h-1 w-10 rounded-full bg-muted/40" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "mb-3 text-center text-[15px] font-semibold",
							children: [
								t("views"),
								" · ",
								viewers.length
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-h-[50vh] overflow-y-auto no-scrollbar",
							children: viewers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-2 py-6 text-center text-[14px] text-muted",
								children: t("noViews")
							}) : viewers.slice().sort((a, b) => b.at - a.at).map((v) => {
								const u = v.userId === "me" ? me : users[v.userId];
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 py-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
										user: u,
										size: 44
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-[15px] font-medium",
											children: u?.displayName ?? v.userId
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[12px] text-muted",
											children: formatRelativeShort(v.at, lang)
										})]
									})]
								}, v.userId + v.at);
							})
						})
					]
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportSheet, {
				open: reportOpen,
				onClose: () => setReportOpen(false),
				kind: "story",
				targetId: item.id,
				blockUserId: mine ? void 0 : userId,
				onSubmitted: pop
			})
		]
	});
}
function NewStoryScreen() {
	const t = useT();
	const pop = useWgoStore((s) => s.pop);
	const addStory = useWgoStore((s) => s.addStory);
	const [mode, setMode] = (0, import_react.useState)("photo");
	const [text, setText] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [ttlMs, setTtlMs] = (0, import_react.useState)(STORY_TTL_24H);
	const [music, setMusic] = (0, import_react.useState)(null);
	const [musicOpen, setMusicOpen] = (0, import_react.useState)(false);
	const bgs = [
		"#0B1220",
		"#151c2c",
		"#1a2a4a",
		"#3b2a12"
	];
	const [bg, setBg] = (0, import_react.useState)(bgs[0]);
	useStoryAudio(music?.src, {
		paused: !music || musicOpen,
		loop: true
	});
	const picker = musicOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMusicPicker, {
		selectedId: music?.id,
		onPick: (track) => {
			setMusic(track);
			setMusicOpen(false);
		},
		onClose: () => setMusicOpen(false)
	}) : null;
	if (draft) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-full flex-col bg-ink text-paper",
		children: [
			draft.type === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				src: draft.url,
				className: "absolute inset-0 size-full object-cover",
				autoPlay: true,
				loop: true,
				playsInline: true,
				muted: Boolean(music)
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartImg, {
				src: draft.url,
				alt: "",
				className: "absolute inset-0 size-full object-cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/50" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex h-full flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
						title: t("addStory"),
						onBack: () => setDraft(null)
					}),
					music ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4 pt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMusicChip, {
							track: music,
							playing: true,
							onRemove: () => setMusic(null)
						})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-auto p-4 pb-8",
						children: [
							draft.type === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-3 text-center text-[12px] text-paper/70",
								children: t("storyVideoMax")
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMusicButton, {
								track: music,
								onClick: () => setMusicOpen(true)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryTtlPicker, {
								value: ttlMs,
								onChange: setTtlMs
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								className: "w-full",
								onClick: () => {
									if (draft.type === "video") addStory({
										type: "video",
										videoUrl: draft.url,
										durationMs: Math.min(draft.durationMs, STORY_VIDEO_MAX_MS),
										ttlMs,
										music: music ?? void 0
									});
									else addStory({
										type: "image",
										imageUrl: draft.url,
										ttlMs,
										music: music ?? void 0
									});
									pop();
								},
								children: t("publish")
							})
						]
					})
				]
			}),
			picker
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-full flex-col",
		style: mode === "text" ? { background: bg } : void 0,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
				title: t("addStory"),
				onBack: pop
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-center gap-2 px-4 pb-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: mode === "photo",
						onClick: () => setMode("photo"),
						children: t("addPhotoStory")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: mode === "video",
						onClick: () => setMode("video"),
						children: t("addVideoStory")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: mode === "text",
						onClick: () => setMode("text"),
						children: t("storyModeText")
					})
				]
			}),
			mode === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				music ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMusicChip, {
						track: music,
						playing: true,
						onRemove: () => setMusic(null)
					})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: "flex-1 resize-none bg-transparent px-6 py-8 text-center text-[28px] font-semibold text-paper outline-none placeholder:text-paper/30",
					placeholder: t("storyText"),
					value: text,
					onChange: (e) => setText(e.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center gap-2 pb-4",
					children: bgs.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn("size-8 rounded-full", bg === c && "ring-2 ring-accent"),
						style: { background: c },
						onClick: () => setBg(c)
					}, c))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 pb-8",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMusicButton, {
							track: music,
							onClick: () => setMusicOpen(true)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryTtlPicker, {
							value: ttlMs,
							onChange: setTtlMs
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							className: "w-full",
							disabled: !text.trim(),
							onClick: () => {
								addStory({
									type: "text",
									text: text.trim(),
									bg,
									ttlMs,
									music: music ?? void 0
								});
								pop();
							},
							children: t("publish")
						})
					]
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 overflow-y-auto no-scrollbar px-4 pb-8",
				children: [mode === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-center text-[12px] text-muted",
					children: t("storyVideoMax")
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoryMediaGrid, {
					kind: mode === "video" ? "video" : "image",
					onPick: setDraft
				})]
			}),
			picker
		]
	});
}
function StoryTtlPicker({ value, onChange }) {
	const t = useT();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-center text-[12px] font-medium text-muted",
			children: t("storyTtl")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
				active: value === STORY_TTL_24H,
				onClick: () => onChange(STORY_TTL_24H),
				children: t("story24h")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
				active: value === STORY_TTL_48H,
				onClick: () => onChange(STORY_TTL_48H),
				children: t("story48h")
			})]
		})]
	});
}
//#endregion
export { NewStoryScreen, StoriesScreen };

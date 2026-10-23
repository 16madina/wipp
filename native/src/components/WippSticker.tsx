import { useEffect, useRef, useState } from "react";
import { STICKER_FOCUS } from "../generated/sticker-focus";
import { Asset } from "expo-asset";
import { cacheDirectory, copyAsync, downloadAsync, getInfoAsync, makeDirectoryAsync, writeAsStringAsync } from "expo-file-system/legacy";
import { Image } from "expo-image";
import { Animated, Easing, Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { wippSrc } from "../lib/assets";
import { stickerById, stickerLabel } from "../lib/stickers";
import { colors } from "../theme";

function isAnimatedImage(path?: string) {
  return Boolean(path && /\.(webp|gif)(\?|$)/i.test(path));
}

function isVideo(path?: string) {
  return Boolean(path && /\.(mp4|webm)(\?|$)/i.test(path));
}

function animatedSource(src: number | { uri: string }) {
  if (typeof src === "number") return src;
  return { uri: src.uri, isAnimated: true as const };
}

/** Green-screen sticker clip. The WebP posters have no motion; the mp4 does. */
function clipHtml(file: string, loop?: boolean) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:transparent;overflow:hidden}canvas,video{position:absolute;inset:0;width:100%;height:100%}video{opacity:0.02}</style></head><body><video id="v" src="${file}"${/^https?:/.test(file) ? ' crossorigin="anonymous"' : ""} muted playsinline webkit-playsinline ${loop ? "loop" : ""} autoplay></video><canvas id="c"></canvas><script>`;
}

/** Navigateur (aperçu web) : même lecteur fond vert, dans une iframe (pas de WebView ni de fichiers locaux). */
function ChromaClipWeb({ source, loop, still, black, extra, onReady }: { source: number | string; loop?: boolean; still?: boolean; black?: boolean; extra?: ClipExtra; onReady: () => void }) {
  const ready = useRef(onReady);
  ready.current = onReady;
  const frame = useRef<HTMLIFrameElement | null>(null);
  const uri = typeof source === "string" ? source : Asset.fromModule(source).uri;
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data === "wipp-clip-ready" && e.source === frame.current?.contentWindow) ready.current();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  // opacity 0 : le navigateur joue quand même la vidéo (sur iPhone il faut 0.02), sans laisser de rectangle visible.
  const html = (clipHtml(uri, loop && !extra?.start) + CLIP_SCRIPT(loop, still, black, extra)).replace("video{opacity:0.02}", "video{opacity:0}").replace(
    "window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('ready');",
    "window.parent.postMessage('wipp-clip-ready','*');",
  );
  return (
    <iframe
      ref={frame}
      srcDoc={html}
      title="sticker"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", pointerEvents: "none" }}
    />
  );
}

/** Personal clips: words drawn by WIPP over the video, and seconds skipped at the start. */
type ClipExtra = { start?: number; text?: string; pop?: boolean };

function ChromaClip({ source, loop, still, black, extra, onReady }: { source: number | string; loop?: boolean; still?: boolean; black?: boolean; extra?: ClipExtra; onReady: () => void }) {
  if (Platform.OS === "web") return <ChromaClipWeb source={source} loop={loop} still={still} black={black} extra={extra} onReady={onReady} />;
  return <ChromaClipNative source={source} loop={loop} still={still} black={black} extra={extra} onReady={onReady} />;
}

function ChromaClipNative({ source, loop, still, black, extra, onReady }: { source: number | string; loop?: boolean; still?: boolean; black?: boolean; extra?: ClipExtra; onReady: () => void }) {
  const [page, setPage] = useState<string | null>(null);
  const [dir, setDir] = useState<string | null>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let live = true;
    // A personal Wippmoji comes from the internet (an address); the built-in stickers ship inside the app.
    const asset = typeof source === "number" ? Asset.fromModule(source) : null;
    void (asset ? asset.downloadAsync() : Promise.resolve(null)).then(async () => {
      if (!live) return;
      const uri = asset ? (asset.localUri ?? asset.uri) : (source as string);
      if (!uri || !cacheDirectory) return;
      // In the installed app the clip sits inside the app itself, where nothing can be written. The player
      // page and a copy of the clip go side by side in the cache folder instead (the web view may only
      // read one folder), otherwise the page is never created and the sticker stays on its first image.
      const folder = `${cacheDirectory}wipp-clips/`;
      await makeDirectoryAsync(folder, { intermediates: true }).catch(() => undefined);
      const name = asset ? asset.hash || (uri.split("?")[0] ?? uri).split("/").pop() || "clip" : (uri.split("?")[0] ?? uri).split("/").slice(-2).join("");
      const file = `${name.replace(/[^a-zA-Z0-9]/g, "")}.${asset?.type || "mp4"}`;
      const info = await getInfoAsync(folder + file);
      if (!info.exists) {
        if (asset) await copyAsync({ from: uri, to: folder + file });
        else await downloadAsync(uri, folder + file);
      }
      const tag = extra ? `-x${Math.abs([...JSON.stringify(extra)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7))}` : "";
      const htmlUri = `${folder}${file}${loop ? "-loop" : ""}${still ? "-still" : ""}${black ? "-black" : ""}${tag}.html`;
      await writeAsStringAsync(htmlUri, clipHtml(file, loop && !extra?.start) + CLIP_SCRIPT(loop, still, black, extra));
      if (!live) return;
      setDir(folder);
      setPage(htmlUri);
    }).catch((err) => {
      void import("../lib/crash-log").then(({ logAppError }) => logAppError(err, false, "sticker clip"));
    });
    return () => {
      live = false;
    };
  }, [source, loop, still, black, extra?.start, extra?.text, extra?.pop]);
  if (!page || !dir) return null;
  return (
    <WebView
      onError={(e) => void import("../lib/crash-log").then(({ logAppError }) => logAppError(new Error(`sticker clip webview: ${e.nativeEvent.description}`), false, "sticker"))}
      originWhitelist={["*"]}
      source={{ uri: page }}
      allowingReadAccessToURL={dir}
      allowFileAccess
      style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      containerStyle={{ backgroundColor: "transparent" }}
      opaque={false}
      scrollEnabled={false}
      bounces={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      pointerEvents="none"
      androidLayerType="hardware"
      onMessage={(e) => {
        const data = e.nativeEvent.data;
        if (data === "ready") ready.current();
        // Anything else is the player saying why it cannot play: kept in the phone's error journal.
        else void import("../lib/crash-log").then(({ logAppError }) => logAppError(new Error(`sticker clip: ${String(data).slice(0, 200)}`), false, "sticker"));
      }}
    />
  );
}

function CLIP_SCRIPT(loop?: boolean, still?: boolean, black?: boolean, extra?: ClipExtra) {
  const start = Math.max(0, extra?.start ?? 0);
  const words = extra?.text ? JSON.stringify(extra.text) : "null";
  return `
const v=document.getElementById('v'); const c=document.getElementById('c');
const ctx=c.getContext('2d',{willReadFrequently:true});
let sent=false, told=false;
function tell(m){ if(told) return; told=true; try{ window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('error '+m); }catch(e){} }
window.onerror=function(m){ tell(String(m)); };
function fit(){ const w=window.innerWidth,h=window.innerHeight; if(w<2||h<2) return false; const d=Math.min(2,window.devicePixelRatio||1); const W=Math.round(w*d),H=Math.round(h*d); if(c.width!==W||c.height!==H){ c.width=W; c.height=H; } return true; }
let blue=null;
const START=${start}, WORDS=${words}, POP=${extra?.pop ? "true" : "false"};
// The words are drawn by WIPP (never in the video): always readable, sized to the sticker, never cut.
function drawWords(dx,dy,dw,dh){ if(!WORDS) return; const dur=(v.duration||6)-START; const t=v.currentTime-START; const at=Math.max(0.6,dur*0.3); if(!${still ? "true" : "false"}&&t<at) return;
 const k=Math.min(1,(t-at)/0.28); const s=${still ? "1" : "(k<1?0.6+0.55*k-0.15*k*k:1)"};
 let fs=Math.round(dh*(POP?0.15:0.19)); const fam='"Arial Rounded MT Bold","Arial Black","Helvetica Neue",Arial,sans-serif';
 ctx.font='900 '+fs+'px '+fam; while(ctx.measureText(WORDS).width>dw*0.86&&fs>8){ fs-=1; ctx.font='900 '+fs+'px '+fam; }
 const x=dx+dw/2, y=dy+dh*(POP?0.86:0.83);
 ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
 ctx.lineWidth=Math.max(2,fs*0.2); ctx.strokeStyle=POP?'#ffffff':'#111111'; ctx.shadowColor='rgba(0,0,0,0.35)'; ctx.shadowBlur=fs*0.15; ctx.shadowOffsetY=fs*0.05;
 ctx.strokeText(WORDS,0,0); ctx.shadowColor='transparent'; ctx.fillStyle=POP?'#EC2880':'#FFD84D'; ctx.fillText(WORDS,0,0); ctx.restore(); }
// A sticker that holds green (frog, green text) is filmed on a blue background: the corner of the first image tells which.
function key(px){ const p=px.data; ${black ? "for(let i=0;i<p.length;i+=4){ const m=Math.max(p[i],p[i+1],p[i+2]); if(m<22) p[i+3]=0; else if(m<70) p[i+3]=Math.round(p[i+3]*(m-22)/48); } return;" : ""} if(blue===null){ blue=p[2]-Math.max(p[0],p[1])>40; }
 for(let i=0;i<p.length;i+=4){ const r=p[i],g=blue?p[i+2]:p[i+1],b=blue?p[i+1]:p[i+2],maxRB=Math.max(r,b),lead=g-maxRB;
 if(g>48&&lead>14&&g>(r+b)*0.42){ const spill=Math.min(1,lead/36); p[i+3]=Math.round(p[i+3]*Math.max(0,1-spill*1.35)); }
 else if(g>r&&g>b&&lead>6){ p[blue?i+2:i+1]=maxRB+Math.round(lead*0.25); } } }
function frame(){ try{ if(v.readyState>=2 && fit()){ ctx.clearRect(0,0,c.width,c.height); const vw=v.videoWidth||c.width,vh=v.videoHeight||c.height,k=Math.min(c.width/vw,c.height/vh),dw=Math.round(vw*k),dh=Math.round(vh*k),dx=Math.round((c.width-dw)/2),dy=Math.round((c.height-dh)/2); ctx.drawImage(v,dx,dy,dw,dh); const img=ctx.getImageData(dx,dy,dw,dh); key(img); ctx.putImageData(img,dx,dy); drawWords(dx,dy,dw,dh); if(!sent){ sent=true; window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('ready'); } } }catch(e){ tell('draw '+(e&&e.message||e)); return; } requestAnimationFrame(frame); }
v.playbackRate=${loop ? "0.92" : "1"};
v.addEventListener('loadeddata',()=>{ if(START>0&&v.currentTime<START) v.currentTime=START; const p=v.play(); if(p&&p.catch) p.catch(function(e){ tell('play '+(e&&e.name||e)); }); });
v.addEventListener('error',()=>{ tell('video '+(v.error&&v.error.code)); });
setTimeout(()=>{ if(!sent) tell('late ready='+v.readyState+' paused='+v.paused+' net='+v.networkState+' size='+window.innerWidth+'x'+window.innerHeight+' t='+v.currentTime); },4000);
${loop ? (start ? "v.addEventListener('ended',()=>{ v.currentTime=START; v.play(); });" : "") : "v.addEventListener('timeupdate',()=>{ if(v.currentTime>=(v.duration||3.17)-0.12) v.pause(); });"}
${still ? "v.addEventListener('playing',()=>setTimeout(()=>v.pause(),120));" : ""}
requestAnimationFrame(frame);
</script></body></html>`;
}

function MotionPoster({ source, motion, box }: { source: number | { uri: string }; motion: string; box: { width: number | "100%"; height: number | "100%" } }) {
  const shift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sway = /arrive|route|voyage|peek|shop/.test(motion);
    const shake = /mdr|debout|crack|call|nope|aie/.test(motion);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: shake ? 90 : sway ? 520 : 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shift, { toValue: -1, duration: shake ? 90 : sway ? 520 : 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [motion, shift]);
  const travel = /arrive|route|voyage|peek|shop/.test(motion) ? 10 : /mdr|debout|crack|call|nope|aie/.test(motion) ? 3 : 0;
  const lift = travel ? 0 : 7;
  return (
    <Animated.View
      style={{
        width: box.width,
        height: box.height,
        transform: [
          { translateX: shift.interpolate({ inputRange: [-1, 1], outputRange: [-travel, travel] }) },
          { translateY: shift.interpolate({ inputRange: [-1, 1], outputRange: [lift, -lift] }) },
          { rotate: shift.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] }) },
        ],
      }}
    >
      <Image source={source} style={{ width: "100%", height: "100%" }} contentFit="contain" />
    </Animated.View>
  );
}

/** Personal Wippmoji made in the Studio: « wm:<path of the clip> » in the public « wippmoji » storage. */
/** "wm:<path>#pop&t=<words>&s=<seconds>": the clip, whether it is a WippPop, its words and its start offset. */
export function parseWippmojiId(id: string) {
  const [path = "", flags = ""] = id.slice(3).split("#");
  const parts = flags.split("&").filter(Boolean);
  const get = (k: string) => {
    const p = parts.find((x) => x.startsWith(`${k}=`));
    return p ? decodeURIComponent(p.slice(k.length + 1)) : undefined;
  };
  return { path, pop: parts.includes("pop"), text: get("t"), start: Number(get("s")) || 0, enter: get("e"), exit: get("x") };
}

export function wippmojiClipUrl(id: string) {
  const { path } = parseWippmojiId(id);
  return `https://wippapp.com/wm/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function personalExtra(id: string): ClipExtra | undefined {
  const { pop, text, start } = parseWippmojiId(id);
  return text || start ? { pop, text, start } : undefined;
}

function PersonalSticker({ id, size, fill, still, loop }: { id: string; size: number; fill?: boolean; still?: boolean; loop?: boolean }) {
  const box = fill ? { width: "100%" as const, height: "100%" as const } : { width: size, height: size };
  return (
    <View style={box}>
      <ChromaClip source={wippmojiClipUrl(id)} still={still} loop={loop ?? !still} extra={personalExtra(id)} onReady={() => undefined} />
    </View>
  );
}

export function WippSticker(props: { id: string; size?: number; loop?: boolean; fill?: boolean; still?: boolean }) {
  if (props.id.startsWith("wm:")) return <PersonalSticker id={props.id} size={props.size ?? 48} fill={props.fill} still={props.still} loop={props.loop} />;
  return <BuiltInSticker {...props} />;
}

function BuiltInSticker({
  id,
  size = 48,
  fill = false,
  still = false,
}: {
  id: string;
  size?: number;
  loop?: boolean;
  fill?: boolean;
  /** Picker grid: first image only — no animation, no video player (dozens at once froze the iPhone). */
  still?: boolean;
}) {
  const row = stickerById(id);
  const poster = row ? wippSrc(row.src) : undefined;
  const anim = row?.anim ? wippSrc(row.anim) : undefined;
  // Sur navigateur, une vidéo locale arrive sous forme d'adresse (texte) et non de numéro de ressource.
  const clipSource = typeof anim === "number" || (Platform.OS === "web" && typeof anim === "string") ? (anim as number | string) : undefined;
  const video = Boolean(isVideo(row?.anim) && clipSource != null);
  const imageAnim = !video && (isAnimatedImage(row?.anim) || isAnimatedImage(row?.src));
  const imageSrc = (isAnimatedImage(row?.anim) ? anim : undefined) || (isAnimatedImage(row?.src) ? poster : undefined) || poster;
  const [broken, setBroken] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const img = useRef<Image>(null);
  const box = fill ? { width: "100%" as const, height: "100%" as const } : { width: size, height: size };
  const shown = broken ? poster : imageSrc;

  useEffect(() => {
    setBroken(false);
    setClipReady(false);
  }, [id]);

  if (still) {
    if (!poster) return <View style={box} />;
    // The picture keeps room around the character for its animation: zoom the still on the character,
    // so every emoji of a row looks the same size.
    const focus = fill ? undefined : STICKER_FOCUS[id];
    if (focus) {
      const [ratio, x0, y0, x1, y1] = focus;
      const w = ratio < 1 ? size * ratio : size;
      const h = ratio < 1 ? size : size / ratio;
      const k = (size * 0.94) / Math.max((x1 - x0) * w, (y1 - y0) * h);
      return (
        <View style={{ width: size, height: size, overflow: "hidden" }}>
          <Image
            recyclingKey={`still-${id}`}
            source={typeof poster === "number" ? poster : { uri: poster.uri, isAnimated: false }}
            style={{ position: "absolute", width: w * k, height: h * k, left: size / 2 - ((x0 + x1) / 2) * w * k, top: size / 2 - ((y0 + y1) / 2) * h * k }}
            contentFit="fill"
            autoplay={false}
            allowDownscaling
            cachePolicy="memory-disk"
          />
        </View>
      );
    }
    return (
      <Image
        recyclingKey={`still-${id}`}
        source={typeof poster === "number" ? poster : { uri: poster.uri, isAnimated: false }}
        style={box}
        contentFit="contain"
        autoplay={false}
        allowDownscaling
        cachePolicy="memory-disk"
      />
    );
  }

  if (video && clipSource != null) {
    return (
      <View style={box}>
        {poster && !clipReady ? <Image source={poster} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="contain" /> : null}
        <ChromaClip source={clipSource} loop={row?.loopSoft} onReady={() => setClipReady(true)} />
      </View>
    );
  }

  if (row?.motion && poster && !imageAnim) {
    return <MotionPoster source={poster} motion={row.motion} box={box} />;
  }

  if (shown) {
    const animate = imageAnim && !broken;
    // Same zoom as the still picture (no jump when it starts moving); the animation may spill over the frame.
    const focus = fill ? undefined : STICKER_FOCUS[id];
    const [ratio, x0, y0, x1, y1] = focus ?? [1, 0, 0, 1, 1];
    const w = ratio < 1 ? size * ratio : size;
    const h = ratio < 1 ? size : size / ratio;
    const k = (size * 0.94) / Math.max((x1 - x0) * w, (y1 - y0) * h);
    const zoomed = { position: "absolute" as const, width: w * k, height: h * k, left: size / 2 - ((x0 + x1) / 2) * w * k, top: size / 2 - ((y0 + y1) / 2) * h * k };
    const picture = (
      <Image
        ref={img}
        recyclingKey={id}
        source={animate ? animatedSource(shown) : shown}
        placeholder={poster}
        style={focus ? zoomed : box}
        contentFit={focus ? "fill" : "contain"}
        autoplay={animate}
        useAppleWebpCodec={false}
        allowDownscaling={!animate}
        cachePolicy="memory-disk"
        onDisplay={() => {
          if (animate && Platform.OS !== "web") void img.current?.startAnimating();
        }}
        onError={() => {
          if (animate) setBroken(true);
        }}
      />
    );
    return focus ? <View style={{ width: size, height: size, overflow: "visible" }}>{picture}</View> : picture;
  }
  return (
    <View style={{ ...box, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: Math.max(11, size / 6), color: colors.muted, textAlign: "center" }} numberOfLines={2}>
        {stickerLabel(id, "fr")}
      </Text>
    </View>
  );
}

/** A WippPop clip (filmed on black), played once over the whole area it is given. */
export function PopClip({ uri, still }: { uri: string; still?: boolean }) {
  return <ChromaClip source={uri} black still={still} onReady={() => undefined} />;
}

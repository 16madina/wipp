import { useEffect, useRef, useState } from "react";
import { Asset } from "expo-asset";
import { writeAsStringAsync } from "expo-file-system/legacy";
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
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:transparent;overflow:hidden}canvas,video{position:absolute;inset:0;width:100%;height:100%}video{opacity:0.02}</style></head><body><video id="v" src="${file}" muted playsinline webkit-playsinline ${loop ? "loop" : ""} autoplay></video><canvas id="c"></canvas><script>`;
}

/** Navigateur (aperçu web) : même lecteur fond vert, dans une iframe (pas de WebView ni de fichiers locaux). */
function ChromaClipWeb({ source, loop, onReady }: { source: number | string; loop?: boolean; onReady: () => void }) {
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
  const html = (clipHtml(uri, loop) + CLIP_SCRIPT(loop)).replace("video{opacity:0.02}", "video{opacity:0}").replace(
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

function ChromaClip({ source, loop, onReady }: { source: number | string; loop?: boolean; onReady: () => void }) {
  if (Platform.OS === "web") return <ChromaClipWeb source={source} loop={loop} onReady={onReady} />;
  if (typeof source !== "number") return null;
  return <ChromaClipNative source={source} loop={loop} onReady={onReady} />;
}

function ChromaClipNative({ source, loop, onReady }: { source: number; loop?: boolean; onReady: () => void }) {
  const [page, setPage] = useState<string | null>(null);
  const [dir, setDir] = useState<string | null>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let live = true;
    const asset = Asset.fromModule(source);
    void asset.downloadAsync().then(async () => {
      if (!live) return;
      const uri = asset.localUri ?? asset.uri;
      if (!uri) return;
      const clean = uri.split("?")[0] ?? uri;
      const slash = clean.lastIndexOf("/");
      const folder = slash >= 0 ? clean.slice(0, slash + 1) : clean;
      const file = slash >= 0 ? clean.slice(slash + 1) : clean;
      const htmlUri = `${folder}wipp-clip-${file}.html`;
      await writeAsStringAsync(htmlUri, clipHtml(file, loop) + CLIP_SCRIPT(loop));
      if (!live) return;
      setDir(folder);
      setPage(htmlUri);
    }).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [source, loop]);
  if (!page || !dir) return null;
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ uri: page }}
      allowingReadAccessToURL={dir}
      style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      containerStyle={{ backgroundColor: "transparent" }}
      opaque={false}
      scrollEnabled={false}
      bounces={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      pointerEvents="none"
      androidLayerType="hardware"
      onMessage={() => ready.current()}
    />
  );
}

function CLIP_SCRIPT(loop?: boolean) {
  return `
const v=document.getElementById('v'); const c=document.getElementById('c');
const ctx=c.getContext('2d',{willReadFrequently:true});
let sent=false;
function fit(){ const w=window.innerWidth,h=window.innerHeight; if(w<2||h<2) return false; const d=Math.min(2,window.devicePixelRatio||1); const W=Math.round(w*d),H=Math.round(h*d); if(c.width!==W||c.height!==H){ c.width=W; c.height=H; } return true; }
function key(px){ const p=px.data; for(let i=0;i<p.length;i+=4){ const r=p[i],g=p[i+1],b=p[i+2],maxRB=Math.max(r,b),lead=g-maxRB;
 if(g>48&&lead>14&&g>(r+b)*0.42){ const spill=Math.min(1,lead/36); p[i+3]=Math.round(p[i+3]*Math.max(0,1-spill*1.35)); }
 else if(g>r&&g>b&&lead>6){ p[i+1]=maxRB+Math.round(lead*0.25); } } }
function frame(){ if(v.readyState>=2 && fit()){ ctx.clearRect(0,0,c.width,c.height); const vw=v.videoWidth||c.width,vh=v.videoHeight||c.height,k=Math.min(c.width/vw,c.height/vh),dw=Math.round(vw*k),dh=Math.round(vh*k),dx=Math.round((c.width-dw)/2),dy=Math.round((c.height-dh)/2); ctx.drawImage(v,dx,dy,dw,dh); const img=ctx.getImageData(dx,dy,dw,dh); key(img); ctx.putImageData(img,dx,dy); if(!sent){ sent=true; window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('ready'); } } requestAnimationFrame(frame); }
v.playbackRate=${loop ? "0.92" : "1"};
v.addEventListener('loadeddata',()=>{ v.play(); });
${loop ? "" : "v.addEventListener('timeupdate',()=>{ if(v.currentTime>=3.05) v.pause(); });"}
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

export function WippSticker({
  id,
  size = 48,
  fill = false,
}: {
  id: string;
  size?: number;
  loop?: boolean;
  fill?: boolean;
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
    return (
      <Image
        ref={img}
        recyclingKey={id}
        source={animate ? animatedSource(shown) : shown}
        placeholder={poster}
        style={box}
        contentFit="contain"
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
  }
  return (
    <View style={{ ...box, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: Math.max(11, size / 6), color: colors.muted, textAlign: "center" }} numberOfLines={2}>
        {stickerLabel(id, "fr")}
      </Text>
    </View>
  );
}

import { useEffect, useRef, useState } from "react";
import { useWgoStore } from "@/lib/store";

export async function prepareAr() {
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof D.requestPermission === "function") {
    try {
      await D.requestPermission();
    } catch {
      /* the camera still works without tilt */
    }
  }
}

export function ArView({ src, onClose }: { src: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const lang = useWgoStore((s) => s.language);
  const [err, setErr] = useState<string | null>(null);
  const fr = lang === "fr";

  useEffect(() => {
    let stream: MediaStream | null = null;
    let dead = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!dead) setErr(fr ? "Cet appareil n’ouvre pas la caméra." : "This device can’t open the camera.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch {
        if (!dead) setErr(fr ? "Autorise la caméra pour poser le gâteau dans la pièce." : "Allow the camera to place the cake in the room.");
      }
    })();
    return () => {
      dead = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [fr]);

  useEffect(() => {
    const onTilt = (e: DeviceOrientationEvent) => {
      const el = anchorRef.current;
      if (!el) return;
      const x = Math.max(-40, Math.min(40, e.gamma ?? 0)) * 2.2;
      const y = Math.max(-35, Math.min(35, (e.beta ?? 45) - 45)) * 1.6;
      el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, []);

  return (
    <div className="absolute inset-0 z-[110] bg-black">
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />
      <div ref={anchorRef} className="ar-anchor">
        <i className="ar-halo" />
        <img src={src} alt="" draggable={false} className="ar-cake" />
      </div>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
        <p className="text-[13px] font-bold text-white drop-shadow">WIPP RA</p>
        <button type="button" className="h-9 rounded-full bg-black/55 px-3 text-[13px] font-semibold text-white" onClick={onClose}>
          {fr ? "Fermer" : "Close"}
        </button>
      </div>
      <p className="absolute inset-x-4 bottom-6 text-center text-[13px] font-medium text-white drop-shadow">
        {err ?? (fr ? "Bouge le téléphone. Le gâteau reste devant toi." : "Move the phone. The cake stays in front of you.")}
      </p>
    </div>
  );
}

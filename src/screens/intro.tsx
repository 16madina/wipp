import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/store";

const INTRO_SRC = "/brand/wipp-boot.mp4";
const INTRO_POSTER = "/brand/wipp-boot.webp";
const INTRO_BG = "#02081e";

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    video.playsInline = true;

    const playWithSound = () => {
      video.muted = false;
      video.volume = 1;
      return video.play();
    };

    void playWithSound().then(
      () => setNeedsTap(false),
      () => {
        video.pause();
        setNeedsTap(true);
      },
    );

    const unlock = () => {
      if (finished.current) return;
      if (!video.paused && !video.muted) return;
      video.currentTime = 0;
      void playWithSound().then(
        () => setNeedsTap(false),
        () => {},
      );
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const failSafe = window.setTimeout(finish, 4800);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.clearTimeout(failSafe);
    };
  }, []);

  return (
    <button
      type="button"
      className="relative flex h-full w-full items-end justify-center overflow-hidden"
      style={{ background: INTRO_BG }}
      aria-label="Wipp"
      onClick={() => {
        const video = videoRef.current;
        if (!video || finished.current) return;
        video.muted = false;
        video.volume = 1;
        video.currentTime = 0;
        void video.play().then(() => setNeedsTap(false));
      }}
    >
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 size-full object-cover"
        src={INTRO_SRC}
        poster={INTRO_POSTER}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />
      {needsTap ? (
        <span className="relative z-10 mb-16 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg">
          {t("introTapSound")}
        </span>
      ) : null}
    </button>
  );
}

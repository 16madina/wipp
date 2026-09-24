/** Browser voice note capture with pause / resume / preview. */

export type VoiceRecorder = {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ blob: Blob; url: string; durationSec: number } | null>;
  cancel: () => void;
  isRecording: () => boolean;
  isPaused: () => boolean;
};

function pickMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

/** Silent fallback blob when mic is unavailable (demo / denied). */
function silentWav(durationSec: number): Blob {
  const sampleRate = 8000;
  const samples = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples * 2, true);
  return new Blob([buffer], { type: "audio/wav" });
}

export function createVoiceRecorder(): VoiceRecorder {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let mime = pickMime();
  let startedAt = 0;
  let accumulatedMs = 0;
  let paused = false;
  let mock = false;
  let mockTimer = 0;

  function clearMock() {
    if (mockTimer) window.clearInterval(mockTimer);
    mockTimer = 0;
  }

  async function start() {
    cancel();
    chunks = [];
    accumulatedMs = 0;
    paused = false;
    startedAt = Date.now();
    mime = pickMime();

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mime = recorder.mimeType || mime;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(250);
      mock = false;
    } catch {
      mock = true;
      clearMock();
      mockTimer = window.setInterval(() => {
        /* duration tracked externally */
      }, 500);
    }
  }

  function pause() {
    if (paused) return;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      accumulatedMs += Date.now() - startedAt;
      paused = true;
      return;
    }
    if (mock && !paused) {
      accumulatedMs += Date.now() - startedAt;
      paused = true;
      clearMock();
    }
  }

  function resume() {
    if (!paused) return;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      startedAt = Date.now();
      paused = false;
      return;
    }
    if (mock) {
      startedAt = Date.now();
      paused = false;
    }
  }

  function elapsedSec() {
    const live = paused || (!recorder && !mock) ? 0 : Date.now() - startedAt;
    return Math.max(0, (accumulatedMs + live) / 1000);
  }

  function stop(): Promise<{ blob: Blob; url: string; durationSec: number } | null> {
    return new Promise((resolve) => {
      const finish = (blob: Blob | null) => {
        const durationSec = Math.max(1, Math.round(elapsedSec()));
        teardown();
        if (!blob || blob.size === 0) {
          const fallback = silentWav(Math.min(durationSec, 30));
          resolve({ blob: fallback, url: URL.createObjectURL(fallback), durationSec });
          return;
        }
        resolve({ blob, url: URL.createObjectURL(blob), durationSec });
      };

      if (recorder && recorder.state !== "inactive") {
        if (recorder.state === "paused") {
          try {
            recorder.resume();
          } catch {
            /* ignore */
          }
        }
        recorder.onstop = () => {
          const type = mime || "audio/webm";
          finish(new Blob(chunks, { type }));
        };
        try {
          recorder.requestData();
        } catch {
          /* ignore */
        }
        recorder.stop();
        return;
      }

      if (mock) {
        if (!paused) accumulatedMs += Date.now() - startedAt;
        finish(silentWav(Math.min(Math.max(1, Math.round(elapsedSec())), 30)));
        return;
      }

      finish(null);
    });
  }

  function teardown() {
    clearMock();
    try {
      recorder?.stop();
    } catch {
      /* ignore */
    }
    recorder = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    paused = false;
    mock = false;
  }

  function cancel() {
    chunks = [];
    accumulatedMs = 0;
    teardown();
  }

  return {
    start,
    pause,
    resume,
    stop,
    cancel,
    isRecording: () => Boolean(recorder && recorder.state === "recording") || (mock && !paused && startedAt > 0),
    isPaused: () => paused,
  };
}

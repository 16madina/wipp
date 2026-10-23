/**
 * Who makes the pictures and videos. `xai` calls Grok Imagine (server only, key in XAI_API_KEY);
 * `mock` returns sample media and costs nothing — the default until WIPPMOJI_PROVIDER=xai is set.
 */
export type VideoStatus = { status: "pending" | "done" | "failed"; url?: string; error?: string };

export interface WippmojiProvider {
  name: "xai" | "mock";
  /** Reference character from the person's photo (data URI). Returns a temporary URL of the image. */
  createReference(photoDataUri: string, prompt: string): Promise<{ url: string }>;
  startVideo(imageUrl: string, prompt: string, seconds: number, vertical?: boolean): Promise<{ requestId: string }>;
  videoStatus(requestId: string): Promise<VideoStatus>;
}

const XAI = "https://api.x.ai/v1";

class XAIProvider implements WippmojiProvider {
  name = "xai" as const;
  constructor(private key: string, private imageModel: string, private videoModel: string) {}
  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${XAI}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`xai_${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  }
  async createReference(photoDataUri: string, prompt: string) {
    const data = await this.call<{ data?: { url?: string }[] }>("/images/edits", {
      method: "POST",
      body: JSON.stringify({ model: this.imageModel, prompt, image: { url: photoDataUri, type: "image_url" } }),
    });
    const url = data.data?.[0]?.url;
    if (!url) throw new Error("xai_no_image");
    return { url };
  }
  async startVideo(imageUrl: string, prompt: string, seconds: number, vertical = false) {
    const extra = vertical ? { aspect_ratio: "9:16", resolution: "480p" } : {};
    const data = await this.call<{ request_id?: string }>("/videos/generations", {
      method: "POST",
      body: JSON.stringify({ model: this.videoModel, prompt, image: { url: imageUrl }, duration: seconds, ...extra }),
    });
    if (!data.request_id) throw new Error("xai_no_request_id");
    return { requestId: data.request_id };
  }
  async videoStatus(requestId: string): Promise<VideoStatus> {
    const data = await this.call<{ status?: string; video?: { url?: string } }>(`/videos/${encodeURIComponent(requestId)}`);
    if (data.status === "done" && data.video?.url) return { status: "done", url: data.video.url };
    if (data.status === "failed" || data.status === "expired") return { status: "failed", error: data.status };
    return { status: "pending" };
  }
}

/** Sample media already published on the site: the whole flow can be tried without paying. */
class MockProvider implements WippmojiProvider {
  name = "mock" as const;
  private base = (process.env.WIPP_PUBLIC_ORIGIN || "https://wippapp.com").replace(/\/$/, "");
  async createReference() {
    return { url: `${this.base}/stickers/afro/sapee.webp` };
  }
  async startVideo() {
    return { requestId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  }
  async videoStatus(requestId: string): Promise<VideoStatus> {
    const started = Number(requestId.split("-")[1] ?? 0);
    if (Date.now() - started < 4000) return { status: "pending" };
    return { status: "done", url: `${this.base}/stickers/afro/sapee.mp4` };
  }
}

export function wippmojiProvider(): WippmojiProvider {
  const key = process.env.XAI_API_KEY?.trim();
  if (process.env.WIPPMOJI_PROVIDER === "xai" && key) {
    return new XAIProvider(key, process.env.WIPPMOJI_IMAGE_MODEL || "grok-imagine-image-2.0", process.env.WIPPMOJI_VIDEO_MODEL || "grok-imagine-video-1.5");
  }
  return new MockProvider();
}

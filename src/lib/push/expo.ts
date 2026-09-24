/** Expo Push Notification helper (no FCM server key required). */

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** High priority for incoming calls */
  priority?: "default" | "normal" | "high";
  channelId?: string;
  categoryId?: string;
};

export async function sendExpoPush(
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; tickets: unknown[] }> {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return { sent: 0, tickets: [] };

  const messages = unique.map((to) => ({
    to,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: payload.priority === "high" ? ("high" as const) : ("default" as const),
    channelId: payload.channelId,
    categoryId: payload.categoryId,
    mutableContent: true,
    _contentAvailable: true,
  }));

  const tickets: unknown[] = [];
  // Expo accepts batches of up to 100
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: unknown };
      if (Array.isArray(json.data)) tickets.push(...json.data);
      else if (json.data) tickets.push(json.data);
    } catch (err) {
      console.warn("[wipp-push] expo send failed", err);
    }
  }
  return { sent: unique.length, tickets };
}

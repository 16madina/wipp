/** Expo Push Notification helper (no FCM server key required). */

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** High priority for incoming calls */
  priority?: "default" | "normal" | "high";
  channelId?: string;
  categoryId?: string;
  collapseId?: string;
  badge?: number;
};

export type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

export async function sendExpoPush(
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; tickets: ExpoTicket[]; invalidTokens: string[] }> {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return { sent: 0, tickets: [], invalidTokens: [] };

  const messages = unique.map((to) => ({
    to,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: payload.priority === "high" ? ("high" as const) : ("default" as const),
    channelId: payload.channelId,
    categoryId: payload.categoryId,
    collapseId: payload.collapseId,
    badge: payload.badge,
    mutableContent: true,
    _contentAvailable: true,
  }));

  const tickets: ExpoTicket[] = [];
  const invalidTokens: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const chunkTokens = unique.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: ExpoTicket | ExpoTicket[] };
      const rows = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      tickets.push(...rows);
      rows.forEach((ticket, idx) => {
        const err = ticket.details?.error;
        if (ticket.status === "error" && (err === "DeviceNotRegistered" || err === "InvalidCredentials")) {
          const tok = chunkTokens[idx];
          if (tok) invalidTokens.push(tok);
        }
      });
    } catch (err) {
      console.warn("[wipp-push] expo send failed");
      void err;
    }
  }
  return { sent: unique.length, tickets, invalidTokens };
}

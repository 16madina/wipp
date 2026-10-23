import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

// Public Wippmoji files (stickers are shared in conversations), by unguessable path.
export const Route = createFileRoute("/wm/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!/^[\w./-]{5,200}$/.test(path) || path.includes("..")) return new Response("Not found", { status: 404 });
        const sql = await getSql();
        const rows = await sql<{ content_type: string; bytes: Uint8Array }>`select content_type, bytes from wippmoji_media where path = ${path} limit 1`;
        if (!rows[0]) return new Response("Not found", { status: 404 });
        return new Response(rows[0].bytes as unknown as BodyInit, {
          headers: { "Content-Type": rows[0].content_type, "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" },
        });
      },
    },
  },
});

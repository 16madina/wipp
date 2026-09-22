import { createFileRoute } from "@tanstack/react-router";
import { handleWippApi } from "@/lib/messaging/handler";

export const Route = createFileRoute("/api/wipp/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleWippApi(request),
      POST: ({ request }) => handleWippApi(request),
    },
  },
});

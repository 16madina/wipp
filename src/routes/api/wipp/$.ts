import { createFileRoute } from "@tanstack/react-router";
import { handleWippApi, handleWippOptions } from "@/lib/messaging/handler";

export const Route = createFileRoute("/api/wipp/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleWippApi(request),
      POST: ({ request }) => handleWippApi(request),
      PUT: ({ request }) => handleWippApi(request),
      OPTIONS: () => handleWippOptions(),
    },
  },
});

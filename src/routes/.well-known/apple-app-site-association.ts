import { createFileRoute } from "@tanstack/react-router";

function body() {
  const team = process.env.APPLE_TEAM_ID?.trim() ?? "";
  const details =
    /^[A-Z0-9]{10}$/.test(team)
      ? [{ appID: `${team}.com.wipp.app`, paths: ["/@*", "/t/*", "/g/*", "/b/*"] }]
      : [];
  return { applinks: { apps: [] as string[], details } };
}

export const Route = createFileRoute("/.well-known/apple-app-site-association")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(body()), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

function body() {
  // Apple Team ID is public (it is in every signed build); env var can override it.
  const team = process.env.APPLE_TEAM_ID?.trim() || "6XW2XM3NDF";
  const details =
    /^[A-Z0-9]{10}$/.test(team)
      ? [{ appID: `${team}.com.wipp.app`, paths: ["/@*", "/t/*", "/g/*", "/b/*", "/c/*", "/e/*"] }]
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

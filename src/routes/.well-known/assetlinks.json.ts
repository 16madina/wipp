import { createFileRoute } from "@tanstack/react-router";

const BODY = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.wipp.app",
      // Play Console → App signing: app signing key (Play Store installs) + upload key (Android Studio builds).
      // Never the public Android debug key: any app signed with it could claim wippapp.com links.
      sha256_cert_fingerprints: [
        "A1:B9:9A:1A:B7:6B:D4:72:E5:A6:9D:7A:FF:D6:76:EE:2F:25:4C:C8:6A:10:A6:15:51:4B:B1:68:2C:17:95:EA",
        "C3:CF:7D:28:65:8B:2D:D5:4F:BB:C1:C0:9C:4C:7D:6B:2C:A1:EA:47:E7:80:61:D0:82:9A:3B:5C:75:CB:20:E3",
      ],
    },
  },
];

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(BODY), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        }),
    },
  },
});

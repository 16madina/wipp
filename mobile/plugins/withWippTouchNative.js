const {
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} = require("expo/config-plugins");

/**
 * WIPP Touch native config:
 * - BLUETOOTH_SCAN neverForLocation (API 31+)
 * - LOCATION only maxSdkVersion=30 (legacy BLE scan)
 * - Associated domains / intent filters for https://wippapp.com/t/*
 * - Trim UIBackgroundModes to what WIPP actually needs
 *
 * @param {import('expo/config').ExpoConfig} config
 */
function withWippTouchNative(config) {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    // Keep only modes we can justify (see agent report / README).
    const allowed = new Set([
      "audio", // LiveKit / CallKeep audio in background
      "voip", // CallKit PushKit / incoming calls
      "remote-notification", // Expo push (Touch notif + calls)
      "bluetooth-central", // B scans for WIPP Touch
      "bluetooth-peripheral", // A advertises WIPP Touch (iOS)
    ]);
    const current = plist.UIBackgroundModes || [];
    plist.UIBackgroundModes = [...new Set(current.filter((m) => allowed.has(m)).concat([...allowed]))];

    const domains = new Set(plist.CFBundleURLTypes ? [] : []);
    // Associated Domains for Universal Links
    const applinks = "applinks:wippapp.com";
    const existing = plist["com.apple.developer.associated-domains"] || [];
    const set = new Set(existing);
    set.add(applinks);
    plist["com.apple.developer.associated-domains"] = [...set];

    plist.NSBluetoothAlwaysUsageDescription =
      plist.NSBluetoothAlwaysUsageDescription ||
      "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité, sans numéro.";
    plist.NSBluetoothPeripheralUsageDescription =
      plist.NSBluetoothPeripheralUsageDescription ||
      "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité.";

    void domains;
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const perms = manifest.manifest["uses-permission"];

    // Remove bare location / scan entries; re-add with correct flags.
    const strip = new Set([
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.NFC",
      "android.permission.BIND_NFC_SERVICE",
    ]);
    manifest.manifest["uses-permission"] = perms.filter((p) => !strip.has(p.$?.["android:name"]));

    manifest.manifest["uses-permission"].push(
      {
        $: {
          "android:name": "android.permission.BLUETOOTH_SCAN",
          "android:usesPermissionFlags": "neverForLocation",
        },
      },
      {
        $: {
          "android:name": "android.permission.ACCESS_FINE_LOCATION",
          "android:maxSdkVersion": "30",
        },
      },
      {
        $: {
          "android:name": "android.permission.ACCESS_COARSE_LOCATION",
          "android:maxSdkVersion": "30",
        },
      },
    );

    // Ensure BLE advertise / connect exist
    const names = new Set(
      manifest.manifest["uses-permission"].map((p) => p.$?.["android:name"]).filter(Boolean),
    );
    for (const name of [
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
    ]) {
      if (!names.has(name)) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    const app = manifest.manifest.application?.[0];
    if (app) {
      const mainActivity =
        app.activity?.find((a) => a.$?.["android:name"]?.includes("MainActivity")) ||
        app.activity?.[0];
      if (mainActivity) {
        if (!mainActivity["intent-filter"]) mainActivity["intent-filter"] = [];
        const hasTouchLink = mainActivity["intent-filter"].some((f) =>
          JSON.stringify(f).includes("wippapp.com") && JSON.stringify(f).includes("/t/"),
        );
        if (!hasTouchLink) {
          mainActivity["intent-filter"].push({
            action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
            category: [
              { $: { "android:name": "android.intent.category.DEFAULT" } },
              { $: { "android:name": "android.intent.category.BROWSABLE" } },
            ],
            data: [
              {
                $: {
                  "android:scheme": "https",
                  "android:host": "wippapp.com",
                  "android:pathPrefix": "/t/",
                },
              },
              {
                $: {
                  "android:scheme": "wipp",
                  "android:host": "t",
                },
              },
            ],
          });
        }
      }
    }

    AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    return cfg;
  });

  return config;
}

module.exports = withWippTouchNative;

const {
  withAndroidManifest,
  withInfoPlist,
  withAppBuildGradle,
  withGradleProperties,
  AndroidConfig,
} = require("expo/config-plugins");

/**
 * WIPP Touch native config:
 * - BLUETOOTH_SCAN neverForLocation (API 31+)
 * - LOCATION only maxSdkVersion=30 (legacy BLE scan)
 * - NFC for optional HCE fallback
 */
function withWippTouchNative(config) {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    const allowed = new Set([
      "audio",
      "voip",
      "remote-notification",
      "bluetooth-central",
      "bluetooth-peripheral",
    ]);
    const current = plist.UIBackgroundModes || [];
    plist.UIBackgroundModes = [...new Set(current.filter((m) => allowed.has(m)).concat([...allowed]))];

    const applinks = "applinks:wippapp.com";
    const existing = plist["com.apple.developer.associated-domains"] || [];
    plist["com.apple.developer.associated-domains"] = [...new Set([...existing, applinks])];

    plist.NSBluetoothAlwaysUsageDescription =
      plist.NSBluetoothAlwaysUsageDescription ||
      "WIPP Touch utilise le Bluetooth pour détecter un téléphone WIPP tout près, sans numéro ni e-mail.";
    plist.NSBluetoothPeripheralUsageDescription =
      plist.NSBluetoothPeripheralUsageDescription ||
      "WIPP Touch utilise le Bluetooth pour partager un identifiant temporaire à proximité.";
    plist.NFCReaderUsageDescription =
      plist.NFCReaderUsageDescription ||
      "WIPP peut lire une puce NFC WIPP comme complément à la proximité physique.";
    plist.NSFaceIDUsageDescription =
      plist.NSFaceIDUsageDescription ||
      "WIPP Privé utilise Face ID pour déverrouiller l’espace privé sur cet appareil.";
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const strip = new Set([
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.BLUETOOTH_SCAN",
    ]);
    manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"].filter(
      (p) => !strip.has(p.$?.["android:name"]),
    );

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

    const names = new Set(
      manifest.manifest["uses-permission"].map((p) => p.$?.["android:name"]).filter(Boolean),
    );
    for (const name of [
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.NFC",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
    ]) {
      if (!names.has(name)) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const i = cfg.modResults.findIndex((item) => item.type === "property" && item.key === key);
      const prop = { type: "property", key, value };
      if (i >= 0) cfg.modResults[i] = prop;
      else cfg.modResults.push(prop);
    };
    set("org.gradle.jvmargs", "-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8");
    set("org.gradle.workers.max", "1");
    set("org.gradle.parallel", "false");
    set("org.gradle.daemon", "false");
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (gradle.includes('abiFilters "arm64-v8a"')) return cfg;
    cfg.modResults.contents = gradle.replace(
      /buildTypes \{\s*debug \{/,
      'buildTypes {\n        debug {\n            ndk { abiFilters "arm64-v8a" }',
    );
    return cfg;
  });

  return config;
}

module.exports = withWippTouchNative;

const {
  withAndroidManifest,
  withInfoPlist,
  withAppBuildGradle,
  withGradleProperties,
  AndroidConfig,
} = require("expo/config-plugins");

/**
 * WIPP Touch native config:
 * - WIPP Touch uses NO Bluetooth and NO NFC: motion sensors + UWB (Nearby Interaction) only.
 * - LOCATION on every version: Explorer/annonces use the position (expo-location)
 * - BLUETOOTH / BLUETOOTH_CONNECT are kept for CALLS only (audio routing to a headset), not Touch.
 */
function withWippTouchNative(config) {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    const allowed = new Set([
      "audio",
      "voip",
      "remote-notification",
    ]);
    const current = plist.UIBackgroundModes || [];
    plist.UIBackgroundModes = [...new Set(current.filter((m) => allowed.has(m)).concat([...allowed]))];

    const applinks = "applinks:wippapp.com";
    const existing = plist["com.apple.developer.associated-domains"] || [];
    plist["com.apple.developer.associated-domains"] = [...new Set([...existing, applinks])];

    delete plist.NSBluetoothAlwaysUsageDescription;
    delete plist.NSBluetoothPeripheralUsageDescription;
    delete plist.NFCReaderUsageDescription;
    plist.NSNearbyInteractionUsageDescription =
      "WIPP Touch mesure la distance avec l’autre téléphone, uniquement pendant WIPP Touch, pour confirmer que vous êtes côte à côte.";
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
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.NFC",
    ]);
    manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"].filter(
      (p) => !strip.has(p.$?.["android:name"]),
    );

    manifest.manifest["uses-permission"].push(
      {
        $: {
          "android:name": "android.permission.ACCESS_FINE_LOCATION",
        },
      },
      {
        $: {
          "android:name": "android.permission.ACCESS_COARSE_LOCATION",
        },
      },
    );

    const names = new Set(
      manifest.manifest["uses-permission"].map((p) => p.$?.["android:name"]).filter(Boolean),
    );
    for (const name of [
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH",
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
    set("reactNativeArchitectures", "armeabi-v7a,arm64-v8a,x86,x86_64");
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents.replace(/\n\s*ndk \{\s*abiFilters "arm64-v8a"\s*\}/g, "");
    if (!gradle.includes('debug {\n            ndk { abiFilters "arm64-v8a" }')) {
      gradle = gradle.replace(
        /buildTypes \{\s*debug \{/,
        'buildTypes {\n        debug {\n            ndk { abiFilters "arm64-v8a" }',
      );
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });

  return config;
}

module.exports = withWippTouchNative;

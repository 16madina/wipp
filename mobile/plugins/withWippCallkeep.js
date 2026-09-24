const { withInfoPlist, withAndroidManifest } = require("expo/config-plugins");

/**
 * Expo config plugin: permissions / Info.plist for react-native-callkeep
 * (CallKit iOS + ConnectionService Android).
 * @param {import('expo/config').ExpoConfig} config
 */
function withWippCallkeep(config) {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    const modes = new Set(plist.UIBackgroundModes || []);
    modes.add("audio");
    modes.add("voip");
    modes.add("remote-notification");
    modes.add("fetch");
    plist.UIBackgroundModes = [...modes];
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const perms = [
      "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
      "android.permission.CALL_PHONE",
      "android.permission.READ_PHONE_STATE",
      "android.permission.USE_FULL_SCREEN_INTENT",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
      "android.permission.MANAGE_OWN_CALLS",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.VIBRATE",
    ];
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const existing = new Set(
      manifest.manifest["uses-permission"].map((p) => p.$?.["android:name"]).filter(Boolean),
    );
    for (const name of perms) {
      if (!existing.has(name)) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    const app = manifest.manifest.application?.[0];
    if (app) {
      if (!app.service) app.service = [];
      const hasVoice = app.service.some(
        (s) => s.$?.["android:name"] === "io.wazo.callkeep.VoiceConnectionService",
      );
      if (!hasVoice) {
        app.service.push({
          $: {
            "android:name": "io.wazo.callkeep.VoiceConnectionService",
            "android:label": "WIPP",
            "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
            "android:foregroundServiceType": "phoneCall",
            "android:exported": "true",
          },
          "intent-filter": [
            {
              action: [{ $: { "android:name": "android.telecom.ConnectionService" } }],
            },
          ],
        });
        app.service.push({
          $: {
            "android:name": "io.wazo.callkeep.RNCallKeepBackgroundMessagingService",
            "android:exported": "true",
          },
        });
      }
    }
    return cfg;
  });

  return config;
}

module.exports = withWippCallkeep;

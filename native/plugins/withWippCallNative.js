const { withAndroidManifest, withInfoPlist, AndroidConfig } = require("expo/config-plugins");

/** Incoming-call permissions. Does not invent an Apple Team ID or a signing key. */
function withWippCallNative(config) {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    plist.NSMicrophoneUsageDescription =
      "WIPP utilise le micro pour les messages vocaux et les appels audio.";
    plist.NSCameraUsageDescription =
      plist.NSCameraUsageDescription || "WIPP utilise la caméra pour les appels vidéo et le scan QR.";
    const modes = new Set(plist.UIBackgroundModes || []);
    modes.add("audio");
    modes.add("voip");
    modes.add("remote-notification");
    plist.UIBackgroundModes = [...modes];
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const names = new Set(manifest.manifest["uses-permission"].map((p) => p.$?.["android:name"]).filter(Boolean));
    for (const name of [
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.WAKE_LOCK",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MICROPHONE",
      "android.permission.FOREGROUND_SERVICE_CAMERA",
      "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
      "android.permission.USE_FULL_SCREEN_INTENT",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.VIBRATE",
      "android.permission.MANAGE_OWN_CALLS",
    ]) {
      if (!names.has(name)) manifest.manifest["uses-permission"].push({ $: { "android:name": name } });
    }
    AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    // Full-screen incoming call: let the call screen appear over the lock screen.
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
    main.$["android:showWhenLocked"] = "true";
    main.$["android:turnScreenOn"] = "true";
    // CallKeep: registerPhoneAccount() throws a SecurityException at startup without this service.
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app.service = (app.service || []).filter((s) => !String(s.$?.["android:name"]).startsWith("io.wazo.callkeep."));
    app.service.push(
      {
        $: {
          "android:name": "io.wazo.callkeep.VoiceConnectionService",
          "android:label": "WIPP",
          "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
          "android:foregroundServiceType": "camera|microphone",
          "android:exported": "true"
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.telecom.ConnectionService" } }] }]
      },
      { $: { "android:name": "io.wazo.callkeep.RNCallKeepBackgroundMessagingService" } }
    );
    return cfg;
  });

  return config;
}

module.exports = withWippCallNative;

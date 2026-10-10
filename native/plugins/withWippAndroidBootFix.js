const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

/**
 * Google Play (Android 15) : « Types de services de premier plan restreints ».
 * Des bibliothèques déclarent des récepteurs BOOT_COMPLETED (expo-task-manager, expo-notifications)
 * alors que l'app déclare aussi des services caméra / micro / appel : Play considère qu'un service
 * restreint pourrait démarrer au redémarrage du téléphone et que l'app plantera sur Android 15.
 *
 * WIPP n'a rien à relancer au démarrage du téléphone (pas de notification programmée pour plus tard,
 * pas de localisation en arrière-plan, pas de partage d'écran) :
 *  - on retire BOOT_COMPLETED / REBOOT / QUICKBOOT des deux récepteurs (le reste est gardé) ;
 *  - on retire les services inutilisés : localisation en arrière-plan (expo-location) et
 *    partage d'écran (MediaProjection de WebRTC).
 * La permission RECEIVE_BOOT_COMPLETED est retirée via android.blockedPermissions (app.json).
 */
function receiver(name, actions) {
  return {
    $: { "android:name": name, "android:enabled": "true", "android:exported": "false", "tools:node": "replace" },
    "intent-filter": [{ $: { "android:priority": "-1" }, action: actions.map((a) => ({ $: { "android:name": a } })) }],
  };
}

function withWippAndroidBootFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    const replaced = [
      receiver("expo.modules.taskManager.TaskBroadcastReceiver", [
        "expo.modules.taskManager.TaskBroadcastReceiver.INTENT_ACTION",
        "android.intent.action.MY_PACKAGE_REPLACED",
      ]),
      receiver("expo.modules.notifications.service.NotificationsService", [
        "expo.modules.notifications.NOTIFICATION_EVENT",
        "android.intent.action.MY_PACKAGE_REPLACED",
      ]),
    ];
    // notifee and WorkManager also listen for BOOT_COMPLETED. Notifee alarms target their receiver
    // explicitly, so it keeps working without the boot filter.
    replaced.push(
      { $: { "android:name": "app.notifee.core.RebootBroadcastReceiver", "tools:node": "remove" } },
      { $: { "android:name": "app.notifee.core.NotificationAlarmReceiver", "android:exported": "false", "tools:node": "replace" } },
      {
        $: {
          "android:name": "androidx.work.impl.background.systemalarm.RescheduleReceiver",
          "android:directBootAware": "false",
          "android:enabled": "false",
          "android:exported": "false",
          "tools:node": "replace",
        },
        "intent-filter": [
          { action: ["android.intent.action.TIME_SET", "android.intent.action.TIMEZONE_CHANGED"].map((a) => ({ $: { "android:name": a } })) },
        ],
      }
    );
    const names = new Set(replaced.map((r) => r.$["android:name"]));
    app.receiver = [...(app.receiver ?? []).filter((r) => !names.has(r.$?.["android:name"])), ...replaced];

    // WIPP 1.1: MediaProjectionService is kept (host screen sharing in a live, started by the user only).
    const removed = ["expo.modules.location.services.LocationTaskService"];
    app.service = [
      ...(app.service ?? []).filter((s) => !removed.includes(s.$?.["android:name"])),
      ...removed.map((name) => ({ $: { "android:name": name, "tools:node": "remove" } })),
    ];
    return cfg;
  });
}

module.exports = withWippAndroidBootFix;

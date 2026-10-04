const { withAppDelegate, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * iOS VoIP (PushKit): registers a VoIP token and, when a "ring" push arrives,
 * reports the call to CallKit right away in native code (required by iOS even when
 * WIPP is killed), then hands the payload to JS (react-native-voip-push-notification).
 */
const MARK = "// WIPP-VOIP";

function patchAppDelegate(src) {
  if (src.includes(MARK)) return src;
  src = src.replace("import Expo\n", `import Expo\nimport PushKit ${MARK}\n`);
  src = src.replace(
    "public class AppDelegate: ExpoAppDelegate {",
    "public class AppDelegate: ExpoAppDelegate, PKPushRegistryDelegate {",
  );
  src = src.replace(
    "    return super.application(application, didFinishLaunchingWithOptions: launchOptions)\n  }",
    `    RNVoipPushNotificationManager.voipRegistration() ${MARK}
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  ${MARK}
  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {}

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let data = payload.dictionaryPayload
    let uuid = (data["uuid"] as? String) ?? UUID().uuidString
    let caller = (data["callerName"] as? String) ?? "WIPP"
    let video = (data["kind"] as? String) == "video"
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)
    RNCallKeep.reportNewIncomingCall(uuid, handle: "wipp", handleType: "generic", hasVideo: video, localizedCallerName: caller, supportsHolding: false, supportsDTMF: false, supportsGrouping: false, supportsUngrouping: false, fromPushKit: true, payload: data, withCompletionHandler: completion)
    // The caller hung up / call answered elsewhere: iOS still requires the report above, then we end it at once.
    if let action = data["action"] as? String, action != "ring" {
      RNCallKeep.endCall(withUUID: uuid, reason: 2)
    }
  }`,
  );
  return src;
}

module.exports = function withWippVoip(config) {
  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language === "swift") cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });
  config = withDangerousMod(config, [
    "ios",
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
      const header = fs.readdirSync(dir).find((f) => f.endsWith("-Bridging-Header.h"));
      if (header) {
        const file = path.join(dir, header);
        let h = fs.readFileSync(file, "utf8");
        if (!h.includes("RNCallKeep.h")) {
          h += '\n#import "RNCallKeep.h"\n#import "RNVoipPushNotificationManager.h"\n';
          fs.writeFileSync(file, h);
        }
      }
      return cfg;
    },
  ]);
  return config;
};

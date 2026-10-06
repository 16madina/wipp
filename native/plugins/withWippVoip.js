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
  src = src.replace("import Expo\n", `import Expo\nimport PushKit ${MARK}\nimport CallKit ${MARK}\n`);
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
      // reason 3 = unanswered (nobody picked up), 2 = remote ended (caller hung up).
      RNCallKeep.endCall(withUUID: uuid, reason: (data["reason"] as? String) == "unanswered" ? 3 : 2)
    } else {
      // Safety net: if no "cancel" arrives (network lost, caller's phone off), stop ringing by itself
      // when the invitation expires on the server (60 s), unless the call was answered meanwhile.
      let now = Date().timeIntervalSince1970
      let expiresAt = (Double((data["expiresAt"] as? String) ?? "") ?? (now * 1000 + 60_000)) / 1000
      let delay = max(5, min(90, expiresAt - now + 2))
      DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
        let ringing = CXCallObserver().calls.first { $0.uuid.uuidString.lowercased() == uuid.lowercased() }
        if let call = ringing, !call.hasConnected, !call.hasEnded {
          RNCallKeep.endCall(withUUID: uuid, reason: 3)
        }
      }
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
      // Logo WIPP (template monochrome) shown on the CallKit in-call button
      const set = path.join(dir, "Images.xcassets", "CallKitLogo.imageset");
      fs.mkdirSync(set, { recursive: true });
      fs.copyFileSync(path.join(cfg.modRequest.projectRoot, "assets", "wipp-logo.png"), path.join(set, "CallKitLogo.png"));
      fs.writeFileSync(
        path.join(set, "Contents.json"),
        JSON.stringify({ images: [{ idiom: "universal", filename: "CallKitLogo.png" }], info: { version: 1, author: "expo" }, properties: { "template-rendering-intent": "template" } }),
      );
      return cfg;
    },
  ]);
  return config;
};

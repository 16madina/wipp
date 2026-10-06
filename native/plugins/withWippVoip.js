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
  src = src.replace("import Expo\n", `import Expo\nimport PushKit ${MARK}\nimport CallKit ${MARK}\nimport UserNotifications ${MARK}\n`);
  src = src.replace(
    "  ) -> Bool {\n    let delegate = ReactNativeDelegate()",
    `  ) -> Bool {
    // WIPP-VOIP: official ringtone stored before CallKit is set up (works from the very first launch after an update).
    var callKeepSettings = UserDefaults.standard.dictionary(forKey: "RNCallKeepSettings")
      ?? ["appName": "WIPP", "imageName": "CallKitLogo", "supportsVideo": true, "maximumCallGroups": "1", "maximumCallsPerCallGroup": "1"]
    callKeepSettings["ringtoneSound"] = "wipp_ring.caf"
    UserDefaults.standard.set(callKeepSettings, forKey: "RNCallKeepSettings")
    let delegate = ReactNativeDelegate()`,
  );
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

  /** Caller shown on the ringing screen, kept to name the "missed call" notice (the cancel push has no name). */
  static var callerNames: [String: String] = [:]
  /** Ringing calls whose « Appel manqué » notice is scheduled: expiry time and whether the caller hung up. */
  static var missedPending: [String: (expiry: TimeInterval, cancelled: Bool)] = [:]
  static let callObserver = CXCallObserver()
  static let callWatcher = CallWatcher()
  static var watchingCalls = false

  /** Answered → cancel the notice. Declined by me before the end → cancel it too (that is not "missed"). */
  final class CallWatcher: NSObject, CXCallObserverDelegate {
    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
      let key = call.uuid.uuidString.lowercased()
      guard let pending = AppDelegate.missedPending[key] else { return }
      if call.hasConnected {
        AppDelegate.cancelMissedCall(key)
      } else if call.hasEnded {
        let declinedByMe = !pending.cancelled && Date().timeIntervalSince1970 < pending.expiry - 3
        if declinedByMe { AppDelegate.cancelMissedCall(key) } else { AppDelegate.missedPending.removeValue(forKey: key) }
      }
    }
  }

  static func missedContent(_ key: String, video: Bool) -> UNMutableNotificationContent {
    let name = callerNames[key] ?? ""
    let content = UNMutableNotificationContent()
    content.title = "Appel manqué"
    content.body = name.isEmpty || name == "WIPP"
      ? (video ? "Appel vidéo WIPP manqué" : "Appel audio WIPP manqué")
      : "\\(name) · \\(video ? "appel vidéo" : "appel audio")"
    content.sound = UNNotificationSound(named: UNNotificationSoundName("wipp_message.caf"))
    content.userInfo = ["type": "missed-call", "screen": "calls"]
    return content
  }

  /** Scheduled when the call starts ringing: iOS shows it at expiry even if WIPP is suspended or closed. */
  static func scheduleMissedCall(uuid: String, video: Bool, at expiry: TimeInterval) {
    let key = uuid.lowercased()
    if !watchingCalls { watchingCalls = true; callObserver.setDelegate(callWatcher, queue: nil) }
    missedPending[key] = (expiry, false)
    let wait = max(1, expiry - Date().timeIntervalSince1970 + 1)
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: wait, repeats: false)
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "missed-\\(key)", content: missedContent(key, video: video), trigger: trigger), withCompletionHandler: nil)
  }

  /** The caller hung up before I answered: show « Appel manqué » now (replaces the scheduled one). */
  static func notifyMissedCall(uuid: String, video: Bool) {
    let key = uuid.lowercased()
    missedPending[key] = (missedPending[key]?.expiry ?? 0, true)
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["missed-\\(key)"])
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "missed-\\(key)", content: missedContent(key, video: video), trigger: nil), withCompletionHandler: nil)
  }

  static func cancelMissedCall(_ key: String) {
    missedPending.removeValue(forKey: key)
    callerNames.removeValue(forKey: key)
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["missed-\\(key)"])
  }

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let data = payload.dictionaryPayload
    let uuid = (data["uuid"] as? String) ?? UUID().uuidString
    let caller = (data["callerName"] as? String) ?? "WIPP"
    let video = (data["kind"] as? String) == "video"
    let action = (data["action"] as? String) ?? "ring"
    let key = uuid.lowercased()
    if action == "ring" { AppDelegate.callerNames[key] = caller }
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)
    RNCallKeep.reportNewIncomingCall(uuid, handle: "wipp", handleType: "generic", hasVideo: video, localizedCallerName: caller, supportsHolding: false, supportsDTMF: false, supportsGrouping: false, supportsUngrouping: false, fromPushKit: true, payload: data, withCompletionHandler: completion)
    if action != "ring" {
      // Caller hung up / nobody answered: iOS still requires the report above, then we end it at once.
      if action == "cancel" && AppDelegate.missedPending[key] != nil { AppDelegate.notifyMissedCall(uuid: uuid, video: video) }
      // reason 3 = unanswered (nobody picked up), 2 = remote ended (caller hung up).
      RNCallKeep.endCall(withUUID: uuid, reason: (data["reason"] as? String) == "unanswered" ? 3 : 2)
    } else {
      let now = Date().timeIntervalSince1970
      let expiresAt = (Double((data["expiresAt"] as? String) ?? "") ?? (now * 1000 + 60_000)) / 1000
      AppDelegate.scheduleMissedCall(uuid: uuid, video: video, at: expiresAt)
      // Safety net: if no "cancel" arrives (network lost, caller's phone off), stop ringing by itself
      // when the invitation expires on the server (60 s), unless the call was answered meanwhile.
      let delay = max(5, min(90, expiresAt - now + 2))
      DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
        let ringing = AppDelegate.callObserver.calls.first { $0.uuid.uuidString.lowercased() == key }
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

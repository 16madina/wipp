import ActivityKit
import AppIntents
import Foundation

/// Video call in progress (Live Activity): Dynamic Island + lock screen, with a « Me montrer / Pause » button.
/// Shared by the app and the WippLiveActivity extension (same type name on both sides).
@available(iOS 16.2, *)
struct WippCallAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// My camera is visible to the other person.
    var shown: Bool
  }
  /// Who I am talking with.
  var name: String
}

/// Button of the Live Activity: runs inside the WIPP app (call in progress), WIPP stays in the background.
@available(iOS 17.0, *)
struct WippToggleCameraIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Caméra de l'appel WIPP"
  static var isDiscoverable: Bool = false

  init() {}

  func perform() async throws -> some IntentResult {
    await MainActor.run {
      NotificationCenter.default.post(name: Notification.Name("WippToggleCallCamera"), object: nil)
    }
    return .result()
  }
}

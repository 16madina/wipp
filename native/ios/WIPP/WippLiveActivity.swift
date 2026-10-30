import ActivityKit
import Foundation
import React

/// JS bridge for the video-call Live Activity (start when the call connects, update when the camera
/// changes, end with the call). The button sends « onToggleCamera » to JS.
@objc(WippLiveActivity)
class WippLiveActivity: RCTEventEmitter {
  private var observer: NSObjectProtocol?
  private var listening = false
  /// A tap that arrived before JS was listening (kept, delivered as soon as it listens).
  private var pending = false

  override init() {
    super.init()
    observer = NotificationCenter.default.addObserver(forName: Notification.Name("WippToggleCallCamera"), object: nil, queue: .main) { [weak self] _ in
      guard let self else { return }
      if self.listening { self.sendEvent(withName: "onToggleCamera", body: nil) } else { self.pending = true }
    }
  }

  deinit {
    if let observer { NotificationCenter.default.removeObserver(observer) }
  }

  override static func requiresMainQueueSetup() -> Bool { false }
  override func supportedEvents() -> [String]! { ["onToggleCamera"] }
  override func startObserving() {
    listening = true
    if pending {
      pending = false
      sendEvent(withName: "onToggleCamera", body: nil)
    }
  }
  override func stopObserving() { listening = false }

  @objc(isSupported:rejecter:)
  func isSupported(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 17.0, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    } else {
      resolve(false)
    }
  }

  @objc(start:shown:resolver:rejecter:)
  func start(_ name: String, shown: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *) else { resolve(false); return }
    Task {
      for activity in Activity<WippCallAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      do {
        _ = try Activity.request(
          attributes: WippCallAttributes(name: name),
          content: .init(state: .init(shown: shown), staleDate: nil),
          pushType: nil
        )
        resolve(true)
      } catch {
        reject("live_activity", error.localizedDescription, error)
      }
    }
  }

  @objc(update:resolver:rejecter:)
  func update(_ shown: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *) else { resolve(false); return }
    Task {
      for activity in Activity<WippCallAttributes>.activities {
        await activity.update(.init(state: .init(shown: shown), staleDate: nil))
      }
      resolve(true)
    }
  }

  @objc(end:rejecter:)
  func end(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *) else { resolve(false); return }
    Task {
      for activity in Activity<WippCallAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      resolve(true)
    }
  }
}

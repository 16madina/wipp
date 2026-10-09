import ReplayKit

/// WIPP screen sharing (ReplayKit Broadcast Upload extension).
/// iOS captures the WHOLE screen (even in Keynote, Safari…); each frame is sent to the WIPP app through a
/// local socket in the App Group, and WIPP publishes it to the live room as a separate LiveKit track.
/// Nothing is recorded or kept: frames go straight to the app, then to LiveKit.
class SampleHandler: RPBroadcastSampleHandler {
  private static let appGroup = "group.com.wipp.app"
  private var connection: SocketConnection?
  private var uploader: SampleUploader?
  private var frames = 0

  private var socketPath: String {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup)?
      .appendingPathComponent("rtc_SSFD").path ?? ""
  }

  override init() {
    super.init()
    if let c = SocketConnection(filePath: socketPath) {
      connection = c
      uploader = SampleUploader(connection: c)
      c.didClose = { [weak self] error in
        // WIPP stopped the sharing (button, end of the live) or the connection broke.
        let err = error ?? NSError(domain: RPRecordingErrorDomain, code: 10001, userInfo: [NSLocalizedDescriptionKey: "Le partage d’écran WIPP est terminé."])
        self?.finishBroadcastWithError(err)
      }
    }
  }

  override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
    frames = 0
    openWhenReady(attempt: 0)
  }

  /// WIPP opens its side a moment after the system countdown: retry for ~10 s.
  private func openWhenReady(attempt: Int) {
    guard let c = connection else { return }
    if c.open() { return }
    if attempt > 100 {
      finishBroadcastWithError(NSError(domain: RPRecordingErrorDomain, code: 10002, userInfo: [NSLocalizedDescriptionKey: "Ouvre le direct dans WIPP pour partager ton écran."]))
      return
    }
    DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) { [weak self] in self?.openWhenReady(attempt: attempt + 1) }
  }

  override func broadcastPaused() {}
  override func broadcastResumed() {}

  override func broadcastFinished() {
    connection?.close()
  }

  override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
    guard sampleBufferType == .video else { return }
    // ~15 images / s is plenty for slides and demos, and keeps the extension under iOS's 50 MB limit.
    frames += 1
    if frames % 4 == 0 { uploader?.send(sample: sampleBuffer) }
  }
}

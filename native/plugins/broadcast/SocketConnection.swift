import Foundation

/// Client side of the local socket opened by the WIPP app (react-native-webrtc ScreenCapturer).
final class SocketConnection: NSObject {
  var didOpen: (() -> Void)?
  var didClose: ((Error?) -> Void)?
  var streamHasSpaceAvailable: (() -> Void)?

  private let filePath: String
  private var socketHandle: Int32 = -1
  private var inputStream: InputStream?
  private var outputStream: OutputStream?
  private var networkThread: Thread?
  private var connected = false

  init?(filePath: String) {
    self.filePath = filePath
    super.init()
  }

  /// Returns false while the WIPP app has not opened its side yet.
  func open() -> Bool {
    guard FileManager.default.fileExists(atPath: filePath) else { return false }
    socketHandle = Darwin.socket(AF_UNIX, SOCK_STREAM, 0)
    guard socketHandle != -1 else { return false }
    var addr = sockaddr_un()
    addr.sun_family = sa_family_t(AF_UNIX)
    let maxLen = MemoryLayout.size(ofValue: addr.sun_path)
    _ = withUnsafeMutablePointer(to: &addr.sun_path) { ptr in
      filePath.withCString { strncpy(UnsafeMutableRawPointer(ptr).assumingMemoryBound(to: CChar.self), $0, maxLen - 1) }
    }
    let ok = withUnsafePointer(to: &addr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { Darwin.connect(socketHandle, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) }
    }
    guard ok == 0 else {
      Darwin.close(socketHandle)
      socketHandle = -1
      return false
    }
    var readStream: Unmanaged<CFReadStream>?
    var writeStream: Unmanaged<CFWriteStream>?
    CFStreamCreatePairWithSocket(kCFAllocatorDefault, socketHandle, &readStream, &writeStream)
    inputStream = readStream?.takeRetainedValue()
    outputStream = writeStream?.takeRetainedValue()
    inputStream?.delegate = self
    outputStream?.delegate = self
    inputStream?.setProperty(kCFBooleanTrue, forKey: Stream.PropertyKey(kCFStreamPropertyShouldCloseNativeSocket as String))
    outputStream?.setProperty(kCFBooleanTrue, forKey: Stream.PropertyKey(kCFStreamPropertyShouldCloseNativeSocket as String))
    let thread = Thread { [weak self] in
      guard let self = self else { return }
      self.inputStream?.schedule(in: .current, forMode: .common)
      self.outputStream?.schedule(in: .current, forMode: .common)
      self.inputStream?.open()
      self.outputStream?.open()
      while self.connected || self.inputStream != nil { RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.25)) }
    }
    networkThread = thread
    connected = true
    thread.start()
    return true
  }

  func close() {
    connected = false
    inputStream?.delegate = nil
    outputStream?.delegate = nil
    inputStream?.close()
    outputStream?.close()
    inputStream = nil
    outputStream = nil
  }

  func write(_ data: Data) -> Int {
    guard let out = outputStream, out.hasSpaceAvailable else { return 0 }
    return data.withUnsafeBytes { raw in
      guard let base = raw.bindMemory(to: UInt8.self).baseAddress else { return 0 }
      return out.write(base, maxLength: data.count)
    }
  }
}

extension SocketConnection: StreamDelegate {
  func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
    switch eventCode {
    case .openCompleted:
      if aStream == outputStream { didOpen?() }
    case .hasSpaceAvailable:
      if aStream == outputStream { streamHasSpaceAvailable?() }
    case .hasBytesAvailable:
      // WIPP closes its side (stop / end of the live): reading 0 bytes means « finished ».
      if aStream == inputStream, let input = inputStream {
        var buffer = [UInt8](repeating: 0, count: 64)
        if input.read(&buffer, maxLength: buffer.count) <= 0 { closeAndNotify(nil) }
      }
    case .endEncountered:
      closeAndNotify(nil)
    case .errorOccurred:
      closeAndNotify(aStream.streamError)
    default:
      break
    }
  }

  private func closeAndNotify(_ error: Error?) {
    guard connected else { return }
    close()
    didClose?(error)
  }
}

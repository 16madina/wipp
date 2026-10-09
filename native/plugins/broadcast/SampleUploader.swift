import CoreImage
import Foundation
import ReplayKit

/// Sends one frame at a time as a small HTTP-style message (headers + JPEG), the format the WIPP app reads:
/// Content-Length, Buffer-Width, Buffer-Height, Buffer-Orientation.
final class SampleUploader {
  private static let ciContext = CIContext(options: nil)
  private let connection: SocketConnection
  private var pending: Data?
  private var sentBytes = 0
  private var busy = false
  private let queue = DispatchQueue(label: "com.wipp.broadcast.uploader")

  init(connection: SocketConnection) {
    self.connection = connection
    connection.streamHasSpaceAvailable = { [weak self] in self?.queue.async { self?.flush() } }
  }

  /// Drops the frame when the previous one is still being sent (no queue = constant memory).
  func send(sample buffer: CMSampleBuffer) {
    queue.async { [weak self] in
      guard let self = self, !self.busy, let message = self.prepare(buffer) else { return }
      self.busy = true
      self.pending = message
      self.sentBytes = 0
      self.flush()
    }
  }

  private func flush() {
    guard let data = pending else { return }
    let rest = data.subdata(in: sentBytes..<data.count)
    let written = connection.write(rest)
    if written > 0 { sentBytes += written }
    if sentBytes >= data.count {
      pending = nil
      busy = false
    }
  }

  private func prepare(_ buffer: CMSampleBuffer) -> Data? {
    guard let pixels = CMSampleBufferGetImageBuffer(buffer) else { return nil }
    CVPixelBufferLockBaseAddress(pixels, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
    let width = CVPixelBufferGetWidth(pixels)
    let height = CVPixelBufferGetHeight(pixels)
    // Half size: sharp enough for slides, light enough for the network and the 50 MB limit.
    let scale: CGFloat = 0.5
    let image = CIImage(cvPixelBuffer: pixels).transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let jpeg = Self.ciContext.jpegRepresentation(of: image, colorSpace: colorSpace, options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.6])
    else { return nil }
    var orientation: UInt32 = 1
    if let value = CMGetAttachment(buffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil) as? NSNumber {
      orientation = value.uint32Value
    }
    let message = CFHTTPMessageCreateResponse(nil, 200, nil, kCFHTTPVersion1_1).takeRetainedValue()
    CFHTTPMessageSetHeaderFieldValue(message, "Content-Length" as CFString, String(jpeg.count) as CFString)
    CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Width" as CFString, String(Int(CGFloat(width) * scale)) as CFString)
    CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Height" as CFString, String(Int(CGFloat(height) * scale)) as CFString)
    CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Orientation" as CFString, String(orientation) as CFString)
    CFHTTPMessageSetBody(message, jpeg as CFData)
    return CFHTTPMessageCopySerializedMessage(message)?.takeRetainedValue() as Data?
  }
}

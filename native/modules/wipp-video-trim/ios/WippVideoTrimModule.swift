import ExpoModulesCore
import AVFoundation
import Photos

public class WippVideoTrimModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WippVideoTrim")

    AsyncFunction("materialize") { (assetId: String) async throws -> [String: Any] in
      let fetched = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
      guard let photo = fetched.firstObject, photo.mediaType == .video else {
        throw TrimFailure("asset_missing id=\(assetId.prefix(12))")
      }
      let destination = try await Self.copyOriginal(photo)
      let asset = AVURLAsset(url: destination)
      let seconds = CMTimeGetSeconds(try await asset.load(.duration))
      guard seconds.isFinite, seconds > 0 else {
        throw TrimFailure("duration")
      }
      return [
        "uri": destination.absoluteString,
        "duration": seconds,
        "ext": destination.pathExtension.lowercased(),
        "bytes": Self.fileBytes(destination),
      ]
    }

    /// Voice messages recorded in several parts (pause → listen → resume): one .m4a file, parts in order.
    AsyncFunction("concatAudio") { (uris: [String]) async throws -> [String: Any] in
      guard !uris.isEmpty else { throw TrimFailure("audio_empty") }
      let composition = AVMutableComposition()
      guard let track = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw TrimFailure("audio_track")
      }
      var cursor = CMTime.zero
      for uri in uris {
        let url = Self.fileURL(uri)
        guard FileManager.default.fileExists(atPath: url.path) else { throw TrimFailure("audio_part_missing") }
        let asset = AVURLAsset(url: url)
        let duration = try await asset.load(.duration)
        guard let source = try await asset.loadTracks(withMediaType: .audio).first, CMTimeGetSeconds(duration) > 0.05 else { continue }
        try track.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: source, at: cursor)
        cursor = CMTimeAdd(cursor, duration)
      }
      guard CMTimeGetSeconds(cursor) > 0 else { throw TrimFailure("audio_empty") }
      let output = FileManager.default.temporaryDirectory.appendingPathComponent("wipp-voice-\(UUID().uuidString).m4a")
      guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetAppleM4A) else {
        throw TrimFailure("audio_export")
      }
      export.outputURL = output
      export.outputFileType = .m4a
      await export.export()
      guard export.status == .completed else {
        throw TrimFailure("audio_export \(export.error.map { Self.describe($0) } ?? "status")")
      }
      return ["uri": output.absoluteString, "duration": CMTimeGetSeconds(cursor)]
    }

    AsyncFunction("trim") { (uri: String, start: Double, end: Double) async throws -> [String: Any] in
      let source = Self.fileURL(uri)
      guard source.isFileURL, FileManager.default.fileExists(atPath: source.path) else {
        throw TrimFailure("source_missing scheme=\(source.scheme ?? "none")")
      }
      let asset = AVURLAsset(url: source)
      let exported = try await Self.exportSegment(asset, start: start, end: end, sourceExt: source.pathExtension)
      return [
        "uri": exported.url.absoluteString,
        "duration": exported.duration,
        "ext": exported.url.pathExtension.lowercased(),
        "bytes": Self.fileBytes(exported.url),
      ]
    }
  }

  private static func copyOriginal(_ photo: PHAsset) async throws -> URL {
    let resources = PHAssetResource.assetResources(for: photo)
    guard let resource = resources.first(where: { $0.type == .fullSizeVideo || $0.type == .video || $0.type == .pairedVideo }) else {
      throw TrimFailure("resource_missing")
    }
    let ext = (resource.originalFilename as NSString).pathExtension
    let safeExt = ext.isEmpty ? "mov" : ext.lowercased()
    let destination = FileManager.default.temporaryDirectory.appendingPathComponent("wipp-src-\(UUID().uuidString).\(safeExt)")
    if FileManager.default.fileExists(atPath: destination.path) {
      try FileManager.default.removeItem(at: destination)
    }
    let options = PHAssetResourceRequestOptions()
    options.isNetworkAccessAllowed = true
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      PHAssetResourceManager.default().writeData(for: resource, toFile: destination, options: options) { error in
        if let error {
          cont.resume(throwing: TrimFailure("copy \(Self.describe(error))"))
        } else {
          cont.resume()
        }
      }
    }
    let size = (try? FileManager.default.attributesOfItem(atPath: destination.path)[.size] as? NSNumber)?.intValue ?? 0
    guard size > 0 else {
      throw TrimFailure("copy_empty")
    }
    return destination
  }

  private static func exportSegment(_ asset: AVAsset, start: Double, end: Double, sourceExt: String) async throws -> (url: URL, duration: Double) {
    let total = CMTimeGetSeconds(try await asset.load(.duration))
    guard total.isFinite, total > 0 else {
      throw TrimFailure("duration")
    }
    let startSec = max(0, min(start, total - 0.05))
    let endSec = max(startSec + 0.1, min(end, total))
    guard endSec - startSec <= 60.25 else {
      throw TrimFailure("range_over_60 start=\(startSec) end=\(endSec)")
    }
    let range = CMTimeRange(
      start: CMTime(seconds: startSec, preferredTimescale: 600),
      duration: CMTime(seconds: endSec - startSec, preferredTimescale: 600)
    )
    // One export. Story size is H.264, not a passthrough of the iPhone source bitrate.
    let attempts: [(String, AVFileType)] = [
      (AVAssetExportPreset1280x720, .mp4),
      (AVAssetExportPreset1920x1080, .mp4),
      (AVAssetExportPreset960x540, .mp4),
      (AVAssetExportPresetMediumQuality, .mp4),
    ]
    var last = "export_failed ext=\(sourceExt)"
    for (preset, preferred) in attempts {
      guard let session = AVAssetExportSession(asset: asset, presetName: preset) else { continue }
      let fileType = session.supportedFileTypes.contains(preferred) ? preferred : (session.supportedFileTypes.contains(.mp4) ? .mp4 : session.supportedFileTypes.first)
      guard let fileType else { continue }
      let ext = fileType == .mov ? "mov" : "mp4"
      let output = FileManager.default.temporaryDirectory.appendingPathComponent("wipp-trim-\(UUID().uuidString).\(ext)")
      session.outputURL = output
      session.outputFileType = fileType
      session.timeRange = range
      session.shouldOptimizeForNetworkUse = true
      do {
        try await run(session)
        let seconds = CMTimeGetSeconds(try await AVURLAsset(url: output).load(.duration))
        let size = (try? FileManager.default.attributesOfItem(atPath: output.path)[.size] as? NSNumber)?.intValue ?? 0
        guard seconds.isFinite, seconds > 0.2, seconds <= 60.5, size > 0 else {
          try? FileManager.default.removeItem(at: output)
          last = "empty_output preset=\(preset) seconds=\(seconds) bytes=\(size)"
          continue
        }
        return (output, seconds)
      } catch {
        try? FileManager.default.removeItem(at: output)
        last = "preset=\(preset) \(Self.describe(error))"
      }
    }
    throw TrimFailure(last)
  }

  private static func run(_ session: AVAssetExportSession) async throws {
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      session.exportAsynchronously {
        if session.status == .completed {
          cont.resume()
        } else {
          cont.resume(throwing: session.error ?? TrimFailure("export_status_\(session.status.rawValue)"))
        }
      }
    }
  }

  private static func fileBytes(_ url: URL) -> Int {
    (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
  }

  private static func fileURL(_ uri: String) -> URL {
    if uri.hasPrefix("file://"), let url = URL(string: uri) {
      return url
    }
    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }
    return URL(string: uri) ?? URL(fileURLWithPath: uri)
  }

  private static func describe(_ error: Error) -> String {
    let ns = error as NSError
    let underlying = (ns.userInfo[NSUnderlyingErrorKey] as? NSError).map { " underlying=\($0.domain):\($0.code)" } ?? ""
    return "\(ns.domain):\(ns.code) \(ns.localizedDescription)\(underlying)"
  }
}

private final class TrimFailure: Exception {
  private let detail: String
  init(_ detail: String) {
    self.detail = detail
    super.init()
  }
  override var reason: String { detail }
}

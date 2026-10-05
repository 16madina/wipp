import CryptoKit
import Foundation
import Security
import UserNotifications

/// WIPP message previews on the lock screen, end-to-end encrypted.
/// The push carries only the ciphertext ("wenc"); this extension decrypts it on the phone with the
/// identity key the app shares through the App Group keychain. Any failure keeps "Nouveau message".
class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    bestAttempt = content
    if let preview = WippPreview.make(from: content.userInfo) {
      content.body = preview
    }
    contentHandler(content)
  }

  override func serviceExtensionTimeWillExpire() {
    if let handler = contentHandler, let content = bestAttempt {
      handler(content)
    }
  }
}

enum WippPreview {
  static let accessGroup = "group.com.wipp.app"
  /// expo-secure-store appends ":no-auth" to the service name for items without biometrics.
  static let service = "wipp-nse:no-auth"
  static let identityKey = "wipp-e2e-identity-nse"
  static let previewKey = "wipp-nse-preview"

  static func make(from userInfo: [AnyHashable: Any]) -> String? {
    guard
      let enc = userInfo["wenc"] as? [String: Any],
      let chatId = enc["c"] as? String,
      let ivB64 = enc["iv"] as? String,
      let ctB64 = enc["ct"] as? String,
      let spk = enc["spk"] as? [String: Any],
      let sx = spk["x"] as? String,
      let sy = spk["y"] as? String
    else { return nil }
    // "Aperçu des messages" turned off in WIPP → keep the generic text.
    if keychainString(previewKey) == "off" { return nil }
    guard
      let identityJson = keychainString(identityKey),
      let identity = try? JSONSerialization.jsonObject(with: Data(identityJson.utf8)) as? [String: Any],
      let privateJwk = identity["privateJwk"] as? [String: Any],
      let d = privateJwk["d"] as? String,
      let dRaw = base64url(d), let xRaw = base64url(sx), let yRaw = base64url(sy),
      let iv = Data(base64Encoded: ivB64), let ct = Data(base64Encoded: ctB64), ct.count > 16
    else { return nil }
    do {
      // Same scheme as the app (src/lib/crypto.ts): ECDH P-256 → HKDF-SHA256(salt: chatId, info: "wgo-e2e-v1") → AES-256-GCM.
      let privateKey = try P256.KeyAgreement.PrivateKey(rawRepresentation: dRaw)
      var x963 = Data([0x04])
      x963.append(xRaw)
      x963.append(yRaw)
      let senderKey = try P256.KeyAgreement.PublicKey(x963Representation: x963)
      let shared = try privateKey.sharedSecretFromKeyAgreement(with: senderKey)
      let key = shared.hkdfDerivedSymmetricKey(
        using: SHA256.self,
        salt: Data(chatId.utf8),
        sharedInfo: Data("wgo-e2e-v1".utf8),
        outputByteCount: 32
      )
      let box = try AES.GCM.SealedBox(
        nonce: AES.GCM.Nonce(data: iv),
        ciphertext: ct.prefix(ct.count - 16),
        tag: ct.suffix(16)
      )
      let plain = try AES.GCM.open(box, using: key)
      guard let text = String(data: plain, encoding: .utf8) else { return nil }
      return describe(text)
    } catch {
      return nil
    }
  }

  /// Turns the decrypted payload into a short, human preview.
  static func describe(_ text: String) -> String? {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("{"),
       let obj = try? JSONSerialization.jsonObject(with: Data(trimmed.utf8)) as? [String: Any],
       let mark = obj["k"] as? String {
      if mark == "wipp-media-v1" {
        let kind = obj["kind"] as? String ?? ""
        let caption = (obj["caption"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let label = mediaLabel(kind)
        return clip(caption.isEmpty ? label : "\(label.split(separator: " ").first ?? "") \(caption)")
      }
      if mark == "wipp-plain-v2" {
        if obj["surprise"] != nil { return "🎁 Surprise" }
        let body = (obj["text"] as? String) ?? ""
        if obj["shop"] != nil { return clip("🛍️ \(body)") }
        return body.isEmpty ? nil : clip(body)
      }
    }
    return trimmed.isEmpty ? nil : clip(trimmed)
  }

  static func mediaLabel(_ kind: String) -> String {
    switch kind {
    case "image": return "📷 Photo"
    case "video": return "🎥 Vidéo"
    case "file": return "📄 Document"
    case "voice": return "🎤 Message vocal"
    case "gif": return "GIF"
    case "sticker": return "Sticker"
    case "contact": return "👤 Contact"
    case "location": return "📍 Position"
    case "link": return "🔗 Lien"
    default: return "Nouveau message"
    }
  }

  static func clip(_ s: String) -> String {
    s.count > 180 ? String(s.prefix(179)) + "…" : s
  }

  static func base64url(_ value: String) -> Data? {
    var b64 = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    while b64.count % 4 != 0 { b64.append("=") }
    return Data(base64Encoded: b64)
  }

  static func keychainString(_ key: String) -> String? {
    let account = Data(key.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: account,
      kSecAttrAccount as String: account,
      kSecAttrAccessGroup as String: accessGroup,
      kSecMatchLimit as String: kSecMatchLimitOne,
      kSecReturnData as String: true,
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }
}

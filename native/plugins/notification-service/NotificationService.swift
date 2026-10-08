import CryptoKit
import Foundation
import Intents
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
    // « Reçu » (two grey dots) even when the app is closed, then show the notification
    // with the sender's / group's photo and the small WIPP logo (iOS communication notification).
    let group = DispatchGroup()
    var finalContent: UNNotificationContent = content
    group.enter()
    WippDelivery.ack(content.userInfo) { group.leave() }
    group.enter()
    WippPhoto.decorate(content) { decorated in
      finalContent = decorated
      group.leave()
    }
    group.notify(queue: .main) { [weak self] in
      guard let self = self, let handler = self.contentHandler else { return }
      self.contentHandler = nil
      handler(finalContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let handler = contentHandler, let content = bestAttempt {
      contentHandler = nil
      handler(content)
    }
  }
}

/// Photo on the notification, like WhatsApp: an INSendMessageIntent with the sender (and group).
/// Any failure (no photo, slow network, iOS refusing) keeps the plain notification.
enum WippPhoto {
  static func decorate(_ content: UNMutableNotificationContent, done: @escaping (UNNotificationContent) -> Void) {
    guard
      let pic = content.userInfo["wpic"] as? [String: Any],
      let senderId = pic["id"] as? String,
      let name = pic["name"] as? String
    else {
      note("no wpic")
      return done(content)
    }
    let groupName = pic["group"] as? String
    // 1. The copy the app saved when it showed this photo (no network, works offline).
    if let path = pic["p"] as? String, !path.isEmpty, let local = localPhoto(path) {
      note("local photo \(local.count)")
      return done(apply(content, senderId: senderId, name: name, groupName: groupName, imageData: local))
    }
    let urlString = (pic["url"] as? String) ?? ""
    guard let url = URL(string: urlString), url.scheme == "https" else {
      return done(apply(content, senderId: senderId, name: name, groupName: groupName, imageData: nil))
    }
    var request = URLRequest(url: url, timeoutInterval: 8)
    request.httpMethod = "GET"
    URLSession.shared.dataTask(with: request) { data, response, _ in
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      note("photo http \(status) bytes \(data?.count ?? 0)")
      let ok = status == 200
      let image = ok && (data?.count ?? 0) > 0 && (data?.count ?? 0) < 3_000_000 ? data : nil
      done(apply(content, senderId: senderId, name: name, groupName: groupName, imageData: image))
    }.resume()
  }

  static func apply(_ content: UNMutableNotificationContent, senderId: String, name: String, groupName: String?, imageData: Data?) -> UNNotificationContent {
    let image = imageData.map { INImage(imageData: $0) }
    let handle = INPersonHandle(value: senderId, type: .unknown)
    let sender = INPerson(personHandle: handle, nameComponents: nil, displayName: name, image: groupName == nil ? image : nil, contactIdentifier: nil, customIdentifier: senderId)
    let me = INPerson(personHandle: INPersonHandle(value: "me", type: .unknown), nameComponents: nil, displayName: nil, image: nil, contactIdentifier: nil, customIdentifier: nil, isMe: true)
    let chatId = (content.userInfo["chatId"] as? String) ?? senderId
    let intent = INSendMessageIntent(
      recipients: groupName == nil ? [me] : [me, sender],
      outgoingMessageType: .outgoingMessageText,
      content: content.body,
      speakableGroupName: groupName.map { INSpeakableString(spokenPhrase: $0) },
      conversationIdentifier: chatId,
      serviceName: nil,
      sender: sender,
      attachments: nil
    )
    if groupName != nil {
      intent.setImage(image, forParameterNamed: \.speakableGroupName)
      // In a group the title is the group; the body says who wrote.
      if !content.body.hasPrefix(name) && !content.body.hasPrefix("@") { content.body = "\(name) : \(content.body)" }
    }
    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate(completion: nil)
    do {
      let updated = try content.updating(from: intent)
      note("updated ok image=\(image != nil)")
      return updated
    } catch {
      note("updating failed \(error.localizedDescription)")
      return content
    }
  }

  /// Same name as notifPhotoName() in src/lib/notif-photos.ts.
  static func localPhoto(_ path: String) -> Data? {
    guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.wipp.app") else { return nil }
    let safe = String(path.map { $0.isASCII && ($0.isLetter || $0.isNumber) ? $0 : "_" }.suffix(120))
    let file = dir.appendingPathComponent("wpic").appendingPathComponent("\(safe).img")
    guard let data = try? Data(contentsOf: file), data.count > 0, data.count < 3_000_000 else {
      note("no local photo for \(safe)")
      return nil
    }
    return data
  }

  /// Last steps, readable from the Mac (App Group container) to debug a missing photo.
  static func note(_ line: String) {
    guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.wipp.app") else { return }
    let file = dir.appendingPathComponent("nse-photo.log")
    let old = (try? String(contentsOf: file, encoding: .utf8)) ?? ""
    let text = String((old + "\(Date()) \(line)\n").suffix(4000))
    try? text.write(to: file, atomically: true, encoding: .utf8)
  }
}

/// Tells the server « this message reached the phone » with a key that can only do that.
enum WippDelivery {
  static let deliveryKey = "wipp-nse-delivery"
  static let endpoint = URL(string: "https://wippapp.com/api/wipp/receipts/delivered")!

  static func ack(_ userInfo: [AnyHashable: Any], done: @escaping () -> Void) {
    guard
      (userInfo["type"] as? String) == "message",
      let chatId = userInfo["chatId"] as? String,
      let messageId = userInfo["eventId"] as? String,
      let key = WippPreview.keychainString(deliveryKey)
    else { done(); return }
    var req = URLRequest(url: endpoint, timeoutInterval: 6)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "content-type")
    req.httpBody = try? JSONSerialization.data(withJSONObject: ["key": key, "chatId": chatId, "messageId": messageId])
    URLSession.shared.dataTask(with: req) { _, _, _ in
      DispatchQueue.main.async { done() }
    }.resume()
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

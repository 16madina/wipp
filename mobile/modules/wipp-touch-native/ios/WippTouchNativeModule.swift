import ExpoModulesCore
import CoreBluetooth
import Foundation

/**
 * WIPP Touch iOS advertiser (CBPeripheralManager).
 * Advertises service UUID 6eeff345-1111-4a2b-9c3d-aabbccddeeff + local name = ephemeral code.
 * Also hosts a readable GATT characteristic with the same code (fallback if local name stripped).
 * No PII — code only.
 */
public class WippTouchNativeModule: Module {
  private var peripheral: WippTouchPeripheral?

  public func definition() -> ModuleDefinition {
    Name("WippTouchNative")

    AsyncFunction("startAdvertise") { (serviceUuid: String, codeUuid: String, code: String) -> [String: Any] in
      let cleaned = code.uppercased().filter { $0.isLetter || $0.isNumber }
      guard (6...12).contains(cleaned.count) else {
        return ["ok": false, "reason": "invalid_code"]
      }
      guard let svc = UUID(uuidString: serviceUuid), let chr = UUID(uuidString: codeUuid) else {
        return ["ok": false, "reason": "invalid_uuid"]
      }

      return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<[String: Any], Error>) in
        DispatchQueue.main.async {
          if self.peripheral == nil {
            self.peripheral = WippTouchPeripheral()
          }
          self.peripheral?.start(service: svc, characteristic: chr, code: cleaned) { result in
            cont.resume(returning: result)
          }
        }
      }
    }

    AsyncFunction("stopAdvertise") {
      await MainActor.run {
        self.peripheral?.stop()
      }
    }

    AsyncFunction("startNfcShare") { (_: String) -> [String: Any] in
      ["ok": false, "reason": "nfc_hce_android_only"]
    }

    AsyncFunction("stopNfcShare") { () in
      // no-op iOS
    }

    Function("canAdvertise") { () -> Bool in
      true
    }

    Function("platformCapabilities") { () -> [String: Any] in
      [
        "bleAdvertise": true,
        "bleAdvertiseServiceUuid": true,
        "bleAdvertiseLocalName": true,
        "bleGattTokenCharacteristic": true,
        "nfcHce": false,
        "nfcNote": "iOS Core NFC is reader-only; Android HCE→iPhone Background Tag Reading for /t/CODE.",
      ]
    }
  }
}

private final class WippTouchPeripheral: NSObject, CBPeripheralManagerDelegate {
  private var manager: CBPeripheralManager?
  private var serviceUuid: CBUUID?
  private var charUuid: CBUUID?
  private var code: String = ""
  private var pending: (([String: Any]) -> Void)?
  private var answered = false

  func start(service: UUID, characteristic: UUID, code: String, completion: @escaping ([String: Any]) -> Void) {
    stop()
    answered = false
    serviceUuid = CBUUID(nsuuid: service)
    charUuid = CBUUID(nsuuid: characteristic)
    self.code = code
    pending = completion
    manager = CBPeripheralManager(delegate: self, queue: .main, options: [
      CBPeripheralManagerOptionShowPowerAlertKey: true,
    ])
  }

  func stop() {
    manager?.stopAdvertising()
    manager?.removeAllServices()
    manager?.delegate = nil
    manager = nil
    pending = nil
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      guard let serviceUuid, let charUuid else {
        finish(["ok": false, "reason": "not_configured"])
        return
      }
      let service = CBMutableService(type: serviceUuid, primary: true)
      let characteristic = CBMutableCharacteristic(
        type: charUuid,
        properties: [.read],
        value: Data(code.utf8),
        permissions: [.readable]
      )
      service.characteristics = [characteristic]
      peripheral.removeAllServices()
      peripheral.add(service)
    case .poweredOff:
      finish(["ok": false, "reason": "bluetooth_off"])
    case .unauthorized:
      finish(["ok": false, "reason": "bluetooth_permission"])
    case .unsupported:
      finish(["ok": false, "reason": "bluetooth_unavailable"])
    default:
      break
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    if let error {
      finish(["ok": false, "reason": "advertise_failed", "message": error.localizedDescription])
      return
    }
    guard let serviceUuid else { return }
    // Service UUID required for B's scan filter. Local name carries the ephemeral code (FG).
    peripheral.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [serviceUuid],
      CBAdvertisementDataLocalNameKey: code,
    ])
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error {
      finish(["ok": false, "reason": "advertise_failed", "message": error.localizedDescription])
      return
    }
    finish(["ok": true, "includesServiceUuid": true, "includesLocalName": true])
  }

  private func finish(_ result: [String: Any]) {
    guard !answered, let pending else { return }
    answered = true
    self.pending = nil
    pending(result)
  }
}

package expo.modules.wipptouchnative

import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

/**
 * Android WIPP Touch:
 * - BLE ADV: Service UUID (scan filter)
 * - Scan response: Service Data = ephemeral ASCII code (asymmetric vs iOS GATT)
 * - NFC HCE Type4 NDEF URI only while share session active
 */
class WippTouchNativeModule : Module() {
  private var advertiser: BluetoothLeAdvertiser? = null
  private var callback: AdvertiseCallback? = null

  override fun definition() = ModuleDefinition {
    Name("WippTouchNative")

    AsyncFunction("startAdvertise") { serviceUuid: String, _codeUuid: String, code: String, promise: Promise ->
      fun finish(payload: Map<String, Any>) {
        promise.resolve(payload)
      }

      val cleaned = code.uppercase().filter { it.isLetterOrDigit() }
      if (cleaned.length !in 6..12) {
        finish(mapOf("ok" to false, "reason" to "invalid_code"))
        return@AsyncFunction
      }
      val ctx = appContext.reactContext
      if (ctx == null) {
        finish(mapOf("ok" to false, "reason" to "no_context"))
        return@AsyncFunction
      }
      if (!ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
        finish(mapOf("ok" to false, "reason" to "bluetooth_unavailable"))
        return@AsyncFunction
      }
      val adapter = (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
      if (adapter == null || !adapter.isEnabled) {
        finish(mapOf("ok" to false, "reason" to "bluetooth_off"))
        return@AsyncFunction
      }
      val le = adapter.bluetoothLeAdvertiser
      if (le == null) {
        finish(mapOf("ok" to false, "reason" to "advertise_unsupported"))
        return@AsyncFunction
      }

      stopInternal()

      val parcel = try {
        ParcelUuid(UUID.fromString(serviceUuid))
      } catch (_: Exception) {
        finish(mapOf("ok" to false, "reason" to "invalid_uuid"))
        return@AsyncFunction
      }

      // ADV packet: Service UUID only (31-byte budget with 128-bit UUID).
      val advData = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        .addServiceUuid(parcel)
        .build()

      val payload = cleaned.toByteArray(Charsets.US_ASCII)
      // Scan response: service data associated with WIPP UUID (token).
      val scanResponse = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .addServiceData(parcel, payload)
        .build()

      val settings = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(false)
        .setTimeout(0)
        .build()

      var settled = false
      fun settle(payload: Map<String, Any>) {
        if (settled) return
        settled = true
        promise.resolve(payload)
      }

      val cb = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
          settle(
            mapOf(
              "ok" to true,
              "includesServiceUuid" to true,
              "includesServiceData" to true,
              "serviceUuid" to serviceUuid,
            ),
          )
        }

        override fun onStartFailure(errorCode: Int) {
          settle(
            mapOf(
              "ok" to false,
              "reason" to "advertise_failed",
              "errorCode" to errorCode,
            ),
          )
        }
      }
      callback = cb
      advertiser = le
      try {
        le.startAdvertising(settings, advData, scanResponse, cb)
      } catch (e: SecurityException) {
        settle(mapOf("ok" to false, "reason" to "bluetooth_permission", "message" to (e.message ?: "")))
      } catch (e: Exception) {
        settle(mapOf("ok" to false, "reason" to "advertise_failed", "message" to (e.message ?: "")))
      }
    }

    AsyncFunction("stopAdvertise") {
      stopInternal()
    }

    AsyncFunction("startNfcShare") { uri: String ->
      val cleaned = uri.trim()
      if (!cleaned.startsWith("https://wippapp.com/t/")) {
        return@AsyncFunction mapOf("ok" to false, "reason" to "invalid_uri")
      }
      WippNfcHceService.setActiveUri(cleaned)
      mapOf("ok" to true, "nfcHce" to true, "uri" to cleaned)
    }

    AsyncFunction("stopNfcShare") {
      WippNfcHceService.clear()
    }

    Function("canAdvertise") {
      val ctx = appContext.reactContext ?: return@Function false
      val adapter = (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      adapter?.bluetoothLeAdvertiser != null
    }

    Function("platformCapabilities") {
      mapOf(
        "bleAdvertise" to true,
        "bleAdvertiseServiceUuid" to true,
        "bleAdvertiseServiceData" to true,
        "nfcHce" to true,
        "nfcNote" to "Type4 NDEF HCE active only during share session; Android→iPhone Background Tag Reading.",
      )
    }
  }

  private fun stopInternal() {
    try {
      val adv = advertiser
      val cb = callback
      if (adv != null && cb != null) adv.stopAdvertising(cb)
    } catch (_: Exception) {
    }
    advertiser = null
    callback = null
  }
}

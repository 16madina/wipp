package expo.modules.wipptouchnative

import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Android WIPP Touch advertiser.
 * Primary ADV: Service UUID (required for B's filtered scan).
 * Scan response: manufacturer data = ephemeral ASCII code.
 * NFC HCE not implemented (see docs/WIPP_TOUCH_NFC.md).
 */
class WippTouchNativeModule : Module() {
  private var advertiser: BluetoothLeAdvertiser? = null
  private var callback: AdvertiseCallback? = null

  override fun definition() = ModuleDefinition {
    Name("WippTouchNative")

    AsyncFunction("startAdvertise") { serviceUuid: String, _codeUuid: String, code: String ->
      val cleaned = code.uppercase().filter { it.isLetterOrDigit() }
      if (cleaned.length !in 6..12) {
        return@AsyncFunction mapOf("ok" to false, "reason" to "invalid_code")
      }
      val ctx = appContext.reactContext
        ?: return@AsyncFunction mapOf("ok" to false, "reason" to "no_context")
      if (!ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
        return@AsyncFunction mapOf("ok" to false, "reason" to "bluetooth_unavailable")
      }
      val adapter = (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
      if (adapter == null || !adapter.isEnabled) {
        return@AsyncFunction mapOf("ok" to false, "reason" to "bluetooth_off")
      }
      val le = adapter.bluetoothLeAdvertiser
        ?: return@AsyncFunction mapOf("ok" to false, "reason" to "advertise_unsupported")

      stopInternal()

      val parcel = try {
        ParcelUuid(UUID.fromString(serviceUuid))
      } catch (_: Exception) {
        return@AsyncFunction mapOf("ok" to false, "reason" to "invalid_uuid")
      }

      val advData = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        .addServiceUuid(parcel)
        .build()

      val payload = cleaned.toByteArray(Charsets.US_ASCII)
      val scanResponse = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .addManufacturerData(0xFFFF, payload)
        .build()

      val settings = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(false)
        .setTimeout(0)
        .build()

      suspendCancellableCoroutine { cont ->
        val cb = object : AdvertiseCallback() {
          override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            if (cont.isActive) {
              cont.resume(
                mapOf(
                  "ok" to true,
                  "includesServiceUuid" to true,
                  "includesManufacturerData" to true,
                  "serviceUuid" to serviceUuid,
                ),
              )
            }
          }

          override fun onStartFailure(errorCode: Int) {
            if (cont.isActive) {
              cont.resume(
                mapOf(
                  "ok" to false,
                  "reason" to "advertise_failed",
                  "errorCode" to errorCode,
                ),
              )
            }
          }
        }
        callback = cb
        advertiser = le
        try {
          le.startAdvertising(settings, advData, scanResponse, cb)
        } catch (e: SecurityException) {
          if (cont.isActive) {
            cont.resume(mapOf("ok" to false, "reason" to "bluetooth_permission", "message" to (e.message ?: "")))
          }
        } catch (e: Exception) {
          if (cont.isActive) {
            cont.resume(mapOf("ok" to false, "reason" to "advertise_failed", "message" to (e.message ?: "")))
          }
        }
        cont.invokeOnCancellation { stopInternal() }
      }
    }

    AsyncFunction("stopAdvertise") {
      stopInternal()
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
        "bleAdvertiseManufacturerData" to true,
        "nfcHce" to false,
        "nfcNote" to "HCE NDEF not implemented — see docs/WIPP_TOUCH_NFC.md",
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

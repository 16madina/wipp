package expo.modules.wipptouchnative

import android.content.Context
import android.util.Base64
import androidx.annotation.RequiresApi
import androidx.core.uwb.RangingParameters
import androidx.core.uwb.RangingResult
import androidx.core.uwb.UwbAddress
import androidx.core.uwb.UwbComplexChannel
import androidx.core.uwb.UwbControleeSessionScope
import androidx.core.uwb.UwbControllerSessionScope
import androidx.core.uwb.UwbDevice
import androidx.core.uwb.UwbManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.security.SecureRandom

/**
 * Android ↔ Android UWB ranging (Jetpack androidx.core.uwb), no Bluetooth.
 * The out-of-band parameters (addresses, channel, session id/key) travel through the WIPP server
 * as an opaque base64 token. The server assigns the roles: one "controller", one "controlee".
 * Only loaded on Android 12+ (API 31) with the UWB hardware feature.
 */
@RequiresApi(31)
class UwbRanger(
  private val context: Context,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private var controller: UwbControllerSessionScope? = null
  private var controlee: UwbControleeSessionScope? = null
  private var role = "controlee"
  private var sessionId = 0
  private val sessionKey = ByteArray(8)
  private var job: Job? = null

  /**
   * UWB present AND switched on (Samsung has a UWB toggle in Settings). This library version has
   * no availability API: opening a session scope fails when the radio is off.
   */
  suspend fun isAvailable(): Boolean =
    try {
      UwbManager.createInstance(context).controleeSessionScope()
      true
    } catch (e: Exception) {
      false
    }

  /** Opens the local UWB scope and returns this phone's OOB parameters as a base64 token. */
  suspend fun prepare(newRole: String): String {
    stop()
    role = if (newRole == "controller") "controller" else "controlee"
    val manager = UwbManager.createInstance(context)
    val token = JSONObject()
    token.put("r", role)
    if (role == "controller") {
      val c = manager.controllerSessionScope()
      controller = c
      val random = SecureRandom()
      sessionId = random.nextInt(Int.MAX_VALUE - 1) + 1
      random.nextBytes(sessionKey)
      token.put("a", b64(c.localAddress.address))
      token.put("ch", c.uwbComplexChannel.channel)
      token.put("pi", c.uwbComplexChannel.preambleIndex)
      token.put("sid", sessionId)
      token.put("key", b64(sessionKey))
    } else {
      val c = manager.controleeSessionScope()
      controlee = c
      token.put("a", b64(c.localAddress.address))
    }
    return b64(token.toString().toByteArray(Charsets.UTF_8))
  }

  /** Starts ranging with the peer's token; distances are emitted as "onUwbDistance" (cm). */
  fun start(peerTokenB64: String): Boolean {
    val peer = try {
      JSONObject(String(Base64.decode(peerTokenB64, Base64.NO_WRAP), Charsets.UTF_8))
    } catch (e: Exception) {
      return false
    }
    val peerDevice = UwbDevice(UwbAddress(Base64.decode(peer.optString("a"), Base64.NO_WRAP)))
    val flow = if (role == "controller") {
      val c = controller ?: return false
      c.prepareSession(
        RangingParameters(
          RangingParameters.CONFIG_UNICAST_DS_TWR,
          sessionId,
          0,
          sessionKey,
          null,
          c.uwbComplexChannel,
          listOf(peerDevice),
          RangingParameters.RANGING_UPDATE_RATE_FREQUENT,
        ),
      )
    } else {
      val c = controlee ?: return false
      if (!peer.has("sid") || !peer.has("key")) return false
      c.prepareSession(
        RangingParameters(
          RangingParameters.CONFIG_UNICAST_DS_TWR,
          peer.getInt("sid"),
          0,
          Base64.decode(peer.getString("key"), Base64.NO_WRAP),
          null,
          UwbComplexChannel(peer.getInt("ch"), peer.getInt("pi")),
          listOf(peerDevice),
          RangingParameters.RANGING_UPDATE_RATE_FREQUENT,
        ),
      )
    }
    job?.cancel()
    job = scope.launch {
      try {
        flow.collect { result ->
          when (result) {
            is RangingResult.RangingResultPosition -> {
              val meters = result.position.distance?.value
              if (meters != null) emit("onUwbDistance", mapOf("distanceCm" to meters.toDouble() * 100.0))
            }
            is RangingResult.RangingResultPeerDisconnected -> emit("onUwbState", mapOf("state" to "lost"))
            else -> {}
          }
        }
      } catch (e: SecurityException) {
        emit("onUwbState", mapOf("state" to "denied"))
      } catch (e: Exception) {
        emit("onUwbState", mapOf("state" to "error"))
      }
    }
    return true
  }

  fun stop() {
    job?.cancel()
    job = null
    controller = null
    controlee = null
  }

  fun destroy() {
    stop()
    scope.cancel()
  }

  private fun b64(bytes: ByteArray): String = Base64.encodeToString(bytes, Base64.NO_WRAP)
}

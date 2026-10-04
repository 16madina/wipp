package expo.modules.wipptouchnative

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.max
import kotlin.math.sqrt

/**
 * WIPP Touch, no Bluetooth: SensorManager (linear acceleration) detects the physical bump.
 * UWB hardware is only reported for diagnostics; UWB ranging is not wired on Android in this build,
 * so the app relies on bump matching + mutual confirmation (and the QR fallback).
 */
class WippTouchNativeModule : Module() {
  private var sensorManager: SensorManager? = null
  private var listener: SensorEventListener? = null

  override fun definition() = ModuleDefinition {
    Name("WippTouchNative")
    Events("onBump", "onUwbDistance", "onUwbState")

    Function("getCapabilities") {
      val ctx = appContext.reactContext
      val sm = ctx?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val motion = sm?.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION) != null ||
        sm?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
      val uwbHardware = ctx?.packageManager?.hasSystemFeature("android.hardware.uwb") == true
      mapOf(
        "platform" to "android",
        "motion" to motion,
        "uwb" to false,
        "uwbKind" to null,
        "uwbHardware" to uwbHardware,
      )
    }

    Function("startBumpDetection") { thresholdG: Double, maxDurMs: Double ->
      stopSensors()
      val ctx = appContext.reactContext ?: return@Function false
      val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return@Function false
      val linear = sm.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
      val sensor = linear ?: sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return@Function false
      val removeGravity = linear == null
      val detector = BumpDetector(thresholdG, maxDurMs)
      val gravity = DoubleArray(3)
      var gravityInit = false
      val l = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          var x = event.values[0].toDouble()
          var y = event.values[1].toDouble()
          var z = event.values[2].toDouble()
          if (removeGravity) {
            if (!gravityInit) {
              gravity[0] = x; gravity[1] = y; gravity[2] = z; gravityInit = true
              return
            }
            val k = 0.9
            gravity[0] = k * gravity[0] + (1 - k) * x
            gravity[1] = k * gravity[1] + (1 - k) * y
            gravity[2] = k * gravity[2] + (1 - k) * z
            x -= gravity[0]; y -= gravity[1]; z -= gravity[2]
          }
          val mag = sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH
          // event.timestamp is elapsedRealtimeNanos: convert to wall-clock ms.
          val wallMs = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1_000_000.0
          detector.feed(mag, wallMs)?.let { sendEvent("onBump", it) }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
      }
      sm.registerListener(l, sensor, SensorManager.SENSOR_DELAY_FASTEST)
      sensorManager = sm
      listener = l
      true
    }

    Function("stopBumpDetection") { stopSensors() }

    Function("uwbPrepare") { null as String? }
    Function("uwbStart") { _: String -> false }
    Function("uwbStop") { }

    OnDestroy { stopSensors() }
  }

  private fun stopSensors() {
    listener?.let { sensorManager?.unregisterListener(it) }
    listener = null
    sensorManager = null
  }
}

/** Short sharp impact detector. A touch is a brief spike; shaking (several spikes) is ignored. */
class BumpDetector(thresholdG: Double, maxDurMs: Double) {
  private val threshold = max(0.8, thresholdG)
  private val maxDur = max(40.0, maxDurMs)
  private var inPeak = false
  private var startMs = 0.0
  private var peak = 0.0
  private var peakAt = 0.0
  private var energy = 0.0
  private var quiet = 0
  private var lastMs = 0.0
  private var lastFired = 0.0
  private val recent = ArrayList<Double>()

  fun feed(mag: Double, atMs: Double): Map<String, Any>? {
    val dt = if (lastMs > 0) minOf(50.0, atMs - lastMs) else 10.0
    lastMs = atMs
    if (!inPeak) {
      if (mag >= threshold) {
        inPeak = true
        startMs = atMs
        peak = mag
        peakAt = atMs
        energy = mag * mag * dt
        quiet = 0
      }
      return null
    }
    energy += mag * mag * dt
    if (mag > peak) { peak = mag; peakAt = atMs }
    if (mag < threshold * 0.5) quiet++ else quiet = 0
    val dur = atMs - startMs
    if (quiet < 2 && dur < 600) return null
    inPeak = false
    recent.removeAll { atMs - it >= 1500 }
    recent.add(peakAt)
    if (dur > maxDur || recent.size > 3 || peakAt - lastFired < 600) return null
    lastFired = peakAt
    return mapOf("at" to peakAt, "peak" to peak, "durMs" to dur, "energy" to energy / 1000.0)
  }
}

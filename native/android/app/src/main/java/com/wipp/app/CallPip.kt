package com.wipp.app

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * Android mini player (Picture-in-Picture) during a video call.
 * JS turns it on while a video call is connected; MainActivity enters PiP when the user leaves the app.
 */
object CallPip {
  @Volatile var enabled = false
  @Volatile var inPip = false
  var onChange: ((Boolean) -> Unit)? = null

  fun supported(activity: Activity?): Boolean =
    activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)

  private fun params(): PictureInPictureParams? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    val b = PictureInPictureParams.Builder().setAspectRatio(Rational(9, 16))
    // Android 12+: the system enters PiP by itself (smooth with gesture navigation).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) b.setAutoEnterEnabled(enabled).setSeamlessResizeEnabled(false)
    return b.build()
  }

  /** Keeps the system up to date (Android 12+ auto-enter follows [enabled]). */
  fun sync(activity: Activity?) {
    if (!supported(activity) || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    try { activity!!.setPictureInPictureParams(params()!!) } catch (_: Exception) {}
  }

  /** Called from MainActivity.onUserLeaveHint (home button, recent apps). */
  fun enterIfWanted(activity: Activity) {
    if (!enabled || !supported(activity) || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return // auto-enter already handles it
    try { activity.enterPictureInPictureMode(params()!!) } catch (_: Exception) {}
  }

  fun changed(isInPip: Boolean) {
    inPip = isInPip
    onChange?.invoke(isInPip)
  }
}

class CallPipModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "WippCallPip"

  init {
    CallPip.onChange = { inPip ->
      try {
        if (ctx.hasActiveReactInstance()) ctx.emitDeviceEvent("wippCallPip", inPip)
      } catch (_: Exception) {}
    }
  }

  @ReactMethod
  fun setEnabled(on: Boolean) {
    CallPip.enabled = on
    val activity = ctx.currentActivity ?: return
    activity.runOnUiThread { CallPip.sync(activity) }
  }

  @ReactMethod
  fun isInPip(promise: Promise) = promise.resolve(CallPip.inPip)

  // Required by NativeEventEmitter.
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Double) {}
}

class CallPipPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(CallPipModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

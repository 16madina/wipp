package com.wipp.app

import android.app.Activity
import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import android.util.Rational
import androidx.core.content.ContextCompat
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
 * The mini player has one button: show my camera to the others / pause it.
 */
object CallPip {
  const val ACTION_CAMERA = "com.wipp.app.PIP_CAMERA"

  @Volatile var enabled = false
  @Volatile var inPip = false
  /** null = no camera button (camera turned off in the call); true = the others see me; false = paused. */
  @Volatile var cameraShown: Boolean? = null
  var onChange: ((Boolean) -> Unit)? = null
  var onCameraButton: (() -> Unit)? = null

  fun supported(activity: Activity?): Boolean =
    activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)

  private fun cameraAction(ctx: Context): RemoteAction? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    val shown = cameraShown ?: return null
    val intent = Intent(ACTION_CAMERA).setPackage(ctx.packageName)
    val pending = PendingIntent.getBroadcast(ctx, 7301, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val title = if (shown) "Pause caméra" else "Me montrer"
    val icon = Icon.createWithResource(ctx, if (shown) R.drawable.pip_camera_off else R.drawable.pip_camera_on)
    return RemoteAction(icon, title, title, pending)
  }

  private fun params(ctx: Context): PictureInPictureParams? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    val b = PictureInPictureParams.Builder().setAspectRatio(Rational(9, 16))
    b.setActions(listOfNotNull(cameraAction(ctx)))
    // Android 12+: the system enters PiP by itself (smooth with gesture navigation).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) b.setAutoEnterEnabled(enabled).setSeamlessResizeEnabled(false)
    return b.build()
  }

  /** Keeps the system up to date (auto-enter on Android 12+, camera button). */
  fun sync(activity: Activity?) {
    if (!supported(activity) || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    try { activity!!.setPictureInPictureParams(params(activity)!!) } catch (_: Exception) {}
  }

  /** Called from MainActivity.onUserLeaveHint (home button, recent apps). */
  fun enterIfWanted(activity: Activity) {
    if (!enabled || !supported(activity) || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return // auto-enter already handles it
    try { activity.enterPictureInPictureMode(params(activity)!!) } catch (_: Exception) {}
  }

  fun changed(isInPip: Boolean) {
    inPip = isInPip
    onChange?.invoke(isInPip)
  }
}

class CallPipModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "WippCallPip"

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == CallPip.ACTION_CAMERA) CallPip.onCameraButton?.invoke()
    }
  }

  init {
    CallPip.onChange = { inPip -> emit("wippCallPip", inPip) }
    CallPip.onCameraButton = { emit("wippCallPipCamera", true) }
    try {
      ContextCompat.registerReceiver(ctx.applicationContext, receiver, IntentFilter(CallPip.ACTION_CAMERA), ContextCompat.RECEIVER_NOT_EXPORTED)
    } catch (_: Exception) {}
  }

  private fun emit(name: String, value: Boolean) {
    try {
      if (ctx.hasActiveReactInstance()) ctx.emitDeviceEvent(name, value)
    } catch (_: Exception) {}
  }

  private fun syncOnUi() {
    val activity = ctx.currentActivity ?: return
    activity.runOnUiThread { CallPip.sync(activity) }
  }

  @ReactMethod
  fun setEnabled(on: Boolean) {
    CallPip.enabled = on
    syncOnUi()
  }

  /** available = the call has a camera to show; shown = the others currently see me. */
  @ReactMethod
  fun setCamera(available: Boolean, shown: Boolean) {
    CallPip.cameraShown = if (available) shown else null
    syncOnUi()
  }

  @ReactMethod
  fun isInPip(promise: Promise) = promise.resolve(CallPip.inPip)

  override fun invalidate() {
    try { ctx.applicationContext.unregisterReceiver(receiver) } catch (_: Exception) {}
    super.invalidate()
  }

  // Required by NativeEventEmitter.
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Double) {}
}

class CallPipPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(CallPipModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

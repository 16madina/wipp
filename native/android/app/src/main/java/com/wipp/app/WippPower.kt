package com.wipp.app

import android.annotation.SuppressLint
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Calls received even when WIPP has not been opened for a long time: Android (Samsung « deep sleep »)
 * can hold back the call notifications of an app under battery optimisation. VoIP calling apps may ask
 * the user to let them run in the background (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
 */
class WippPowerModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "WippPower"

  private fun ignoring(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return true
    return pm.isIgnoringBatteryOptimizations(ctx.packageName)
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try { promise.resolve(ignoring()) } catch (_: Exception) { promise.resolve(true) }
  }

  /** Opens Android's « Allow WIPP to run in the background? » dialog (or the battery settings list). */
  @SuppressLint("BatteryLife")
  @ReactMethod
  fun requestIgnoreBatteryOptimizations(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || ignoring()) {
      promise.resolve(true)
      return
    }
    val activity = ctx.currentActivity
    val direct = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}"))
    // WIPP shown over the lock screen (after a call): Android drops the dialog and shows the lock screen.
    // Ask to unlock first, then open it.
    val km = ctx.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (activity != null && km?.isKeyguardLocked == true && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      activity.runOnUiThread {
        try {
          km.requestDismissKeyguard(activity, object : KeyguardManager.KeyguardDismissCallback() {
            override fun onDismissSucceeded() {
              try { activity.startActivity(direct) } catch (_: Exception) {}
            }
          })
        } catch (_: Exception) {}
      }
      promise.resolve(false)
      return
    }
    try {
      if (activity != null) activity.startActivity(direct)
      else ctx.startActivity(direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(false)
    } catch (_: Exception) {
      try {
        val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(list)
      } catch (_: Exception) {}
      promise.resolve(false)
    }
  }
}

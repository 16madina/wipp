package expo.modules.wippvideotrim

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import com.google.common.collect.ImmutableList
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID

/**
 * Video Studio export (Android, Media3 Transformer). The sources are read, never changed:
 * segments are joined in order, each with its own volume, every video is fitted into a 9:16 frame,
 * and the timed texts are drawn into the picture. Speed changes are iPhone-only for now.
 */
@UnstableApi
class WippVideoTrimModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var transformer: Transformer? = null

  override fun definition() = ModuleDefinition {
    Name("WippVideoTrim")
    Events("onStudioProgress")

    Function("studioCapabilities") { mapOf("speed" to false) }

    AsyncFunction("exportProject") { spec: Map<String, Any?>, promise: Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.reject(CodedException("studio_context"))
      val width = num(spec["width"], 720.0).toInt()
      val height = num(spec["height"], 1280.0).toInt()
      @Suppress("UNCHECKED_CAST")
      val segments = (spec["segments"] as? List<Map<String, Any?>>).orEmpty()
      @Suppress("UNCHECKED_CAST")
      val texts = (spec["texts"] as? List<Map<String, Any?>>).orEmpty().mapNotNull { TextItem.from(it) }
      if (segments.isEmpty()) return@AsyncFunction promise.reject(CodedException("studio_no_segments"))
      if (context.cacheDir.usableSpace < 200L * 1024 * 1024) return@AsyncFunction promise.reject(CodedException("studio_no_space"))

      val items = mutableListOf<EditedMediaItem>()
      var offset = 0.0
      for (seg in segments) {
        val uri = seg["uri"] as? String ?: return@AsyncFunction promise.reject(CodedException("studio_bad_segment"))
        val start = num(seg["start"], 0.0)
        val end = num(seg["end"], 0.0)
        if (end <= start) return@AsyncFunction promise.reject(CodedException("studio_bad_range"))
        val volume = num(seg["volume"], 1.0).coerceIn(0.0, 1.0).toFloat()
        val media = MediaItem.Builder()
          .setUri(Uri.parse(uri))
          .setClippingConfiguration(
            MediaItem.ClippingConfiguration.Builder()
              .setStartPositionMs((start * 1000).toLong())
              .setEndPositionMs((end * 1000).toLong())
              .build(),
          )
          .build()
        val audio = if (volume < 0.999f) listOf<AudioProcessor>(VolumeProcessor(volume)) else emptyList()
        val video = mutableListOf<androidx.media3.common.Effect>(
          Presentation.createForWidthAndHeight(width, height, Presentation.LAYOUT_SCALE_TO_FIT),
        )
        if (texts.isNotEmpty()) {
          video.add(OverlayEffect(ImmutableList.of(TextOverlay(texts, offset, width, height))))
        }
        items.add(EditedMediaItem.Builder(media).setEffects(Effects(audio, video)).build())
        offset += end - start
      }

      val composition = Composition.Builder(listOf(EditedMediaItemSequence(items)))
        .experimentalSetForceAudioTrack(true)
        .build()
      val output = File(context.cacheDir, "wipp-studio-${UUID.randomUUID()}.mp4")

      main.post {
        val t = Transformer.Builder(context)
          .setVideoMimeType(MimeTypes.VIDEO_H264)
          .setAudioMimeType(MimeTypes.AUDIO_AAC)
          .addListener(object : Transformer.Listener {
            override fun onCompleted(composition: Composition, result: ExportResult) {
              transformer = null
              sendEvent("onStudioProgress", mapOf("progress" to 1.0))
              promise.resolve(
                mapOf(
                  "uri" to Uri.fromFile(output).toString(),
                  "duration" to (if (result.durationMs > 0) result.durationMs / 1000.0 else offset),
                  "ext" to "mp4",
                  "bytes" to output.length().toDouble(),
                ),
              )
            }

            override fun onError(composition: Composition, result: ExportResult, error: ExportException) {
              transformer = null
              output.delete()
              val code = if (context.cacheDir.usableSpace < 100L * 1024 * 1024) "studio_no_space" else "studio_export ${error.errorCodeName}"
              promise.reject(CodedException(code))
            }
          })
          .build()
        transformer = t
        t.start(composition, output.absolutePath)
        val holder = ProgressHolder()
        val tick = object : Runnable {
          override fun run() {
            if (transformer !== t) return
            if (t.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE) {
              sendEvent("onStudioProgress", mapOf("progress" to holder.progress / 100.0))
            }
            main.postDelayed(this, 250)
          }
        }
        main.post(tick)
      }
    }

    AsyncFunction("cancelExport") {
      main.post {
        transformer?.cancel()
        transformer = null
      }
    }
  }

  private fun num(value: Any?, fallback: Double) = (value as? Number)?.toDouble() ?: fallback
}

/** Per-segment volume (16-bit PCM). 0 = silence. */
@UnstableApi
private class VolumeProcessor(private val gain: Float) : BaseAudioProcessor() {
  override fun onConfigure(inputAudioFormat: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
    if (inputAudioFormat.encoding != C.ENCODING_PCM_16BIT) throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
    return inputAudioFormat
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    val input = inputBuffer.order(ByteOrder.nativeOrder())
    val out = replaceOutputBuffer(input.remaining())
    while (input.remaining() >= 2) {
      val sample = (input.short * gain).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
      out.putShort(sample.toShort())
    }
    out.flip()
  }
}

private data class TextItem(
  val text: String,
  val x: Float,
  val y: Float,
  val size: Float,
  val color: Int,
  val style: String,
  val bold: Boolean,
  val shadow: Boolean,
  val align: String,
  val rot: Float,
  val anim: String,
  val animSec: Double,
  val fontName: String?,
  val from: Double,
  val to: Double,
) {
  /** Same curves as animAt() in project.ts. */
  fun animAt(t: Double): Triple<Float, Float, Float> {
    val p = (t / animSec).coerceIn(0.0, 1.0)
    val ease = 1 - Math.pow(1 - p, 3.0)
    return when (anim) {
      "fade" -> Triple(ease.toFloat(), 1f, 0f)
      "appear" -> Triple(ease.toFloat(), (1.3 - 0.3 * ease).toFloat(), 0f)
      "pop" -> Triple(minOf(1.0, p * 3).toFloat(), (if (p < 0.6) 0.5 + 0.62 * p / 0.6 else 1.12 - 0.12 * (p - 0.6) / 0.4).toFloat(), 0f)
      "slide" -> Triple(ease.toFloat(), 1f, (0.08 * (1 - ease)).toFloat())
      else -> Triple(1f, 1f, 0f)
    }
  }

  companion object {
    fun from(m: Map<String, Any?>): TextItem? {
      val text = (m["text"] as? String)?.takeIf { it.isNotBlank() } ?: return null
      fun n(k: String, f: Double) = (m[k] as? Number)?.toDouble() ?: f
      val color = runCatching { Color.parseColor(m["color"] as? String ?: "#ffffff") }.getOrDefault(Color.WHITE)
      return TextItem(
        text, n("x", 0.5).toFloat(), n("y", 0.5).toFloat(), n("size", 0.07).toFloat(), color,
        m["style"] as? String ?: "plain", m["bold"] as? Boolean ?: false, m["shadow"] as? Boolean ?: false,
        m["align"] as? String ?: "center", n("rot", 0.0).toFloat(), m["anim"] as? String ?: "none", n("animSec", 0.4),
        m["fontName"] as? String, n("from", 0.0), n("to", 0.0),
      )
    }
  }
}

/** Draws the texts visible at this moment of the final video (one full-frame transparent picture). */
@UnstableApi
private class TextOverlay(
  private val texts: List<TextItem>,
  /** Where this segment starts in the final video (seconds). */
  private val offset: Double,
  private val width: Int,
  private val height: Int,
) : BitmapOverlay() {
  private var absolute: Boolean? = null
  private var lastKey = ""
  private var bitmap: Bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

  override fun getBitmap(presentationTimeUs: Long): Bitmap {
    val pts = presentationTimeUs / 1_000_000.0
    // Frames may carry times counted from this segment or from the start of the video: decide on the first frame.
    val abs = absolute ?: (kotlin.math.abs(pts - offset) < kotlin.math.abs(pts)).also { absolute = it }
    val t = if (abs) pts else pts + offset
    val visible = texts.filter { t >= it.from && t < it.to }
    // While an intro animation runs, every frame is different.
    val key = visible.joinToString("|") { item ->
      val since = t - item.from
      if (item.anim != "none" && since < item.animSec) "${item.hashCode()}@${(since * 1000).toInt()}" else item.hashCode().toString()
    }
    if (key != lastKey) {
      lastKey = key
      bitmap = draw(visible, t)
    }
    return bitmap
  }

  private fun draw(list: List<TextItem>, now: Double): Bitmap {
    val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    for (item in list) {
      val fontPx = item.size * width
      val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = fontPx
        color = item.color
        typeface = Typeface.create(item.fontName ?: "sans-serif", if (item.bold) Typeface.BOLD else Typeface.NORMAL)
        if (item.shadow) setShadowLayer(fontPx * 0.08f, 0f, fontPx * 0.04f, Color.argb(190, 0, 0, 0))
      }
      val align = when (item.align) { "left" -> Layout.Alignment.ALIGN_NORMAL; "right" -> Layout.Alignment.ALIGN_OPPOSITE; else -> Layout.Alignment.ALIGN_CENTER }
      val (alpha, scale, dy) = item.animAt(now - item.from)
      val maxW = (width * 0.86f).toInt()
      val layout = StaticLayout.Builder.obtain(item.text, 0, item.text.length, paint, maxW).setAlignment(align).build()
      var textW = 0f
      for (i in 0 until layout.lineCount) textW = maxOf(textW, layout.getLineWidth(i))
      val cx = item.x * width
      val cy = item.y * height
      // Rotation, intro animation: around the centre of the text, like in the editor.
      canvas.save()
      canvas.translate(0f, dy * height)
      canvas.rotate(item.rot, cx, cy)
      canvas.scale(scale, scale, cx, cy)
      val layerAlpha = (alpha * 255).toInt().coerceIn(0, 255)
      if (layerAlpha < 255) canvas.saveLayerAlpha(0f, 0f, width.toFloat(), height.toFloat(), layerAlpha)
      val left = cx - maxW / 2f
      val top = cy - layout.height / 2f
      if (item.style == "box") {
        val pad = fontPx * 0.35f
        val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(153, 0, 0, 0) }
        canvas.drawRoundRect(RectF(cx - textW / 2 - pad, top - pad, cx + textW / 2 + pad, top + layout.height + pad), fontPx * 0.3f, fontPx * 0.3f, bg)
      }
      canvas.save()
      canvas.translate(left, top)
      if (item.style == "outline") {
        val stroke = TextPaint(paint).apply {
          style = Paint.Style.STROKE
          strokeWidth = fontPx * 0.08f
          color = Color.BLACK
        }
        StaticLayout.Builder.obtain(item.text, 0, item.text.length, stroke, maxW).setAlignment(align).build().draw(canvas)
      }
      layout.draw(canvas)
      canvas.restore()
      if (layerAlpha < 255) canvas.restore()
      canvas.restore()
    }
    return bmp
  }
}

package expo.modules.wipptouchnative

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.util.concurrent.atomic.AtomicReference

/**
 * Type 4 Tag NDEF HCE for WIPP Touch (Android A → iPhone Background Tag Reading).
 * Only answers while a share session is active (AtomicReference URI set).
 *
 * AID: D2760000850101 (NDEF Tag Application)
 */
class WippNfcHceService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    val uri = activeUri.get()
    if (uri.isNullOrBlank() || commandApdu == null || commandApdu.size < 4) {
      return SW_ERR
    }
    val ins = commandApdu[1].toInt() and 0xff
    val p1 = commandApdu[2].toInt() and 0xff
    val p2 = commandApdu[3].toInt() and 0xff

    // SELECT by AID / by file
    if (ins == 0xa4) {
      if (commandApdu.size >= 7) {
        val data = commandApdu.copyOfRange(5, commandApdu.size)
        if (data.size >= 2) {
          val fid = ((data[data.size - 2].toInt() and 0xff) shl 8) or (data[data.size - 1].toInt() and 0xff)
          if (fid == 0xE103) selectedFile.set(FILE_CC)
          if (fid == 0xE104) selectedFile.set(FILE_NDEF)
        }
      }
      return SW_OK
    }
    // READ BINARY
    if (ins == 0xb0) {
      val offset = ((p1 and 0xff) shl 8) or (p2 and 0xff)
      val le = if (commandApdu.size >= 5) commandApdu[4].toInt() and 0xff else 0
      val file = when (selectedFile.get()) {
        FILE_CC -> ccFile()
        FILE_NDEF -> ndefFile(uri)
        else -> ndefFile(uri)
      }
      if (offset >= file.size) return SW_OK
      val end = minOf(file.size, offset + if (le == 0) 256 else le)
      val slice = file.copyOfRange(offset, end)
      return slice + SW_OK
    }
    return SW_ERR
  }

  override fun onDeactivated(reason: Int) {}

  companion object {
    private val activeUri = AtomicReference<String?>(null)
    private val selectedFile = AtomicReference(FILE_NDEF)

    private const val FILE_CC = 1
    private const val FILE_NDEF = 2

    private val SW_OK = byteArrayOf(0x90.toByte(), 0x00)
    private val SW_ERR = byteArrayOf(0x6A.toByte(), 0x82.toByte())

    fun setActiveUri(uri: String?) {
      activeUri.set(uri)
    }

    fun clear() {
      activeUri.set(null)
    }

    /** Capability Container (E103) — minimal CC for NDEF. */
    private fun ccFile(): ByteArray {
      // CCLEN(2)=000F, Mapping=20, MLe=00FF, MLc=00FF, NDEF File Control TLV
      return byteArrayOf(
        0x00, 0x0F,
        0x20,
        0x00, 0xFF.toByte(),
        0x00, 0xFF.toByte(),
        0x04, 0x06,
        0xE1.toByte(), 0x04,
        0x00, 0xFF.toByte(),
        0x00, 0x00,
      )
    }

    /** NDEF file (E104): NLEN(2) + NDEF message (URI record). */
    private fun ndefFile(uri: String): ByteArray {
      val record = uriNdefRecord(uri)
      val nlen = record.size
      val out = ByteArray(2 + nlen)
      out[0] = ((nlen shr 8) and 0xff).toByte()
      out[1] = (nlen and 0xff).toByte()
      System.arraycopy(record, 0, out, 2, nlen)
      return out
    }

    /** TNF Well-Known, type "U", URI prefix https://www. = 0x02 or https:// = 0x04 */
    private fun uriNdefRecord(uri: String): ByteArray {
      var rest = uri
      var prefix: Byte = 0x00
      when {
        uri.startsWith("https://www.") -> {
          prefix = 0x02
          rest = uri.removePrefix("https://www.")
        }
        uri.startsWith("http://www.") -> {
          prefix = 0x01
          rest = uri.removePrefix("http://www.")
        }
        uri.startsWith("https://") -> {
          prefix = 0x04
          rest = uri.removePrefix("https://")
        }
        uri.startsWith("http://") -> {
          prefix = 0x03
          rest = uri.removePrefix("http://")
        }
      }
      val payload = byteArrayOf(prefix) + rest.toByteArray(Charset.forName("UTF-8"))
      val type = byteArrayOf('U'.code.toByte())
      // MB=1 ME=1 SR=1 TNF=0x01 → 0xD1
      val header = 0xD1.toByte()
      return byteArrayOf(header, type.size.toByte(), payload.size.toByte()) + type + payload
    }
  }
}

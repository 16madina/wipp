/**
 * NFC and WIPP Touch — capability study (no HCE implementation).
 *
 * Decision: NFC is NOT implemented in this slice.
 * BLE remains the primary proximity channel; QR /t/CODE is the guaranteed fallback.
 *
 * ## Direction matrix (real OS constraints)
 *
 * ### Android → Android
 * - Classic Android Beam (NDEF push) is **deprecated/removed** on modern Android.
 * - Host Card Emulation (HCE) can emulate a Type-4 NDEF tag, but:
 *   - B must be in a state where the system NFC reader runs (screen on; OEM-dependent).
 *   - Background / locked behavior varies by OEM.
 *   - Not a reliable “phones touch → sheet” path comparable to AirDrop/NameDrop.
 * - Reader/Writer mode requires the receiving app (or system UI) to actively read.
 * - **Verdict:** possible as a complementary experiment later; not primary. Not shipped.
 *
 * ### Android → iPhone
 * - iOS Background Tag Reading can open https URLs from NDEF URI records when the phone
 *   is unlocked and NFC is available — **if** A presents as a real NDEF tag.
 * - Android HCE Type-4 NDEF is non-trivial and often fails interop testing with iPhone.
 * - Core NFC on B would require WIPP open (reader session) — breaks “B doesn’t open Touch”.
 * - **Verdict:** do not claim AirDrop-like NFC. Prefer BLE + `/t/CODE` (QR or share sheet).
 *
 * ### iPhone → Android
 * - iOS has **no HCE**. An iPhone cannot emulate an NDEF tag for Android to tap.
 * - iPhone can only act as NFC reader (Core NFC), which requires WIPP foreground.
 * - **Verdict:** unsupported as emit channel. BLE (+ QR) only.
 *
 * ### iPhone → iPhone
 * - No peer HCE. NameDrop/AirDrop are Apple-private stacks.
 * - Core NFC does not enable phone-to-phone token broadcast.
 * - **Verdict:** unsupported via NFC. BLE peripheral/central only.
 *
 * ## Locked / background
 * - iOS: NFC reader sessions need foreground; background tag reading is system-only for tags.
 * - Android: HCE may run in background with restrictions; OEM kills are common.
 *
 * ## What we ship instead
 * - BLE advertise (service UUID + ephemeral code) + server invite.
 * - Deep link `https://wippapp.com/t/CODE` for QR, share, and future NFC-if-ever.
 */
export {};

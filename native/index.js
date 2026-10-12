// Background tasks must be defined before anything else: when a push starts WIPP with no screen
// (phone locked, app closed), the screens in app/ are never loaded — the incoming-call task defined
// there did not exist yet, and the call only appeared once WIPP was opened by hand.
import "./src/lib/push/android-call";
import "expo-router/entry";

const { withAppDelegate } = require("expo/config-plugins");

/**
 * iOS 18+: lets the camera keep running while a WIPP video call is in the mini player (PiP),
 * so « Me montrer » in the call notification works outside the app.
 * Needs `voip` in UIBackgroundModes (already there) and an app built with the iOS 18 SDK.
 * See @livekit/react-native README (iOS setup) and AVCaptureSession.isMultitaskingCameraAccessSupported.
 */
const MARK = "// WIPP-CALL-CAMERA";

function patch(src) {
  if (src.includes(MARK)) return src;
  src = src.replace("import Expo\n", `import Expo\nimport livekit_react_native_webrtc ${MARK}\n`);
  src = src.replace(
    "    return super.application(application, didFinishLaunchingWithOptions: launchOptions)\n  }",
    `    WebRTCModuleOptions.sharedInstance().enableMultitaskingCameraAccess = true ${MARK}
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }`,
  );
  return src;
}

module.exports = function withWippCallCamera(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language === "swift") cfg.modResults.contents = patch(cfg.modResults.contents);
    return cfg;
  });
};

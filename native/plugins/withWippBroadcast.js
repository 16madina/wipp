/**
 * WIPP 1.1 — screen sharing on iPhone: a ReplayKit « Broadcast Upload » extension (WippBroadcast).
 * It captures the whole screen and hands each frame to the WIPP app through the App Group; the app
 * publishes it as a separate LiveKit screen-share track (react-native-webrtc ScreenCapturer).
 *
 * Same method as withWippNotificationService. `applyToIosProject(root)` lets us add the target to the
 * existing ios/ folder without a full prebuild (scripts/apply-broadcast-ios.js).
 */
const fs = require("fs");
const path = require("path");
const { withDangerousMod, withInfoPlist, withXcodeProject } = require("@expo/config-plugins");

const TARGET = "WippBroadcast";
const APP_GROUP = "group.com.wipp.app";
const SOURCES = ["SampleHandler.swift", "SocketConnection.swift", "SampleUploader.swift"];

function infoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>WIPP</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.broadcast-services-upload</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).SampleHandler</string>
    <key>RPBroadcastProcessMode</key>
    <string>RPBroadcastProcessModeSampleBuffer</string>
  </dict>
</dict>
</plist>
`;
}

function entitlements() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>
`;
}

function writeExtensionFiles(iosRoot) {
  const dir = path.join(iosRoot, TARGET);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of SOURCES) fs.copyFileSync(path.join(__dirname, "broadcast", f), path.join(dir, f));
  // Own file name: two extensions with an « Info.plist » each would share one project file reference.
  fs.writeFileSync(path.join(dir, `${TARGET}-Info.plist`), infoPlist());
  fs.writeFileSync(path.join(dir, `${TARGET}.entitlements`), entitlements());
}

function mainDevelopmentTeam(pbx) {
  const configs = pbx.pbxXCBuildConfigurationSection();
  for (const key in configs) {
    const bs = configs[key].buildSettings;
    if (!bs || !bs.PRODUCT_NAME || !bs.DEVELOPMENT_TEAM) continue;
    const name = String(bs.PRODUCT_NAME).replace(/"/g, "");
    if (name.includes("Extension") || name.includes("Service") || name.includes(TARGET)) continue;
    return String(bs.DEVELOPMENT_TEAM).replace(/"/g, "");
  }
  return null;
}

/** Adds the WippBroadcast target to an xcode project object (idempotent). */
function addTarget(pbx, { bundleIdentifier, buildNumber, version }) {
  if (pbx.pbxTargetByName(TARGET)) return false;
  const bundleId = `${bundleIdentifier}.broadcast`;
  const team = mainDevelopmentTeam(pbx);
  const files = [...SOURCES, `${TARGET}-Info.plist`, `${TARGET}.entitlements`];
  const group = pbx.addPbxGroup(files, TARGET, TARGET);
  const groups = pbx.hash.project.objects.PBXGroup;
  for (const key of Object.keys(groups)) {
    const g = groups[key];
    if (typeof g === "object" && g.name === undefined && g.path === undefined) pbx.addToPbxGroup(group.uuid, key);
  }
  const objects = pbx.hash.project.objects;
  objects.PBXTargetDependency = objects.PBXTargetDependency || {};
  objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};
  const target = pbx.addTarget(TARGET, "app_extension", TARGET, bundleId);
  pbx.addBuildPhase(SOURCES, "PBXSourcesBuildPhase", "Sources", target.uuid);
  pbx.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
  pbx.addBuildPhase(["ReplayKit.framework"], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);
  const configs = pbx.pbxXCBuildConfigurationSection();
  for (const key in configs) {
    const bs = configs[key].buildSettings;
    if (!bs || bs.PRODUCT_NAME !== `"${TARGET}"`) continue;
    bs.INFOPLIST_FILE = `"${TARGET}/${TARGET}-Info.plist"`;
    bs.CODE_SIGN_ENTITLEMENTS = `"${TARGET}/${TARGET}.entitlements"`;
    bs.CODE_SIGN_STYLE = "Automatic";
    bs.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
    bs.CURRENT_PROJECT_VERSION = `"${buildNumber}"`;
    bs.MARKETING_VERSION = `"${version}"`;
    bs.IPHONEOS_DEPLOYMENT_TARGET = "15.1";
    bs.SWIFT_VERSION = "5.0";
    bs.TARGETED_DEVICE_FAMILY = `"1,2"`;
    bs.CLANG_ENABLE_MODULES = "YES";
    bs.GENERATE_INFOPLIST_FILE = "NO";
    bs.SKIP_INSTALL = "YES";
    if (team) bs.DEVELOPMENT_TEAM = team;
  }
  if (team) pbx.addTargetAttribute("DevelopmentTeam", team, pbx.pbxTargetByName(TARGET));
  return true;
}

/** Keys the WIPP app reads to find the extension and the shared socket. */
function addInfoKeys(info, bundleIdentifier) {
  info.RTCAppGroupIdentifier = APP_GROUP;
  info.RTCScreenSharingExtension = `${bundleIdentifier}.broadcast`;
  return info;
}

const plugin = function withWippBroadcast(config) {
  const bundleIdentifier = config.ios?.bundleIdentifier || "com.wipp.app";
  config = withInfoPlist(config, (cfg) => {
    addInfoKeys(cfg.modResults, bundleIdentifier);
    return cfg;
  });
  config = withDangerousMod(config, ["ios", (cfg) => {
    writeExtensionFiles(cfg.modRequest.platformProjectRoot);
    return cfg;
  }]);
  config = withXcodeProject(config, (cfg) => {
    addTarget(cfg.modResults, { bundleIdentifier, buildNumber: cfg.ios?.buildNumber || "1", version: cfg.version || "1.0.0" });
    return cfg;
  });
  return config;
};

module.exports = plugin;
module.exports.TARGET = TARGET;
module.exports.writeExtensionFiles = writeExtensionFiles;
module.exports.addTarget = addTarget;
module.exports.addInfoKeys = addInfoKeys;

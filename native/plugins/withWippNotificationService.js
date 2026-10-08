const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * iOS Notification Service Extension "WippNotificationService":
 * decrypts the E2E message preview on the phone (lock screen), from the ciphertext in the push.
 * Shares the identity key with the app through the App Group keychain (group.com.wipp.app).
 */
const TARGET = "WippNotificationService";
const APP_GROUP = "group.com.wipp.app";

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
    <key>NSExtensionAttributes</key>
    <dict>
      <key>IntentsSupported</key>
      <array>
        <string>INSendMessageIntent</string>
      </array>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NotificationService</string>
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

function mainDevelopmentTeam(pbx) {
  const configs = pbx.pbxXCBuildConfigurationSection();
  for (const key in configs) {
    const bs = configs[key].buildSettings;
    if (!bs || !bs.PRODUCT_NAME || !bs.DEVELOPMENT_TEAM) continue;
    const name = String(bs.PRODUCT_NAME).replace(/"/g, "");
    if (name.includes("Extension") || name.includes(TARGET)) continue;
    return String(bs.DEVELOPMENT_TEAM).replace(/"/g, "");
  }
  return null;
}

module.exports = function withWippNotificationService(config) {
  config = withDangerousMod(config, [
    "ios",
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(path.join(__dirname, "notification-service", "NotificationService.swift"), path.join(dir, "NotificationService.swift"));
      fs.writeFileSync(path.join(dir, "Info.plist"), infoPlist());
      fs.writeFileSync(path.join(dir, `${TARGET}.entitlements`), entitlements());
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const pbx = cfg.modResults;
    if (pbx.pbxTargetByName(TARGET)) return cfg;
    const bundleId = `${cfg.ios?.bundleIdentifier || "com.wipp.app"}.NotificationService`;
    const buildNumber = cfg.ios?.buildNumber || "1";
    const version = cfg.version || "1.0.0";
    const team = mainDevelopmentTeam(pbx);

    const files = ["NotificationService.swift", "Info.plist", `${TARGET}.entitlements`];
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
    pbx.addBuildPhase(["NotificationService.swift"], "PBXSourcesBuildPhase", "Sources", target.uuid);
    pbx.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
    pbx.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);

    const configs = pbx.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const bs = configs[key].buildSettings;
      if (!bs || bs.PRODUCT_NAME !== `"${TARGET}"`) continue;
      bs.INFOPLIST_FILE = `"${TARGET}/Info.plist"`;
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
    return cfg;
  });
  return config;
};

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function readDeploy() {
  try {
    return JSON.parse(readFileSync(join(__dirname, "..", ".grok", "deploy.json"), "utf8"));
  } catch {
    return {};
  }
}

const deploy = readDeploy();
const easProjectId =
  process.env.EAS_PROJECT_ID ||
  deploy.easProjectId ||
  "ea523c90-fa59-41f1-af9e-fde9a68b360e";
const apiUrl =
  process.env.EXPO_PUBLIC_WIPP_API_URL || deploy.apiUrl || "https://wippapp.com";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Wipp",
  slug: "wipp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "wipp",
  userInterfaceStyle: "dark",
  // String form works for managed CNG and avoids bare-workflow policy errors
  // if a local ios/ folder is accidentally present during upload.
  runtimeVersion: "1.0.0",
  updates: easProjectId
    ? {
        url: `https://u.expo.dev/${easProjectId}`,
        fallbackToCacheTimeout: 0,
        checkAutomatically: "ON_LOAD",
      }
    : {
        enabled: false,
      },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.wipp.app",
    buildNumber: "1",
    googleServicesFile: "./GoogleService-Info.plist",
    associatedDomains: ["applinks:wippapp.com"],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSBluetoothAlwaysUsageDescription:
        "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité, sans numéro.",
      NSBluetoothPeripheralUsageDescription:
        "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité.",
      /**
       * Background modes kept (justified):
       * - audio: LiveKit / CallKeep call audio
       * - voip: CallKit / PushKit incoming calls
       * - remote-notification: Expo push (calls + Touch Accept/Refuse)
       * - bluetooth-central: B scans WIPP Touch in background
       * - bluetooth-peripheral: A advertises WIPP Touch (CBPeripheralManager)
       * Removed: fetch (unused)
       */
      UIBackgroundModes: [
        "audio",
        "voip",
        "remote-notification",
        "bluetooth-central",
        "bluetooth-peripheral",
      ],
    },
  },
  android: {
    package: "com.wipp.app",
    versionCode: 1,
    googleServicesFile: "./google-services.json",
    // Location intentionally omitted here — plugin adds maxSdkVersion=30 only.
    permissions: [
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
      "POST_NOTIFICATIONS",
      "USE_FULL_SCREEN_INTENT",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_PHONE_CALL",
      "FOREGROUND_SERVICE_CONNECTED_DEVICE",
      "MANAGE_OWN_CALLS",
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "BLUETOOTH_ADVERTISE",
      "BLUETOOTH_CONNECT",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "wippapp.com",
            pathPrefix: "/t/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    adaptiveIcon: {
      backgroundColor: "#0B1220",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-dev-client",
    [
      "expo-notifications",
      {
        sounds: [],
        mode: "production",
      },
    ],
    [
      "@react-native-firebase/app",
      {
        // CocoaPods Firebase (not SPM) so we can use static frameworks with
        // the local WippTouchNative Expo module. SPM requires dynamic linkage,
        // which conflicts with custom static Expo modules under precompiled RN.
        ios: { disableSPM: true },
      },
    ],
    "@react-native-firebase/auth",
    "./plugins/withWippCallkeep.js",
    "./plugins/withWippTouchNative.js",
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: true,
        modes: ["peripheral", "central"],
        bluetoothAlwaysPermission:
          "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité, sans numéro.",
        neverForLocation: true,
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          forceStaticLinking: [
            "RNFBApp",
            "RNFBAuth",
            "WippTouchNative",
          ],
        },
        android: {
          usesCleartextTraffic: true,
          permissions: [
            "android.permission.POST_NOTIFICATIONS",
            "android.permission.USE_FULL_SCREEN_INTENT",
            "android.permission.BLUETOOTH_ADVERTISE",
            "android.permission.BLUETOOTH_CONNECT",
            "android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE",
          ],
        },
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#0B1220",
      },
    ],
    "expo-updates",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    wippApiUrl: apiUrl,
    firebaseProjectId: "wipp-61124",
    /** Default RSSI gate — calibrate on devices (see touch-proximity). */
    wippTouchRssiThreshold: -52,
    ...(easProjectId
      ? {
          eas: {
            projectId: easProjectId,
          },
        }
      : {}),
  },
  ...(deploy.expoOwner ? { owner: deploy.expoOwner } : {}),
};

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
  runtimeVersion: {
    policy: "appVersion",
  },
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
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSBluetoothAlwaysUsageDescription:
        "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité, sans numéro.",
      NSBluetoothPeripheralUsageDescription:
        "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité.",
      UIBackgroundModes: [
        "audio",
        "voip",
        "remote-notification",
        "fetch",
        "bluetooth-central",
        "bluetooth-peripheral",
      ],
    },
  },
  android: {
    package: "com.wipp.app",
    versionCode: 1,
    googleServicesFile: "./google-services.json",
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
      "BLUETOOTH_SCAN",
      "BLUETOOTH_ADVERTISE",
      "BLUETOOTH_CONNECT",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
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
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "./plugins/withWippCallkeep.js",
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: true,
        modes: ["peripheral", "central"],
        bluetoothAlwaysPermission:
          "WIPP Touch utilise le Bluetooth pour partager ton WIPP à proximité, sans numéro.",
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          // RN Firebase v26 résout firebase-ios-sdk via SPM → linkage dynamique requis
          useFrameworks: "dynamic",
        },
        android: {
          permissions: [
            "android.permission.POST_NOTIFICATIONS",
            "android.permission.USE_FULL_SCREEN_INTENT",
            "android.permission.BLUETOOTH_SCAN",
            "android.permission.BLUETOOTH_ADVERTISE",
            "android.permission.BLUETOOTH_CONNECT",
            "android.permission.ACCESS_FINE_LOCATION",
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

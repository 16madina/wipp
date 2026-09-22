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
const easProjectId = process.env.EAS_PROJECT_ID || deploy.easProjectId || null;
const apiUrl =
  process.env.EXPO_PUBLIC_WIPP_API_URL || deploy.apiUrl || "http://127.0.0.1:3847";

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
  },
  android: {
    package: "com.wipp.app",
    versionCode: 1,
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
    eas: {
      projectId: easProjectId,
    },
  },
  ...(deploy.expoOwner ? { owner: deploy.expoOwner } : {}),
};

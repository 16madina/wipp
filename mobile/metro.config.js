const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Resolve local Expo module without relying solely on the file: symlink.
const touchNative = path.resolve(__dirname, "modules/wipp-touch-native");
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "wipp-touch-native": touchNative,
};
const messaging = path.resolve(__dirname, "../src/lib/messaging");
config.watchFolders = [...(config.watchFolders || []), touchNative, messaging];

module.exports = config;

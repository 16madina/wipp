const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-secure-store has no web implementation: use a localStorage shim for the web preview only.
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "expo-secure-store") {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "src/shims/secure-store.web.ts") };
  }
  return (resolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;

/**
 * Adds the WippBroadcast extension to the EXISTING ios/ project (no full prebuild, which would also
 * regenerate everything else). Safe to run twice. Usage: node scripts/apply-broadcast-ios.js
 */
const fs = require("fs");
const path = require("path");
const xcode = require("xcode");
const plist = require("@expo/plist").default;
const broadcast = require("../plugins/withWippBroadcast");

const root = path.join(__dirname, "..");
const ios = path.join(root, "ios");
const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;
const bundleIdentifier = app.ios?.bundleIdentifier || "com.wipp.app";

broadcast.writeExtensionFiles(ios);

const pbxPath = path.join(ios, "WIPP.xcodeproj", "project.pbxproj");
const pbx = xcode.project(pbxPath);
pbx.parseSync();
const added = broadcast.addTarget(pbx, { bundleIdentifier, buildNumber: app.ios?.buildNumber || "1", version: app.version || "1.0.0" });
if (added) fs.writeFileSync(pbxPath, pbx.writeSync());

const infoPath = path.join(ios, "WIPP", "Info.plist");
const info = plist.parse(fs.readFileSync(infoPath, "utf8"));
broadcast.addInfoKeys(info, bundleIdentifier);
fs.writeFileSync(infoPath, plist.build(info));

console.log(added ? "WippBroadcast target added." : "WippBroadcast target already present (files refreshed).");

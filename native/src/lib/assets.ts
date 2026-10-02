import { raster, type RasterKey } from "../generated/raster";
import { stickerRemoteUri } from "./sticker-cdn";

export function wippSrc(path?: string | null) {
  if (!path) return undefined;
  const key = path.replace(/^\//, "").split("?")[0] as RasterKey;
  const local = (raster as Record<string, number>)[key];
  if (local != null) return local;
  const uri = stickerRemoteUri(key);
  return uri ? { uri } : undefined;
}

export const authLogin = require("../../assets/auth/wipp-auth-login.png");
export const authSms = require("../../assets/auth/wipp-auth-sms-clean2.png");
export const authProfile = require("../../assets/auth/wipp-auth-profile-no-password.png");
export const authWelcome = require("../../assets/auth/wipp-auth-welcome.png");
export const authPhone = require("../../assets/auth/wipp-auth-phone.png");
export const logoGold = require("../../assets/auth/wipp-logo-gold.png");
export const brandOfficial = require("../../assets/wipp/brand/wipp-official.png");
export const bootVideo = require("../../assets/wipp/brand/wipp-boot.mp4");
export const bootPoster = require("../../assets/wipp/brand/wipp-boot.jpg");
export const composerSticker = require("../../assets/composer/sticker.png");

import { raster, type RasterKey } from "../generated/raster";
import { stickerVideo } from "../generated/video";
import { stickerRemoteUri } from "./sticker-cdn";

export function wippSrc(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return { uri: path };
  const key = path.replace(/^\//, "").split("?")[0] as RasterKey;
  const clip = (stickerVideo as Record<string, number>)[key];
  if (clip != null) return clip;
  const local = (raster as Record<string, number>)[key];
  if (local != null) return local;
  const uri = stickerRemoteUri(key);
  return uri ? { uri } : undefined;
}

export const authLogin = require("../../assets/auth/wipp-auth-login.png");
export const authSms = require("../../assets/auth/wipp-auth-sms-clean2.png");
export const authProfile = require("../../assets/auth/wipp-auth-profile-no-password.png");
export const authProfileBg = require("../../assets/auth/wipp-auth-profile-bg.jpg");
export const authMascotAnim = require("../../assets/auth/wipp-mascot-anim.webp");
export const authWelcome = require("../../assets/auth/wipp-auth-welcome.png");
export const authPhone = require("../../assets/auth/wipp-auth-phone.png");
export const logoGold = require("../../assets/auth/wipp-logo-gold.png");
export const brandOfficial = require("../../assets/wipp/brand/wipp-official.png");
export const bootVideo = require("../../assets/wipp/brand/wipp-boot.mp4");
export const bootPoster = require("../../assets/wipp/brand/wipp-boot.jpg");
/** The little WIPP guy on the sticker button: gold on the dark theme, blue on the light (blue) theme. */
export const composerMascotGold = require("../../assets/composer/wipp-mascot-gold.png");
export const composerMascotBlue = require("../../assets/composer/wipp-mascot-blue.png");

export const eventHero = require("../../assets/events/create-hero.png");
export const businessIntro = require("../../assets/business/business-intro.png");
export const listingHero = require("../../assets/listings/create-hero.png");

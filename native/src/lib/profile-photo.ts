import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FileSystemSessionType, FileSystemUploadType, createUploadTask } from "expo-file-system/legacy";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./firebase-config";
import { firebaseIdToken } from "./firebase-phone";
import { myProfileId } from "./lot7/api";
import { cachedProfile, setCachedProfile } from "./messaging/supa";
import { useWippStore } from "./store";
import { supabase } from "./supabase";

/** Native upload task on phones; plain fetch in the browser (no upload task on web). */
async function uploadPublicMedia(endpoint: string, uri: string, mime: string, token: string) {
  const headers = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, "Content-Type": mime, "x-upsert": "false" };
  if (Platform.OS === "web") {
    const body = await (await fetch(uri)).blob();
    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (!res.ok) throw new Error("Envoi de la photo impossible");
    return;
  }
  const task = createUploadTask(endpoint, uri, {
    httpMethod: "POST",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    sessionType: FileSystemSessionType.FOREGROUND,
    headers,
  });
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) throw new Error("Envoi de la photo impossible");
}

export async function saveProfilePhotoFromUri(uri: string, mime = "image/jpeg") {
  const me = await myProfileId();
  const token = await firebaseIdToken();
  if (!token) throw new Error("Session requise");
  const ext = mime.includes("png") ? "png" : "jpg";
  const path = `business/${me}/avatar-${crypto.randomUUID()}.${ext}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/wipp-public-media/${path}`;
  await uploadPublicMedia(endpoint, uri, mime, token);
  const { data, error } = await supabase.from("wipp_profiles").update({ avatar_url: path }).eq("id", me).select("id");
  if (error || !data?.length) throw new Error("La photo a été envoyée, mais le profil n’a pas pu être mis à jour.");
  const known = cachedProfile();
  if (known) setCachedProfile({ ...known, avatarUrl: path });
  useWippStore.getState().changeAvatar(path);
  return path;
}

/** One canonical avatar path under the existing private-flag public bucket. */
export async function changeProfilePhoto() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Accès aux photos refusé.");
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  const asset = res.assets?.[0];
  if (res.canceled || !asset?.uri) return;
  const me = await myProfileId();
  const token = await firebaseIdToken();
  if (!token) throw new Error("Session requise");
  const mime = asset.mimeType ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : "jpg";
  const path = `business/${me}/avatar-${crypto.randomUUID()}.${ext}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/wipp-public-media/${path}`;
  await uploadPublicMedia(endpoint, asset.uri, mime, token);
  const { data, error } = await supabase.from("wipp_profiles").update({ avatar_url: path }).eq("id", me).select("id");
  if (error || !data?.length) throw new Error("La photo a été envoyée, mais le profil n’a pas pu être mis à jour.");
  const known = cachedProfile();
  if (known) setCachedProfile({ ...known, avatarUrl: path });
  useWippStore.setState((state) => {
    const users = { ...state.users };
    if (users.me) users.me = { ...users.me, avatar: path };
    const serverKey = `srvuser:${me}`;
    if (users[serverKey]) users[serverKey] = { ...users[serverKey], avatar: path };
    return { me: { ...state.me, avatar: path }, users };
  });
  useWippStore.getState().changeAvatar(path);
}

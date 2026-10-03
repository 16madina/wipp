import { Platform } from "react-native";
import { FileSystemSessionType, FileSystemUploadType, createUploadTask } from "expo-file-system/legacy";
import { SUPABASE_ANON_KEY } from "./firebase-config";

/**
 * Sends a local file to Supabase Storage. Phones stream it with a native upload task;
 * browsers have no upload task, so the web build sends the picked file with fetch.
 */
export async function uploadFileToStorage(
  endpoint: string,
  uri: string,
  mime: string,
  token: string | null,
  onProgress?: (sent: number, total: number) => void,
) {
  const headers = {
    Authorization: `Bearer ${token ?? ""}`,
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": mime,
    "x-upsert": "false",
  };
  if (Platform.OS === "web") {
    const body = await (await fetch(uri)).blob();
    onProgress?.(0, body.size);
    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (!res.ok) throw new Error("Envoi du fichier impossible");
    onProgress?.(body.size, body.size);
    return;
  }
  const task = createUploadTask(
    endpoint,
    uri,
    { httpMethod: "POST", uploadType: FileSystemUploadType.BINARY_CONTENT, sessionType: FileSystemSessionType.FOREGROUND, headers },
    (data) => {
      if (data.totalBytesExpectedToSend > 0) onProgress?.(data.totalBytesSent, data.totalBytesExpectedToSend);
    },
  );
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) throw new Error("Envoi du fichier impossible");
}

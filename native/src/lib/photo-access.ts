import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Before opening the photo library picker.
 * Android 13+ uses the system Photo Picker, which needs no permission: asking for full media access there
 * fails when the person picks "selected photos" or refuses, and WIPP then wrongly said "access refused".
 * iPhone: same as before (limited access counts as allowed).
 */
export async function requestPhotoPickerAccess(): Promise<{ granted: boolean }> {
  if (Platform.OS === "android") return { granted: true };
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return { granted: perm.granted || perm.accessPrivileges === "limited" };
}

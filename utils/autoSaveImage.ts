// src/utils/autosaveImage.ts
// SDK 54+: "expo-file-system/legacy". SDK 53 or older: "expo-file-system".
import * as FileSystem from "expo-file-system/legacy";
import type { ImagePickerAsset } from "expo-image-picker";

const DIR = `${FileSystem.documentDirectory}blog-autosave/`;

export async function keepImageForAutosave(
  asset: ImagePickerAsset,
): Promise<ImagePickerAsset> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  const ext = asset.uri.split(".").pop()?.split(/[?#]/)[0] ?? "jpg";
  const to = `${DIR}cover-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to });
  return { ...asset, uri: to };
}

export async function imageStillExists(uri: string) {
  try {
    return (await FileSystem.getInfoAsync(uri)).exists;
  } catch {
    return false;
  }
}

// src/storage/blogAutosaveStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  BLOG_AUTOSAVE_VERSION,
  type BlogAutosave,
  type BlogFormValues,
} from "@/types/blogAutoSave";
import { stripHtml } from "@/utils/html";

const storageKey = (userId: string) => `blog_autosave:${userId}`;

// Rich editors often report "<p></p>" when empty, so compare plain text.
export function isFormEmpty(values: BlogFormValues) {
  return (
    !values.title.trim() &&
    !stripHtml(values.description) &&
    !values.tagsInput.trim() &&
    !values.image
  );
}

export async function loadAutosave(
  userId: string,
): Promise<BlogAutosave | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as BlogAutosave;
    return saved.version === BLOG_AUTOSAVE_VERSION ? saved : null;
  } catch {
    return null; // corrupted data must never crash the screen
  }
}

export async function saveAutosave(userId: string, values: BlogFormValues) {
  const data: BlogAutosave = {
    ...values,
    version: BLOG_AUTOSAVE_VERSION,
    savedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch (error) {
    console.warn("Could not save autosave", error);
  }
}

export async function clearAutosave(userId: string) {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch (error) {
    console.warn("Could not clear autosave", error);
  }
}

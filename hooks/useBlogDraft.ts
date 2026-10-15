// src/hooks/useBlogAutosave.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  clearAutosave as clearStoredAutosave,
  isFormEmpty,
  loadAutosave,
  saveAutosave,
} from "@/storage/blogDraftStorage";
import type { BlogFormValues } from "@/types/blogAutoSave";
import { imageStillExists } from "@/utils/autoSaveImage";

const AUTOSAVE_DELAY_MS = 600;

type Options = {
  userId: string | undefined;
  values: BlogFormValues; // memoize this in the page
  onRestore: (saved: BlogFormValues) => void;
};

export function useBlogAutosave({ userId, values, onRestore }: Options) {
  const [isRestoring, setIsRestoring] = useState(true);

  const latestValues = useRef(values);
  const onRestoreRef = useRef(onRestore);
  const hasRestored = useRef(false);
  const stopped = useRef(false); // true after a successful submit

  useEffect(() => {
    latestValues.current = values;
    onRestoreRef.current = onRestore;
  });

  // Every save goes through here, so the safety rules live in one place.
  const persist = useCallback(
    async (v: BlogFormValues) => {
      if (!userId || !hasRestored.current || stopped.current) return;
      if (isFormEmpty(v)) await clearStoredAutosave(userId);
      else await saveAutosave(userId, v);
    },
    [userId],
  );

  // 1) Restore once.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const saved = await loadAutosave(userId);
      if (cancelled) return;

      if (saved) {
        const image =
          saved.image && (await imageStillExists(saved.image.uri))
            ? saved.image
            : null;
        if (cancelled) return;
        onRestoreRef.current({ ...saved, image });
      }
      hasRestored.current = true;
      setIsRestoring(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 2) Debounced autosave while typing.
  useEffect(() => {
    if (isRestoring) return;
    const timer = setTimeout(() => void persist(values), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [values, isRestoring, persist]);

  // 3) Instant save when the app leaves the foreground (camera opens).
  useEffect(() => {
    if (isRestoring) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void persist(latestValues.current);
    });
    return () => sub.remove();
  }, [isRestoring, persist]);

  // 4) Save on unmount.
  useEffect(
    () => () => {
      void persist(latestValues.current);
    },
    [persist],
  );

  // Call after a successful submit.
  const clearAutosave = useCallback(async () => {
    stopped.current = true;
    if (userId) await clearStoredAutosave(userId);
  }, [userId]);

  return { isRestoring, clearAutosave };
}

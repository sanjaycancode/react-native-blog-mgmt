// src/hooks/useImageSource.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";

import * as ImagePicker from "expo-image-picker";

type Asset = ImagePicker.ImagePickerAsset;

type Options = {
  onPick: (asset: Asset) => void | Promise<void>;
  onError: (message: string) => void;
};

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [16, 9], // matches the preview; Android crop only
  quality: 0.85,
};

export function useImageSource({ onPick, onError }: Options) {
  const [isPicking, setIsPicking] = useState(false);

  // Refs: always call the latest callbacks without re-creating our functions.
  const onPickRef = useRef(onPick);
  const onErrorRef = useRef(onError);
  const busy = useRef(false);
  const recovered = useRef(false);

  useEffect(() => {
    onPickRef.current = onPick;
    onErrorRef.current = onError;
  });

  // One wrapper for both sources: busy guard, spinner, error handling.
  const run = useCallback(
    async (
      launch: () => Promise<ImagePicker.ImagePickerResult>,
      failMessage: string,
    ) => {
      if (busy.current) return; // ignore double taps
      busy.current = true;
      setIsPicking(true);
      try {
        const result = await launch();
        if (!result.canceled && result.assets[0]) {
          await onPickRef.current(result.assets[0]);
        }
      } catch {
        onErrorRef.current(failMessage);
      } finally {
        busy.current = false;
        setIsPicking(false);
      }
    },
    [],
  );

  const pickFromGallery = useCallback(
    // The system gallery picker needs no permission, so we don't ask for one.
    () =>
      run(
        () => ImagePicker.launchImageLibraryAsync(PICK_OPTIONS),
        "Unable to open your gallery. Please try again.",
      ),
    [run],
  );

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      if (permission.canAskAgain) {
        onErrorRef.current("Camera permission is needed to take a photo.");
      } else {
        // The user chose "Don't ask again": only Settings can fix it.
        Alert.alert(
          "Camera access is off",
          "Turn on camera access in Settings to take photos.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
      }
      return;
    }

    await run(
      () => ImagePicker.launchCameraAsync(PICK_OPTIONS),
      "Unable to open the camera. Please try again.",
    );
  }, [run]);

  // Android only: if the OS killed the app while the camera was open,
  // the photo is waiting here after the restart. Runs once on mount.
  useEffect(() => {
    if (recovered.current) return;
    recovered.current = true;

    (async () => {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        // Some SDK versions return one result, others an array. Handle both.
        const list = Array.isArray(pending)
          ? pending
          : pending
            ? [pending]
            : [];
        for (const item of list) {
          if ("assets" in item && !item.canceled && item.assets[0]) {
            await onPickRef.current(item.assets[0]);
            break;
          }
        }
      } catch {
        // nothing to recover
      }
    })();
  }, []);

  return { pickFromGallery, takePhoto, isPicking };
}

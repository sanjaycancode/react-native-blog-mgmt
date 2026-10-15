// src/components/forms/FormImagePicker.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { Image } from "expo-image";

import type * as ImagePicker from "expo-image-picker";

import { Ionicons } from "@expo/vector-icons";

import {
  ImageSourceSheet,
  type ImageSourceOption,
} from "@/components/forms/ImageSourceSheet";
import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

import { useImageSource } from "@/hooks/useImageSource";

type Asset = ImagePicker.ImagePickerAsset;

interface FormImagePickerProps {
  image: Asset | null;
  onChange: (image: Asset | null) => void | Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function FormImagePicker({
  image,
  onChange,
  onError,
  disabled = false,
}: FormImagePickerProps) {
  const { colors, spacing, radii } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { pickFromGallery, takePhoto, isPicking } = useImageSource({
    onPick: onChange,
    onError,
  });

  const blocked = disabled || isPicking;

  // Launch the picker only AFTER the sheet has closed.
  // iOS refuses to present a picker while a Modal is still dismissing.
  const pendingAction = useRef<(() => void) | null>(null);

  const runPending = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);

  const choose = useCallback(
    (action: () => void) => {
      pendingAction.current = action;
      setSheetOpen(false);
      if (Platform.OS === "android") runPending(); // Android has no onDismiss
    },
    [runPending],
  );

  const options = useMemo<ImageSourceOption[]>(() => {
    const list: ImageSourceOption[] = [
      {
        key: "camera",
        label: "Take a photo",
        hint: "Use your camera",
        icon: "camera-outline",
        onPress: () => choose(() => void takePhoto()),
      },
      {
        key: "gallery",
        label: "Choose from gallery",
        hint: "Pick an existing photo",
        icon: "images-outline",
        onPress: () => choose(() => void pickFromGallery()),
      },
      // Later: { key: "my-images", label: "My images", ... } goes here.
    ];

    if (image) {
      list.push({
        key: "remove",
        label: "Remove image",
        icon: "trash-outline",
        destructive: true,
        onPress: () => choose(() => void onChange(null)),
      });
    }
    return list;
  }, [choose, image, onChange, pickFromGallery, takePhoto]);

  const openSheet = () => {
    if (!blocked) setSheetOpen(true);
  };

  return (
    <View>
      {image ? (
        // Filled state: the whole preview is tappable.
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={blocked}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="Change cover image"
          style={[
            styles.frame,
            { backgroundColor: colors.muted, borderRadius: radii.md },
          ]}
        >
          <Image
            key={image.uri}
            source={{ uri: image.uri }}
            contentFit="cover"
            transition={150}
            style={styles.fill}
            onError={(e) => console.log("image failed", image.uri, e.error)}
            onLoad={(e) => console.log("LOADED", image.uri, e.source)}
          />
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.card, borderRadius: radii.full },
            ]}
          >
            <Ionicons name="pencil" size={14} color={colors.foreground} />
            <ThemedText variant="caption">Change</ThemedText>
          </View>
          {isPicking ? <Busy /> : null}
        </TouchableOpacity>
      ) : (
        // Empty state: a big, obvious drop zone.
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={blocked}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="Add cover image"
          style={[
            styles.frame,
            styles.empty,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
              gap: spacing.xs,
              opacity: disabled ? 0.55 : 1,
            },
          ]}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          </View>
          <ThemedText variant="bodySmall">Add cover image</ThemedText>
          <ThemedText variant="caption" semantic="muted">
            Take a photo or choose from your gallery
          </ThemedText>
          {isPicking ? <Busy /> : null}
        </TouchableOpacity>
      )}

      <ImageSourceSheet
        visible={sheetOpen}
        title="Cover image"
        options={options}
        onClose={() => setSheetOpen(false)}
        onDismiss={runPending}
      />
    </View>
  );
}

function Busy() {
  const { colors } = useTheme();
  return (
    <View style={styles.busy}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 16 / 9, overflow: "hidden", width: "100%" },
  fill: { height: "100%", width: "100%" },
  empty: {
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1.5,
    justifyContent: "center",
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  badge: {
    alignItems: "center",
    bottom: 10,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: 10,
  },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
  },
});

export default FormImagePicker;

import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import * as ImagePicker from "expo-image-picker";

import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

interface FormImagePickerProps {
  image: ImagePicker.ImagePickerAsset | null;
  onChange: (image: ImagePicker.ImagePickerAsset | null) => void;
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
  const [isPicking, setIsPicking] = useState(false);

  const pickImage = async () => {
    if (disabled || isPicking) return;
    setIsPicking(true);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onError("Allow photo library access to choose a cover image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled) onChange(result.assets[0] ?? null);
    } catch {
      onError("Unable to open the photo library. Please try again.");
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {image ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: image.uri }}
            accessibilityLabel="Selected cover image preview"
            resizeMode="cover"
            style={[
              styles.preview,
              { backgroundColor: colors.muted, borderRadius: radii.md },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove cover image"
            disabled={disabled || isPicking}
            onPress={() => onChange(null)}
            style={[
              styles.removeButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.full,
              },
            ]}
          >
            <Ionicons name="close" size={18} color={colors.foreground} />
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={image ? "Change cover image" : "Choose cover image"}
        disabled={disabled || isPicking}
        onPress={() => void pickImage()}
        style={({ pressed }) => [
          styles.selectButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radii.md,
            gap: spacing.sm,
            minHeight: 48,
            paddingHorizontal: spacing.md,
            opacity: disabled || isPicking ? 0.55 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="image-outline" size={18} color={colors.primary} />
        <ThemedText variant="bodySmall">
          {isPicking ? "Opening photos..." : image ? "Change image" : "Choose image"}
        </ThemedText>
      </Pressable>
      {image?.fileName ? (
        <ThemedText variant="caption" semantic="muted">
          Selected: {image.fileName}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    alignSelf: "flex-start",
    position: "relative",
  },
  preview: {
    height: 160,
    width: 160,
  },
  removeButton: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
  },
  selectButton: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
});

export default FormImagePicker;

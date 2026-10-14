import { Pressable, StyleSheet } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

type HeaderBackButtonProps = {
  onPress: () => void;
  label?: string;
};

export function HeaderBackButton({
  onPress,
  label = "Go back",
}: HeaderBackButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name="chevron-back" size={19} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

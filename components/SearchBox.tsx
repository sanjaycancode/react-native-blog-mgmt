import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchBoxProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  delay?: number;
}


const noOutline = Platform.select({
  web: { outlineStyle: "none", outlineWidth: 0 } as object,
  default: {},
});

export default function SearchBox({
  initialValue = "",
  onSearch,
  placeholder = "Search...",
  delay = 800,
}: SearchBoxProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const debouncedValue = useDebounce(value, delay);
  const inputRef = useRef<TextInput>(null);
  const initialValueRef = useRef(initialValue);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    initialValueRef.current = initialValue;
    setValue((current) =>
      current.trim() === initialValue ? current : initialValue,
    );
  }, [initialValue]);

  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    if (debouncedValue.trim() === initialValueRef.current) return;
    onSearchRef.current(debouncedValue.trim());
  }, [debouncedValue]);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: focused ? colors.primary : colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={colors.mutedForeground}
      />
      <TextInput
        ref={inputRef}
        accessibilityLabel="Search blogs"
        returnKeyType="search"
        value={value}
        onChangeText={setValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        underlineColorAndroid="transparent"
        style={[
          styles.input,
          {
            color: colors.foreground,
            fontSize: typography.sizes.sm,
          },
          noOutline,
        ]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => setValue("")}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.mutedForeground}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    height: 44,
    width: "100%",
    overflow: "hidden",
  },
  input: {
    flex: 1,
    height: "100%",
    padding: 0,
    margin: 0,
    backgroundColor: "transparent",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
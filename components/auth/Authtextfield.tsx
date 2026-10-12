import { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

// Your theme has no "destructive" token, so errors use this fixed red.
export const ERROR_COLOR = "#DC2626";

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Pass a message to show it. Parent decides when (e.g. after blur). */
  error?: string | null;
  /** Adds the show/hide eye toggle and hides the text. */
  secure?: boolean;
};

const AuthTextField = forwardRef<TextInput, Props>(function AuthTextField(
  { label, icon, error, secure, onFocus, onBlur, style, ...rest },
  ref,
) {
  const { colors, typography, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Text
        style={{
          color: colors.foreground,
          fontSize: typography.sizes.sm,
          fontWeight: typography.weights.semibold,
          marginBottom: spacing.xs,
        }}
      >
        {label}
      </Text>

      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.background,
            borderColor: error
              ? ERROR_COLOR
              : focused
                ? colors.primary
                : colors.border,
            borderWidth: focused ? 2 : 1,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={focused ? colors.primary : colors.mutedForeground}
        />
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
          secureTextEntry={secure && !visible}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.foreground, fontSize: typography.sizes.base },
            style,
          ]}
        />
        {secure && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>

      {!!error && (
        <View style={[styles.errorRow, { marginTop: spacing.xs }]}>
          <Ionicons name="alert-circle" size={14} color={ERROR_COLOR} />
          <Text
            style={{
              color: ERROR_COLOR,
              fontSize: typography.sizes.xs,
              flex: 1,
            }}
          >
            {error}
          </Text>
        </View>
      )}
    </View>
  );
});

export default AuthTextField;

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    height: "100%",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
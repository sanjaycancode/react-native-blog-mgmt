import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

type ThemedKeyboardAvoidingViewProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  behavior?: "height" | "position" | "padding";
};

export function ThemedKeyboardAvoidingView({
  children,
  style,
  keyboardVerticalOffset = 0,
  behavior,
}: ThemedKeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : "height")}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";

import { useTheme } from "@/constants/theme";

interface RichTextEditorProps {
  id?: string;
  content?: string;
  placeholder?: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

function htmlToText(html: string) {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function RichTextEditor({
  id,
  content = "",
  placeholder = "Write your story...",
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  const { colors, spacing, radii } = useTheme();
  const [text, setText] = useState(() => htmlToText(content));

  useEffect(() => {
    setText(htmlToText(content));
  }, [content]);

  const handleChange = (value: string) => {
    setText(value);
    onChange(
      value.trim()
        ? value
            .split(/\r?\n/)
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join("")
        : "",
    );
  };

  return (
    <View
      nativeID={id}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.md,
        },
      ]}
    >
      <ThemedText
        variant="caption"
        semantic="muted"
        style={[
          styles.notice,
          {
            backgroundColor: colors.muted,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        Rich text formatting is available in the mobile app.
      </ThemedText>
      <ThemedTextInput
        accessibilityLabel={placeholder}
        value={text}
        onChangeText={handleChange}
        placeholder={placeholder}
        multiline
        textAlignVertical="top"
        editable={!disabled}
        style={[styles.input, { minHeight: 220, padding: spacing.md }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  notice: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 220,
  },
});

export default RichTextEditor;

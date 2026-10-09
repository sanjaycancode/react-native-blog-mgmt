import { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";

import type { RichEditor as RichEditorInstance } from "react-native-pell-rich-editor";
import {
  actions,
  RichEditor as PellRichEditor,
  RichToolbar,
} from "react-native-pell-rich-editor";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

interface RichTextEditorProps {
  id?: string;
  content?: string;
  placeholder?: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

const toolbarActions = [
  actions.setBold,
  actions.setItalic,
  actions.heading2,
  actions.insertBulletsList,
  actions.insertOrderedList,
  actions.blockquote,
];

function normalizeHtml(html: string) {
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?(p|div|span)(\s[^>]*)?>/gi, "")
    .replace(/&nbsp;|&#160;|\s|<[^>]*>/gi, "");

  return text ? html : "";
}

export function RichTextEditor({
  id,
  content = "",
  placeholder = "Write your story...",
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const editorRef = useRef<RichEditorInstance>(null);

  const handleChange = useCallback(
    (html: string) => onChange(normalizeHtml(html)),
    [onChange],
  );

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
      <RichToolbar
        getEditor={() => editorRef.current!}
        actions={toolbarActions}
        disabled={disabled}
        iconTint={colors.mutedForeground}
        selectedIconTint={colors.primaryForeground}
        selectedButtonStyle={{ backgroundColor: colors.primary }}
        disabledButtonStyle={{ opacity: 0.5 }}
        style={[
          styles.toolbar,
          {
            backgroundColor: colors.muted,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.xs,
          },
        ]}
        iconMap={{
          [actions.setBold]: () => (
            <ThemedText style={styles.boldIcon}>B</ThemedText>
          ),
          [actions.setItalic]: () => (
            <ThemedText style={styles.italicIcon}>I</ThemedText>
          ),
          [actions.heading2]: () => (
            <ThemedText style={styles.headingIcon}>H2</ThemedText>
          ),
          [actions.insertBulletsList]: () => (
            <ThemedText style={styles.listIcon}>• List</ThemedText>
          ),
          [actions.insertOrderedList]: () => (
            <ThemedText style={styles.listIcon}>1. List</ThemedText>
          ),
          [actions.blockquote]: () => (
            <ThemedText style={styles.quoteIcon}>Quote</ThemedText>
          ),
        }}
      />
      <PellRichEditor
        ref={editorRef}
        accessibilityLabel={placeholder}
        initialContentHTML={content}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        editorStyle={{
          backgroundColor: colors.card,
          color: colors.foreground,
          caretColor: colors.primary,
          placeholderColor: colors.mutedForeground,
          contentCSSText: `
            font-size: ${typography.sizes.base}px;
            line-height: ${typography.lineHeights.relaxed};
            padding: ${spacing.md}px;
            color: ${colors.foreground};
          `,
          cssText: `
            body { margin: 0; }
            h2 { font-size: ${typography.sizes.xl}px; }
            blockquote {
              border-left: 3px solid ${colors.primary};
              background: ${colors.muted};
              margin-left: 0;
              padding: 8px 12px;
            }
            a { color: ${colors.primary}; }
          `,
        }}
        style={[styles.editor, { backgroundColor: colors.card }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editor: {
    minHeight: 220,
  },
  boldIcon: {
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  italicIcon: {
    fontStyle: "italic",
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headingIcon: {
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  listIcon: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  quoteIcon: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
});

export default RichTextEditor;

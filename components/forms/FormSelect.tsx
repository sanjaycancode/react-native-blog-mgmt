import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

export interface FormSelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  value: string;
  options: FormSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function FormSelect({
  value,
  options,
  placeholder,
  onChange,
  accessibilityLabel,
  disabled = false,
}: FormSelectProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radii.md,
            minHeight: 48,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <ThemedText
          variant="bodySmall"
          semantic={selectedLabel ? "default" : "muted"}
          style={styles.selectedLabel}
        >
          {selectedLabel ?? placeholder}
        </ThemedText>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>
      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close options"
            onPress={() => setIsOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.foreground, opacity: 0.35 },
            ]}
          />
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.lg,
                maxHeight: "70%",
                padding: spacing.md,
              },
            ]}
          >
            <ScrollView>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    style={[
                      styles.option,
                      { paddingVertical: spacing.md, gap: spacing.sm },
                    ]}
                  >
                    <ThemedText
                      variant="bodySmall"
                      style={{
                        color: selected ? colors.primary : colors.foreground,
                        fontWeight: selected
                          ? typography.weights.semibold
                          : typography.weights.regular,
                      }}
                    >
                      {option.label}
                    </ThemedText>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectedLabel: {
    flex: 1,
  },
  modalRoot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  menu: {
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  option: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default FormSelect;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/NavBar";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

import { useAuth } from "@/context/AuthContext"; // adjust to where your AuthContext lives

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

type FieldName = "email" | "password";

type FormValues = Record<FieldName, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Your theme has no "destructive" token, so errors use this fixed red.
const ERROR_COLOR = "#DC2626";

function validate(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email, like you@example.com.";
  }
  if (values.password.length === 0) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export default function LoginScreen() {
  const { colors, typography, spacing, radii } = useTheme();
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const ADMIN_ROLE = "admin";

  const [values, setValues] = useState<FormValues>({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    email: false,
    password: false,
  });
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const errors = useMemo(() => validate(values), [values]);

  // Once the session is set (after login, or if already logged in), leave this screen.

  const setField = (field: FieldName, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const markTouched = (field: FieldName) => {
    setFocused((current) => (current === field ? null : current));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleLogin = useCallback(async () => {
    if (isSubmitting) return;

    setTouched({ email: true, password: true });
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      // Adjust this to match what your login() returns
      const role = result?.user?.role || "user";

      if (role === ADMIN_ROLE) {
        router.replace("/admin");
      } else {
        router.push("/profile");
      }
    } catch (error) {
      Alert.alert("Couldn't log you in", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [errors, isSubmitting, login, router, values]);
  const renderLabel = (label: string) => (
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
  );

  const renderError = (field: FieldName) =>
    touched[field] && errors[field] ? (
      <View style={[styles.errorRow, { marginTop: spacing.xs }]}>
        <Ionicons name="alert-circle" size={14} color={ERROR_COLOR} />
        <Text
          style={{
            color: ERROR_COLOR,
            fontSize: typography.sizes.xs,
            flex: 1,
          }}
        >
          {errors[field]}
        </Text>
      </View>
    ) : null;

  const inputShellStyle = (field: FieldName) => {
    const hasError = touched[field] && !!errors[field];
    return [
      styles.inputShell,
      {
        backgroundColor: colors.background,
        borderColor: hasError
          ? ERROR_COLOR
          : focused === field
            ? colors.primary
            : colors.border,
        borderWidth: focused === field ? 2 : 1,
        paddingHorizontal: spacing.md,
      },
    ];
  };

  const inputTextStyle = {
    color: colors.foreground,
    fontSize: typography.sizes.base,
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Navbar />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { padding: spacing.xl }]}>
            <View
              pointerEvents="none"
              style={[styles.glowLarge, { backgroundColor: colors.primary }]}
            />
            <View
              pointerEvents="none"
              style={[styles.glowSmall, { backgroundColor: colors.primary }]}
            />

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Ionicons name="book-outline" size={14} color={colors.primary} />
              <Text
                style={{
                  color: colors.secondaryForeground,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Good to see you again
              </Text>
            </View>

            <Text
              style={[
                styles.title,
                {
                  color: colors.foreground,
                  fontSize: typography.sizes["3xl"],
                  fontWeight: typography.weights.heavy,
                  lineHeight: 38,
                },
              ]}
            >
              Welcome back,{"\n"}
              <Text style={{ color: colors.primary }}>keep writing.</Text>
            </Text>

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.base,
                lineHeight: 24,
                marginTop: spacing.md,
              }}
            >
              Log in to pick up your drafts, publish new stories, and read what
              the community has been up to.
            </Text>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: spacing.xl }}>
            <Card
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                padding: spacing.xl,
              }}
            >
              {/* Email */}
              <View>
                {renderLabel("Email")}
                <View style={inputShellStyle("email")}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={
                      focused === "email"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                  <TextInput
                    value={values.email}
                    onChangeText={(text) => setField("email", text)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => markTouched("email")}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    style={[styles.input, inputTextStyle]}
                  />
                </View>
                {renderError("email")}
              </View>

              {/* Password */}
              <View style={{ marginTop: spacing.lg }}>
                {renderLabel("Password")}
                <View style={inputShellStyle("password")}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={
                      focused === "password"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                  <TextInput
                    ref={passwordRef}
                    value={values.password}
                    onChangeText={(text) => setField("password", text)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => markTouched("password")}
                    placeholder="Your password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleLogin()}
                    style={[styles.input, inputTextStyle]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
                {renderError("password")}
              </View>

              <Button
                title={isSubmitting ? "Logging in..." : "Log in"}
                variant="filled"
                onPress={() => void handleLogin()}
                style={{ width: "100%", marginTop: spacing.xl }}
              />
            </Card>
          </View>

          {/* Register link */}
          <View style={[styles.registerRow, { marginTop: spacing.xl }]}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
              }}
            >
              New here?
            </Text>
            <Pressable
              onPress={() => router.replace("/register")}
              hitSlop={8}
              accessibilityRole="link"
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.sizes.sm,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Create an account
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    position: "relative",
    overflow: "hidden",
  },
  glowLarge: {
    position: "absolute",
    right: -50,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.12,
  },
  glowSmall: {
    position: "absolute",
    right: 60,
    top: 70,
    width: 54,
    height: 54,
    borderRadius: 27,
    opacity: 0.1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
  },
  title: {
    letterSpacing: -0.5,
  },
  inputShell: {
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
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
});

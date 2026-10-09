import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authApi } from "@/api/services/auth";
import { getErrorMessage } from "@/utils/errorMessage";
import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/NavBar";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

import { useTheme } from "@/constants/theme";

const BLOG_BASE_URL = "http://localhost:8081/";

type FieldName = "name" | "email" | "password";

type FormValues = Record<FieldName, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Your theme has no "destructive" token, so errors use this fixed red.
const ERROR_COLOR = "#DC2626";

function validate(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};

  if (values.name.trim().length < 2) {
    errors.name = "Enter your name (at least 2 characters).";
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email, like you@example.com.";
  }
  if (values.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  return errors;
}

/** 0 (empty) to 4 (strong). */
function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.max(score, 1);
}

const STRENGTH_LABELS = ["", "Weak", "Okay", "Good", "Strong"];


export default function RegisterScreen() {
  const { colors, typography, spacing, radii } = useTheme();
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    name: false,
    email: false,
    password: false,
  });
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const errors = useMemo(() => validate(values), [values]);
  const strength = getPasswordStrength(values.password);

  const strengthColor = (level: number) => {
    if (level <= 1) return ERROR_COLOR;
    if (level === 2) return "#F59E0B";
    return colors.primary;
  };

  const setField = (field: FieldName, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const markTouched = (field: FieldName) => {
    setFocused((current) => (current === field ? null : current));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleRegister = useCallback(async () => {
    if (isSubmitting) return;

    setTouched({ name: true, email: true, password: true });
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await authApi.register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      Alert.alert("Check your email", response.data.message);

      setValues({ name: "", email: "", password: "" });
      setTouched({ name: false, email: false, password: false });
      setShowPassword(false);
      // router.push("/profile");
    } catch (error) {
      Alert.alert("Couldn't create your account", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [errors, isSubmitting, values]);

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
              <Ionicons
                name="create-outline"
                size={14}
                color={colors.primary}
              />
              <Text
                style={{
                  color: colors.secondaryForeground,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Free for every writer
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
              Start writing,{"\n"}
              <Text style={{ color: colors.primary }}>find your readers.</Text>
            </Text>

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.base,
                lineHeight: 24,
                marginTop: spacing.md,
              }}
            >
              Create an account to publish your own stories and join a growing
              Nepali community of writers.
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
              {/* Name */}
              <View>
                {renderLabel("Full name")}
                <View style={inputShellStyle("name")}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={
                      focused === "name"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                  <TextInput
                    value={values.name}
                    onChangeText={(text) => setField("name", text)}
                    onFocus={() => setFocused("name")}
                    onBlur={() => markTouched("name")}
                    placeholder="Your name"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    style={[styles.input, inputTextStyle]}
                  />
                </View>
                {renderError("name")}
              </View>

              {/* Email */}
              <View style={{ marginTop: spacing.lg }}>
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
                    ref={emailRef}
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
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleRegister()}
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

                {/* Strength meter */}
                {values.password.length > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                level <= strength
                                  ? strengthColor(strength)
                                  : colors.border,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.sizes.xs,
                        marginTop: spacing.xs,
                      }}
                    >
                      Password strength: {STRENGTH_LABELS[strength]}
                    </Text>
                  </View>
                )}
              </View>

              <Button
                title={isSubmitting ? "Creating account..." : "Create account"}
                variant="filled"
                onPress={() => void handleRegister()}
                style={{ width: "100%", marginTop: spacing.xl }}
              />

              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.xs,
                  lineHeight: 18,
                  textAlign: "center",
                  marginTop: spacing.md,
                }}
              >
                By creating an account, you agree to our terms and privacy
                policy.
              </Text>
            </Card>
          </View>

          {/* Login link */}
          <View style={[styles.loginRow, { marginTop: spacing.xl }]}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
              }}
            >
              Already have an account?
            </Text>
            <Pressable
              onPress={() => router.replace("/login")}
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
                Log in
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
  strengthBars: {
    flexDirection: "row",
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
});

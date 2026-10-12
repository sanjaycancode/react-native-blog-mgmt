import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import AuthScreen from "@/components/auth/AuthScreen";
import AuthSuccess from "@/components/auth/AuthSuccess";
import AuthTextField, { ERROR_COLOR } from "@/components/auth/Authtextfield";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

// ⚠️ Add forgotPassword / resetPassword to this service (see notes)
import { authApi } from "@/api/services/auth";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors, typography, spacing } = useTheme();

  const [email, setEmail] = useState(params.email ?? "");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const emailError =
    touched && !EMAIL_PATTERN.test(email.trim())
      ? "Enter a valid email, like you@example.com."
      : null;

  // Counts down so people can't spam the resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  }, [router]);

  const send = async () => {
    if (isSubmitting || cooldown > 0) return;
    setTouched(true);
    if (!EMAIL_PATTERN.test(email.trim())) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goReset = () =>
    router.push({
      pathname: "/reset-password",
      params: { email: email.trim().toLowerCase() },
    });

  return (
    <AuthScreen
      onBack={goBack}
      badgeIcon="key-outline"
      badge="Account recovery"
      title="Forgot your password?"
      accent="No worries."
      subtitle="Enter the email you signed up with and we'll send you a link to set a new password."
    >
      {sent ? (
        <Card
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            padding: spacing.xl,
          }}
        >
          <AuthSuccess
            icon="mail-open-outline"
            title="Check your email"
            body={`If an account exists for ${email.trim()}, a reset link is on its way. It stays valid for 2 hours.`}
          >
            <Button
              title="I have my reset link"
              variant="filled"
              onPress={goReset}
              style={{ width: "100%" }}
            />

            <View
              style={{
                alignItems: "center",
                marginTop: spacing.lg,
                gap: spacing.md,
              }}
            >
              <Pressable
                onPress={() => void send()}
                disabled={cooldown > 0 || isSubmitting}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text
                  style={{
                    color:
                      cooldown > 0 ? colors.mutedForeground : colors.primary,
                    fontSize: typography.sizes.sm,
                    fontWeight: typography.weights.semibold,
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setSent(false);
                  setCooldown(0);
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.sm,
                  }}
                >
                  Wrong email? Change it
                </Text>
              </Pressable>
            </View>
          </AuthSuccess>
        </Card>
      ) : (
        <Card
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            padding: spacing.xl,
          }}
        >
          <AuthTextField
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setTouched(true)}
            error={emailError}
            placeholder="you@example.com"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void send()}
          />

          {!!error && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: spacing.md,
              }}
            >
              <Ionicons name="alert-circle" size={16} color={ERROR_COLOR} />
              <Text
                style={{
                  color: ERROR_COLOR,
                  fontSize: typography.sizes.sm,
                  flex: 1,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          <Button
            title={isSubmitting ? "Sending..." : "Send reset link"}
            variant="filled"
            onPress={() => void send()}
            style={{ width: "100%", marginTop: spacing.xl }}
          />
        </Card>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          marginTop: spacing.xl,
        }}
      >
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: typography.sizes.sm,
          }}
        >
          Remembered it?
        </Text>
        <Pressable
          onPress={() => router.replace("/login")}
          accessibilityRole="link"
          hitSlop={8}
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
    </AuthScreen>
  );
}

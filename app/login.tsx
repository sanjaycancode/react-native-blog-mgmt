import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Redirect, Stack } from "expo-router";

import { Controller, useForm } from "react-hook-form";

import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedKeyboardAvoidingView } from "@/components/ThemedKeyboardAvoidingView";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import { formTextInputHelper } from "@/utils";
import { getErrorMessage } from "@/utils/errorMessage";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { isAuthenticated, isInitializing, login } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      username: "testUser",
      password: "testPassword",
    },
  });

  const clearError = useCallback(() => {
    if (loginError) setLoginError(null);
  }, [loginError]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setLoginError(null);
      await login({
        username: values.username.trim(),
        password: values.password.trim(),
      });
    } catch (error) {
      setLoginError(getErrorMessage(error));
    }
  };

  if (isInitializing) return null;
  if (isAuthenticated) return <Redirect href="/(auth)/(tabs)/home" />;

  return (
    <>
      <Stack.Screen options={{ title: "Login", headerShown: false }} />
      <ThemedSafeAreaView edges={["top", "bottom", "left", "right"]}>
        <ThemedKeyboardAvoidingView>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerContainer}>
              <ThemedText variant="heading2">Welcome</ThemedText>
              <ThemedText variant="body" semantic="muted">
                Sign in to continue.
              </ThemedText>
            </View>

            <ThemedCard style={styles.formContainer}>
              <Controller
                control={control}
                name="username"
                rules={{
                  required: "Enter your username.",
                }}
                render={({ field, fieldState }) => (
                  <ThemedTextInput
                    label="Email or Username"
                    placeholder="Enter email or username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    {...formTextInputHelper({ field, fieldState })}
                    onChangeText={(text) => {
                      field.onChange(text);
                      clearError();
                    }}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                rules={{
                  required: "Enter your password.",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <ThemedTextInput
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry
                    editable={!isSubmitting}
                    {...formTextInputHelper({ field, fieldState })}
                    onChangeText={(text) => {
                      field.onChange(text);
                      clearError();
                    }}
                  />
                )}
              />

              {loginError ? (
                <ThemedText variant="bodySmall" semantic="error">
                  {loginError}
                </ThemedText>
              ) : null}

              <ThemedButton
                title="Login"
                variant="accent"
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
              />
            </ThemedCard>
          </ScrollView>
        </ThemedKeyboardAvoidingView>
      </ThemedSafeAreaView>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    headerContainer: { gap: theme.spacing.sm, alignItems: "center" },
    formContainer: { gap: theme.spacing.lg, padding: theme.spacing.lg },
  });

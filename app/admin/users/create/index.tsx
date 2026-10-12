import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { type Href, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  HelperText,
  Menu,
  Text,
  TextInput,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { adminApi } from "@/api/services/admin";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import { getErrorMessage } from "@/utils/errorMessage";

type UserRole = "admin" | "user";
type FormErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword" | "role", string>
>;

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function CreateAdminUserPage() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isAdmin, isAuthenticated, isInitializing, router]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      showToast(getErrorMessage(logoutError), "error");
    }
  }, [logout, router, showToast]);

  const validate = useCallback(() => {
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!validateEmail(email.trim())) {
      nextErrors.email = "Enter a valid email.";
    }
    if (!password) nextErrors.password = "Password is required.";
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm password is required.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [confirmPassword, email, name, password]);

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    if (!validate()) return;

    setCreating(true);
    try {
      await adminApi.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      showToast("User created.");
      router.replace("/admin/users" as Href);
    } catch (createError) {
      showToast(getErrorMessage(createError), "error");
    } finally {
      setCreating(false);
    }
  }, [email, name, password, role, router, showToast, validate]);

  const updateField = useCallback(
    (field: keyof FormErrors, value: string, update: (text: string) => void) => {
      update(value);
      if (submitted) {
        setErrors((current) => ({ ...current, [field]: undefined }));
      }
    },
    [submitted],
  );

  if (isInitializing || !isAuthenticated || !isAdmin) {
    return (
      <View
        style={[
          styles.accessLoading,
          { backgroundColor: colors.background, gap: spacing.md },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text variant="bodyMedium" style={{ color: colors.foreground }}>
          Checking administrator access...
        </Text>
      </View>
    );
  }

  return (
    <AdminShell userName={user?.name} onLogout={() => void handleLogout()}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              padding: spacing.md,
              paddingBottom: spacing["4xl"],
              gap: spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          <View style={{ gap: spacing.xs }}>
            <Text
              variant="labelLarge"
              style={{
                color: colors.primary,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Admin
            </Text>
            <Text
              variant="headlineMedium"
              style={{ color: colors.foreground, fontWeight: "700" }}
            >
              Create New User
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Add a new member and choose their role.
            </Text>
          </View>

          <Card
            mode="outlined"
            style={[
              styles.formCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.md,
              },
            ]}
          >
            <Card.Content style={{ gap: spacing.lg }}>
              <View>
                <TextInput
                  label="Name *"
                  mode="outlined"
                  value={name}
                  onChangeText={(value) =>
                    updateField("name", value, setName)
                  }
                  placeholder="Enter full name"
                  autoCapitalize="words"
                  autoComplete="name"
                  disabled={creating}
                  error={Boolean(errors.name)}
                />
                {errors.name ? (
                  <HelperText type="error" visible>
                    {errors.name}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TextInput
                  label="Email *"
                  mode="outlined"
                  value={email}
                  onChangeText={(value) =>
                    updateField("email", value, setEmail)
                  }
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  disabled={creating}
                  error={Boolean(errors.email)}
                />
                {errors.email ? (
                  <HelperText type="error" visible>
                    {errors.email}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TextInput
                  label="Password *"
                  mode="outlined"
                  value={password}
                  onChangeText={(value) =>
                    updateField("password", value, setPassword)
                  }
                  placeholder="Enter password"
                  autoComplete="new-password"
                  secureTextEntry
                  disabled={creating}
                  error={Boolean(errors.password)}
                />
                {errors.password ? (
                  <HelperText type="error" visible>
                    {errors.password}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TextInput
                  label="Confirm Password *"
                  mode="outlined"
                  value={confirmPassword}
                  onChangeText={(value) =>
                    updateField("confirmPassword", value, setConfirmPassword)
                  }
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  secureTextEntry
                  disabled={creating}
                  error={Boolean(errors.confirmPassword)}
                />
                {errors.confirmPassword ? (
                  <HelperText type="error" visible>
                    {errors.confirmPassword}
                  </HelperText>
                ) : null}
              </View>

              <View style={{ gap: spacing.sm }}>
                <Menu
                  visible={roleMenuVisible}
                  onDismiss={() => setRoleMenuVisible(false)}
                  anchor={
                    <TextInput
                      label="Role"
                      mode="outlined"
                      value={role === "admin" ? "Admin" : "User"}
                      editable={false}
                      disabled={creating}
                      right={
                        <TextInput.Icon
                          icon={roleMenuVisible ? "chevron-up" : "chevron-down"}
                          onPress={() =>
                            setRoleMenuVisible((visible) => !visible)
                          }
                        />
                      }
                      onPressIn={() => setRoleMenuVisible(true)}
                    />
                  }
                >
                  {(["user", "admin"] as const).map((option) => (
                    <Menu.Item
                      key={option}
                      title={option === "admin" ? "Admin" : "User"}
                      leadingIcon={
                        role === option ? "check" : undefined
                      }
                      onPress={() => {
                        setRole(option);
                        setRoleMenuVisible(false);
                        if (submitted) {
                          setErrors((current) => ({
                            ...current,
                            role: undefined,
                          }));
                        }
                      }}
                    />
                  ))}
                </Menu>
                {errors.role ? (
                  <HelperText type="error" visible>
                    {errors.role}
                  </HelperText>
                ) : null}
              </View>

              <View
                style={[
                  styles.formActions,
                  { borderColor: colors.border, gap: spacing.sm, paddingTop: spacing.md },
                ]}
              >
                <Button
                  mode="outlined"
                  onPress={() => router.replace("/admin/users" as Href)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => void handleSubmit()}
                  loading={creating}
                  disabled={creating}
                  icon={({ color, size }) =>
                    creating ? null : (
                      <Ionicons
                        name="person-add-outline"
                        color={color}
                        size={size}
                      />
                    )
                  }
                >
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  accessLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  formCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  formActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
});

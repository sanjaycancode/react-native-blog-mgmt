import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/constants/theme";

// ⚠️ Same auth hook your old Navbar used
import { useAuth } from "@/context/AuthContext";

const SPRING = { damping: 16, stiffness: 260, mass: 0.7 };
const TILT_DEG = -12;

// The bar stays out of the way on auth screens and in the editor.
const HIDDEN_ON = ["/login", "/register", "/blog/create"];

/** Wraps any icon with tap-scale feedback and the active dot. */
function NavButton({
  active,
  label,
  onPress,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.82, SPRING))}
      onPressOut={() => (scale.value = withSpring(1, SPRING))}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8 }}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, style]}>
        {children}
      </Animated.View>
      <View
        style={[
          styles.dot,
          { backgroundColor: active ? colors.primary : "transparent" },
        ]}
      />
    </Pressable>
  );
}

/** The brand logo. Straight and faded when idle, tilted and bold when active. */
function HomeLogo({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    // Low damping gives the tilt a small, satisfying overshoot.
    progress.value = withSpring(active ? 1 : 0, {
      damping: 7,
      stiffness: 190,
      mass: 0.8,
    });
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 + 0.5 * Math.min(Math.max(progress.value, 0), 1),
    transform: [
      { rotate: `${TILT_DEG * progress.value}deg` },
      { scale: 1 + 0.14 * progress.value },
    ],
  }));

  return (
    <Animated.Image
      source={require("../assets/images/logo.png")}
      style={[styles.logo, style]}
      resizeMode="contain"
    />
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { session } = useAuth();

  const user = session?.user;
  const isLoggedIn = !!user;

  if (
    HIDDEN_ON.some((p) => pathname.startsWith(p)) ||
    pathname.includes("/edit")
  ) {
    return null;
  }

  const isHome = pathname === "/" || pathname === "/index";
  const isExplore = pathname === "/blog" || pathname.startsWith("/blog/");
  const isProfile =
    pathname.startsWith("/profile") || pathname.startsWith("/admin");

  // Top-level sections swap in place so the back stack doesn't pile up.
  const goTab = (path: string, active: boolean) => {
    if (!active) void router.replace(path);
  };

  const goWrite = () =>
    void router.push(isLoggedIn ? "/blog/create" : "/register");
  const goProfile = () => {
    if (!isLoggedIn) return void router.push("/login");
    goTab(user?.role === "admin" ? "/admin" : "/profile", isProfile);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      accessibilityRole="tablist"
    >
      <NavButton
        active={isHome}
        label="Home"
        onPress={() => goTab("/", isHome)}
      >
        <HomeLogo active={isHome} />
      </NavButton>

      <NavButton
        active={isExplore}
        label="Explore"
        onPress={() => goTab("/blog", isExplore)}
      >
        <Ionicons
          name={isExplore ? "search" : "search-outline"}
          size={26}
          color={isExplore ? colors.foreground : colors.mutedForeground}
        />
      </NavButton>

      {/* Center action: the thing people come here to do */}
      <NavButton active={false} label="Write a blog" onPress={goWrite}>
        <View style={[styles.write, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={26} color={colors.primaryForeground} />
        </View>
      </NavButton>

      <NavButton active={isProfile} label="Profile" onPress={goProfile}>
        <Ionicons
          name={isProfile ? "person" : "person-outline"}
          size={25}
          color={isProfile ? colors.foreground : colors.mutedForeground}
        />
      </NavButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  itemInner: {
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  logo: {
    width: 30,
    height: 30,
  },
  write: {
    width: 46,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { type ReactNode, useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { type Href,usePathname, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { profileApi } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

// ⚠️ Same auth hook your old Navbar used
import { useAuth } from "@/context/AuthContext";

import { imgSrc } from "@/utils/getImgSrc";

const SPRING = { damping: 16, stiffness: 260, mass: 0.7 };
const TILT_DEG = -12;

// Change this to whatever your bookmarks/saved route is.
const SAVED_ROUTE = "/profile/saved" as Href;

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

/** Raised center action. The plus spins a quarter turn while pressed. */
function WriteButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const pressed = useSharedValue(0);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.92]) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pressed.value * 90}deg` }],
  }));

  return (
    <View style={styles.item}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (pressed.value = withSpring(1, SPRING))}
        onPressOut={() => (pressed.value = withSpring(0, SPRING))}
        accessibilityRole="button"
        accessibilityLabel="Write a blog"
        style={styles.fabWrap}
      >
        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              borderColor: colors.card, // ring that "cuts" the bar
              shadowColor: colors.primary,
            },
            buttonStyle,
          ]}
        >
          <Animated.View style={iconStyle}>
            <Ionicons name="add" size={30} color={colors.primaryForeground} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function ProfileAvatar({ userId, name }: { userId?: string; name?: string }) {
  const { colors, typography } = useTheme();
  const [avatar, setAvatar] = useState<string>();

  useEffect(() => {
    if (!userId) {
      setAvatar(undefined);
      return;
    }

    let cancelled = false;
    void profileApi
      .get()
      .then((response) => {
        if (cancelled) return;
        const profile = response.data.profile;
        setAvatar(profile?.avatar ? imgSrc(profile.avatar, "profile") : undefined);
      })
      .catch(() => {
        if (!cancelled) setAvatar(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const initial = (name?.trim().charAt(0) || "?").toUpperCase();

  return avatar ? (
    <Image source={{ uri: avatar }} style={styles.profileAvatar} />
  ) : (
    <View
      style={[styles.profileAvatar, { backgroundColor: colors.secondary }]}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: typography.sizes.sm,
          fontWeight: typography.weights.bold,
        }}
      >
        {initial}
      </Text>
    </View>
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
  const isSaved = pathname.startsWith("/profile/saved");
  const isProfile = pathname === "/profile" || pathname === "/admin";

  // Top-level sections swap in place so the back stack doesn't pile up.
  const goTab = (path: Href, active: boolean) => {
    if (!active) void router.replace(path);
  };

  const goWrite = () =>
    void router.push(isLoggedIn ? "/blog/create" : "/register");
  const goSaved = () => {
    if (!isLoggedIn) return void router.push("/login");
    goTab(SAVED_ROUTE, isSaved);
  };
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

      {/* Dead center: the thing people come here to do */}
      <WriteButton onPress={goWrite} />

      <NavButton active={isSaved} label="Saved" onPress={goSaved}>
        <Ionicons
          name={isSaved ? "bookmark" : "bookmark-outline"}
          size={25}
          color={isSaved ? colors.foreground : colors.mutedForeground}
        />
      </NavButton>

      <NavButton active={isProfile} label="Profile" onPress={goProfile}>
        <ProfileAvatar userId={user?.id} name={user?.name} />
      </NavButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    overflow: "visible",
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
  profileAvatar: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    overflow: "hidden",
    width: 26,
  },
  fabWrap: {
    transform: [{ translateY: -14 }],
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
});
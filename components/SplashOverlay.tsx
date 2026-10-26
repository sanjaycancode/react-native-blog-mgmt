// components/SplashOverlay.tsx
import { Image, StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

export default function SplashOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Image
        source={require("../assets/images/ncblogo.png")}
        style={styles.logo}
        resizeMode="contain"
        onLoadEnd={() => void SplashScreen.hideAsync().catch(() => undefined)}
      />
      <Text style={styles.brand}>by NepalCan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
    elevation: 999,
    backgroundColor: "#F9F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 160, height: 160 },
  brand: {
    position: "absolute",
    bottom: 48,
    fontSize: 14,
    letterSpacing: 1,
    color: "#6B6B80",
  },
});

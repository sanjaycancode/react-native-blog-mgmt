import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import ParallaxLayer from "../ParallaxLayer";

import {
  type SceneProps,
  Cover,
  FloatPill,
  sceneStyles,
  unitFor,
} from "./shared";

/** The draft editor: private draft badge, autosave note, cover, and a Publish button. */
export default function EditorScene({ size, palette, ...depth }: SceneProps) {
  const u = unitFor(size);
  const cardW = size * 0.84;
  const cardH = size * 0.96;
  const pad = 14 * u;
  const left = (size - cardW) / 2;
  const top = (size - cardH) / 2;

  const card = {
    left,
    top,
    width: cardW,
    height: cardH,
    backgroundColor: palette.surface,
    borderColor: palette.border,
  };

  return (
    <View style={{ width: size, height: size }}>
      {/* A second draft peeking out behind */}
      <ParallaxLayer {...depth} factor={0.3} scaleFrom={0.9} style={{ position: "absolute", left: 0, top: 0 }}>
        <View
          style={[
            sceneStyles.card,
            card,
            { opacity: 0.6, transform: [{ translateX: size * 0.06 }, { rotate: "5deg" }] },
          ]}
        />
      </ParallaxLayer>

      <ParallaxLayer {...depth} factor={0.05} scaleFrom={0.92} style={{ position: "absolute", left: 0, top: 0 }}>
        <View style={[sceneStyles.card, card, { padding: pad }]}>
          <View style={styles.header}>
            <View style={[styles.draftPill, { paddingHorizontal: 9 * u, paddingVertical: 4 * u }]}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: palette.primary, opacity: 0.12 },
                ]}
              />
              <Ionicons name="lock-closed" size={10 * u} color={palette.primary} />
              <Text style={{ color: palette.primary, fontSize: 11 * u, fontWeight: "800" }}>
                Draft
              </Text>
            </View>
            <View style={styles.saved}>
              <Ionicons name="checkmark-circle" size={12 * u} color={palette.muted} />
              <Text style={{ color: palette.muted, fontSize: 10.5 * u }}>Saved just now</Text>
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={{
              color: palette.foreground,
              fontSize: 17 * u,
              lineHeight: 21 * u,
              fontWeight: "800",
              letterSpacing: -0.3,
              marginTop: 12 * u,
            }}
          >
            Annapurna on a budget
          </Text>

          <View style={{ borderRadius: 14, overflow: "hidden", marginTop: 12 * u }}>
            <Cover
              variant="mountain"
              width={cardW - pad * 2}
              height={cardH * 0.27}
              palette={palette}
            />
          </View>

          <View style={{ gap: 7 * u, marginTop: 14 * u }}>
            {[100, 92, 64].map((w) => (
              <View
                key={w}
                style={{
                  width: `${w}%`,
                  height: 7 * u,
                  borderRadius: 4,
                  backgroundColor: palette.muted,
                  opacity: 0.26,
                }}
              />
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.footer}>
            <View style={{ flexDirection: "row", gap: 6 * u }}>
              {["#travel", "#trek"].map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { paddingHorizontal: 8 * u, paddingVertical: 4 * u }]}
                >
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: palette.muted, opacity: 0.14 },
                    ]}
                  />
                  <Text style={{ color: palette.muted, fontSize: 10.5 * u, fontWeight: "600" }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={{
                backgroundColor: palette.primary,
                borderRadius: 999,
                paddingHorizontal: 14 * u,
                paddingVertical: 8 * u,
              }}
            >
              <Text style={{ color: palette.onPrimary, fontSize: 12 * u, fontWeight: "800" }}>
                Publish
              </Text>
            </View>
          </View>
        </View>
      </ParallaxLayer>

      <FloatPill
        {...depth}
        palette={palette}
        u={u}
        icon="lock-closed"
        label="Only you can see this"
        left={size * 0.3}
        top={-size * 0.01}
        factor={-0.35}
        tilt={-4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  draftPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  saved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tag: {
    borderRadius: 999,
    overflow: "hidden",
  },
});
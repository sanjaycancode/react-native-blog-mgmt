import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import ParallaxLayer from "../ParallaxLayer";

import {
  type SceneProps,
  FloatBox,
  FloatPill,
  sceneStyles,
  unitFor,
} from "./shared";

/** Relative bar heights for the sparkline, trending up like a good month. */
const BARS = [
  0.3, 0.45, 0.35, 0.5, 0.4, 0.62, 0.55, 0.48, 0.7, 0.6, 0.82, 0.74, 0.95, 0.88,
] as const;

/** The Insights screen: range pills, the big number, a bar trend and the top post. */
export default function InsightsScene({ size, palette, ...depth }: SceneProps) {
  const u = unitFor(size);
  const cardW = size * 0.88;
  const cardH = size * 0.9;
  const pad = 14 * u;
  const chartH = cardH * 0.24;

  return (
    <View style={{ width: size, height: size }}>
      <ParallaxLayer
        {...depth}
        factor={0.05}
        scaleFrom={0.92}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <View
          style={[
            sceneStyles.card,
            {
              left: (size - cardW) / 2,
              top: (size - cardH) / 2,
              width: cardW,
              height: cardH,
              padding: pad,
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.row}>
            <Text
              style={{
                color: palette.foreground,
                fontSize: 15 * u,
                fontWeight: "800",
              }}
            >
              Insights
            </Text>
            <View style={{ flexDirection: "row", gap: 4 * u }}>
              {["7D", "30D", "90D"].map((range) => {
                const active = range === "30D";
                return (
                  <View
                    key={range}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 8 * u,
                      paddingVertical: 3 * u,
                      backgroundColor: active ? palette.primary : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? palette.onPrimary : palette.muted,
                        fontSize: 10 * u,
                        fontWeight: "800",
                      }}
                    >
                      {range}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text
            style={{
              color: palette.foreground,
              fontSize: 36 * u,
              fontWeight: "800",
              letterSpacing: -1.5,
              marginTop: 10 * u,
            }}
          >
            1,284
          </Text>
          <View
            style={[styles.row, { justifyContent: "flex-start", gap: 8 * u }]}
          >
            <Text style={{ color: palette.muted, fontSize: 11 * u }}>
              views, last 30 days
            </Text>
            <View style={styles.delta}>
              <Ionicons name="arrow-up" size={12 * u} color={palette.primary} />
              <Text
                style={{
                  color: palette.primary,
                  fontSize: 11 * u,
                  fontWeight: "800",
                }}
              >
                18%
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.bars,
              { height: chartH, gap: 4 * u, marginTop: 14 * u },
            ]}
          >
            {BARS.map((h, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: chartH * h,
                  borderRadius: 4,
                  backgroundColor: palette.primary,
                  opacity: 0.25 + (i / (BARS.length - 1)) * 0.75,
                }}
              />
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <View
            style={[
              styles.best,
              { borderTopColor: palette.border, paddingTop: 10 * u },
            ]}
          >
            <Text
              style={{
                color: palette.primary,
                fontSize: 16 * u,
                fontWeight: "800",
                width: 18 * u,
              }}
            >
              1
            </Text>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: palette.foreground,
                fontSize: 12.5 * u,
                fontWeight: "700",
              }}
            >
              Annapurna on a budget
            </Text>
            <Ionicons name="eye-outline" size={13 * u} color={palette.muted} />
            <Text
              style={{
                color: palette.muted,
                fontSize: 11.5 * u,
                fontWeight: "700",
              }}
            >
              842
            </Text>
          </View>
        </View>
      </ParallaxLayer>

      <FloatPill
        {...depth}
        palette={palette}
        u={u}
        icon="bookmark"
        label="31 saves"
        left={size * 0.62}
        top={-size * 0.01}
        factor={-0.3}
        tilt={5}
        delay={400}
      />

      {/* Mini profile: avatar, verified tick and post count, like the real profile header */}
      <FloatBox
        {...depth}
        left={size * 0.0}
        top={size * 0.8}
        factor={-0.4}
        tilt={-4}
        range={7}
      >
        <View
          style={[
            styles.profile,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              padding: 8 * u,
              gap: 8 * u,
            },
          ]}
        >
          <View
            style={{
              width: 28 * u,
              height: 28 * u,
              borderRadius: 14 * u,
              backgroundColor: palette.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: palette.onPrimary,
                fontSize: 13 * u,
                fontWeight: "800",
              }}
            >
              S
            </Text>
          </View>
          <View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Text
                style={{
                  color: palette.foreground,
                  fontSize: 12 * u,
                  fontWeight: "800",
                }}
              >
                Sita Rai
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={12 * u}
                color={palette.primary}
              />
            </View>
            <Text style={{ color: palette.muted, fontSize: 10 * u }}>
              12 posts
            </Text>
          </View>
        </View>
      </FloatBox>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  best: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
});

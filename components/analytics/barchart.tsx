import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Line, LinearGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { C } from "./theme";
import { compact, niceMax, useProgress, useScrub } from "./chartutils";

const PAD = { l: 36, r: 8, t: 12, b: 26 };

interface VProps {
  data: number[];
  labels: string[];
  height?: number;
  animateKey?: string;
  onScrub?: (i: number | null) => void;
}

/** Vertical bars with drag-to-inspect. No track or backdrop, just the bars. */
export function BarChart({ data, labels, height = 190, animateKey, onScrub }: VProps) {
  const [w, setW] = useState(0);
  const n = data.length;
  const p = useProgress(animateKey, 900);
  const { active, panHandlers } = useScrub(w, n, PAD.l, PAD.r, "band", onScrub);

  const ih = height - PAD.t - PAD.b;
  const iw = Math.max(0, w - PAD.l - PAD.r);
  const max = niceMax(Math.max(0, ...data));
  const slot = n ? iw / n : 0;
  const bw = Math.max(2, slot * 0.58);
  const base = PAD.t + ih;
  const ticks = [0, 1, 2, 3, 4].map((k) => (max * k) / 4);
  const xIdx = n <= 1 ? [0] : Array.from(new Set([0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1]));

  return (
    <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} {...panHandlers}>
      {w > 0 && (
        <Svg width={w} height={height} pointerEvents="none">
          <Defs>
            <LinearGradient id="bar" gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={PAD.t} y2={base}>
              <Stop offset="0" stopColor={C.red400} />
              <Stop offset="1" stopColor={C.red800} />
            </LinearGradient>
          </Defs>

          {ticks.map((t, i) => {
            const yy = base - (t / max) * ih;
            return (
              <React.Fragment key={i}>
                <Line x1={PAD.l} x2={w - PAD.r} y1={yy} y2={yy} stroke={C.line} strokeWidth={1} strokeDasharray={i === 0 ? undefined : "2 6"} />
                <SvgText x={PAD.l - 8} y={yy + 3.5} fontSize={10} fill={C.mute} textAnchor="end">{compact(t)}</SvgText>
              </React.Fragment>
            );
          })}

          {data.map((v, i) => {
            const h = (v / max) * ih * p;
            if (h < 0.5) return null;
            return (
              <Rect
                key={i}
                x={PAD.l + i * slot + (slot - bw) / 2}
                y={base - h}
                width={bw}
                height={h}
                rx={Math.min(bw / 2, 4)}
                fill="url(#bar)"
                opacity={active === null || active === i ? 1 : 0.3}
              />
            );
          })}

          {xIdx.map((i, k) => (
            <SvgText
              key={i}
              x={PAD.l + i * slot + slot / 2}
              y={height - 6}
              fontSize={10}
              fill={C.mute}
              textAnchor={k === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            >
              {labels[i]}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

const SHADES = [C.hot, C.red500, C.red600, C.red700, C.red800, C.red900, C.red900, C.red900];

/** Ranked horizontal bars, used for tags. */
export function HBarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const p = useProgress(items.map((i) => i.label + i.value).join("|"), 800);
  return (
    <View style={{ gap: 16 }}>
      {items.map((it, i) => (
        <View key={it.label}>
          <View style={h.head}>
            <Text style={h.label} numberOfLines={1}>{it.label}</Text>
            <Text style={h.value}>{it.value}</Text>
          </View>
          <View
            style={{
              height: 5,
              borderRadius: 3,
              width: `${(it.value / max) * 100 * p}%`,
              backgroundColor: SHADES[Math.min(i, SHADES.length - 1)],
            }}
          />
        </View>
      ))}
    </View>
  );
}

const h = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  label: { color: C.text, fontSize: 14, fontWeight: "500", flex: 1 },
  value: { color: C.sub, fontSize: 13, fontWeight: "600" },
});
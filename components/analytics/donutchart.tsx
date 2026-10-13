import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Svg, { Circle, G } from "react-native-svg";

import { useProgress } from "./chartutils";
import { useAnalyticsColors } from "./useAnalayticsColors";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutDatum[];
  size?: number;
  stroke?: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  centerCaption?: string;
}

export function DonutChart({
  data,
  size = 156,
  stroke = 14,
  selected,
  onSelect,
  centerCaption = "posts",
}: Props) {
  const C = useAnalyticsColors();
  const total = data.reduce((s, d) => s + d.value, 0);
  const p = useProgress(total + "-" + data.length, 1000);
  const r = (size - stroke - 6) / 2;
  const circ = 2 * Math.PI * r;
  const gap = data.length > 1 ? 7 : 0;

  let cum = 0;
  const arcs = data.map((d) => {
    const len = (d.value / total) * circ;
    const arc = { len, start: cum };
    cum += len;
    return arc;
  });

  const sel = selected !== null ? data[selected] : null;

  return (
    <View style={s.row}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {data.map((d, i) => (
              <Circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={selected === i ? stroke + 5 : stroke}
                strokeOpacity={selected === null || selected === i ? 1 : 0.3}
                strokeDasharray={`${Math.max(0, arcs[i].len - gap) * p} ${circ}`}
                strokeDashoffset={-arcs[i].start}
              />
            ))}
          </G>
        </Svg>
        <View style={s.center} pointerEvents="none">
          <Text style={[s.centerValue, { color: C.text }]}>{sel ? sel.value : total}</Text>
          <Text style={[s.centerCaption, { color: C.sub }]}>
            {sel ? sel.label.toLowerCase() : centerCaption}
          </Text>
        </View>
      </View>

      <View style={s.legend}>
        {data.map((d, i) => (
          <Pressable
            key={d.label}
            onPress={() => onSelect(selected === i ? null : i)}
            style={[
              s.legendRow,
              { opacity: selected === null || selected === i ? 1 : 0.4 },
            ]}
            hitSlop={6}
          >
            <View style={[s.dot, { backgroundColor: d.color }]} />
            <Text style={[s.legendLabel, { color: C.text }]} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={[s.legendValue, { color: C.text }]}>{d.value}</Text>
            <Text style={[s.legendPct, { color: C.mute }]}>
              {Math.round((d.value / total) * 100)}%
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 20 },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  centerCaption: { fontSize: 12, marginTop: 1 },
  legend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  legendValue: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "right",
  },
  legendPct: { fontSize: 12, minWidth: 34, textAlign: "right" },
});

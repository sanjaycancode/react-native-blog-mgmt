import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { C } from "./theme";
import {
  compact,
  niceMax,
  smoothPath,
  useProgress,
  useScrub,
} from "./chartutils";

export interface LineSeries {
  data: number[];
  color: string;
  /** Ghost line used for the previous period. */
  dashed?: boolean;
}

interface Props {
  series: LineSeries[];
  labels: string[];
  height?: number;
  /** Change this to replay the draw-in animation. */
  animateKey?: string;
  onScrub?: (i: number | null) => void;
}

const PAD = { l: 36, r: 14, t: 12, b: 26 };

export function LineChart({
  series,
  labels,
  height = 230,
  animateKey,
  onScrub,
}: Props) {
  const [w, setW] = useState(0);
  const n = labels.length;
  const p = useProgress(animateKey, 1000);
  const { active, panHandlers } = useScrub(
    w,
    n,
    PAD.l,
    PAD.r,
    "point",
    onScrub,
  );

  const ih = height - PAD.t - PAD.b;
  const iw = Math.max(0, w - PAD.l - PAD.r);
  const max = useMemo(
    () => niceMax(Math.max(0, ...series.flatMap((s) => s.data))),
    [series],
  );
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;

  const lines = useMemo(
    () =>
      series.map((s) => {
        const pts = s.data.map((v, i) => ({ x: x(i), y: y(v) }));
        let len = 0;
        for (let i = 1; i < pts.length; i++)
          len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        return { d: smoothPath(pts), len: len * 1.25 + 2, pts };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, w, height, max, n],
  );

  const ticks = [0, 1, 2, 3, 4].map((k) => (max * k) / 4);
  const xIdx =
    n <= 1
      ? [0]
      : Array.from(
          new Set([
            0,
            Math.round((n - 1) / 3),
            Math.round(((n - 1) * 2) / 3),
            n - 1,
          ]),
        );

  return (
    <View
      style={{ height }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      {...panHandlers}
    >
      {w > 0 && (
        <Svg width={w} height={height} pointerEvents="none">
          <Defs>
            {series.map((s, si) => (
              <LinearGradient
                key={si}
                id={`lg${si}`}
                gradientUnits="userSpaceOnUse"
                x1={PAD.l}
                x2={w - PAD.r}
                y1={0}
                y2={0}
              >
                <Stop offset="0" stopColor={s.color} stopOpacity={0.3} />
                <Stop offset="1" stopColor={s.color} stopOpacity={1} />
              </LinearGradient>
            ))}
          </Defs>

          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PAD.l}
                x2={w - PAD.r}
                y1={y(t)}
                y2={y(t)}
                stroke={C.line}
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : "2 6"}
              />
              <SvgText
                x={PAD.l - 8}
                y={y(t) + 3.5}
                fontSize={10}
                fill={C.mute}
                textAnchor="end"
              >
                {compact(t)}
              </SvgText>
            </React.Fragment>
          ))}

          {xIdx.map((i, k) => (
            <SvgText
              key={i}
              x={x(i)}
              y={height - 6}
              fontSize={10}
              fill={C.mute}
              textAnchor={k === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            >
              {labels[i]}
            </SvgText>
          ))}

          {series.map((s, si) =>
            s.dashed ? (
              <Path
                key={si}
                d={lines[si].d}
                stroke={s.color}
                strokeOpacity={0.5}
                strokeWidth={1.5}
                strokeDasharray="3 5"
                fill="none"
              />
            ) : (
              <React.Fragment key={si}>
                <Path
                  d={lines[si].d}
                  stroke={s.color}
                  strokeOpacity={0.16}
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${lines[si].len * p} ${lines[si].len * 2}`}
                />
                <Path
                  d={lines[si].d}
                  stroke={`url(#lg${si})`}
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={`${lines[si].len * p} ${lines[si].len * 2}`}
                />
              </React.Fragment>
            ),
          )}

          {active === null &&
            p >= 1 &&
            series.map((s, si) => {
              if (s.dashed || !lines[si].pts.length) return null;
              const last = lines[si].pts[lines[si].pts.length - 1];
              return (
                <React.Fragment key={si}>
                  <Circle
                    cx={last.x}
                    cy={last.y}
                    r={9}
                    fill={s.color}
                    opacity={0.18}
                  />
                  <Circle cx={last.x} cy={last.y} r={4} fill={s.color} />
                </React.Fragment>
              );
            })}

          {active !== null && (
            <>
              <Line
                x1={x(active)}
                x2={x(active)}
                y1={PAD.t}
                y2={PAD.t + ih}
                stroke={C.text}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              {series.map((s, si) =>
                s.dashed || !lines[si].pts[active] ? null : (
                  <React.Fragment key={si}>
                    <Circle
                      cx={lines[si].pts[active].x}
                      cy={lines[si].pts[active].y}
                      r={9}
                      fill={s.color}
                      opacity={0.22}
                    />
                    <Circle
                      cx={lines[si].pts[active].x}
                      cy={lines[si].pts[active].y}
                      r={5}
                      fill={C.bg}
                      stroke={s.color}
                      strokeWidth={2.5}
                    />
                  </React.Fragment>
                ),
              )}
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

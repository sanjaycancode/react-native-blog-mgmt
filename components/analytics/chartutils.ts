import { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder } from "react-native";

/** Round a max value up so 4 grid intervals land on clean numbers. */
export function niceMax(v: number): number {
  if (v <= 0) return 4;
  const raw = v / 4;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const opts = exp >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  const m = opts.find((o) => f <= o) ?? 10;
  return Math.max(1, m * exp) * 4;
}

export function compact(n: number): string {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n * 10) / 10);
}

/** Monotone cubic path: smooth, and never overshoots below zero. */
export function smoothPath(p: { x: number; y: number }[]): string {
  const n = p.length;
  if (n === 0) return "";
  if (n === 1) return `M${p[0].x},${p[0].y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x;
    m[i] = (p[i + 1].y - p[i].y) / dx[i];
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++)
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        t[i] = tau * a * m[i];
        t[i + 1] = tau * b * m[i];
      }
    }
  }
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${p[i].x + h},${p[i].y + t[i] * h} ${p[i + 1].x - h},${p[i + 1].y - t[i + 1] * h} ${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
}

/** 0 -> 1 progress, restarts whenever `key` changes. Drives draw-in animations. */
export function useProgress(key: unknown, duration = 900, delay = 0): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    setP(0);
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setP(value));
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      v.removeListener(id);
      v.stopAnimation();
    };
  }, [key, duration, delay]);
  return p;
}

/** Horizontal drag-to-inspect. Only claims the gesture on horizontal moves so the page still scrolls. */
export function useScrub(
  w: number,
  n: number,
  padL: number,
  padR: number,
  mode: "point" | "band",
  onScrub?: (i: number | null) => void,
) {
  const [active, setActive] = useState<number | null>(null);
  const g = useRef({ w, n, padL, padR, mode });
  g.current = { w, n, padL, padR, mode };
  const cb = useRef(onScrub);
  cb.current = onScrub;
  const last = useRef<number | null>(null);

  const set = (i: number | null) => {
    if (last.current === i) return;
    last.current = i;
    setActive(i);
    cb.current?.(i);
  };

  const idx = (x: number) => {
    const { w, n, padL, padR, mode } = g.current;
    if (n <= 1) return 0;
    const iw = Math.max(1, w - padL - padR);
    const r = (x - padL) / iw;
    const i = mode === "point" ? Math.round(r * (n - 1)) : Math.floor(r * n);
    return Math.max(0, Math.min(n - 1, i));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, s) =>
        Math.abs(s.dx) > 6 && Math.abs(s.dx) > Math.abs(s.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => set(idx(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => set(idx(e.nativeEvent.locationX)),
      onPanResponderRelease: () => set(null),
      onPanResponderTerminate: () => set(null),
    }),
  ).current;

  return { active, panHandlers: pan.panHandlers };
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { imgSrc } from "@/utils/getImgSrc";

import { C, STATUS_COLORS, STATUS_LABELS } from "@/components/analytics/theme";
import {
  RANGE_LABEL,
  useAnalyticsData,
  type Delta,
  type Range,
} from "@/components/analytics/UseAnalyticsData";
import { LineChart } from "@/components/analytics/LineChart";
import { DonutChart } from "@/components/analytics/donutchart";
import { BarChart, HBarList } from "@/components/analytics/barchart";

type Metric = "views" | "likes" | "posts";
const METRICS: { key: Metric; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "posts", label: "Posts" },
];

// ── Small building blocks ──────────────────────────────────────────────────
function AnimatedNumber({
  value,
  decimals = 0,
  instant = false,
  style,
}: {
  value: number;
  decimals?: number;
  instant?: boolean;
  style?: TextStyle;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (instant) {
      setShown(value);
      from.current = value;
      return;
    }
    const v = new Animated.Value(0);
    const start = from.current;
    const id = v.addListener(({ value: t }) => {
      const cur = start + (value - start) * t;
      from.current = cur;
      setShown(cur);
    });
    Animated.timing(v, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      v.removeListener(id);
      v.stopAnimation();
    };
  }, [value, instant]);
  return (
    <Text style={style}>
      {decimals
        ? shown.toFixed(decimals)
        : Math.round(shown).toLocaleString("en-US")}
    </Text>
  );
}

function Skeleton({
  h,
  w = "100%",
  r = 12,
}: {
  h: number;
  w?: number | `${number}%`;
  r?: number;
}) {
  const o = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(o, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View
      style={{
        height: h,
        width: w,
        borderRadius: r,
        backgroundColor: C.line,
        opacity: o,
      }}
    />
  );
}

function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>{title}</Text>
          {hint ? <Text style={s.sectionHint}>{hint}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function DeltaPill({ d }: { d: Delta }) {
  if (d.pct === null) {
    if (d.current === 0) return null;
    return <Text style={[s.delta, { color: C.red300 }]}>New this period</Text>;
  }
  const up = d.pct >= 0;
  return (
    <View style={s.deltaRow}>
      <Ionicons
        name={up ? "arrow-up" : "arrow-down"}
        size={13}
        color={up ? C.red400 : C.sub}
      />
      <Text style={[s.delta, { color: up ? C.red400 : C.sub }]}>
        {Math.abs(d.pct).toFixed(d.pct % 1 === 0 ? 0 : 1)}% vs previous
      </Text>
    </View>
  );
}

function RangePills({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <View style={s.pills}>
      {(["7D", "30D", "90D"] as Range[]).map((r) => (
        <Pressable
          key={r}
          onPress={() => onChange(r)}
          style={[s.pill, value === r && s.pillOn]}
        >
          <Text style={[s.pillText, value === r && s.pillTextOn]}>{r}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stat({
  label,
  value,
  decimals,
  note,
  last,
}: {
  label: string;
  value: number;
  decimals?: number;
  note?: string;
  last?: boolean;
}) {
  return (
    <View style={[s.stat, !last && s.statRule]}>
      <Text style={s.statLabel}>{label}</Text>
      <AnimatedNumber value={value} decimals={decimals} style={s.statValue} />
      {note ? <Text style={s.statNote}>{note}</Text> : null}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const d = useAnalyticsData();

  const [metric, setMetric] = useState<Metric>("views");
  const [scrub, setScrub] = useState<number | null>(null);
  const [barScrub, setBarScrub] = useState<number | null>(null);
  const [donutSel, setDonutSel] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const labels = useMemo(() => d.current.map((x) => x.date), [d.current]);
  const pick = (b: { count: number; likes: number; views: number }) =>
    metric === "posts" ? b.count : b[metric];
  const curData = useMemo(() => d.current.map(pick), [d.current, metric]); // eslint-disable-line
  const prevData = useMemo(() => d.previous.map(pick), [d.previous, metric]); // eslint-disable-line
  const viewsData = useMemo(() => d.current.map((x) => x.views), [d.current]);

  const delta = d.deltas[metric];
  const heroValue = scrub !== null ? (curData[scrub] ?? 0) : delta.current;
  const heroCaption =
    scrub !== null
      ? `${labels[scrub]}  ·  previous: ${prevData[scrub] ?? 0}`
      : `Last ${RANGE_LABEL[d.range]}`;
  const chartKey = `${d.range}-${metric}`;

  const donutData = useMemo(
    () =>
      (Object.keys(d.statusCounts) as (keyof typeof STATUS_COLORS)[])
        .filter((k) => (d.statusCounts[k] ?? 0) > 0)
        .map((k) => ({
          label: STATUS_LABELS[k],
          value: d.statusCounts[k]!,
          color: STATUS_COLORS[k],
        })),
    [d.statusCounts],
  );

  const name = d.profile?.user?.name ?? user?.name ?? "Your insights";
  const avatar = d.profile?.avatar ? imgSrc(d.profile.avatar, "profile") : null;
  const maxViews = d.topPosts[0]?.views ?? 0;
  const firstLoad = d.isLoading && d.blogs.length === 0;

  if (authLoading || !isAuthenticated) return <View style={s.screen} />;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 48,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrub === null && barScrub === null}
        refreshControl={
          <RefreshControl
            refreshing={d.isRefreshing}
            onRefresh={d.refresh}
            tintColor={C.red500}
            colors={[C.red500]}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Insights</Text>
            <View style={s.whoRow}>
              <Text style={s.who} numberOfLines={1}>
                {name}
              </Text>
              {d.profile?.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color={C.red400} />
              )}
              {d.joinedDaysAgo > 0 && (
                <Text style={s.who}> · {d.joinedDaysAgo}d on the platform</Text>
              )}
            </View>
          </View>
          {avatar ? (
            <Image source={{ uri: avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {d.error && (
          <View style={s.error}>
            <Ionicons name="alert-circle" size={18} color={C.red300} />
            <Text style={s.errorText}>{d.error}</Text>
          </View>
        )}

        {firstLoad && (
          <View style={{ paddingHorizontal: 20, gap: 18, marginTop: 28 }}>
            <Skeleton h={44} w="40%" />
            <Skeleton h={230} r={16} />
            <Skeleton h={120} r={16} />
            <Skeleton h={180} r={16} />
          </View>
        )}

        {!d.isLoading && !d.error && d.totalPosts === 0 && (
          <View style={s.empty}>
            <Ionicons name="pulse" size={44} color={C.red800} />
            <Text style={s.emptyTitle}>Nothing to measure yet</Text>
            <Text style={s.emptyBody}>
              Publish your first post and your views, likes and trends will show
              up here.
            </Text>
            <Pressable
              style={s.cta}
              onPress={() => router.push("/blogs/create")}
            >
              <Text style={s.ctaText}>Write a post</Text>
            </Pressable>
          </View>
        )}

        {!firstLoad && d.totalPosts > 0 && (
          <>
            {/* Hero: one metric, one line */}
            <View style={s.hero}>
              <View style={s.heroTop}>
                <RangePills
                  value={d.range}
                  onChange={(r) => {
                    setScrub(null);
                    d.setRange(r);
                  }}
                />
              </View>

              <View style={s.tabs}>
                {METRICS.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setScrub(null);
                      setMetric(m.key);
                    }}
                    style={s.tab}
                  >
                    <Text style={[s.tabText, metric === m.key && s.tabTextOn]}>
                      {m.label}
                    </Text>
                    <View style={[s.tabBar, metric === m.key && s.tabBarOn]} />
                  </Pressable>
                ))}
              </View>

              <View style={s.heroNumberBlock}>
                <AnimatedNumber
                  value={heroValue}
                  instant={scrub !== null}
                  style={s.heroNumber}
                />
                <Text style={s.heroCaption}>{heroCaption}</Text>
                {scrub === null && <DeltaPill d={delta} />}
              </View>

              <View style={{ paddingHorizontal: 12 }}>
                <LineChart
                  animateKey={chartKey}
                  labels={labels}
                  onScrub={setScrub}
                  series={[
                    { data: prevData, color: C.red300, dashed: true },
                    { data: curData, color: C.hot },
                  ]}
                />
              </View>

              <View style={s.keyRow}>
                <View style={s.keyItem}>
                  <View style={[s.keyLine, { backgroundColor: C.hot }]} />
                  <Text style={s.keyText}>This period</Text>
                </View>
                <View style={s.keyItem}>
                  <View
                    style={[
                      s.keyLine,
                      { backgroundColor: C.red300, opacity: 0.5 },
                    ]}
                  />
                  <Text style={s.keyText}>Previous {RANGE_LABEL[d.range]}</Text>
                </View>
              </View>
              <Text style={s.footnote}>
                Counts posts published in each window, with every post's current
                views and likes.
              </Text>
            </View>

            {/* Lifetime numbers */}
            <Section title="All time">
              <View style={s.statGrid}>
                <Stat
                  label="Views"
                  value={d.totalViews}
                  note={`${d.avgViewsPerPost} per post`}
                />
                <Stat
                  label="Likes"
                  value={d.totalLikes}
                  note={`${d.avgLikesPerPost} per post`}
                />
                <Stat
                  label="Posts"
                  value={d.totalPosts}
                  note={`${d.publishedPosts} live`}
                  last={d.savedByOthers === 0}
                />
                {d.savedByOthers > 0 && (
                  <Stat
                    label="Saves"
                    value={d.savedByOthers}
                    note="by readers"
                    last
                  />
                )}
              </View>
            </Section>

            {/* Content mix */}
            {donutData.length > 0 && (
              <Section title="Content mix" hint="Tap a status to focus it">
                <DonutChart
                  data={donutData}
                  selected={donutSel}
                  onSelect={setDonutSel}
                />
              </Section>
            )}

            {/* Views by day */}
            <Section
              title="Views by publish date"
              hint={barScrub !== null ? undefined : "Drag across the bars"}
              right={
                barScrub !== null ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.readValue}>
                      {viewsData[barScrub].toLocaleString("en-US")}
                    </Text>
                    <Text style={s.readLabel}>{labels[barScrub]}</Text>
                  </View>
                ) : null
              }
            >
              <BarChart
                data={viewsData}
                labels={labels}
                animateKey={chartKey + "b"}
                onScrub={setBarScrub}
              />
            </Section>

            {/* Tags */}
            {d.tagFrequency.length > 0 && (
              <Section title="What you write about" hint="Your most-used tags">
                <HBarList
                  items={d.tagFrequency.map((t) => ({
                    label: t.tag,
                    value: t.count,
                  }))}
                />
              </Section>
            )}

            {/* Top posts */}
            <Section title="Best performing" hint="Ranked by views">
              <View style={{ gap: 22 }}>
                {d.topPosts.map((p, i) => {
                  const pct = maxViews > 0 ? (p.views / maxViews) * 100 : 0;
                  return (
                    <Pressable
                      key={p._id}
                      onPress={() => router.push(`/blogs/${p.slug}`)}
                      style={s.post}
                    >
                      <Text style={[s.rank, i === 0 && { color: C.hot }]}>
                        {i + 1}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.postTitle} numberOfLines={2}>
                          {p.title}
                        </Text>
                        <View style={s.postMeta}>
                          <Ionicons
                            name="eye-outline"
                            size={14}
                            color={C.red300}
                          />
                          <Text style={s.metaText}>
                            {p.views.toLocaleString("en-US")}
                          </Text>
                          <Ionicons
                            name="heart"
                            size={13}
                            color={C.red500}
                            style={{ marginLeft: 10 }}
                          />
                          <Text style={s.metaText}>{p.likes}</Text>
                          <View
                            style={[
                              s.statusDot,
                              { backgroundColor: STATUS_COLORS[p.status] },
                            ]}
                          />
                          <Text style={s.metaText}>
                            {STATUS_LABELS[p.status]}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.postBar,
                            {
                              width: `${Math.max(pct, 3)}%`,
                              opacity: 1 - i * 0.14,
                            },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: C.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  whoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  who: { color: C.sub, fontSize: 13 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.red700,
  },
  avatarFallback: {
    backgroundColor: C.red900,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: C.red100, fontWeight: "800", fontSize: 16 },

  error: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.red800,
  },
  errorText: { color: C.red200, fontSize: 13, flex: 1 },

  empty: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 90,
    gap: 10,
  },
  emptyTitle: { color: C.text, fontSize: 20, fontWeight: "700", marginTop: 6 },
  emptyBody: {
    color: C.sub,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  cta: {
    marginTop: 14,
    backgroundColor: C.red600,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 99,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  hero: { marginTop: 22 },
  heroTop: { paddingHorizontal: 20, alignItems: "flex-start" },
  pills: {
    flexDirection: "row",
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.line,
    padding: 3,
  },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99 },
  pillOn: { backgroundColor: C.red600 },
  pillText: { color: C.sub, fontSize: 12.5, fontWeight: "700" },
  pillTextOn: { color: "#fff" },

  tabs: { flexDirection: "row", gap: 22, paddingHorizontal: 20, marginTop: 22 },
  tab: { paddingTop: 2 },
  tabText: { color: C.mute, fontSize: 16, fontWeight: "700", paddingBottom: 6 },
  tabTextOn: { color: C.text },
  tabBar: { height: 2.5, borderRadius: 2, backgroundColor: "transparent" },
  tabBarOn: { backgroundColor: C.hot },

  heroNumberBlock: {
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
    minHeight: 104,
  },
  heroNumber: {
    color: C.text,
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -2.5,
    lineHeight: 60,
  },
  heroCaption: { color: C.sub, fontSize: 13.5, marginTop: 2 },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 6,
  },
  delta: { fontSize: 13, fontWeight: "700", marginTop: 0 },

  keyRow: {
    flexDirection: "row",
    gap: 18,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  keyItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  keyLine: { width: 16, height: 2.5, borderRadius: 2 },
  keyText: { color: C.sub, fontSize: 12 },
  footnote: {
    color: C.mute,
    fontSize: 11.5,
    paddingHorizontal: 20,
    marginTop: 10,
    lineHeight: 16,
  },

  section: { marginTop: 44, paddingHorizontal: 20 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  sectionHint: { color: C.sub, fontSize: 13, marginTop: 2 },
  readValue: {
    color: C.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  readLabel: { color: C.sub, fontSize: 12 },

  statGrid: { flexDirection: "row", flexWrap: "wrap" },
  stat: { width: "50%", paddingVertical: 18, paddingRight: 12 },
  statRule: {},
  statLabel: { color: C.sub, fontSize: 13, marginBottom: 4 },
  statValue: {
    color: C.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  statNote: { color: C.red300, fontSize: 12.5, marginTop: 3 },

  post: { flexDirection: "row", gap: 14 },
  rank: {
    color: C.mute,
    fontSize: 22,
    fontWeight: "800",
    width: 22,
    letterSpacing: -0.5,
  },
  postTitle: { color: C.text, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  metaText: { color: C.sub, fontSize: 12.5, fontWeight: "600" },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 12,
    marginRight: 1,
  },
  postBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.red500,
    marginTop: 10,
  },
});

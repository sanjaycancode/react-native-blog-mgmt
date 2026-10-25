import { View } from "react-native";

import ParallaxLayer from "../ParallaxLayer";

import {
  type CoverVariant,
  type SceneProps,
  FloatPill,
  StoryCard,
  unitFor,
} from "./shared";

/** Sample stories shown in the preview. Swap in anything that sounds like your community. */
const STORIES: readonly {
  variant: CoverVariant;
  category: string;
  title: string;
  author: string;
}[] = [
  { variant: "mountain", category: "Travel", title: "Annapurna on a budget", author: "Sita Rai" },
  { variant: "code", category: "Tech", title: "My first year as a dev in Kathmandu", author: "Anish Gurung" },
  { variant: "bowl", category: "Food", title: "Momo, ranked by a local", author: "Pema Sherpa" },
];

/** A fan of three story cards, like the feed, with the like and save badges floating in front. */
export default function StoriesScene({ size, palette, ...depth }: SceneProps) {
  const u = unitFor(size);
  const cardW = size * 0.54;
  const cardH = (cardW * 4) / 3;

  const place = (dx: number, dy: number) => ({
    position: "absolute" as const,
    left: size / 2 - cardW / 2 + dx * size,
    top: size / 2 - cardH / 2 + dy * size,
  });

  const [front, left, right] = [STORIES[0], STORIES[1], STORIES[2]];

  return (
    <View style={{ width: size, height: size }}>
      <ParallaxLayer {...depth} factor={0.3} scaleFrom={0.9} style={place(-0.27, 0.06)}>
        <View style={{ transform: [{ rotate: "-9deg" }] }}>
          <StoryCard width={cardW} palette={palette} u={u} {...left} />
        </View>
      </ParallaxLayer>

      <ParallaxLayer {...depth} factor={0.22} scaleFrom={0.9} style={place(0.27, 0.08)}>
        <View style={{ transform: [{ rotate: "9deg" }] }}>
          <StoryCard width={cardW} palette={palette} u={u} {...right} />
        </View>
      </ParallaxLayer>

      <ParallaxLayer {...depth} factor={0.08} scaleFrom={0.92} style={place(0, -0.02)}>
        <StoryCard width={cardW} palette={palette} u={u} elevated {...front} />
      </ParallaxLayer>

      <FloatPill
        {...depth}
        palette={palette}
        u={u}
        icon="heart"
        label="248"
        left={size * 0.6}
        top={size * 0.05}
        factor={-0.4}
        tilt={6}
      />
      <FloatPill
        {...depth}
        palette={palette}
        u={u}
        icon="bookmark"
        label="Saved"
        left={size * 0.02}
        top={size * 0.78}
        factor={-0.3}
        tilt={-6}
        range={8}
        delay={600}
      />
    </View>
  );
}
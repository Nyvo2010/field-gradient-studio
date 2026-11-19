import { lerpHex, oklchToHex } from "./color";

export type PaletteColor = { id: string; hex: string; alpha?: number };

export type FieldSettings = {
  blur: number;
  spread: number;
  distortion: number;
  swirl: number;
  grain: number;
  /** Seed for the static spot layout. */
  positions: number;
};

/**
 * Defaults lifted from the brand field spec:
 * forest ground, moss sweep, light green centre, pink and orange splashes
 * at 75%, ink anchors, 2px blur, 1.2 contrast, 0.35 grain.
 */
export const BRAND_COLORS: PaletteColor[] = [
  { id: "forest", hex: "#2D6B44" },
  { id: "moss", hex: "#80B579" },
  { id: "light-green", hex: "#9DC672" },
  { id: "pink", hex: "#F5B3BE", alpha: 0.75 },
  { id: "orange", hex: "#F7B380", alpha: 0.75 },
];

export const BRAND_SETTINGS: FieldSettings = {
  blur: 2,
  spread: 1.15,
  distortion: 0.8,
  swirl: 0.55,
  grain: 0.35,
  positions: 64.3,
};

export const MIN_COLORS = 2;
export const MAX_COLORS = 8;

export function paletteKey(colors: PaletteColor[]) {
  return colors.map((color) => color.hex).join(",");
}

export function settingsKey(settings: FieldSettings) {
  return Object.values(settings).join(",");
}

function serializeColor(color: PaletteColor, base: string): string {
  const alpha = color.alpha ?? 1;
  // The shader blends colour spots against each other, so a translucent spot
  // would darken toward black. Flatten it onto the palette's ground instead,
  // which is what an alpha colour would look like over the brand field.
  if (alpha >= 1) return color.hex;
  return lerpHex(base, color.hex, alpha);
}

/**
 * The first two colours are the field's ground. Duplicating them gives the
 * palette the same green-dominant weighting the CSS gradient had, so the
 * brand colours always keep their intended proportions.
 */
export function buildSpots(colors: PaletteColor[]): string[] {
  if (colors.length === 0) return ["#2D6B44"];

  const base = colors[0].hex;

  if (colors.length === 1) {
    const only = serializeColor(colors[0], base);
    return [only, only, only];
  }

  const spots = [...colors];
  const dominant = [colors[0], colors[1], colors[0]];

  for (let i = 0; i < 3; i += 1) {
    spots.splice(Math.min(1 + i * 2, spots.length), 0, dominant[i]);
  }

  return spots.slice(0, 10).map((color) => serializeColor(color, base));
}

/** A new layout seed while the palette and settings stay put. */
export function randomLayout(): number {
  return Math.round(Math.random() * 1000) / 10;
}

const STRATEGIES = ["analogous", "complement", "split", "triad", "monochrome"] as const;
type Strategy = (typeof STRATEGIES)[number];

function jitter(amount: number) {
  return (Math.random() - 0.5) * amount;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function offsetsFor(strategy: Strategy): [number, number, number] {
  switch (strategy) {
    case "analogous":
      return [28, 52, -34];
    case "complement":
      return [180, 26, 202];
    case "split":
      return [150, 210, 22];
    case "triad":
      return [120, 240, 28];
    case "monochrome":
      return [4, 8, 2];
  }
}

/**
 * Builds a palette in OKLCH so the colours stay perceptually even:
 * a deep ground, a light ground, one bright accent, one warm splash,
 * and an ink-weight anchor for depth.
 */
export function randomPalette(): PaletteColor[] {
  const strategy = pick(STRATEGIES);
  const [offsetA, offsetB, offsetC] = offsetsFor(strategy);
  const baseHue = Math.random() * 360;
  const monochrome = strategy === "monochrome";
  const count = 4 + Math.floor(Math.random() * 3);

  const hues: number[] = [
    baseHue + jitter(10),
    baseHue + (monochrome ? jitter(10) : offsetA + jitter(18)),
    baseHue + (monochrome ? jitter(10) : offsetB + jitter(20)),
    38 + jitter(26),
  ];

  if (count > 4) {
    hues.push(baseHue + (monochrome ? jitter(10) : offsetC + jitter(16)));
  }
  if (count > 5) {
    hues.push(baseHue + jitter(14));
  }

  const chroma = monochrome ? 0.035 : 0.075;
  const colors: string[] = [];

  // Deep ground.
  colors.push(oklchToHex(0.3 + Math.random() * 0.08, chroma + Math.random() * 0.045, hues[0]));
  // Light ground.
  colors.push(oklchToHex(0.6 + Math.random() * 0.09, chroma + Math.random() * 0.05, hues[1]));
  // Bright accent.
  colors.push(oklchToHex(0.72 + Math.random() * 0.08, chroma + 0.02 + Math.random() * 0.04, hues[2]));
  // Warm splash.
  colors.push(oklchToHex(0.72 + Math.random() * 0.08, 0.09 + Math.random() * 0.045, hues[3]));

  for (let i = 4; i < count; i += 1) {
    colors.push(oklchToHex(0.42 + Math.random() * 0.2, chroma + Math.random() * 0.04, hues[i] ?? baseHue));
  }

  // Anchor: a low-chroma dark tone, the shader's equivalent of the ink anchors.
  colors.push(oklchToHex(0.15 + Math.random() * 0.07, 0.012 + Math.random() * 0.018, baseHue));

  return colors.map((hex, index) => ({
    id: `random-${index}-${Math.random().toString(36).slice(2, 7)}`,
    hex,
    alpha: 1,
  }));
}

export function newColor(): PaletteColor {
  const [color] = randomPalette();
  return {
    id: `color-${Math.random().toString(36).slice(2, 9)}`,
    hex: color.hex,
    alpha: 1,
  };
}

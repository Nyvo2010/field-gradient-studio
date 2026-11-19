export type Unit = "px" | "cm";

export type OutputSize = {
  preset: string;
  unit: Unit;
  width: number;
  height: number;
  dpi: number;
};

export type OutputPreset = {
  id: string;
  label: string;
  unit: Unit;
  width: number;
  height: number;
  dpi?: number;
};

export const PRESETS: OutputPreset[] = [
  { id: "landscape", label: "Landscape · 16:9", unit: "px", width: 1920, height: 1080 },
  { id: "wide", label: "Wide · 21:9", unit: "px", width: 2560, height: 1080 },
  { id: "square", label: "Square · 1:1", unit: "px", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait · 4:5", unit: "px", width: 1080, height: 1350 },
  { id: "story", label: "Story · 9:16", unit: "px", width: 1080, height: 1920 },
  { id: "a5", label: "A5 · 148 × 210 mm", unit: "cm", width: 14.8, height: 21, dpi: 300 },
  { id: "a4", label: "A4 · 210 × 297 mm", unit: "cm", width: 21, height: 29.7, dpi: 300 },
  { id: "a3", label: "A3 · 297 × 420 mm", unit: "cm", width: 29.7, height: 42, dpi: 300 },
  { id: "letter", label: "Letter · 8.5 × 11 in", unit: "cm", width: 21.59, height: 27.94, dpi: 300 },
];

export const DEFAULT_OUTPUT: OutputSize = {
  preset: "landscape",
  unit: "px",
  width: 1920,
  height: 1080,
  dpi: 300,
};

export const DPI_OPTIONS = [72, 96, 150, 300, 600];

export const MAX_EXPORT_PIXELS = 36_000_000;

export function cmToPx(cm: number, dpi: number) {
  return (cm / 2.54) * dpi;
}

export function pxToCm(px: number, dpi: number) {
  return (px / dpi) * 2.54;
}

export function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function outputPixels(size: OutputSize) {
  if (size.unit === "cm") {
    return {
      width: Math.max(1, Math.round(cmToPx(size.width, size.dpi))),
      height: Math.max(1, Math.round(cmToPx(size.height, size.dpi))),
    };
  }
  return {
    width: Math.max(1, Math.round(size.width)),
    height: Math.max(1, Math.round(size.height)),
  };
}

export function convertUnit(size: OutputSize, unit: Unit): OutputSize {
  if (size.unit === unit) return size;

  if (unit === "cm") {
    return {
      ...size,
      unit,
      width: round(pxToCm(size.width, size.dpi)),
      height: round(pxToCm(size.height, size.dpi)),
    };
  }

  return {
    ...size,
    unit,
    width: Math.round(cmToPx(size.width, size.dpi)),
    height: Math.round(cmToPx(size.height, size.dpi)),
  };
}

export function applyPreset(preset: OutputPreset, currentDpi: number): OutputSize {
  return {
    preset: preset.id,
    unit: preset.unit,
    width: preset.width,
    height: preset.height,
    dpi: preset.dpi ?? currentDpi,
  };
}

export function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function megapixels(width: number, height: number) {
  return (width * height) / 1_000_000;
}

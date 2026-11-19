import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import ColorRow from "./components/ColorRow";
import GradientField from "./components/GradientField";
import OutputBar from "./components/OutputBar";
import Slider from "./components/Slider";
import { exportFieldPng } from "./lib/export";
import {
  BRAND_COLORS,
  BRAND_SETTINGS,
  MAX_COLORS,
  MIN_COLORS,
  buildSpots,
  newColor,
  paletteKey,
  randomLayout,
  type FieldSettings,
  type PaletteColor,
} from "./lib/field";
import {
  DEFAULT_OUTPUT,
  convertUnit,
  outputPixels,
  type OutputSize,
  type Unit,
} from "./lib/output";

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M3 7h3.4c1.2 0 2 .6 2.7 1.5l4.2 6c.7.9 1.5 1.5 2.7 1.5H21" />
      <path d="M3 17h3.4c1.2 0 2-.6 2.7-1.5l1.2-1.7" />
      <path d="M14 8.2l1.3-1.7C16 5.6 16.9 5 18.1 5H21" />
      <path d="M18.5 2.8 21 5l-2.5 2.2" />
      <path d="M18.5 13.8 21 16l-2.5 2.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="icon icon--small">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

const FORMATTERS = {
  px: (value: number) => `${Math.round(value)}px`,
  times: (value: number) => `${value.toFixed(2)}×`,
  decimal: (value: number) => value.toFixed(2),
};

export default function App() {
  const [palette, setPalette] = useState<PaletteColor[]>(() =>
    BRAND_COLORS.map((color) => ({ ...color })),
  );
  const [settings, setSettings] = useState<FieldSettings>(() => ({ ...BRAND_SETTINGS }));
  const [output, setOutput] = useState<OutputSize>(DEFAULT_OUTPUT);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const viewRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  const isBrand =
    paletteKey(palette) === paletteKey(BRAND_COLORS) &&
    settings.blur === BRAND_SETTINGS.blur &&
    settings.grain === BRAND_SETTINGS.grain;

  const modeLabel = isBrand ? "Brand field" : "Custom field";
  const spotCount = useMemo(() => buildSpots(palette).length, [palette]);
  const pixels = useMemo(() => outputPixels(output), [output]);
  const textureScale = useMemo(
    () => Math.max(0.35, Math.min(pixels.width, pixels.height) / 1000),
    [pixels],
  );

  useLayoutEffect(() => {
    const element = viewRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setViewSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const displayScale = useMemo(() => {
    if (!viewSize.width || !viewSize.height) return 0;
    return Math.min(
      (viewSize.width - 12) / pixels.width,
      (viewSize.height - 12) / pixels.height,
      1,
    );
  }, [viewSize, pixels]);

  const displayWidth = Math.max(1, Math.floor(pixels.width * displayScale));
  const displayHeight = Math.max(1, Math.floor(pixels.height * displayScale));
  const previewTextureScale = textureScale * displayScale;

  const updateSetting = useCallback(
    <K extends keyof FieldSettings>(key: K, value: FieldSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const randomize = useCallback(() => {
    setSettings((current) => ({ ...current, positions: randomLayout() }));
    setExportError(null);
  }, []);

  const reset = useCallback(() => {
    setPalette(BRAND_COLORS.map((color) => ({ ...color })));
    setSettings((current) => ({
      ...current,
      blur: BRAND_SETTINGS.blur,
      grain: BRAND_SETTINGS.grain,
    }));
    setExportError(null);
  }, []);

  const setColor = useCallback((id: string, hex: string) => {
    setPalette((current) =>
      current.map((color) => (color.id === id ? { ...color, hex, alpha: 1 } : color)),
    );
  }, []);

  const removeColor = useCallback((id: string) => {
    setPalette((current) => {
      if (current.length <= MIN_COLORS) return current;
      return current.filter((color) => color.id !== id);
    });
  }, []);

  const addColor = useCallback(() => {
    setPalette((current) => {
      if (current.length >= MAX_COLORS) return current;
      return [...current, newColor()];
    });
  }, []);

  const handleUnitChange = useCallback((unit: Unit) => {
    setOutput((current) => convertUnit(current, unit));
    setExportError(null);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    try {
      await exportFieldPng({
        colors: palette,
        settings,
        width: pixels.width,
        height: pixels.height,
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export the PNG.");
    } finally {
      setExporting(false);
    }
  }, [palette, settings, pixels]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        randomize();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [randomize]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__name">Field</span>
            <span className="brand__meta">Gradient studio</span>
          </div>

          <div className="topbar__actions">
            <button
              type="button"
              className="reset"
              onClick={reset}
              disabled={isBrand}
              title="Restore the brand palette and grain, keeping the current layout"
            >
              <span className="reset__full">Reset to brand</span>
              <span className="reset__short">Reset</span>
            </button>

            <button
              type="button"
              className="primary randomize"
              onClick={randomize}
              title="New gradient layout (R)"
            >
              <ShuffleIcon />
              <span className="randomize__label">Randomize</span>
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="rail" aria-label="Field controls">
          <section className="section">
            <div className="section__head">
              <h2 className="label">Palette</h2>
              <span className="section__meta">
                {palette.length} / {MAX_COLORS}
              </span>
            </div>

            <ul className="colors">
              {palette.map((color, index) => (
                <ColorRow
                  key={color.id}
                  color={color}
                  index={index}
                  canRemove={palette.length > MIN_COLORS}
                  onChange={(hex) => setColor(color.id, hex)}
                  onRemove={() => removeColor(color.id)}
                />
              ))}
            </ul>

            <button
              type="button"
              className="add"
              onClick={addColor}
              disabled={palette.length >= MAX_COLORS}
            >
              <PlusIcon />
              <span>Add color</span>
            </button>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="label">Shape</h2>
            </div>

            <Slider
              label="Flow"
              value={settings.distortion}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateSetting("distortion", value)}
              format={FORMATTERS.decimal}
            />
            <Slider
              label="Swirl"
              value={settings.swirl}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateSetting("swirl", value)}
              format={FORMATTERS.decimal}
            />
            <Slider
              label="Spread"
              value={settings.spread}
              min={0.8}
              max={2}
              step={0.01}
              onChange={(value) => updateSetting("spread", value)}
              format={FORMATTERS.times}
            />
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="label">Surface</h2>
            </div>

            <Slider
              label="Grain"
              value={settings.grain}
              min={0}
              max={0.7}
              step={0.01}
              onChange={(value) => updateSetting("grain", value)}
              format={FORMATTERS.decimal}
            />
            <Slider
              label="Blur"
              value={settings.blur}
              min={0}
              max={8}
              step={0.5}
              onChange={(value) => updateSetting("blur", value)}
              format={FORMATTERS.px}
            />
          </section>

          <p className="rail__note">
            Texture scales with the canvas. Press <kbd>R</kbd> for a new layout; the palette stays
            put.
          </p>
        </aside>

        <section className="stage" aria-label="Gradient preview">
          <div
            className="stage__view"
            ref={viewRef}
            style={
              {
                "--aspect": `${pixels.width} / ${pixels.height}`,
              } as CSSProperties
            }
          >
            {displayScale > 0 ? (
              <div
                className="canvas"
                data-positions={settings.positions}
                style={{ width: displayWidth, height: displayHeight }}
              >
                <GradientField
                  colors={palette}
                  settings={settings}
                  textureScale={previewTextureScale}
                />
              </div>
            ) : null}
          </div>

          <div className="stage__status">
            <span className="stage__mode">{modeLabel}</span>
            <span className="stage__meta">
              {palette.length} colors · {spotCount} spots
            </span>
            <span className="stage__meta stage__meta--wide">
              grain {settings.grain.toFixed(2)} · texture ×{textureScale.toFixed(2)}
            </span>
          </div>

          <OutputBar
            size={output}
            pixels={pixels}
            exporting={exporting}
            error={exportError}
            onChange={(next) => {
              setOutput(next);
              setExportError(null);
            }}
            onUnitChange={handleUnitChange}
            onExport={handleExport}
          />
        </section>
      </main>
    </div>
  );
}

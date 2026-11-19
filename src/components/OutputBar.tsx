import NumberField from "./NumberField";
import {
  DPI_OPTIONS,
  MAX_EXPORT_PIXELS,
  PRESETS,
  applyPreset,
  megapixels,
  type OutputSize,
  type Unit,
  type OutputPreset,
} from "../lib/output";

type OutputBarProps = {
  size: OutputSize;
  pixels: { width: number; height: number };
  exporting: boolean;
  error: string | null;
  onChange: (size: OutputSize) => void;
  onUnitChange: (unit: Unit) => void;
  onExport: () => void;
};

export default function OutputBar({
  size,
  pixels,
  exporting,
  error,
  onChange,
  onUnitChange,
  onExport,
}: OutputBarProps) {
  const tooLarge = pixels.width * pixels.height > MAX_EXPORT_PIXELS;
  const suffix = size.unit;
  const dimMin = size.unit === "px" ? 16 : 1;
  const dimMax = size.unit === "px" ? 12000 : 300;
  const dimStep = size.unit === "px" ? 1 : 0.1;

  const changeDimension = (key: "width" | "height", value: number) => {
    onChange({ ...size, preset: "custom", [key]: value });
  };

  return (
    <div className="output">
      <div className="output__controls">
        <div className="output__field output__field--preset">
          <label className="mini-label" htmlFor="output-preset">
            Preset
          </label>
          <select
            id="output-preset"
            className="select"
            value={size.preset}
            onChange={(event) => {
              const preset = PRESETS.find(
                (item: OutputPreset) => item.id === event.currentTarget.value,
              );
              if (preset) onChange(applyPreset(preset, size.dpi));
            }}
          >
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom" disabled>
              Custom
            </option>
          </select>
        </div>

        <div className="output__field">
          <span className="mini-label">Size</span>
          <div className="output__sizes">
            <NumberField
              id="output-width"
              label="Width"
              value={size.width}
              min={dimMin}
              max={dimMax}
              step={dimStep}
              suffix={suffix}
              onChange={(value) => changeDimension("width", value)}
            />
            <span className="output__times" aria-hidden="true">
              ×
            </span>
            <NumberField
              id="output-height"
              label="Height"
              value={size.height}
              min={dimMin}
              max={dimMax}
              step={dimStep}
              suffix={suffix}
              onChange={(value) => changeDimension("height", value)}
            />
          </div>
        </div>

        <div className="output__field">
          <span className="mini-label">Unit</span>
          <div className="segmented" role="group" aria-label="Output unit">
            {(["px", "cm"] as Unit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                className={`segmented__item${size.unit === unit ? " is-active" : ""}`}
                onClick={() => onUnitChange(unit)}
                aria-pressed={size.unit === unit}
              >
                {unit.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="output__field">
          <label className="mini-label" htmlFor="output-dpi">
            DPI
          </label>
          <select
            id="output-dpi"
            className="select select--short"
            value={size.dpi}
            disabled={size.unit === "px"}
            title={size.unit === "px" ? "DPI applies to centimeter sizes" : "Print resolution"}
            onChange={(event) => onChange({ ...size, dpi: Number(event.currentTarget.value) })}
          >
            {DPI_OPTIONS.map((dpi) => (
              <option key={dpi} value={dpi}>
                {dpi}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="output__action">
        <span className={`output__summary${tooLarge ? " is-error" : ""}`}>
          {pixels.width.toLocaleString()} × {pixels.height.toLocaleString()} px ·{" "}
          {megapixels(pixels.width, pixels.height).toFixed(1)} MP
        </span>
        <button
          type="button"
          className="inverted"
          onClick={onExport}
          disabled={exporting || tooLarge}
          title="Export a PNG at the full canvas size"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="icon icon--small">
            <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 15.5h12" />
          </svg>
          <span>{exporting ? "Exporting…" : "Export PNG"}</span>
        </button>
      </div>

      {tooLarge || error ? (
        <p className="output__error" role="status">
          {tooLarge
            ? "Over 36 MP. Lower the dimensions or DPI."
            : error}
        </p>
      ) : null}
    </div>
  );
}

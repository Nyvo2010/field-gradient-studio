import { useEffect, useState } from "react";
import { normalizeHex } from "../lib/color";
import type { PaletteColor } from "../lib/field";

type ColorRowProps = {
  color: PaletteColor;
  index: number;
  canRemove: boolean;
  onChange: (hex: string) => void;
  onRemove: () => void;
};

export default function ColorRow({
  color,
  index,
  canRemove,
  onChange,
  onRemove,
}: ColorRowProps) {
  const [draft, setDraft] = useState(color.hex);

  useEffect(() => {
    setDraft(color.hex);
  }, [color.hex]);

  const commit = () => {
    const next = normalizeHex(draft);
    if (next) {
      onChange(next);
      setDraft(next);
    } else {
      setDraft(color.hex);
    }
  };

  const opacity = color.alpha ?? 1;

  return (
    <li className="color-row">
      <label
        className="swatch"
        style={{ backgroundColor: color.hex }}
        title={`${color.hex}${opacity < 1 ? ` at ${Math.round(opacity * 100)}% opacity` : ""}`}
      >
        <input
          type="color"
          value={color.hex}
          onChange={(event) => onChange(event.currentTarget.value.toUpperCase())}
          aria-label={`Color ${index + 1}, ${color.hex}`}
        />
      </label>

      <input
        className="hex-input"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(color.hex);
            event.currentTarget.blur();
          }
        }}
        spellCheck={false}
        autoComplete="off"
        aria-label={`Hex value for color ${index + 1}`}
      />

      {opacity < 1 ? (
        <span className="alpha-tag" title="Accent opacity from the brand field">
          {Math.round(opacity * 100)}%
        </span>
      ) : null}

      <button
        type="button"
        className="row-button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove color ${color.hex}`}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>
    </li>
  );
}

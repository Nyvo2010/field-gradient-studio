import { useEffect, useState } from "react";
import { formatNumber } from "../lib/output";

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
};

export default function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(formatNumber(value));

  useEffect(() => {
    setDraft(formatNumber(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setDraft(formatNumber(value));
      return;
    }
    const next = Math.min(max, Math.max(min, parsed));
    setDraft(formatNumber(next));
    if (next !== value) onChange(next);
  };

  return (
    <label className="well" htmlFor={id}>
      <input
        id={id}
        className="well__input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(formatNumber(value));
            event.currentTarget.blur();
          }
        }}
        aria-label={label}
      />
      <span className="well__suffix" aria-hidden="true">
        {suffix}
      </span>
    </label>
  );
}

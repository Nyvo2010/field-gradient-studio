import { useId, type CSSProperties } from "react";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
};

export default function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: SliderProps) {
  const id = useId();
  const fill = `${((value - min) / (max - min)) * 100}%`;

  return (
    <div className="slider">
      <div className="slider__head">
        <label htmlFor={id} className="slider__label">
          {label}
        </label>
        <output htmlFor={id} className="slider__value">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        className="slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{ "--fill": fill } as CSSProperties}
      />
    </div>
  );
}

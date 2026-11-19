import { StaticMeshGradient } from "@paper-design/shaders-react";
import { useMemo } from "react";
import { buildSpots, type FieldSettings, type PaletteColor } from "../lib/field";

type GradientFieldProps = {
  colors: PaletteColor[];
  settings: FieldSettings;
  /** Combined canvas scale × display scale, so texture matches the export. */
  textureScale: number;
};

const WAVE_X_SHIFT = 0.6;
const WAVE_Y_SHIFT = 0.21;
const MIXING = 0.75;

/**
 * Static mesh gradient: a fixed spot layout with a seed, so the field never
 * moves. Randomising the seed is the only thing that changes the composition.
 */
export default function GradientField({ colors, settings, textureScale }: GradientFieldProps) {
  const spots = useMemo(() => buildSpots(colors), [colors]);

  const blur = settings.blur * textureScale;
  const pad = Math.max(8, Math.ceil(blur * 2 + 8));
  const grainA = Math.max(1, 260 * textureScale);
  const grainB = Math.max(1, 520 * textureScale);

  return (
    <div className="field">
      <div
        className="field__shader"
        style={{
          inset: `-${pad}px`,
          filter: `blur(${blur}px) contrast(1.2)`,
        }}
      >
        <StaticMeshGradient
          colors={spots}
          positions={settings.positions}
          waveX={settings.distortion}
          waveXShift={WAVE_X_SHIFT}
          waveY={settings.swirl}
          waveYShift={WAVE_Y_SHIFT}
          mixing={MIXING}
          scale={settings.spread}
          grainMixer={0}
          grainOverlay={0}
          fit="cover"
          width="100%"
          height="100%"
          minPixelRatio={1.25}
          maxPixelCount={3_200_000}
          style={{ display: "block" }}
        />
      </div>
      <div
        className="field__grain"
        style={{
          opacity: settings.grain,
          backgroundSize: `${grainA}px ${grainA}px, ${grainB}px ${grainB}px`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

import {
  ShaderFitOptions,
  ShaderMount,
  getShaderColorFromString,
  staticMeshGradientFragmentShader,
} from "@paper-design/shaders";
import { buildSpots, type FieldSettings, type PaletteColor } from "./field";
import { MAX_EXPORT_PIXELS } from "./output";

type ExportOptions = {
  colors: PaletteColor[];
  settings: FieldSettings;
  width: number;
  height: number;
};

const WAVE_X_SHIFT = 0.6;
const WAVE_Y_SHIFT = 0.21;
const MIXING = 0.75;

function grainDataUri({
  size,
  frequency,
  octaves,
  seed,
  slope,
  intercept,
}: {
  size: number;
  frequency: number;
  octaves: number;
  seed: number;
  slope: number;
  intercept: number;
}) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='linear' slope='${slope}' intercept='${intercept}'/><feFuncG type='linear' slope='${slope}' intercept='${intercept}'/><feFuncB type='linear' slope='${slope}' intercept='${intercept}'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not build the grain texture."));
    image.src = src;
  });
}

function fillWithImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tileSize: number,
  width: number,
  height: number,
) {
  const tile = document.createElement("canvas");
  tile.width = Math.max(1, Math.round(tileSize));
  tile.height = Math.max(1, Math.round(tileSize));
  const tileCtx = tile.getContext("2d");
  if (!tileCtx) return;
  tileCtx.drawImage(image, 0, 0, tile.width, tile.height);

  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
}

function waitForShader(mount: ShaderMount, width: number, height: number) {
  return new Promise<void>((resolve) => {
    const started = performance.now();

    const check = () => {
      const canvas = mount.canvasElement;
      const ready =
        canvas &&
        canvas.width > 0 &&
        canvas.height > 0 &&
        Math.abs(canvas.width - width) <= 1 &&
        Math.abs(canvas.height - height) <= 1;

      if (ready || performance.now() - started > 4000) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the PNG."));
    }, "image/png");
  });
}

export async function exportFieldPng({ colors, settings, width, height }: ExportOptions) {
  const outputWidth = Math.max(1, Math.round(width));
  const outputHeight = Math.max(1, Math.round(height));

  if (outputWidth * outputHeight > MAX_EXPORT_PIXELS) {
    throw new Error("That canvas is too large to export. Try a smaller size or lower DPI.");
  }

  const textureScale = Math.max(0.35, Math.min(outputWidth, outputHeight) / 1000);
  const blur = settings.blur * textureScale;
  const pad = Math.ceil(Math.max(12, blur * 2 + 8));

  const mountElement = document.createElement("div");
  mountElement.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    `width:${outputWidth + pad * 2}px`,
    `height:${outputHeight + pad * 2}px`,
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(mountElement);

  const spots = buildSpots(colors);
  const uniforms = {
    u_colors: spots.map(getShaderColorFromString),
    u_colorsCount: spots.length,
    u_positions: settings.positions,
    u_waveX: settings.distortion,
    u_waveXShift: WAVE_X_SHIFT,
    u_waveY: settings.swirl,
    u_waveYShift: WAVE_Y_SHIFT,
    u_mixing: MIXING,
    u_grainMixer: 0,
    u_grainOverlay: 0,
    u_fit: ShaderFitOptions.cover,
    u_rotation: 0,
    u_scale: settings.spread,
    u_offsetX: 0,
    u_offsetY: 0,
    u_originX: 0.5,
    u_originY: 0.5,
    u_worldWidth: 0,
    u_worldHeight: 0,
  };

  let mount: ShaderMount | null = null;

  try {
    mount = new ShaderMount(
      mountElement,
      staticMeshGradientFragmentShader,
      uniforms,
      { preserveDrawingBuffer: true },
      0,
      0,
      1,
      (outputWidth + pad * 2) * (outputHeight + pad * 2),
    );

    await waitForShader(mount, outputWidth + pad * 2, outputHeight + pad * 2);

    const out = document.createElement("canvas");
    out.width = outputWidth;
    out.height = outputHeight;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Could not create the export canvas.");

    ctx.filter = `blur(${blur}px) contrast(1.2)`;
    ctx.drawImage(mount.canvasElement, -pad, -pad, outputWidth + pad * 2, outputHeight + pad * 2);
    ctx.filter = "none";

    const tileA = Math.max(1, Math.round(260 * textureScale));
    const tileB = Math.max(1, Math.round(520 * textureScale));
    const [grainA, grainB] = await Promise.all([
      loadImage(
        grainDataUri({
          size: tileA,
          frequency: 0.9,
          octaves: 4,
          seed: 3,
          slope: 2.6,
          intercept: -0.8,
        }),
      ),
      loadImage(
        grainDataUri({
          size: tileB,
          frequency: 0.35,
          octaves: 3,
          seed: 9,
          slope: 2,
          intercept: -0.5,
        }),
      ),
    ]);

    if (settings.grain > 0) {
      const grainLayer = document.createElement("canvas");
      grainLayer.width = outputWidth;
      grainLayer.height = outputHeight;
      const grainCtx = grainLayer.getContext("2d");
      if (!grainCtx) throw new Error("Could not create the grain layer.");
      fillWithImage(grainCtx, grainA, tileA, outputWidth, outputHeight);
      fillWithImage(grainCtx, grainB, tileB, outputWidth, outputHeight);

      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = settings.grain;
      ctx.drawImage(grainLayer, 0, 0);
      ctx.restore();
    }

    const blob = await canvasToBlob(out);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `field-${outputWidth}x${outputHeight}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    mount?.dispose();
    mountElement.remove();
  }
}

// src/utils/textureGenerator.js
// GIMP-like soft Perlin / fBm texture for vertically scrollable bars.

const TEXTURE_DEFAULTS = {
  seed: 7,
  baseScaleX: 0.0008,
  baseScaleY: 0.0012,
  octaves: 8,
  lacunarity: 2.0,
  persistence: 1,
  warpStrength: 6,
  warpScaleX: 0.1,
  warpScaleY: 0.1,
  contrast: 0.72,
  grayMin: 220,
  grayMax: 255,
  grain: 2,
};

const DEFAULT_BAR_WIDTH = 40;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function hash2D(ix, iy, seed = 0) {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + seed * 101.3) * 43758.5453123;
  return s - Math.floor(s);
}

function gradient2D(ix, iy, seed = 0) {
  const angle = hash2D(ix, iy, seed) * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function perlin2D(x, y, seed = 0) {
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;

  const g00 = gradient2D(x0, y0, seed);
  const g10 = gradient2D(x1, y0, seed);
  const g01 = gradient2D(x0, y1, seed);
  const g11 = gradient2D(x1, y1, seed);

  const dx = x - x0;
  const dy = y - y0;

  const n00 = g00.x * dx + g00.y * dy;
  const n10 = g10.x * (dx - 1) + g10.y * dy;
  const n01 = g01.x * dx + g01.y * (dy - 1);
  const n11 = g11.x * (dx - 1) + g11.y * (dy - 1);

  const u = fade(dx);
  const v = fade(dy);

  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);

  return lerp(nx0, nx1, v) * 1.35;
}

function fractalNoise2D(
  x,
  y,
  {
    seed = 1,
    octaves = 4,
    lacunarity = 2.0,
    persistence = 0.5,
    baseScaleX = 0.018,
    baseScaleY = 0.01,
  } = {}
) {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;

  for (let o = 0; o < octaves; o++) {
    const n = perlin2D(
      x * baseScaleX * frequency,
      y * baseScaleY * frequency,
      seed + o * 97
    );

    sum += amplitude * n;
    norm += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return norm === 0 ? 0 : sum / norm;
}

function warpedNoise2D(
  x,
  y,
  {
    seed = 1,
    warpStrength = 8,
    warpScaleX = 0.012,
    warpScaleY = 0.008,
    ...noiseOptions
  } = {}
) {
  const wx =
    perlin2D(x * warpScaleX, y * warpScaleY, seed + 1000) * warpStrength;
  const wy =
    perlin2D(x * warpScaleX, y * warpScaleY, seed + 2000) * warpStrength;

  return fractalNoise2D(x + wx, y + wy, {
    seed,
    ...noiseOptions,
  });
}

function smoothstep01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function buildSoftPerlinTextureCanvas(height, width, options = {}) {
  const h = Math.max(1, Math.round(height));
  const w = Math.max(1, Math.round(width));

  const {
    seed,
    baseScaleX,
    baseScaleY,
    octaves,
    lacunarity,
    persistence,
    warpStrength,
    warpScaleX,
    warpScaleY,
    contrast,
    grayMin,
    grayMax,
    grain,
    targetHeight,
  } = {
    ...TEXTURE_DEFAULTS,
    ...options,
  };

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  const values = new Array(w * h);
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let y = 0; y < h; y++) {
    const sampleY = targetHeight && targetHeight > h
      ? ((y + 0.5) * targetHeight) / h
      : y;
    for (let x = 0; x < w; x++) {
      let v = warpedNoise2D(x, sampleY, {
        seed,
        warpStrength,
        warpScaleX,
        warpScaleY,
        octaves,
        lacunarity,
        persistence,
        baseScaleX,
        baseScaleY,
      });

      const fine =
        fractalNoise2D(x + 23.17, sampleY - 11.43, {
          seed: seed + 3000,
          octaves: 2,
          lacunarity: 2.0,
          persistence: 0.45,
          baseScaleX: baseScaleX * 3.0,
          baseScaleY: baseScaleY * 3.0,
        }) * grain;

      v += fine;

      const idx = y * w + x;
      values[idx] = v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  }

  const range = maxVal - minVal || 1;

  for (let i = 0; i < values.length; i++) {
    let t = (values[i] - minVal) / range;
    t = 0.5 + (t - 0.5) * contrast;
    t = smoothstep01(t);

    const g = Math.round(lerp(grayMin, grayMax, t));

    const di = i * 4;
    data[di] = g;
    data[di + 1] = g;
    data[di + 2] = g;
    data[di + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function cropBottom(canvas, cropHeight) {
  const h = Math.max(1, Math.round(cropHeight));
  const w = canvas.width;
  const sourceH = canvas.height;
  const sy = Math.max(0, sourceH - h);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;

  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, sy, w, h, 0, 0, w, h);

  return out;
}

export function generateVerticalPairTextures({
  longBar,
  shortBar,
  barWidth = DEFAULT_BAR_WIDTH,
  textureOptions = {},
} = {}) {
  const longH = Math.max(1, Math.round(longBar));
  const shortH = Math.max(1, Math.round(shortBar));

  const mergedTextureOptions = {
    ...TEXTURE_DEFAULTS,
    ...textureOptions,
  };

  const largeCanvas = buildSoftPerlinTextureCanvas(
    longH,
    barWidth,
    mergedTextureOptions
  );

  const smallCanvas = cropBottom(largeCanvas, shortH);

  return {
    largeTexture: largeCanvas.toDataURL("image/png"),
    smallTexture: smallCanvas.toDataURL("image/png"),
  };
}

// NEW
export function generateTextureBackground({
  width,
  height,
  textureOptions = {},
} = {}) {
  const canvas = buildSoftPerlinTextureCanvas(height, width, {
    ...TEXTURE_DEFAULTS,
    ...textureOptions,
  });

  return canvas.toDataURL("image/png");
}

export { TEXTURE_DEFAULTS, DEFAULT_BAR_WIDTH };
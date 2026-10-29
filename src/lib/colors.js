import { COLOR_NAMES } from "./constants.js";

function hex(n) {
  return n.toString(16).padStart(2, "0");
}

function rgbToHex(r, g, b) {
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function parseHex(value) {
  const raw = value.replace("#", "");
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function nearestName(hexColor) {
  const rgb = parseHex(hexColor);
  let best = COLOR_NAMES[0][0];
  let bestDist = Infinity;
  for (const [name, value] of COLOR_NAMES) {
    const gap = dist(rgb, parseHex(value));
    if (gap < bestDist) {
      best = name;
      bestDist = gap;
    }
  }
  return best;
}

export function colorsFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map();
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 40) continue;
    const key = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
    count += 1;
  }
  if (!count) return { dominantHex: "#888888", secondaryHex: "#888888", names: ["grey"] };
  const ranked = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const toHex = (key) => {
    const [r, g, b] = key.split(",").map((part) => (Number(part) << 4) + 8);
    return rgbToHex(r, g, b);
  };
  const dominantHex = toHex(ranked[0][0]);
  const secondaryHex = toHex((ranked[1] || ranked[0])[0]);
  const names = [...new Set([nearestName(dominantHex), nearestName(secondaryHex)])];
  return { dominantHex, secondaryHex, names };
}

export function hexDistance(a, b) {
  if (!a || !b) return 999;
  return dist(parseHex(a), parseHex(b));
}

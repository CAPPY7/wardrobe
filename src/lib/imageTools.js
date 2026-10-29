export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function blobToImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function drawFit(source, max) {
  const sw = source.naturalWidth || source.videoWidth || source.width;
  const sh = source.naturalHeight || source.videoHeight || source.height;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

function colorDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function cornerColor(data, w, h) {
  const spots = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ];
  const samples = spots.map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  const avg = [0, 1, 2].map((channel) => samples.reduce((sum, sample) => sum + sample[channel], 0) / samples.length);
  const spread = Math.max(...samples.map((sample) => colorDist(sample, avg)));
  return { avg, spread };
}

function trimAlpha(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 20) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const pad = 8;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const w = Math.min(width - x, maxX - minX + pad * 2);
  const h = Math.min(height - y, maxY - minY + pad * 2);
  const next = document.createElement("canvas");
  next.width = w;
  next.height = h;
  next.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return next;
}

/** Plain-background cutout. Returns the original canvas if the sheet is not plain enough. */
export function knockOut(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const { avg, spread } = cornerColor(data, width, height);
  if (spread > 42) return { canvas, removed: false };
  let gone = 0;
  const total = width * height;
  for (let i = 0; i < data.length; i += 4) {
    const pixel = [data[i], data[i + 1], data[i + 2]];
    if (colorDist(pixel, avg) < 38) {
      data[i + 3] = 0;
      gone += 1;
    }
  }
  const fraction = gone / total;
  if (fraction < 0.08 || fraction > 0.78) return { canvas, removed: false };
  ctx.putImageData(image, 0, 0);
  return { canvas: trimAlpha(canvas), removed: true };
}

export async function preparePhoto(blob) {
  const image = await blobToImage(blob);
  const fitted = drawFit(image, 1024);
  const cut = knockOut(fitted);
  const cleaned = cut.canvas;
  const thumb = drawFit(cleaned, 360);
  const upload = drawFit(cleaned, 768);
  const imageBlob = (await canvasToBlob(cleaned, "image/webp", 0.9)) || (await canvasToBlob(cleaned, "image/png"));
  const thumbBlob = (await canvasToBlob(thumb, "image/webp", 0.82)) || (await canvasToBlob(thumb, "image/jpeg", 0.8));
  const jpegBlob = await canvasToBlob(upload, "image/jpeg", 0.8);
  return { cleaned, imageBlob, thumbBlob, jpegBlob, removed: cut.removed };
}

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

function borderMedian(data, width, height) {
  const samples = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 36));
  for (let x = 0; x < width; x += step) {
    samples.push([data[(1 * width + x) * 4], data[(1 * width + x) * 4 + 1], data[(1 * width + x) * 4 + 2]]);
    const y = height - 2;
    samples.push([data[(y * width + x) * 4], data[(y * width + x) * 4 + 1], data[(y * width + x) * 4 + 2]]);
  }
  for (let y = 0; y < height; y += step) {
    samples.push([data[(y * width + 1) * 4], data[(y * width + 1) * 4 + 1], data[(y * width + 1) * 4 + 2]]);
    const x = width - 2;
    samples.push([data[(y * width + x) * 4], data[(y * width + x) * 4 + 1], data[(y * width + x) * 4 + 2]]);
  }
  const mid = (channel) => {
    const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] || 0;
  };
  return [mid(0), mid(1), mid(2)];
}

/** Crop to the cloth when the photo is a room, not a plain sheet. */
export function focusGarment(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const border = borderMedian(data, width, height);
  const step = 3;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const mask = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const x = Math.min(width - 1, gx * step);
      const y = Math.min(height - 1, gy * step);
      const i = (y * width + x) * 4;
      if (colorDist([data[i], data[i + 1], data[i + 2]], border) > 36) mask[gy * cols + gx] = 1;
    }
  }
  const seen = new Uint8Array(mask.length);
  let best = null;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let count = 0;
    let minX = cols;
    let minY = rows;
    let maxX = 0;
    let maxY = 0;
    while (stack.length) {
      const cur = stack.pop();
      count += 1;
      const x = cur % cols;
      const y = Math.floor(cur / cols);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const nexts = [cur - 1, cur + 1, cur - cols, cur + cols];
      for (const next of nexts) {
        if (next < 0 || next >= mask.length || seen[next] || !mask[next]) continue;
        if ((next === cur - 1 || next === cur + 1) && Math.floor(next / cols) !== y) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    if (!best || count > best.count) best = { count, minX, minY, maxX, maxY };
  }
  const total = cols * rows;
  if (!best || best.count < total * 0.08 || best.count > total * 0.8) return { canvas, cropped: false };
  const pad = step * 3;
  const x = Math.max(0, best.minX * step - pad);
  const y = Math.max(0, best.minY * step - pad);
  const w = Math.min(width - x, (best.maxX - best.minX + 1) * step + pad * 2);
  const h = Math.min(height - y, (best.maxY - best.minY + 1) * step + pad * 2);
  if (w > width * 0.92 && h > height * 0.92) return { canvas, cropped: false };
  const next = document.createElement("canvas");
  next.width = Math.max(1, Math.round(w));
  next.height = Math.max(1, Math.round(h));
  next.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, next.width, next.height);
  return { canvas: next, cropped: true };
}
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
  let cut = knockOut(fitted);
  let canvas = cut.canvas;
  if (!cut.removed) {
    const focused = focusGarment(fitted);
    cut = knockOut(focused.canvas);
    canvas = cut.removed ? cut.canvas : focused.canvas;
  }
  const thumb = drawFit(canvas, 360);
  const upload = drawFit(canvas, 768);
  const imageBlob = (await canvasToBlob(canvas, "image/webp", 0.9)) || (await canvasToBlob(canvas, "image/png"));
  const thumbBlob = (await canvasToBlob(thumb, "image/webp", 0.82)) || (await canvasToBlob(thumb, "image/jpeg", 0.8));
  const jpegBlob = await canvasToBlob(upload, "image/jpeg", 0.8);
  return { cleaned: canvas, imageBlob, thumbBlob, jpegBlob, removed: cut.removed, needsSheet: !cut.removed };
}

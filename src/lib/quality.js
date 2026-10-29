export function measureFrame(source) {
  const canvas = document.createElement("canvas");
  const sw = source.videoWidth || source.width || 160;
  const sh = source.videoHeight || source.height || 160;
  const scale = 96 / Math.max(sw, sh);
  canvas.width = Math.max(8, Math.round(sw * scale));
  canvas.height = Math.max(8, Math.round(sh * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4;
    gray[i] = data[p] * 0.3 + data[p + 1] * 0.59 + data[p + 2] * 0.11;
    sum += gray[i];
  }
  const brightness = sum / gray.length;
  let lap = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const value = gray[i] * 4 - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      lap += value * value;
      count += 1;
    }
  }
  return { brightness, variance: lap / count, tooDark: brightness < 48, blurry: lap / count < 18 };
}

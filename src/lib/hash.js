export function dHash(canvas) {
  const sample = document.createElement("canvas");
  sample.width = 9;
  sample.height = 8;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, 9, 8);
  const data = ctx.getImageData(0, 0, 9, 8).data;
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = y * 9 + x;
      const right = left + 1;
      const l = data[left * 4] + data[left * 4 + 1] + data[left * 4 + 2];
      const r = data[right * 4] + data[right * 4 + 1] + data[right * 4 + 2];
      bits += l > r ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let n = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}

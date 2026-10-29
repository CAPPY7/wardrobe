import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public");

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, paint) {
  const px = new Uint8ClampedArray(size * size * 4);
  paint(px, size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const start = y * (size * 4 + 1);
    raw[start] = 0;
    Buffer.from(px.buffer, px.byteOffset + y * size * 4, size * 4).copy(raw, start + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function set(px, size, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
}

function fill(px, size, r, g, b) {
  for (let i = 0; i < px.length; i += 4) {
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  }
}

function shirt(px, size, pad) {
  fill(px, size, 31, 74, 58);
  const left = Math.round(size * (0.28 + pad));
  const right = Math.round(size * (0.72 - pad));
  const top = Math.round(size * (0.34 + pad));
  const bottom = Math.round(size * (0.78 - pad));
  const mid = size / 2;
  for (let y = top; y < bottom; y += 1) {
    const t = (y - top) / (bottom - top);
    const inset = Math.round((right - left) * 0.06 * t);
    for (let x = left + inset; x < right - inset; x += 1) set(px, size, x, y, 243, 238, 230);
  }
  const neck = Math.round(size * 0.08);
  for (let y = top - neck; y < top + neck; y += 1) {
    for (let x = Math.round(mid - neck); x < Math.round(mid + neck); x += 1) set(px, size, x, y, 243, 238, 230);
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "pwa-192.png"), png(192, (px, size) => shirt(px, size, 0)));
writeFileSync(join(outDir, "pwa-512.png"), png(512, (px, size) => shirt(px, size, 0)));
writeFileSync(join(outDir, "maskable-512.png"), png(512, (px, size) => shirt(px, size, 0.08)));
writeFileSync(join(outDir, "apple-touch-icon.png"), png(180, (px, size) => shirt(px, size, 0)));
console.log("icons written");

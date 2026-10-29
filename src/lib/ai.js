import { KINDS, MATERIALS, OCCASIONS, PATTERNS, SEASONS } from "./constants.js";

const OCCASION_KEYS = new Set(OCCASIONS.map((item) => item.key));

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read the photo."));
    reader.readAsDataURL(blob);
  });
}

async function post(workerUrl, path, body) {
  let lastError = new Error("AI is unavailable.");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${workerUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(response.status === 429 ? "AI quota is used up." : "AI is unavailable.");
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI is unavailable.");
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function sanitizeTags(raw, kindHint) {
  const kind = KINDS.includes(raw?.kind) ? raw.kind : kindHint || "other";
  const confidence = Math.min(1, Math.max(0, Number(raw?.confidence) || 0));
  return {
    kind,
    type: String(raw?.type || "item").slice(0, 60),
    name: String(raw?.name || "New item").slice(0, 80),
    colors: Array.isArray(raw?.colors) && raw.colors.length ? raw.colors.map(String).slice(0, 3) : [],
    pattern: PATTERNS.includes(raw?.pattern) ? raw.pattern : "other",
    material: MATERIALS.includes(raw?.material) ? raw.material : "unknown",
    seasons: (Array.isArray(raw?.seasons) ? raw.seasons : ["all"]).filter((s) => SEASONS.includes(s)),
    formality: Math.min(5, Math.max(1, Math.round(Number(raw?.formality) || 3))),
    warmth: Math.min(5, Math.max(1, Math.round(Number(raw?.warmth) || 3))),
    occasions: (Array.isArray(raw?.occasions) ? raw.occasions : []).filter((key) => OCCASION_KEYS.has(key)),
    confidence,
    advice: String(raw?.quality?.advice || ""),
    usable: raw?.quality ? Boolean(raw.quality.usable) : true,
    valid: Boolean(raw && raw.kind && raw.name),
  };
}

export async function analyzePhoto(workerUrl, jpegBlob, kindHint) {
  const image = await blobToBase64(jpegBlob);
  const raw = await post(workerUrl, "/analyze", { image, mimeType: "image/jpeg" });
  return sanitizeTags(raw, kindHint);
}

export async function stylistNote(workerUrl, outfit, context) {
  const compact = (outfit.items || []).map((item) => ({
    name: item.name,
    kind: item.kind,
    type: item.type,
    colors: item.colors,
    material: item.material,
  }));
  const payload = await post(workerUrl, "/stylist", { outfit: compact, context });
  return String(payload.note || "").slice(0, 240);
}

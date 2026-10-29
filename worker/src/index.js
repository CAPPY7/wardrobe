/**
 * wardrobe-proxy
 * Fixed prompts only. The Gemini key is env.GEMINI_API_KEY (a Worker secret).
 * Allowed origins: the GitHub Pages site and local Vite.
 */

const MODEL = "gemini-2.5-flash";
const MAX_BODY = 1_500_000;

const ALLOWED_ORIGINS = new Set([
  "https://cappy7.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const OCCASIONS = [
  "office",
  "casual_outing",
  "college",
  "date",
  "party",
  "wedding_function",
  "festival_puja",
  "travel",
  "gym_sports",
  "formal_event",
  "home_relax",
];

const ANALYZE_PROMPT =
  "You are a fashion cataloguing assistant for an Indian user. Look at ONE clothing item, shoe, watch or accessory photo. Return ONLY JSON in the given schema. Be accurate and conservative. If unsure, lower the confidence value. Include Indian ethnic wear types when relevant (kurta, pyjama, sherwani, nehru jacket, dupatta, saree, lehenga, salwar, etc.).";

const STYLIST_PROMPT =
  "You are a concise stylist. Given an outfit and the weather, reply with one or two short friendly lines on why it works. No preamble. Do not invent items that are not in the list.";

const ANALYZE_SCHEMA = {
  type: "object",
  properties: {
    quality: {
      type: "object",
      properties: {
        usable: { type: "boolean" },
        problems: { type: "array", items: { type: "string" } },
        advice: { type: "string" },
      },
      required: ["usable", "problems", "advice"],
    },
    kind: { type: "string" },
    type: { type: "string" },
    name: { type: "string" },
    colors: { type: "array", items: { type: "string" } },
    pattern: { type: "string" },
    material: { type: "string" },
    seasons: { type: "array", items: { type: "string" } },
    formality: { type: "integer" },
    warmth: { type: "integer" },
    occasions: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: [
    "quality",
    "kind",
    "type",
    "name",
    "colors",
    "pattern",
    "material",
    "seasons",
    "formality",
    "warmth",
    "occasions",
    "confidence",
  ],
};

function corsHeaders(origin) {
  const headers = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function json(origin, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

async function callGemini(env, parts, schema) {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, status: 500, error: "Worker secret GEMINI_API_KEY is missing." };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });
  if (response.status === 429) {
    return { ok: false, status: 429, error: "Gemini quota is used up for now. Try again later." };
  }
  if (!response.ok) {
    return { ok: false, status: 502, error: "Gemini did not answer." };
  }
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, error: "Gemini returned invalid JSON." };
  }
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanAnalyze(raw) {
  const kindSet = new Set(["top", "bottom", "one_piece", "ethnic", "layer", "footwear", "watch", "accessory", "bag", "other"]);
  const patternSet = new Set(["solid", "striped", "checked", "printed", "floral", "textured", "other"]);
  const materialSet = new Set(["cotton", "denim", "linen", "wool", "leather", "synthetic", "silk", "knit", "unknown"]);
  const seasonSet = new Set(["summer", "monsoon", "winter", "all"]);
  const kind = kindSet.has(raw.kind) ? raw.kind : "other";
  return {
    quality: {
      usable: Boolean(raw.quality?.usable),
      problems: Array.isArray(raw.quality?.problems) ? raw.quality.problems.map(String).slice(0, 6) : [],
      advice: String(raw.quality?.advice || "").slice(0, 180),
    },
    kind,
    type: String(raw.type || "item").slice(0, 60),
    name: String(raw.name || "New item").slice(0, 80),
    colors: Array.isArray(raw.colors) ? raw.colors.map(String).slice(0, 3) : [],
    pattern: patternSet.has(raw.pattern) ? raw.pattern : "other",
    material: materialSet.has(raw.material) ? raw.material : "unknown",
    seasons: (Array.isArray(raw.seasons) ? raw.seasons : ["all"]).filter((s) => seasonSet.has(s)).slice(0, 4),
    formality: clampInt(raw.formality, 1, 5, 3),
    warmth: clampInt(raw.warmth, 1, 5, 3),
    occasions: (Array.isArray(raw.occasions) ? raw.occasions : []).filter((key) => OCCASIONS.includes(key)),
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (!ALLOWED_ORIGINS.has(origin)) return json(origin, 403, { error: "Origin not allowed." });
    if (request.method !== "POST") return json(origin, 400, { error: "POST only." });

    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_BODY) return json(origin, 413, { error: "Photo is too large." });

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return json(origin, 400, { error: "JSON only." });

    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY) return json(origin, 413, { error: "Photo is too large." });
      body = JSON.parse(text);
    } catch {
      return json(origin, 400, { error: "Bad JSON." });
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === "/analyze") {
        const image = String(body.image || "");
        const mimeType = body.mimeType === "image/png" || body.mimeType === "image/webp" ? body.mimeType : "image/jpeg";
        if (!image || image.length < 100) return json(origin, 400, { error: "Missing image." });
        const result = await callGemini(
          env,
          [
            { text: ANALYZE_PROMPT },
            { inline_data: { mime_type: mimeType, data: image } },
          ],
          ANALYZE_SCHEMA,
        );
        if (!result.ok) return json(origin, result.status, { error: result.error });
        return json(origin, 200, cleanAnalyze(result.data));
      }

      if (url.pathname === "/stylist") {
        const outfit = Array.isArray(body.outfit) ? body.outfit.slice(0, 8) : [];
        const context = body.context || {};
        const compact = JSON.stringify({ outfit, context }).slice(0, 4000);
        const result = await callGemini(
          env,
          [{ text: `${STYLIST_PROMPT}\n${compact}` }],
          {
            type: "object",
            properties: { note: { type: "string" } },
            required: ["note"],
          },
        );
        if (!result.ok) return json(origin, result.status, { error: result.error });
        return json(origin, 200, { note: String(result.data.note || "").slice(0, 240) });
      }

      return json(origin, 400, { error: "Unknown path." });
    } catch {
      return json(origin, 502, { error: "Worker failed." });
    }
  },
};

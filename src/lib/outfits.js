const RANGES = {
  office: [3, 4],
  casual_outing: [2, 2],
  college: [2, 2],
  date: [3, 3],
  party: [3, 3],
  wedding_function: [4, 5],
  festival_puja: [3, 4],
  travel: [2, 2],
  gym_sports: [1, 1],
  formal_event: [5, 5],
  home_relax: [1, 1],
};

const LABELS = {
  office: "office",
  casual_outing: "a casual outing",
  college: "college",
  date: "a date",
  party: "a party",
  wedding_function: "a wedding",
  festival_puja: "a festival",
  travel: "travel",
  gym_sports: "the gym",
  formal_event: "a formal event",
  home_relax: "home",
};

const NEUTRAL = new Set(["black", "white", "grey", "gray", "navy", "beige", "brown", "olive", "cream", "khaki"]);
const LOUD = new Set(["red", "orange", "yellow", "pink", "purple", "maroon"]);

export function comboKey(ids) {
  return [...ids].map(String).sort().join("-");
}

function dayJitter(dayKey, key) {
  const text = `${dayKey}|${key}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  return hash % 5;
}

function eligible(item, occasion) {
  const [lo, hi] = RANGES[occasion] || [2, 3];
  const tagged = (item.occasions || []).includes(occasion);
  const formality = Number(item.formality || 3);
  return tagged || (formality >= lo - 1 && formality <= hi + 1);
}

function shoeBlocked(shoe, occasion) {
  const type = `${shoe.type || ""} ${shoe.name || ""}`.toLowerCase();
  const sporty = /sneaker|trainer|sport|running/.test(type);
  const formal = /loafer|oxford|formal|heel|derby/.test(type);
  if ((occasion === "office" || occasion === "formal_event" || occasion === "wedding_function") && sporty) return true;
  if (occasion === "gym_sports" && formal && !sporty) return true;
  return false;
}

function preScore(item, ctx) {
  let score = 0;
  if ((item.occasions || []).includes(ctx.occasion)) score += 6;
  const [lo, hi] = RANGES[ctx.occasion] || [2, 3];
  score -= Math.abs((item.formality || 3) - (lo + hi) / 2) * 2;
  if (ctx.weather.temp >= 30 && (item.warmth || 3) <= 2) score += 4;
  if (ctx.weather.temp <= 18 && (item.warmth || 3) >= 3) score += 4;
  if (item.favourite) score += 3;
  return score;
}

function topN(list, ctx, n) {
  return [...list].sort((a, b) => preScore(b, ctx) - preScore(a, ctx)).slice(0, n);
}

function harmony(items) {
  const names = items.flatMap((item) => item.colors || []).map((name) => String(name).toLowerCase());
  const loud = [...new Set(names.filter((name) => LOUD.has(name)))];
  if (loud.length >= 2) return -12;
  if (names.every((name) => NEUTRAL.has(name) || name === "")) return 6;
  return 2;
}

function scoreOutfit(parts, ctx) {
  const bits = parts.filter(Boolean);
  let score = 40;
  const [lo, hi] = RANGES[ctx.occasion] || [2, 3];
  const mid = (lo + hi) / 2;
  for (const item of bits) {
    if ((item.occasions || []).includes(ctx.occasion)) score += 8;
    score -= Math.abs((item.formality || 3) - mid) * 3;
    if (item.favourite) score += 4;
  }
  const cloth = bits.filter((item) => item.kind === "top" || item.kind === "ethnic" || item.kind === "one_piece");
  for (const item of cloth) {
    if (ctx.weather.temp >= 30) {
      if ((item.warmth || 3) <= 2) score += 8;
      if ((item.warmth || 3) >= 4) score -= 12;
      if (item.material === "wool") score -= 10;
      if (item.material === "linen" || item.material === "cotton") score += 6;
    }
    if (ctx.weather.temp <= 18 && (item.warmth || 3) >= 3) score += 5;
  }
  const layer = bits.find((item) => item.kind === "layer");
  if (ctx.weather.temp <= 18) score += layer && (layer.warmth || 3) >= 3 ? 10 : -8;
  if (ctx.weather.temp >= 30 && layer) score -= 15;

  const shoe = bits.find((item) => item.kind === "footwear");
  if (shoe && ctx.weather.rain >= 50) {
    const text = `${shoe.type} ${shoe.material} ${(shoe.colors || []).join(" ")} ${shoe.name}`.toLowerCase();
    if (/leather|suede|white|sandal/.test(text)) score -= 14;
    else score += 6;
  }
  if (shoe && (ctx.occasion === "office" || ctx.occasion === "formal_event" || ctx.occasion === "wedding_function")) {
    const type = `${shoe.type || ""}`.toLowerCase();
    if (/sneaker|trainer|sport/.test(type)) score -= 16;
  }
  if (shoe && ctx.occasion === "gym_sports") {
    const type = `${shoe.type || ""}`.toLowerCase();
    if (/sneaker|trainer|sport/.test(type)) score += 10;
    if (/loafer|oxford|formal/.test(type)) score -= 10;
  }

  score += harmony(bits);
  const loudPattern = bits.filter((item) => item.pattern && item.pattern !== "solid" && item.pattern !== "textured");
  if (loudPattern.length > 1) score -= 10;

  for (const item of bits) {
    if (!item.lastWornAt) continue;
    const days = (ctx.now - item.lastWornAt) / 86400000;
    if (days < 1) score -= 18;
    else if (days < 3) score -= 8;
  }

  const key = comboKey(bits.map((item) => item.id));
  const feedback = (ctx.feedback || []).find((row) => row.comboKey === key);
  if (feedback?.verdict === "skip") score -= 25;
  if (feedback?.verdict === "like") score += 8;
  score += dayJitter(ctx.dayKey, key);
  return score;
}

export function explain(parts, weather, occasion) {
  const bits = [];
  if (weather.temp >= 30) bits.push(`Light clothes for ${Math.round(weather.temp)}C`);
  else if (weather.temp <= 18) bits.push(`Layer for ${Math.round(weather.temp)}C`);
  else bits.push(`${Math.round(weather.temp)}C`);
  if (weather.rain >= 50) bits.push("closed shoes for rain");
  const neutrals = parts.filter(Boolean).flatMap((item) => item.colors || []).map((c) => c.toLowerCase());
  if (neutrals.length && neutrals.every((name) => NEUTRAL.has(name))) bits.push("neutral colours");
  bits.push(`right for ${LABELS[occasion] || occasion}`);
  return bits.join(", ");
}

function missingLine(items, occasion) {
  const ready = items.filter((item) => eligible(item, occasion));
  const shoes = ready.filter((item) => item.kind === "footwear");
  const tops = ready.filter((item) => item.kind === "top" || item.kind === "ethnic" || item.kind === "one_piece");
  if (!tops.length) return "Add a shirt, kurta, or dress to get outfits.";
  if (!shoes.length) {
    if (occasion === "office" || occasion === "formal_event" || occasion === "wedding_function") {
      return "Add formal shoes to get office outfits.";
    }
    return "Add shoes to get complete outfits.";
  }
  if ((occasion === "office" || occasion === "formal_event") && shoes.every((shoe) => shoeBlocked(shoe, occasion))) {
    return "Add formal shoes to get office outfits.";
  }
  return "";
}

function pin(list, locked, kinds) {
  if (!locked || !kinds.includes(locked.kind)) return list;
  return [locked, ...list.filter((item) => item.id !== locked.id)];
}

function buildCandidates(pool, ctx) {
  const locked = ctx.locked;
  const tops = pin(topN(pool.filter((item) => item.kind === "top"), ctx, 6), locked, ["top"]);
  const bottoms = pin(topN(pool.filter((item) => item.kind === "bottom"), ctx, 5), locked, ["bottom"]);
  const ethnic = pin(topN(pool.filter((item) => item.kind === "ethnic"), ctx, 4), locked, ["ethnic"]);
  const dresses = pin(topN(pool.filter((item) => item.kind === "one_piece"), ctx, 4), locked, ["one_piece"]);
  const shoes = pin(
    topN(
      pool.filter((item) => item.kind === "footwear" && (!shoeBlocked(item, ctx.occasion) || item.id === locked?.id)),
      ctx,
      4,
    ),
    locked,
    ["footwear"],
  );
  const layerPool = ctx.weather.temp <= 18 || locked?.kind === "layer"
    ? topN(pool.filter((item) => item.kind === "layer"), ctx, 2)
    : [];
  const layers = pin(layerPool, locked, ["layer"]);
  const watches = pin(topN(pool.filter((item) => item.kind === "watch"), ctx, 1), locked, ["watch"]);
  const watch = watches[0] || null;
  const out = [];

  const push = (parts) => {
    let bits = parts.filter(Boolean);
    if (locked && !bits.some((item) => item.id === locked.id)) {
      if (["accessory", "bag", "other", "watch"].includes(locked.kind)) bits = [...bits, locked];
      else return;
    }
    if (bits.length < 2) return;
    const core = bits.find((item) => !locked || item.id !== locked.id) || bits[0];
    out.push({
      itemIds: bits.map((item) => item.id),
      items: bits,
      score: scoreOutfit(bits, ctx),
      coreId: core.id,
      reason: explain(bits, ctx.weather, ctx.occasion),
    });
  };

  for (const top of tops) {
    for (const bottom of bottoms) {
      if (!shoes.length) push([top, bottom, layers[0], watch]);
      for (const shoe of shoes) push([top, bottom, shoe, layers[0], watch]);
    }
  }
  for (const piece of ethnic) {
    for (const bottom of bottoms) {
      for (const shoe of shoes.length ? shoes : [null]) push([piece, bottom, shoe, watch]);
    }
  }
  for (const dress of dresses) {
    for (const shoe of shoes.length ? shoes : [null]) push([dress, shoe, layers[0], watch]);
  }
  return out;
}

const REPORT = ["office", "casual_outing", "wedding_function", "gym_sports", "festival_puja", "travel", "formal_event"];

export function closetReport(items, weather) {
  return REPORT.map((occasion) => {
    const result = suggest({ items, occasion, weather: weather || { temp: 28, rain: 0 }, dayKey: "report" });
    let status = "Covered";
    if (!result.outfits.length) status = "Missing";
    else if (result.outfits.length < 2 || result.missing) status = "Thin";
    return { occasion, status, count: result.outfits.length, missing: result.missing };
  });
}

export function suggest({ items, occasion, weather, wearLog = [], feedback = [], now = Date.now(), dayKey = "", lockedId = null }) {
  const safeWeather = {
    temp: Number(weather?.temp ?? 28),
    feels: Number(weather?.feels ?? weather?.temp ?? 28),
    rain: Number(weather?.rain ?? 0),
  };
  const all = items || [];
  const locked = lockedId == null ? null : all.find((item) => item.id === lockedId) || null;
  if (locked?.laundry) return { outfits: [], missing: "That piece is in the wash." };
  const available = all.filter((item) => !item.laundry);
  const ctx = {
    occasion,
    weather: safeWeather,
    wearLog,
    feedback,
    now,
    dayKey: dayKey || String(new Date(now).toDateString()),
    locked,
  };
  const pool = available.filter((item) => eligible(item, occasion) || item.id === lockedId);
  const missing = missingLine(available, occasion);
  const ranked = buildCandidates(pool, ctx).sort((a, b) => b.score - a.score);
  const picked = [];
  const used = new Set();
  for (const outfit of ranked) {
    if (used.has(outfit.coreId)) continue;
    used.add(outfit.coreId);
    picked.push(outfit);
    if (picked.length === 3) break;
  }
  const hasShoes = picked.some((outfit) => outfit.items.some((item) => item.kind === "footwear"));
  return { outfits: picked, missing: picked.length && hasShoes ? "" : missing };
}

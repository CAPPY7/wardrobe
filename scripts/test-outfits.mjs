import assert from "node:assert/strict";
import test from "node:test";
import { suggest } from "../src/lib/outfits.js";

const day = "2026-10-29";
const now = Date.parse("2026-10-29T12:00:00Z");

function item(partial) {
  return {
    colors: ["navy"],
    pattern: "solid",
    material: "cotton",
    seasons: ["all"],
    formality: 3,
    warmth: 3,
    occasions: [],
    favourite: false,
    lastWornAt: null,
    ...partial,
  };
}

const closet = [
  item({ id: 1, kind: "top", name: "White linen shirt", type: "shirt", colors: ["white"], material: "linen", warmth: 1, formality: 3, occasions: ["office", "casual_outing"] }),
  item({ id: 2, kind: "top", name: "Wool sweater", type: "sweater", colors: ["grey"], material: "wool", warmth: 5, formality: 3, occasions: ["office"] }),
  item({ id: 3, kind: "top", name: "Black gym tee", type: "t-shirt", colors: ["black"], material: "synthetic", warmth: 1, formality: 1, occasions: ["gym_sports"] }),
  item({ id: 4, kind: "bottom", name: "Olive chinos", type: "chinos", colors: ["olive"], warmth: 2, formality: 3, occasions: ["office", "casual_outing"] }),
  item({ id: 5, kind: "bottom", name: "Track pants", type: "track pants", colors: ["black"], material: "synthetic", warmth: 2, formality: 1, occasions: ["gym_sports"] }),
  item({ id: 6, kind: "footwear", name: "Brown loafers", type: "loafers", colors: ["brown"], material: "leather", formality: 4, occasions: ["office", "formal_event"] }),
  item({ id: 7, kind: "footwear", name: "White sneakers", type: "sneakers", colors: ["white"], material: "synthetic", formality: 1, occasions: ["gym_sports", "casual_outing"] }),
  item({ id: 8, kind: "layer", name: "Grey blazer", type: "blazer", colors: ["grey"], material: "wool", warmth: 3, formality: 4, occasions: ["office"] }),
  item({ id: 9, kind: "ethnic", name: "Navy kurta", type: "kurta", colors: ["navy"], material: "cotton", warmth: 2, formality: 3, occasions: ["festival_puja", "casual_outing"] }),
];

function firstTop(result) {
  return result.outfits[0]?.items.find((piece) => piece.kind === "top" || piece.kind === "ethnic" || piece.kind === "one_piece");
}

test("hot office prefers linen over wool", () => {
  const result = suggest({ items: closet, occasion: "office", weather: { temp: 34, rain: 0 }, now, dayKey: day });
  assert.equal(firstTop(result)?.id, 1);
  assert.equal(result.outfits[0].items.some((piece) => piece.id === 2), false);
});

test("gym uses sneakers not loafers", () => {
  const result = suggest({ items: closet, occasion: "gym_sports", weather: { temp: 30, rain: 0 }, now, dayKey: day });
  const shoe = result.outfits[0]?.items.find((piece) => piece.kind === "footwear");
  assert.equal(shoe?.id, 7);
});

test("cold office adds a warm layer", () => {
  const result = suggest({ items: closet, occasion: "office", weather: { temp: 12, rain: 10 }, now, dayKey: day });
  assert.equal(result.outfits[0].items.some((piece) => piece.kind === "layer"), true);
});

test("rain avoids white sneakers when loafers exist for office", () => {
  const result = suggest({ items: closet, occasion: "office", weather: { temp: 24, rain: 80 }, now, dayKey: day });
  const shoe = result.outfits[0]?.items.find((piece) => piece.kind === "footwear");
  assert.equal(shoe?.id, 6);
});

test("yesterday's shirt is not the first office top", () => {
  const worn = closet.map((piece) => (piece.id === 1 ? { ...piece, lastWornAt: now - 3 * 60 * 60 * 1000 } : piece));
  const extra = item({ id: 10, kind: "top", name: "Blue shirt", type: "shirt", colors: ["blue"], material: "cotton", warmth: 2, formality: 3, occasions: ["office"] });
  const result = suggest({ items: [...worn, extra], occasion: "office", weather: { temp: 26, rain: 0 }, now, dayKey: day });
  assert.notEqual(firstTop(result)?.id, 1);
});

test("a skipped combo is not the first suggestion", () => {
  const result = suggest({
    items: closet,
    occasion: "office",
    weather: { temp: 33, rain: 0 },
    feedback: [{ comboKey: "1-4-6", verdict: "skip" }],
    now,
    dayKey: day,
  });
  assert.notEqual(result.outfits[0].itemIds.slice().sort().join("-"), "1-4-6");
});

test("three outfits use different core pieces when the closet allows it", () => {
  const more = [
    ...closet,
    item({ id: 11, kind: "top", name: "Checked shirt", type: "shirt", colors: ["navy"], pattern: "checked", warmth: 2, formality: 3, occasions: ["office", "casual_outing"] }),
    item({ id: 12, kind: "one_piece", name: "Black dress", type: "dress", colors: ["black"], warmth: 2, formality: 3, occasions: ["date", "party"] }),
  ];
  const result = suggest({ items: more, occasion: "casual_outing", weather: { temp: 27, rain: 0 }, now, dayKey: day });
  const cores = result.outfits.map((outfit) => outfit.coreId);
  assert.equal(new Set(cores).size, cores.length);
  assert.ok(cores.length >= 2);
});

test("office does not suggest sneakers when loafers exist", () => {
  const result = suggest({ items: closet, occasion: "office", weather: { temp: 26, rain: 0 }, now, dayKey: day });
  assert.equal(result.outfits.some((outfit) => outfit.items.some((piece) => piece.id === 7)), false);
});

test("a shirt in the wash is not suggested", () => {
  const washed = closet.map((piece) => (piece.id === 1 ? { ...piece, laundry: true } : piece));
  const result = suggest({ items: washed, occasion: "office", weather: { temp: 34, rain: 0 }, now, dayKey: day });
  assert.equal(result.outfits.some((outfit) => outfit.items.some((piece) => piece.id === 1)), false);
});

test("wear with this keeps the chosen piece", () => {
  const result = suggest({ items: closet, occasion: "office", weather: { temp: 34, rain: 0 }, now, dayKey: day, lockedId: 2 });
  assert.ok(result.outfits.length > 0);
  assert.ok(result.outfits.every((outfit) => outfit.items.some((piece) => piece.id === 2)));
});

test("missing shoes are called out", () => {
  const noShoes = closet.filter((piece) => piece.kind !== "footwear");
  const result = suggest({ items: noShoes, occasion: "office", weather: { temp: 28, rain: 0 }, now, dayKey: day });
  assert.match(result.missing, /shoe/i);
});

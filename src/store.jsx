import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildBackup, importBackup } from "./lib/backup.js";
import { analyzePhoto } from "./lib/ai.js";
import { colorsFromCanvas, hexDistance } from "./lib/colors.js";
import { WORKER_URL } from "./lib/config.js";
import { dHash, hamming } from "./lib/hash.js";
import { preparePhoto } from "./lib/imageTools.js";
import { db, loadSettings, saveSettings } from "./db/db.js";
import { fetchForecast } from "./lib/weather.js";

const WardrobeContext = createContext(null);
const locks = new Set();

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

async function paintSample(label, hexColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e7e1d6";
  ctx.fillRect(0, 0, 480, 640);
  ctx.fillStyle = hexColor;
  ctx.fillRect(110, 80, 260, 460);
  ctx.fillStyle = "#1c1916";
  ctx.font = "28px sans-serif";
  ctx.fillText(label, 40, 40);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  return blob;
}

const SAMPLES = [
  { clientKey: "sample-linen", kind: "top", type: "shirt", name: "White linen shirt", colors: ["white"], dominantHex: "#f4f4f4", pattern: "solid", material: "linen", seasons: ["summer"], formality: 3, warmth: 1, occasions: ["office", "casual_outing"], hex: "#f7f7f2" },
  { clientKey: "sample-checked", kind: "top", type: "shirt", name: "Navy checked shirt", colors: ["navy"], dominantHex: "#1b2a4a", pattern: "checked", material: "cotton", seasons: ["all"], formality: 3, warmth: 2, occasions: ["office", "casual_outing"], hex: "#1b2a4a" },
  { clientKey: "sample-tee", kind: "top", type: "t-shirt", name: "Black gym tee", colors: ["black"], dominantHex: "#1a1a1a", pattern: "solid", material: "synthetic", seasons: ["summer"], formality: 1, warmth: 1, occasions: ["gym_sports", "home_relax"], hex: "#222" },
  { clientKey: "sample-chinos", kind: "bottom", type: "chinos", name: "Olive chinos", colors: ["olive"], dominantHex: "#5c6b3a", pattern: "solid", material: "cotton", seasons: ["all"], formality: 3, warmth: 2, occasions: ["office", "casual_outing"], hex: "#5c6b3a" },
  { clientKey: "sample-jeans", kind: "bottom", type: "jeans", name: "Dark jeans", colors: ["navy"], dominantHex: "#1c2430", pattern: "solid", material: "denim", seasons: ["all"], formality: 2, warmth: 3, occasions: ["casual_outing", "college", "travel"], hex: "#243044" },
  { clientKey: "sample-trousers", kind: "bottom", type: "trousers", name: "Black trousers", colors: ["black"], dominantHex: "#1a1a1a", pattern: "solid", material: "wool", seasons: ["winter"], formality: 4, warmth: 3, occasions: ["office", "formal_event"], hex: "#111" },
  { clientKey: "sample-kurta", kind: "ethnic", type: "kurta", name: "Navy kurta", colors: ["navy"], dominantHex: "#1b2a4a", pattern: "solid", material: "cotton", seasons: ["all"], formality: 3, warmth: 2, occasions: ["festival_puja", "casual_outing", "wedding_function"], hex: "#24325a" },
  { clientKey: "sample-loafers", kind: "footwear", type: "loafers", name: "Brown loafers", colors: ["brown"], dominantHex: "#6b4423", pattern: "solid", material: "leather", seasons: ["all"], formality: 4, warmth: 2, occasions: ["office", "formal_event", "wedding_function"], hex: "#6b4423" },
  { clientKey: "sample-sneakers", kind: "footwear", type: "sneakers", name: "White sneakers", colors: ["white"], dominantHex: "#f4f4f4", pattern: "solid", material: "synthetic", seasons: ["all"], formality: 1, warmth: 2, occasions: ["gym_sports", "casual_outing", "travel"], hex: "#eeeeee" },
  { clientKey: "sample-blazer", kind: "layer", type: "blazer", name: "Grey blazer", colors: ["grey"], dominantHex: "#8d8d8d", pattern: "solid", material: "wool", seasons: ["winter"], formality: 4, warmth: 4, occasions: ["office", "formal_event"], hex: "#8a8f99" },
];

export function WardrobeProvider({ children }) {
  const [booted, setBooted] = useState(false);
  const [items, setItems] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [wearLog, setWearLog] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [settings, setSettings] = useState(null);
  const [job, setJob] = useState("");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  async function refresh() {
    const [nextItems, nextOutfits, nextLog, nextFeedback, nextSettings] = await Promise.all([
      db.items.orderBy("id").reverse().toArray(),
      db.outfits.orderBy("id").reverse().toArray(),
      db.wearLog.orderBy("id").reverse().toArray(),
      db.feedback.toArray(),
      loadSettings(),
    ]);
    setItems(nextItems);
    setOutfits(nextOutfits);
    setWearLog(nextLog);
    setFeedback(nextFeedback);
    setSettings(nextSettings);
  }

  useEffect(() => {
    let stop = false;
    (async () => {
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      await refresh();
      if (!stop) setBooted(true);
    })();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      stop = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!booted || !settings?.lat || settings.debugWeather !== "off") return;
    fetchForecast(settings.lat, settings.lon)
      .then((weather) => updateSettings({ weatherCache: weather }))
      .catch(() => {});
  }, [booted, settings?.lat, settings?.lon]);

  useEffect(() => {
    if (!booted) return;
    for (const item of items) {
      if (item.status === "pending_analysis") processItem(item.id);
    }
  }, [booted]);

  async function updateSettings(patch) {
    const next = { ...(settings || (await loadSettings())), ...patch, key: "app" };
    await saveSettings(next);
    setSettings(next);
  }

  function workerUrl() {
    return (settings?.workerUrl || WORKER_URL).replace(/\/$/, "");
  }

  function findDuplicate(phash, kind, dominantHex) {
    return items.find((item) => item.kind === kind && item.phash && hamming(item.phash, phash) <= 10 && hexDistance(item.dominantHex, dominantHex) < 48);
  }

  async function savePhoto({ blob, kind, force = false }) {
    setJob("Cleaning photo...");
    const prepared = await preparePhoto(blob);
    const colours = colorsFromCanvas(prepared.cleaned);
    const phash = dHash(prepared.cleaned);
    const duplicate = findDuplicate(phash, kind, colours.dominantHex);
    if (duplicate && !force) {
      setJob("");
      return { duplicate, prepared, colours, phash, kind };
    }
    const id = await db.items.add({
      createdAt: Date.now(),
      clientKey: `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      imageBlob: prepared.imageBlob,
      thumbBlob: prepared.thumbBlob,
      jpegBlob: prepared.jpegBlob,
      status: "pending_analysis",
      kind,
      type: "item",
      name: "New item",
      colors: colours.names,
      dominantHex: colours.dominantHex,
      secondaryHex: colours.secondaryHex,
      pattern: "other",
      material: "unknown",
      seasons: ["all"],
      formality: 3,
      warmth: 3,
      occasions: [],
      confidence: 0,
      timesWorn: 0,
      lastWornAt: null,
      favourite: false,
      notes: "",
      advice: "",
      phash,
      cleaned: prepared.removed,
    });
    await refresh();
    processItem(id);
    return { id };
  }

  async function processItem(id) {
    if (locks.has(id)) return;
    locks.add(id);
    try {
      const item = await db.items.get(id);
      if (!item || item.status === "ready") return;
      if (!online) return;
      setJob("Reading details...");
      const tags = await analyzePhoto(workerUrl(), item.jpegBlob || item.imageBlob, item.kind);
      const low = !tags.valid || tags.confidence < 0.6 || tags.usable === false;
      await db.items.update(id, {
        ...tags,
        colors: tags.colors.length ? tags.colors : item.colors,
        status: low ? "needs_review" : "ready",
        jpegBlob: null,
      });
      setJob("");
      await refresh();
    } catch {
      setJob("");
      await db.items.update(id, { status: "pending_analysis" });
      await refresh();
    } finally {
      locks.delete(id);
    }
  }

  async function retryPending() {
    const pending = await db.items.where("status").equals("pending_analysis").toArray();
    for (const item of pending) processItem(item.id);
    return pending.length;
  }

  async function updateItem(id, patch) {
    await db.items.update(id, patch);
    await refresh();
  }

  async function deleteItem(id) {
    await db.items.delete(id);
    await refresh();
  }

  async function wear(outfit, occasion, weatherSummary) {
    const createdAt = Date.now();
    const outfitId = await db.outfits.add({
      createdAt,
      itemIds: outfit.itemIds,
      occasion,
      weatherSummary,
      source: "suggested",
      liked: null,
    });
    await db.wearLog.add({ date: todayKey(), outfitId, itemIds: outfit.itemIds, occasion });
    for (const itemId of outfit.itemIds) {
      const item = await db.items.get(itemId);
      if (!item) continue;
      await db.items.update(itemId, { timesWorn: (item.timesWorn || 0) + 1, lastWornAt: createdAt });
    }
    await refresh();
  }

  async function feedbackOn(itemIds, verdict) {
    const comboKey = [...itemIds].map(String).sort().join("-");
    const existing = await db.feedback.where("comboKey").equals(comboKey).first();
    if (existing) await db.feedback.update(existing.id, { verdict, at: Date.now() });
    else await db.feedback.add({ comboKey, verdict, at: Date.now() });
    await refresh();
  }

  async function addSamples() {
    const existing = new Set((await db.items.toArray()).map((item) => item.clientKey));
    let added = 0;
    for (const sample of SAMPLES) {
      if (existing.has(sample.clientKey)) continue;
      const blob = await paintSample(sample.name, sample.hex);
      const { hex, ...rest } = sample;
      await db.items.add({
        ...rest,
        createdAt: Date.now(),
        imageBlob: blob,
        thumbBlob: blob,
        status: "ready",
        confidence: 0.9,
        timesWorn: 0,
        lastWornAt: null,
        favourite: false,
        notes: "Sample piece",
        secondaryHex: rest.dominantHex,
        advice: "",
        phash: "",
      });
      added += 1;
    }
    await refresh();
    return added;
  }

  async function exportBackup() {
    const payload = await buildBackup(db);
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wardrobe-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackupFile(file) {
    const added = await importBackup(db, file);
    await refresh();
    return `Imported ${added} new pieces.`;
  }

  async function deleteAll() {
    await db.items.clear();
    await db.outfits.clear();
    await db.wearLog.clear();
    await db.feedback.clear();
    await refresh();
  }

  const value = useMemo(
    () => ({
      booted,
      items,
      outfits,
      wearLog,
      feedback,
      settings,
      job,
      online,
      updateSettings,
      savePhoto,
      updateItem,
      deleteItem,
      wear,
      feedbackOn,
      addSamples,
      exportBackup,
      importBackupFile,
      deleteAll,
      retryPending,
    }),
    [booted, items, outfits, wearLog, feedback, settings, job, online],
  );

  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe() {
  const value = useContext(WardrobeContext);
  if (!value) throw new Error("useWardrobe outside provider");
  return value;
}

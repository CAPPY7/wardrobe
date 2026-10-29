function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read a photo."));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(value) {
  if (!value) return null;
  const [header, data] = String(value).split(",");
  const mime = (header.match(/data:(.*?);/) || [])[1] || "image/webp";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function buildBackup(db) {
  const [items, outfits, wearLog, feedback, settings] = await Promise.all([
    db.items.toArray(),
    db.outfits.toArray(),
    db.wearLog.toArray(),
    db.feedback.toArray(),
    db.settings.toArray(),
  ]);
  const packed = [];
  for (const item of items) {
    const { imageBlob, thumbBlob, jpegBlob, ...rest } = item;
    packed.push({
      ...rest,
      imageBlob: imageBlob ? await blobToDataUrl(imageBlob) : null,
      thumbBlob: thumbBlob ? await blobToDataUrl(thumbBlob) : null,
    });
  }
  return { version: 1, exportedAt: new Date().toISOString(), items: packed, outfits, wearLog, feedback, settings };
}

function remapCombo(comboKey, idMap) {
  const parts = String(comboKey || "").split("-").filter(Boolean);
  const next = [];
  for (const part of parts) {
    const id = idMap.get(Number(part));
    if (id == null) return "";
    next.push(String(id));
  }
  return next.sort().join("-");
}

export async function importBackup(db, file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.items)) throw new Error("That file is not a Wardrobe backup.");
  const existing = await db.items.toArray();
  const keys = new Set(existing.map((item) => item.clientKey).filter(Boolean));
  const idMap = new Map();
  let added = 0;
  for (const item of data.items) {
    if (item.clientKey && keys.has(item.clientKey)) {
      const found = existing.find((row) => row.clientKey === item.clientKey);
      if (found) idMap.set(item.id, found.id);
      continue;
    }
    const { id, imageBlob, thumbBlob, jpegBlob, ...rest } = item;
    let image;
    let thumb;
    try {
      image = dataUrlToBlob(imageBlob);
      thumb = dataUrlToBlob(thumbBlob);
    } catch {
      continue;
    }
    const newId = await db.items.add({ ...rest, imageBlob: image, thumbBlob: thumb });
    idMap.set(id, newId);
    if (item.clientKey) keys.add(item.clientKey);
    added += 1;
  }

  const outfitSeen = new Set((await db.outfits.toArray()).map((row) => `${row.createdAt}|${[...row.itemIds].map(String).sort().join("-")}`));
  for (const outfit of data.outfits || []) {
    const itemIds = (outfit.itemIds || []).map((id) => idMap.get(id)).filter((id) => id != null);
    if (itemIds.length < 2) continue;
    const key = `${outfit.createdAt}|${itemIds.map(String).sort().join("-")}`;
    if (outfitSeen.has(key)) continue;
    const { id, ...rest } = outfit;
    await db.outfits.add({ ...rest, itemIds });
    outfitSeen.add(key);
  }

  const logSeen = new Set((await db.wearLog.toArray()).map((row) => `${row.date}|${[...(row.itemIds || [])].map(String).sort().join("-")}`));
  for (const entry of data.wearLog || []) {
    const itemIds = (entry.itemIds || []).map((id) => idMap.get(id)).filter((id) => id != null);
    if (!itemIds.length) continue;
    const key = `${entry.date}|${itemIds.map(String).sort().join("-")}`;
    if (logSeen.has(key)) continue;
    const { id, outfitId, ...rest } = entry;
    await db.wearLog.add({ ...rest, itemIds });
    logSeen.add(key);
  }

  for (const row of data.feedback || []) {
    const comboKey = remapCombo(row.comboKey, idMap);
    if (!comboKey) continue;
    const existingRow = await db.feedback.where("comboKey").equals(comboKey).first();
    if (existingRow) continue;
    await db.feedback.add({ comboKey, verdict: row.verdict === "like" ? "like" : "skip", at: row.at || Date.now() });
  }
  return added;
}

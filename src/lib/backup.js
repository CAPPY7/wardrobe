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
    packed.push({
      ...item,
      imageBlob: item.imageBlob ? await blobToDataUrl(item.imageBlob) : null,
      thumbBlob: item.thumbBlob ? await blobToDataUrl(item.thumbBlob) : null,
    });
  }
  return { version: 1, exportedAt: new Date().toISOString(), items: packed, outfits, wearLog, feedback, settings };
}

export async function importBackup(db, file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.items)) throw new Error("That file is not a Wardrobe backup.");
  const existing = await db.items.toArray();
  const keys = new Set(existing.map((item) => item.clientKey).filter(Boolean));
  let added = 0;
  for (const item of data.items) {
    if (item.clientKey && keys.has(item.clientKey)) continue;
    const { id, imageBlob, thumbBlob, ...rest } = item;
    await db.items.add({
      ...rest,
      imageBlob: dataUrlToBlob(imageBlob),
      thumbBlob: dataUrlToBlob(thumbBlob),
    });
    if (item.clientKey) keys.add(item.clientKey);
    added += 1;
  }
  return added;
}

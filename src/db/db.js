import Dexie from "dexie";
import { DEFAULT_SETTINGS } from "../lib/constants.js";

export const db = new Dexie("wardrobe");

db.version(1).stores({
  items: "++id, kind, status, clientKey, lastWornAt",
  outfits: "++id, createdAt",
  wearLog: "++id, date",
  feedback: "++id, comboKey",
  settings: "key",
});

export async function loadSettings() {
  const row = await db.settings.get("app");
  return { ...DEFAULT_SETTINGS, ...(row || {}), key: "app" };
}

export async function saveSettings(next) {
  await db.settings.put({ ...next, key: "app" });
}

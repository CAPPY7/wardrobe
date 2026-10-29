const fromEnv = import.meta.env.VITE_WORKER_URL || "https://wardrobe-proxy.pervertonichan.workers.dev";

export const WORKER_URL = String(fromEnv).replace(/\/$/, "");

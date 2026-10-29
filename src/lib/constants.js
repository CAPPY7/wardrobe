export const APP_VERSION = "1.0.0";

export const KINDS = ["top", "bottom", "one_piece", "ethnic", "layer", "footwear", "watch", "accessory", "bag", "other"];

export const KIND_LABEL = {
  top: "Top",
  bottom: "Bottom",
  one_piece: "One piece",
  ethnic: "Ethnic",
  layer: "Layer",
  footwear: "Shoes",
  watch: "Watch",
  accessory: "Accessory",
  bag: "Bag",
  other: "Other",
};

export const OCCASIONS = [
  { key: "office", label: "Office", formality: [3, 4] },
  { key: "casual_outing", label: "Casual", formality: [2, 2] },
  { key: "college", label: "College", formality: [2, 2] },
  { key: "date", label: "Date", formality: [3, 3] },
  { key: "party", label: "Party", formality: [3, 3] },
  { key: "wedding_function", label: "Wedding", formality: [4, 5] },
  { key: "festival_puja", label: "Festival", formality: [3, 4] },
  { key: "travel", label: "Travel", formality: [2, 2] },
  { key: "gym_sports", label: "Gym", formality: [1, 1] },
  { key: "formal_event", label: "Formal", formality: [5, 5] },
  { key: "home_relax", label: "Home", formality: [1, 1] },
];

export const OCCASION_MAP = Object.fromEntries(OCCASIONS.map((item) => [item.key, item]));

export const PATTERNS = ["solid", "striped", "checked", "printed", "floral", "textured", "other"];
export const MATERIALS = ["cotton", "denim", "linen", "wool", "leather", "synthetic", "silk", "knit", "unknown"];
export const SEASONS = ["summer", "monsoon", "winter", "all"];

export const COLOR_NAMES = [
  ["black", "#1a1a1a"],
  ["white", "#f4f4f4"],
  ["grey", "#8d8d8d"],
  ["navy", "#1b2a4a"],
  ["blue", "#2f5fbf"],
  ["brown", "#6b4423"],
  ["beige", "#d7c4a3"],
  ["olive", "#5c6b3a"],
  ["green", "#2f7d4a"],
  ["red", "#b4232a"],
  ["maroon", "#6e1e2a"],
  ["pink", "#e7a1b5"],
  ["yellow", "#e2c044"],
  ["orange", "#e07a2f"],
  ["purple", "#6a3d8a"],
];

export const SHOOTS = [
  { id: "top", label: "Top", kind: "top", guide: "Lay flat on a plain bed sheet or floor. Smooth out wrinkles. Whole item inside the frame. Shoot straight from above." },
  { id: "bottom", label: "Bottom", kind: "bottom", guide: "Fold in half lengthwise, lay flat, shoot straight from above, whole item in frame." },
  { id: "ethnic", label: "Ethnic wear", kind: "ethnic", guide: "Lay flat on a plain bed sheet or floor. Smooth out wrinkles. Whole item inside the frame. Shoot straight from above." },
  { id: "layer", label: "Layer / jacket", kind: "layer", guide: "Lay flat on a plain bed sheet or floor. Smooth out wrinkles. Whole item inside the frame. Shoot straight from above." },
  { id: "footwear", label: "Shoes", kind: "footwear", guide: "Place ONE shoe on the floor, side view, toes pointing right, whole shoe in frame. Take the other shoe only if the pair looks different." },
  { id: "watch", label: "Watch", kind: "watch", guide: "Place flat on a plain surface, dial facing the camera, straps straight, fill the frame." },
  { id: "bag", label: "Bag / accessory", kind: "accessory", guide: "Place on a plain surface, whole item in frame." },
];

export const SHOOT_ALWAYS = "Use daylight or a bright room. Plain, single-colour background. One item only. No hand or shadow over the item.";

export const DEFAULT_SETTINGS = {
  locationName: "",
  lat: null,
  lon: null,
  units: "C",
  aiNoteEnabled: true,
  onboardingDone: false,
  debugWeather: "off",
  weatherCache: null,
  workerUrl: "",
};

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project site. Repo name is the path.
const base = "/wardrobe/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Wardrobe",
        short_name: "Wardrobe",
        description: "Photograph a piece. The closet suggests what to wear.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f3eee6",
        theme_color: "#1f4a3a",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/screens.css";

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event("wardrobe-update"));
  },
});
window.__wardrobeUpdate = updateSW;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

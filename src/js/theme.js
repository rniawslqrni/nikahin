import { data } from "../assets/data/data.js";

export const THEMES = [
  { id: "classic",  name: "Klasik",   accent: "#1a1a1a", bg: "#f8f9fa" },
  { id: "rose",     name: "Rose",     accent: "#b76e79", bg: "#fdf7f8" },
  { id: "emerald",  name: "Emerald",  accent: "#2d6a4f", bg: "#f3faf5" },
  { id: "ocean",    name: "Ocean",    accent: "#1d5c99", bg: "#f2f7fd" },
  { id: "lavender", name: "Lavender", accent: "#7c5cbf", bg: "#f7f4fd" },
  { id: "gold",     name: "Emas",     accent: "#9a7b2d", bg: "#fdf9f0" },
];

// Terapkan tema pilihan user: preset via [data-theme], warna kustom via inline style.
export function applyTheme() {
  const t = (data && data.theme) || {};
  const preset = THEMES.find((x) => x.id === t.preset) || THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = preset.id;
  if (t.accent) root.style.setProperty("--theme-accent", t.accent);
  else root.style.removeProperty("--theme-accent");
  if (t.bg) root.style.setProperty("--bg-color", t.bg);
  else root.style.removeProperty("--bg-color");
}

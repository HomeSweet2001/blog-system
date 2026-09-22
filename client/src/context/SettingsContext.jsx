import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyTheme, setBaseTitle } from "../lib/theme.js";

const SettingsContext = createContext(null);

/**
 * Valores usados enquanto nenhum blog esta carregado (tela de login, por exemplo).
 * O blog selecionado substitui tudo isso via `setSettings`.
 */
const FALLBACK_SETTINGS = {
  blog_name: "Blog Platform",
  tagline: "",
  description: "",
  logo_url: null,
  favicon_url: null,
  banner_url: null,
  banner_title: "",
  banner_subtitle: "",
  banner_overlay: 0.45,
  primary_color: "#6366f1",
  secondary_color: "#0f172a",
  accent_color: "#f59e0b",
  text_color: "#1f2937",
  background_color: "#ffffff",
  surface_color: "#f8fafc",
  border_color: "#e5e7eb",
  heading_font: "Inter",
  body_font: "Inter",
  border_radius: 12,
  template: "classic",
  show_banner: true,
  show_sidebar: false,
  show_author: true,
  // URLs relativas ao blog: "" = inicio, "sobre" = /b/<slug>/sobre
  navbar: [
    { label: "Início", url: "" },
    { label: "Categorias", url: "categorias" },
    { label: "Sobre", url: "sobre" },
  ],
  footer_text: "",
  social_links: [],
  posts_per_page: 6,
  dark_mode: false,
  custom_css: "",
};

/**
 * Guarda a aparencia ATIVA (a do blog aberto) e aplica no tema.
 * Quem carrega e troca esses valores e o BlogProvider.
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);

  useEffect(() => {
    applyTheme(settings);
    setBaseTitle(settings.blog_name);
  }, [settings]);

  const value = useMemo(
    () => ({ settings, setSettings, fallback: FALLBACK_SETTINGS }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings deve ser usado dentro de SettingsProvider.");
  return ctx;
}

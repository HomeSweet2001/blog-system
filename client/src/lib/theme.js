/* ------------------------------------------------------------------
   Motor de temas: aplica as configuracoes salvas no painel como
   variaveis CSS, carrega as Google Fonts necessarias e gerencia o
   favicon / titulo do documento.
------------------------------------------------------------------- */

export const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Roboto',
  'Open Sans',
  'Nunito',
  'Raleway',
  'Work Sans',
  'DM Sans',
  'Space Grotesk',
  'Fira Sans',
  'Source Sans 3',
  'Lora',
  'Merriweather',
  'Playfair Display',
  'Bitter',
  'Libre Baskerville',
  'Cormorant Garamond',
  'Roboto Slab',
  'Caveat',
];

/** Fontes com pesos disponiveis no Google Fonts (ajuste fino do <link>). */
const SERIF_FONTS = new Set([
  'Lora',
  'Merriweather',
  'Playfair Display',
  'Bitter',
  'Libre Baskerville',
  'Cormorant Garamond',
  'Roboto Slab',
]);

export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classico',
    description: 'Lista em coluna unica com banner grande. Ideal para blogs de texto.',
  },
  {
    id: 'magazine',
    name: 'Revista',
    description: 'Destaque principal + grade de posts. Visual editorial e moderno.',
  },
  {
    id: 'grid',
    name: 'Grade',
    description: 'Cards uniformes em grade responsiva, foco em imagens.',
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Sem imagens grandes, tipografia limpa e muito espaco branco.',
  },
];

export const COLOR_PRESETS = [
  {
    id: 'indigo',
    name: 'Indigo',
    colors: {
      primary_color: '#6366f1',
      secondary_color: '#0f172a',
      accent_color: '#f59e0b',
      text_color: '#1f2937',
      background_color: '#ffffff',
      surface_color: '#f8fafc',
      border_color: '#e5e7eb',
    },
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    colors: {
      primary_color: '#10b981',
      secondary_color: '#064e3b',
      accent_color: '#f97316',
      text_color: '#1f2937',
      background_color: '#ffffff',
      surface_color: '#f0fdf4',
      border_color: '#d1fae5',
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    colors: {
      primary_color: '#ef4444',
      secondary_color: '#1f2937',
      accent_color: '#0ea5e9',
      text_color: '#27272a',
      background_color: '#ffffff',
      surface_color: '#fef2f2',
      border_color: '#fee2e2',
    },
  },
  {
    id: 'oceano',
    name: 'Oceano',
    colors: {
      primary_color: '#0284c7',
      secondary_color: '#0c4a6e',
      accent_color: '#22d3ee',
      text_color: '#1e293b',
      background_color: '#ffffff',
      surface_color: '#f0f9ff',
      border_color: '#e0f2fe',
    },
  },
  {
    id: 'roxo',
    name: 'Roxo',
    colors: {
      primary_color: '#9333ea',
      secondary_color: '#3b0764',
      accent_color: '#f472b6',
      text_color: '#27272a',
      background_color: '#ffffff',
      surface_color: '#faf5ff',
      border_color: '#f3e8ff',
    },
  },
  {
    id: 'noturno',
    name: 'Noturno',
    colors: {
      primary_color: '#818cf8',
      secondary_color: '#e2e8f0',
      accent_color: '#fbbf24',
      text_color: '#e2e8f0',
      background_color: '#0b1120',
      surface_color: '#131c31',
      border_color: '#243049',
    },
  },
  {
    id: 'papel',
    name: 'Papel',
    colors: {
      primary_color: '#b45309',
      secondary_color: '#292524',
      accent_color: '#78716c',
      text_color: '#292524',
      background_color: '#fffbf5',
      surface_color: '#f5f0e8',
      border_color: '#e7ded0',
    },
  },
  {
    id: 'mono',
    name: 'Monocromatico',
    colors: {
      primary_color: '#111827',
      secondary_color: '#111827',
      accent_color: '#6b7280',
      text_color: '#111827',
      background_color: '#ffffff',
      surface_color: '#f4f4f5',
      border_color: '#e4e4e7',
    },
  },
];

/* --------------------------- Google Fonts -------------------------- */

const loadedFonts = new Set();

function googleFontHref(font) {
  const family = font.replace(/\s+/g, '+');
  const weights = SERIF_FONTS.has(font) ? '400;600;700;800' : '300;400;500;600;700;800';
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

export function ensureFontLoaded(font) {
  if (!font || loadedFonts.has(font)) return;
  loadedFonts.add(font);

  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.gstatic.com';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontHref(font);
  document.head.appendChild(link);
}

/* ----------------------------- aplicacao ---------------------------- */

const CSS_VARS = {
  primary_color: '--c-primary',
  secondary_color: '--c-secondary',
  accent_color: '--c-accent',
  text_color: '--c-text',
  background_color: '--c-bg',
  surface_color: '--c-surface',
  border_color: '--c-border',
};

let customStyleEl = null;

export function applyTheme(settings) {
  if (!settings) return;
  const root = document.documentElement;

  for (const [field, variable] of Object.entries(CSS_VARS)) {
    const value = settings[field];
    if (value) root.style.setProperty(variable, value);
  }

  const radius = Number.isFinite(Number(settings.border_radius)) ? Number(settings.border_radius) : 12;
  root.style.setProperty('--radius', `${radius}px`);

  if (settings.heading_font) {
    ensureFontLoaded(settings.heading_font);
    root.style.setProperty('--font-heading', `'${settings.heading_font}', system-ui, sans-serif`);
  }
  if (settings.body_font) {
    ensureFontLoaded(settings.body_font);
    root.style.setProperty('--font-body', `'${settings.body_font}', system-ui, sans-serif`);
  }

  // Tema escuro: ajusta o brilho do texto secundario
  root.classList.toggle('theme-dark', Boolean(settings.dark_mode));

  // CSS personalizado do usuario
  if (!customStyleEl) {
    customStyleEl = document.createElement('style');
    customStyleEl.id = 'blog-custom-css';
    document.head.appendChild(customStyleEl);
  }
  customStyleEl.textContent = settings.custom_css || '';

  // Meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && settings.primary_color) meta.setAttribute('content', settings.primary_color);

  applyFavicon(settings.favicon_url, settings.blog_name);
  applyDocumentTitle(settings);
}

function applyFavicon(url, blogName) {
  const selector = 'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';
  document.querySelectorAll(selector).forEach((el) => el.remove());

  if (url) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    document.head.appendChild(link);
    return;
  }

  // Favicon gerado com a inicial do blog
  const initial = (blogName || 'B').trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '#6366f1'}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="700" fill="#fff">${initial}</text></svg>`;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  document.head.appendChild(link);
}

let baseTitle = '';

export function setBaseTitle(title) {
  baseTitle = title || '';
  document.title = baseTitle;
}

function applyDocumentTitle(settings) {
  baseTitle = settings.blog_name || '';
  if (document.title === 'Carregando...' || !document.title) {
    document.title = baseTitle;
  }
}

export function setPageTitle(pageTitle) {
  if (pageTitle) document.title = `${pageTitle} | ${baseTitle}`;
  else document.title = baseTitle;
}

/** Gera o texto de contraste (preto/branco) para um fundo. */
export function readableTextOn(hex) {
  const color = String(hex || '#000000').replace('#', '');
  const full = color.length === 3 ? color.split('').map((c) => c + c).join('') : color;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

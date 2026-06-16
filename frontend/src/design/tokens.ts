// ── Design System — Mynotes ───────────────────────────────────────────────────
// Fonte unica de verdade para todas as decisoes visuais do projeto.

export const colors = {
  bg: {
    deep: "#1a1040",
    mid: "#2d1558",
    accent: "#3d1a44",
    rust: "#5a2015",
    surface: "rgba(15, 10, 30, 0.92)",
    card: "rgba(255, 255, 255, 0.06)",
    overlay: "rgba(0, 0, 0, 0.60)",
  },

  gradient: {
    main: "linear-gradient(155deg, #1a1040 0%, #2d1558 40%, #3d1a44 70%, #5a2015 100%)",
    nav: "linear-gradient(155deg, #3a2d9e 0%, #6832b5 40%, #9a3aaa 65%, #c85838 100%)",
    cardOverlay:
      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.28) 55%, transparent 100%)",
  },

  accent: {
    primary: "#fb923c",
    purple: "#6832b5",
    indigo: "#3a2d9e",
    orange: "#f97316",
    orangeHover: "#ea6c0a",
  },

  text: {
    primary: "rgba(255, 255, 255, 1.00)",
    secondary: "rgba(255, 255, 255, 0.65)",
    muted: "rgba(255, 255, 255, 0.45)",
    faint: "rgba(255, 255, 255, 0.25)",
  },

  border: {
    subtle: "rgba(255, 255, 255, 0.08)",
    mid: "rgba(255, 255, 255, 0.15)",
    strong: "rgba(255, 255, 255, 0.25)",
  },
} as const;

export const typography = {
  fontFamily: {
    primary: "'Poppins', sans-serif",
    secondary: "'Work Sans', sans-serif",
  },
  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "24px",
  },
} as const;

export const spacing = {
  cardGap: 8,
  cardRadius: 16,
  panelRadius: 20,
} as const;

export const blur = {
  panel: "blur(16px)",
  nav: "blur(12px)",
  card: "blur(6px)",
} as const;

export const animation = {
  snap: 300,
  toast: 2500,
  fade: 120,
} as const;

export type Colors     = typeof colors;
export type Typography = typeof typography;
